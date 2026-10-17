// 인증 서비스
// - AuthService: 인증/가족 초대 플로우의 인터페이스 (구현체와 무관)
// - MockAuthService: Firebase 키가 없을 때 쓰는 인메모리 세션 기반 구현체
// - FirebaseAuthService: Firebase Auth(익명 로그인) 구현체
// 화면/훅에서는 이 파일이 export하는 `auth` 만 사용하면 되므로,
// 구현체가 바뀌어도 호출 코드는 바뀌지 않습니다.
//
// 인증 방식: Firebase 익명 로그인 (signInAnonymously)
// - 초대코드 플로우(가족 이름 + 내 이름만 입력)에 맞춰 선택 — 이메일/비밀번호
//   입력 UI가 없으므로 익명 로그인이 인터페이스와 정확히 들어맞습니다.
// - 멤버 문서 ID = Firebase Auth uid (보안 규칙이 이 가정에 의존합니다).
// - 기기당 1개 uid가 안정적으로 유지되며(AsyncStorage 지속성),
//   앱 삭제 시 uid가 바뀌면 새 멤버로 참여하면 됩니다.
// - 콘솔에서 Authentication > 로그인 방법 > "익명" 사용 설정이 필요합니다.

import {
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signInAnonymously,
  signOut as firebaseSignOut,
  type Auth,
  type User,
} from "firebase/auth";
import { db } from "./db";
import { firebaseAuth, isMockMode } from "./firebase";
import type { Family, Member } from "../types";

/** 가족 생성/합류 결과 */
export interface AuthResult {
  /** 생성되거나 합류한 가족 */
  family: Family;
  /** 현재 세션의 멤버 */
  member: Member;
}

/** 인증 상태 변경 리스너 */
export type AuthStateListener = (member: Member | null) => void;

/** 인증 서비스 인터페이스 (초대코드 기반 인증) */
export interface AuthService {
  /** 새 가족 생성 + 6자리 초대코드 발급 + 생성자를 parent로 등록 */
  createFamily(familyName: string, displayName: string): Promise<AuthResult>;
  /** 초대코드로 기존 가족에 합류 (family 역할로 등록) */
  joinFamily(inviteCode: string, displayName: string): Promise<AuthResult>;
  /** 현재 로그인된 멤버 (없으면 null) */
  getCurrentMember(): Promise<Member | null>;
  /** 로그인 상태 변경 구독 (반환값으로 구독 해제) */
  onAuthStateChanged(listener: AuthStateListener): () => void;
  /** 로그아웃 (현재 세션 해제) */
  signOut(): Promise<void>;
}

/**
 * 초대코드용 문자셋: 헷갈리는 문자(0/O, 1/I/L) 제외한 대문자+숫자
 * (비밀값이 아니라 코드 규칙이므로 하드코딩 가능)
 */
const INVITE_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
/** 초대코드 길이 */
export const INVITE_CODE_LENGTH = 6;
/** 초대코드 중복 확인 최대 시도 횟수 */
const MAX_CODE_ATTEMPTS = 10;

/** 6자리 초대코드 1개 생성 (순수 함수 — db에 의존하지 않음) */
function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    const index = Math.floor(Math.random() * INVITE_CODE_CHARS.length);
    code += INVITE_CODE_CHARS[index];
  }
  return code;
}

/** 중복되지 않는 초대코드 발급 (db 조회로 충돌 확인) */
async function issueInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const candidate = generateInviteCode();
    // resolveInviteCode가 있으면 매핑만으로 충돌 확인 (가족 문서 읽기 권한 불필요)
    const taken = db.resolveInviteCode
      ? (await db.resolveInviteCode(candidate)) !== null
      : (await db.getFamilyByInviteCode(candidate)) !== null;
    if (!taken) return candidate;
  }
  throw new Error("초대코드 발급에 실패했습니다. 잠시 후 다시 시도해 주세요.");
}

/** 인메모리 세션 기반 mock 인증 구현체 */
export class MockAuthService implements AuthService {
  /** 현재 세션의 멤버 (mock에서는 메모리에만 보관 — 앱 재시작 시 사라짐) */
  private currentMember: Member | null = null;
  /** 상태 변경 리스너 집합 */
  private listeners = new Set<AuthStateListener>();

  /** 세션 변경을 모든 리스너에게 알림 */
  private setSession(member: Member | null): void {
    this.currentMember = member;
    for (const listener of this.listeners) {
      listener(member);
    }
  }

  onAuthStateChanged(listener: AuthStateListener): () => void {
    this.listeners.add(listener);
    // 구독 즉시 현재 상태를 한 번 전달
    listener(this.currentMember);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async createFamily(
    familyName: string,
    displayName: string
  ): Promise<AuthResult> {
    const name = familyName.trim();
    const nick = displayName.trim();
    if (!name) throw new Error("가족 이름을 입력해 주세요.");
    if (!nick) throw new Error("이름을 입력해 주세요.");

    const inviteCode = await issueInviteCode();
    const family = await db.createFamily({ name, inviteCode });
    const member = await db.createMember({
      displayName: nick,
      role: "parent",
      familyId: family.id,
    });
    await db.addFamilyMember(family.id, member.id);

    this.setSession(member);
    return { family, member };
  }

  async joinFamily(
    inviteCode: string,
    displayName: string
  ): Promise<AuthResult> {
    // 입력 정규화: 앞뒤 공백 제거 + 대문자 변환
    const code = inviteCode.trim().toUpperCase();
    const nick = displayName.trim();
    if (!nick) throw new Error("이름을 입력해 주세요.");
    if (code.length !== INVITE_CODE_LENGTH) {
      throw new Error(
        "초대코드를 확인해 주세요. 6자리 코드를 정확히 입력했는지 다시 확인해 보세요."
      );
    }

    const family = await db.getFamilyByInviteCode(code);
    if (!family) {
      throw new Error(
        "초대코드를 확인해 주세요. 6자리 코드를 정확히 입력했는지 다시 확인해 보세요."
      );
    }

    const member = await db.createMember({
      displayName: nick,
      role: "family",
      familyId: family.id,
    });
    await db.addFamilyMember(family.id, member.id);

    this.setSession(member);
    return { family, member };
  }

  async getCurrentMember(): Promise<Member | null> {
    return this.currentMember;
  }

  async signOut(): Promise<void> {
    this.setSession(null);
  }
}

/**
 * Firebase Auth(익명 로그인) 구현체.
 * - 멤버 문서 ID = Auth uid (보안 규칙과 일치)
 * - 로그인 후 db의 가족 컨텍스트(familyId)를 동기화합니다.
 */
export class FirebaseAuthService implements AuthService {
  /**
   * 최초 인증 상태 복원 대기용.
   * 앱 시작 시 세션 복원이 비동기로 일어나므로, 복원 완료 전에
   * ensureUid()가 실행되면 currentUser가 null로 보여 익명 로그인을
   * 중복 수행(기존 uid 고아 발생)할 수 있습니다. 이를 방지합니다.
   */
  private readyPromise: Promise<void> | null = null;

  private requireAuth(): Auth {
    if (!firebaseAuth) {
      throw new Error(
        "Firebase Auth가 초기화되지 않았습니다. .env의 Firebase 설정을 확인해 주세요."
      );
    }
    return firebaseAuth;
  }

  /** 첫 onAuthStateChanged 콜백까지 대기 = 세션 복원 완료 보장 */
  private waitForReady(): Promise<void> {
    if (!this.readyPromise) {
      const auth = this.requireAuth();
      this.readyPromise = new Promise<void>((resolve) => {
        const unsub = firebaseOnAuthStateChanged(auth, () => {
          unsub();
          resolve();
        });
      });
    }
    return this.readyPromise;
  }

  /** db 구현체에 현재 세션의 가족 ID를 알려줌 (서브컬렉션 경로 구성용) */
  private syncFamilyContext(member: Member | null): void {
    db.setCurrentFamilyId?.(member ? member.familyId : null);
  }

  /** Firebase User → Member 문서 조회 (없으면 null), 가족 컨텍스트 동기화 */
  private async memberForUser(user: User | null): Promise<Member | null> {
    if (!user) {
      this.syncFamilyContext(null);
      return null;
    }
    const member = await db.getMember(user.uid);
    this.syncFamilyContext(member);
    return member;
  }

  /** 로그인돼 있지 않으면 익명 로그인하고 uid 반환 */
  private async ensureUid(): Promise<string> {
    await this.waitForReady();
    const auth = this.requireAuth();
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("로그인에 실패했습니다. 다시 시도해 주세요.");
    return uid;
  }

  async createFamily(
    familyName: string,
    displayName: string
  ): Promise<AuthResult> {
    const name = familyName.trim();
    const nick = displayName.trim();
    if (!name) throw new Error("가족 이름을 입력해 주세요.");
    if (!nick) throw new Error("이름을 입력해 주세요.");

    const uid = await this.ensureUid();
    const inviteCode = await issueInviteCode();

    // FirestoreDatabase.createFamily가 생성자를 memberIds에 포함시킵니다.
    const family = await db.createFamily({ name, inviteCode });
    if (!db.createMemberWithId) {
      throw new Error("데이터베이스가 멤버 ID 지정을 지원하지 않습니다.");
    }
    const member = await db.createMemberWithId({
      id: uid,
      displayName: nick,
      role: "parent",
      familyId: family.id,
    });

    this.syncFamilyContext(member);
    return { family, member };
  }

  async joinFamily(
    inviteCode: string,
    displayName: string
  ): Promise<AuthResult> {
    const code = inviteCode.trim().toUpperCase();
    const nick = displayName.trim();
    if (!nick) throw new Error("이름을 입력해 주세요.");
    if (code.length !== INVITE_CODE_LENGTH) {
      throw new Error(
        "초대코드를 확인해 주세요. 6자리 코드를 정확히 입력했는지 다시 확인해 보세요."
      );
    }
    if (!db.resolveInviteCode) {
      throw new Error("데이터베이스가 초대코드 해석을 지원하지 않습니다.");
    }

    const uid = await this.ensureUid();

    // 합류 전에는 가족 문서를 읽을 권한이 없으므로 매핑으로 familyId를 알아냅니다.
    const resolved = await db.resolveInviteCode(code);
    if (!resolved) {
      throw new Error(
        "초대코드를 확인해 주세요. 6자리 코드를 정확히 입력했는지 다시 확인해 보세요."
      );
    }
    const { familyId } = resolved;

    // 이미 이 가족의 멤버라면 기존 멤버 반환 (중복 참여 방지)
    const existing = await db.getMember(uid);
    if (existing) {
      if (existing.familyId !== familyId) {
        throw new Error(
          "이미 다른 가족에 참여 중입니다. 로그아웃 후 다시 시도해 주세요."
        );
      }
      this.syncFamilyContext(existing);
      const family = await db.getFamilyByInviteCode(code);
      if (!family) throw new Error("가족 정보를 불러오지 못했습니다.");
      return { family, member: existing };
    }

    if (!db.createMemberWithId) {
      throw new Error("데이터베이스가 멤버 ID 지정을 지원하지 않습니다.");
    }
    const member = await db.createMemberWithId({
      id: uid,
      displayName: nick,
      role: "family",
      familyId,
    });
    await db.addFamilyMember(familyId, uid);

    this.syncFamilyContext(member);
    // 이제 멤버이므로 가족 문서 조회 가능
    const family = await db.getFamilyByInviteCode(code);
    if (!family) throw new Error("가족 정보를 불러오지 못했습니다.");
    return { family, member };
  }

  async getCurrentMember(): Promise<Member | null> {
    const auth = this.requireAuth();
    return this.memberForUser(auth.currentUser);
  }

  onAuthStateChanged(listener: AuthStateListener): () => void {
    const auth = this.requireAuth();
    return firebaseOnAuthStateChanged(auth, (user) => {
      // 비동기 조회이므로 결과를 기다리지 않고 리스너에 전달
      void this.memberForUser(user).then((member) => listener(member));
    });
  }

  async signOut(): Promise<void> {
    const auth = this.requireAuth();
    await firebaseSignOut(auth);
    this.syncFamilyContext(null);
  }
}

/**
 * 앱 전체에서 사용하는 인증 서비스 싱글톤.
 * - mock 모드: MockAuthService (인메모리 세션)
 * - Firebase 키가 있으면: FirebaseAuthService (익명 로그인)
 */
export const auth: AuthService = isMockMode
  ? new MockAuthService()
  : new FirebaseAuthService();
