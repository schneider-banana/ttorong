// 데이터 레이어
// - BabyLogDatabase: 앱 전체에서 사용하는 CRUD 인터페이스 (구현체와 무관)
// - InMemoryDatabase: Firebase 키가 없을 때 쓰는 인메모리 mock 구현체
// - FirestoreDatabase: 실제 Firestore 구현체
// 화면/훅에서는 이 파일이 export하는 `db` 만 사용하면 되므로,
// 구현체가 바뀌어도 호출 코드는 바뀌지 않습니다.
//
// Firestore 컬렉션 구조:
//   families/{familyId}              — 가족 문서 (name, inviteCode, memberIds)
//   families/{familyId}/children     — 아이 문서
//   families/{familyId}/events       — 일정 문서
//   families/{familyId}/logEntries   — 육아 로그 문서
//   families/{familyId}/growthRecords — 성장 기록 문서
//   members/{memberId}               — 멤버 문서 (문서 ID = Firebase Auth uid)
//   inviteCodes/{code}               — 초대코드 → { familyId, familyName } 매핑
//     (문서 ID 자체가 초대코드. list 금지로 코드 열거를 차단하므로
//      families에 대한 inviteCode where 쿼리 대신 이 매핑을 사용합니다.)

import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  deleteDoc,
  where,
  writeBatch,
  type DocumentSnapshot,
  type Firestore,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { firebaseAuth, firestoreDb, isMockMode } from "./firebase";
import type {
  BabyLogEntry,
  CalendarEvent,
  Child,
  Family,
  GrowthRecord,
  Member,
} from "../types";

/** 앱 전체 데이터 접근 인터페이스 */
export interface BabyLogDatabase {
  // --- 아이 ---
  /** 가족에 속한 아이 목록 조회 */
  listChildren(familyId: string): Promise<Child[]>;
  /** 아이 1건 조회 (없으면 null) */
  getChild(id: string): Promise<Child | null>;
  /** 아이 등록 */
  createChild(child: Omit<Child, "id">): Promise<Child>;
  /** 아이 정보 수정 */
  updateChild(id: string, patch: Partial<Omit<Child, "id">>): Promise<Child>;
  /** 아이 삭제 */
  deleteChild(id: string): Promise<void>;

  // --- 가족 ---
  /** 초대코드로 가족 조회 (없으면 null) */
  getFamilyByInviteCode(inviteCode: string): Promise<Family | null>;
  /** 가족 ID로 가족 조회 (없으면 null) */
  getFamily(id: string): Promise<Family | null>;
  /**
   * 초대코드 해석 → { familyId, familyName } (없으면 null).
   * 합류 전에는 가족 문서를 읽을 권한이 없으므로, 초대코드 매핑만으로
   * familyId를 알아낼 때 사용합니다.
   */
  resolveInviteCode?(inviteCode: string): Promise<{
    familyId: string;
    familyName: string;
  } | null>;
  /** 가족 생성 */
  createFamily(family: Omit<Family, "id" | "memberIds">): Promise<Family>;
  /** 가족에 멤버 추가 */
  addFamilyMember(familyId: string, memberId: string): Promise<void>;

  // --- 멤버 ---
  /** 멤버 1건 조회 (없으면 null) */
  getMember(id: string): Promise<Member | null>;
  /** 멤버 등록 */
  createMember(member: Omit<Member, "id">): Promise<Member>;
  /**
   * 멤버 등록 (문서 ID 지정 — Firestore 구현체 전용).
   * Firebase Auth uid를 멤버 문서 ID로 쓸 때 사용합니다.
   */
  createMemberWithId?(member: Member): Promise<Member>;

  // --- 캘린더 일정 ---
  /** 특정 날짜 범위의 가족 일정 조회 (date: YYYY-MM-DD) */
  listEvents(familyId: string, from: string, to: string): Promise<CalendarEvent[]>;
  /** 일정 등록 */
  createEvent(event: Omit<CalendarEvent, "id">): Promise<CalendarEvent>;
  /** 일정 수정 */
  updateEvent(
    id: string,
    patch: Partial<Omit<CalendarEvent, "id" | "familyId">>
  ): Promise<CalendarEvent>;
  /** 일정 삭제 */
  deleteEvent(id: string): Promise<void>;

  // --- 육아 로그 ---
  /** 아이의 로그 조회 (최신순, limit 기본 50건) */
  listLogEntries(
    childId: string,
    limit?: number
  ): Promise<BabyLogEntry[]>;
  /** 로그 1건 등록 */
  createLogEntry(entry: Omit<BabyLogEntry, "id">): Promise<BabyLogEntry>;
  /** 로그 삭제 */
  deleteLogEntry(id: string): Promise<void>;

  // --- 성장 기록 ---
  /** 아이의 성장 기록 조회 (측정일 오름차순, limit 기본 100건) */
  listGrowthRecords(
    childId: string,
    limit?: number
  ): Promise<GrowthRecord[]>;
  /** 성장 기록 1건 등록 */
  createGrowthRecord(
    record: Omit<GrowthRecord, "id">
  ): Promise<GrowthRecord>;
  /** 성장 기록 삭제 */
  deleteGrowthRecord(id: string): Promise<void>;

  /**
   * 현재 세션의 가족 ID 설정 (Firestore 구현체 전용).
   * 서브컬렉션 경로(families/{familyId}/...)를 구성하기 위해
   * auth 서비스가 로그인/로그아웃 시 호출합니다.
   */
  setCurrentFamilyId?(familyId: string | null): void;
}

/** 간단한 ID 생성 (mock용) */
function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** 인메모리 mock 구현체 (Firebase 키가 없을 때 사용) */
export class InMemoryDatabase implements BabyLogDatabase {
  private children = new Map<string, Child>();
  private families = new Map<string, Family>();
  private members = new Map<string, Member>();
  private events = new Map<string, CalendarEvent>();
  private logEntries = new Map<string, BabyLogEntry>();
  private growthRecords = new Map<string, GrowthRecord>();

  async listChildren(familyId: string): Promise<Child[]> {
    // mock에서는 familyId 필터 없이 전체 반환 (Child에 familyId가 없으므로)
    void familyId;
    return [...this.children.values()];
  }

  async getChild(id: string): Promise<Child | null> {
    return this.children.get(id) ?? null;
  }

  async createChild(child: Omit<Child, "id">): Promise<Child> {
    const created: Child = { ...child, id: newId() };
    this.children.set(created.id, created);
    return created;
  }

  async updateChild(
    id: string,
    patch: Partial<Omit<Child, "id">>
  ): Promise<Child> {
    const existing = this.children.get(id);
    if (!existing) throw new Error(`아이를 찾을 수 없습니다: ${id}`);
    const updated: Child = { ...existing, ...patch };
    this.children.set(id, updated);
    return updated;
  }

  async deleteChild(id: string): Promise<void> {
    this.children.delete(id);
  }

  async getFamilyByInviteCode(inviteCode: string): Promise<Family | null> {
    for (const family of this.families.values()) {
      if (family.inviteCode === inviteCode) return family;
    }
    return null;
  }

  async getFamily(id: string): Promise<Family | null> {
    return this.families.get(id) ?? null;
  }

  async resolveInviteCode(
    inviteCode: string
  ): Promise<{ familyId: string; familyName: string } | null> {
    const family = await this.getFamilyByInviteCode(inviteCode);
    if (!family) return null;
    return { familyId: family.id, familyName: family.name };
  }

  async createFamily(
    family: Omit<Family, "id" | "memberIds">
  ): Promise<Family> {
    const created: Family = {
      ...family,
      id: newId(),
      memberIds: [],
      inviteCode: family.inviteCode || newId().slice(0, 6).toUpperCase(),
    };
    this.families.set(created.id, created);
    return created;
  }

  async addFamilyMember(familyId: string, memberId: string): Promise<void> {
    const family = this.families.get(familyId);
    if (!family) throw new Error(`가족을 찾을 수 없습니다: ${familyId}`);
    if (!family.memberIds.includes(memberId)) {
      family.memberIds.push(memberId);
    }
  }

  async getMember(id: string): Promise<Member | null> {
    return this.members.get(id) ?? null;
  }

  async createMember(member: Omit<Member, "id">): Promise<Member> {
    const created: Member = { ...member, id: newId() };
    this.members.set(created.id, created);
    return created;
  }

  async listEvents(
    familyId: string,
    from: string,
    to: string
  ): Promise<CalendarEvent[]> {
    return [...this.events.values()]
      .filter((e) => e.familyId === familyId && e.date >= from && e.date <= to)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async createEvent(event: Omit<CalendarEvent, "id">): Promise<CalendarEvent> {
    const created: CalendarEvent = { ...event, id: newId() };
    this.events.set(created.id, created);
    return created;
  }

  async updateEvent(
    id: string,
    patch: Partial<Omit<CalendarEvent, "id" | "familyId">>
  ): Promise<CalendarEvent> {
    const existing = this.events.get(id);
    if (!existing) throw new Error(`일정을 찾을 수 없습니다: ${id}`);
    const updated: CalendarEvent = { ...existing, ...patch };
    this.events.set(id, updated);
    return updated;
  }

  async deleteEvent(id: string): Promise<void> {
    this.events.delete(id);
  }

  async listLogEntries(
    childId: string,
    limit = 50
  ): Promise<BabyLogEntry[]> {
    return [...this.logEntries.values()]
      .filter((e) => e.childId === childId)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, limit);
  }

  async createLogEntry(entry: Omit<BabyLogEntry, "id">): Promise<BabyLogEntry> {
    const created: BabyLogEntry = { ...entry, id: newId() };
    this.logEntries.set(created.id, created);
    return created;
  }

  async deleteLogEntry(id: string): Promise<void> {
    this.logEntries.delete(id);
  }

  async listGrowthRecords(
    childId: string,
    limit = 100
  ): Promise<GrowthRecord[]> {
    return [...this.growthRecords.values()]
      .filter((r) => r.childId === childId)
      .sort((a, b) => a.measuredDate.localeCompare(b.measuredDate))
      .slice(0, limit);
  }

  async createGrowthRecord(
    record: Omit<GrowthRecord, "id">
  ): Promise<GrowthRecord> {
    const created: GrowthRecord = { ...record, id: newId() };
    this.growthRecords.set(created.id, created);
    return created;
  }

  async deleteGrowthRecord(id: string): Promise<void> {
    this.growthRecords.delete(id);
  }
}

/** 문서 데이터에서 id 필드를 제거 (id는 문서 ID로 사용하므로 본문에 저장하지 않음) */
function withoutId<T extends { id: string }>(value: T): Omit<T, "id"> {
  const copy = { ...value };
  delete (copy as { id?: string }).id;
  return copy;
}

/**
 * Firestore 쓰기 전 undefined 필드 제거.
 * Firestore는 undefined 값을 거부하므로, 선택 입력(메모 등)이 비어 있을 때
 * addDoc/setDoc/updateDoc이 실패하는 것을 방지합니다.
 */
function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  const copy = { ...value };
  for (const key of Object.keys(copy)) {
    if (copy[key] === undefined) delete copy[key];
  }
  return copy;
}

/** 스냅샷을 id 포함 객체로 변환 (문서 없으면 null) */
function withId<T>(
  snap: QueryDocumentSnapshot | DocumentSnapshot
): (T & { id: string }) | null {
  if (!snap.exists()) return null;
  return { ...(snap.data() as T), id: snap.id };
}

/**
 * Firestore 구현체.
 * - 서브컬렉션 경로에 필요한 familyId는 auth 서비스가 setCurrentFamilyId로 설정합니다.
 * - 복합 인덱스가 필요 없도록 쿼리는 단일 필드 조건만 사용하고 정렬은 메모리에서 합니다.
 */
export class FirestoreDatabase implements BabyLogDatabase {
  /** 현재 세션의 가족 ID (서브컬렉션 경로 구성용) */
  private familyId: string | null = null;

  setCurrentFamilyId(familyId: string | null): void {
    this.familyId = familyId;
  }

  /** 초기화된 Firestore 인스턴스 (firebase 모드에서만 생성됨) */
  private get fs(): Firestore {
    if (!firestoreDb) {
      throw new Error(
        "Firestore가 초기화되지 않았습니다. .env의 Firebase 설정을 확인해 주세요."
      );
    }
    return firestoreDb;
  }

  /** 서브컬렉션 경로에 쓸 familyId (없으면 로그인 안내 에러) */
  private requireFamilyId(): string {
    if (!this.familyId) {
      throw new Error(
        "가족 세션이 없습니다. 가족을 만들거나 초대코드로 참여해 주세요."
      );
    }
    return this.familyId;
  }

  /** 현재 로그인한 Firebase Auth uid (없으면 에러) */
  private requireUid(): string {
    const uid = firebaseAuth?.currentUser?.uid;
    if (!uid) throw new Error("로그인이 필요합니다.");
    return uid;
  }

  private familyRef(familyId: string) {
    return doc(this.fs, "families", familyId);
  }

  private childrenCol(familyId: string) {
    return collection(this.fs, "families", familyId, "children");
  }

  private eventsCol(familyId: string) {
    return collection(this.fs, "families", familyId, "events");
  }

  private logEntriesCol(familyId: string) {
    return collection(this.fs, "families", familyId, "logEntries");
  }

  private growthRecordsCol(familyId: string) {
    return collection(this.fs, "families", familyId, "growthRecords");
  }

  private membersCol() {
    return collection(this.fs, "members");
  }

  // --- 아이 ---

  async listChildren(familyId: string): Promise<Child[]> {
    const snap = await getDocs(this.childrenCol(familyId));
    return snap.docs
      .map((d) => withId<Child>(d))
      .filter((c): c is Child => c !== null);
  }

  async getChild(id: string): Promise<Child | null> {
    const snap = await getDoc(
      doc(this.fs, "families", this.requireFamilyId(), "children", id)
    );
    return withId<Child>(snap);
  }

  async createChild(child: Omit<Child, "id">): Promise<Child> {
    const ref = await addDoc(
      this.childrenCol(this.requireFamilyId()),
      stripUndefined(child as Record<string, unknown>)
    );
    return { ...child, id: ref.id };
  }

  async updateChild(
    id: string,
    patch: Partial<Omit<Child, "id">>
  ): Promise<Child> {
    const ref = doc(this.fs, "families", this.requireFamilyId(), "children", id);
    await updateDoc(ref, stripUndefined({ ...patch }));
    const updated = await getDoc(ref);
    const result = withId<Child>(updated);
    if (!result) throw new Error(`아이를 찾을 수 없습니다: ${id}`);
    return result;
  }

  async deleteChild(id: string): Promise<void> {
    await deleteDoc(
      doc(this.fs, "families", this.requireFamilyId(), "children", id)
    );
  }

  // --- 가족 ---

  async getFamilyByInviteCode(inviteCode: string): Promise<Family | null> {
    // inviteCodes/{code} 매핑으로 조회 (list 쿼리 없이 단건 조회 — 열거 차단)
    // 주의: 합류 전에는 가족 문서를 읽을 권한이 없어 null이 아니라
    // 권한 에러가 날 수 있습니다. 합류 플로우에서는 resolveInviteCode를 쓰세요.
    const codeSnap = await getDoc(doc(this.fs, "inviteCodes", inviteCode));
    if (!codeSnap.exists()) return null;
    const { familyId } = codeSnap.data() as { familyId: string };
    const famSnap = await getDoc(this.familyRef(familyId));
    return withId<Family>(famSnap);
  }

  async getFamily(id: string): Promise<Family | null> {
    const famSnap = await getDoc(this.familyRef(id));
    return withId<Family>(famSnap);
  }

  async resolveInviteCode(
    inviteCode: string
  ): Promise<{ familyId: string; familyName: string } | null> {
    const codeSnap = await getDoc(doc(this.fs, "inviteCodes", inviteCode));
    if (!codeSnap.exists()) return null;
    const data = codeSnap.data() as { familyId: string; familyName: string };
    return { familyId: data.familyId, familyName: data.familyName };
  }

  async createFamily(
    family: Omit<Family, "id" | "memberIds">
  ): Promise<Family> {
    // 가족 생성자를 memberIds에 바로 포함 (보안 규칙상 생성 직후 본인이 멤버여야 함)
    // 가족 문서 + 초대코드 매핑을 배치로 원자적 생성
    const uid = this.requireUid();
    const batch = writeBatch(this.fs);
    const familyRef = doc(collection(this.fs, "families"));
    batch.set(familyRef, {
      name: family.name,
      inviteCode: family.inviteCode,
      memberIds: [uid],
    });
    batch.set(doc(this.fs, "inviteCodes", family.inviteCode), {
      familyId: familyRef.id,
      familyName: family.name,
    });
    await batch.commit();
    return { ...family, id: familyRef.id, memberIds: [uid] };
  }

  async addFamilyMember(familyId: string, memberId: string): Promise<void> {
    await updateDoc(this.familyRef(familyId), {
      memberIds: arrayUnion(memberId),
    });
  }

  // --- 멤버 ---

  async getMember(id: string): Promise<Member | null> {
    const snap = await getDoc(doc(this.fs, "members", id));
    return withId<Member>(snap);
  }

  async createMember(member: Omit<Member, "id">): Promise<Member> {
    const ref = await addDoc(this.membersCol(), stripUndefined(withoutId({ ...member, id: "" })));
    return { ...member, id: ref.id };
  }

  async createMemberWithId(member: Member): Promise<Member> {
    await setDoc(doc(this.fs, "members", member.id), stripUndefined(withoutId(member)));
    return member;
  }

  // --- 캘린더 일정 ---

  async listEvents(
    familyId: string,
    from: string,
    to: string
  ): Promise<CalendarEvent[]> {
    // 단일 필드 범위 조건만 사용 (복합 인덱스 불필요), 정렬은 메모리에서
    const q = query(
      this.eventsCol(familyId),
      where("date", ">=", from),
      where("date", "<=", to)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => withId<CalendarEvent>(d))
      .filter((e): e is CalendarEvent => e !== null)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async createEvent(event: Omit<CalendarEvent, "id">): Promise<CalendarEvent> {
    const ref = await addDoc(this.eventsCol(event.familyId), stripUndefined(withoutId({ ...event, id: "" })));
    return { ...event, id: ref.id };
  }

  async updateEvent(
    id: string,
    patch: Partial<Omit<CalendarEvent, "id" | "familyId">>
  ): Promise<CalendarEvent> {
    const ref = doc(this.fs, "families", this.requireFamilyId(), "events", id);
    await updateDoc(ref, stripUndefined({ ...patch }));
    const updated = await getDoc(ref);
    const result = withId<CalendarEvent>(updated);
    if (!result) throw new Error(`일정을 찾을 수 없습니다: ${id}`);
    return result;
  }

  async deleteEvent(id: string): Promise<void> {
    await deleteDoc(
      doc(this.fs, "families", this.requireFamilyId(), "events", id)
    );
  }

  // --- 육아 로그 ---

  async listLogEntries(
    childId: string,
    limitCount = 50
  ): Promise<BabyLogEntry[]> {
    // childId 동등 조건만 사용 (복합 인덱스 불필요), 최신순 정렬은 메모리에서
    const q = query(
      this.logEntriesCol(this.requireFamilyId()),
      where("childId", "==", childId)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => withId<BabyLogEntry>(d))
      .filter((e): e is BabyLogEntry => e !== null)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, limitCount);
  }

  async createLogEntry(
    entry: Omit<BabyLogEntry, "id">
  ): Promise<BabyLogEntry> {
    const ref = await addDoc(
      this.logEntriesCol(entry.familyId),
      stripUndefined(withoutId({ ...entry, id: "" }))
    );
    return { ...entry, id: ref.id };
  }

  async deleteLogEntry(id: string): Promise<void> {
    await deleteDoc(
      doc(this.fs, "families", this.requireFamilyId(), "logEntries", id)
    );
  }

  // --- 성장 기록 ---

  async listGrowthRecords(
    childId: string,
    limitCount = 100
  ): Promise<GrowthRecord[]> {
    const q = query(
      this.growthRecordsCol(this.requireFamilyId()),
      where("childId", "==", childId)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => withId<GrowthRecord>(d))
      .filter((r): r is GrowthRecord => r !== null)
      .sort((a, b) => a.measuredDate.localeCompare(b.measuredDate))
      .slice(0, limitCount);
  }

  async createGrowthRecord(
    record: Omit<GrowthRecord, "id">
  ): Promise<GrowthRecord> {
    const ref = await addDoc(
      this.growthRecordsCol(record.familyId),
      stripUndefined(withoutId({ ...record, id: "" }))
    );
    return { ...record, id: ref.id };
  }

  async deleteGrowthRecord(id: string): Promise<void> {
    await deleteDoc(
      doc(this.fs, "families", this.requireFamilyId(), "growthRecords", id)
    );
  }
}

/**
 * 앱 전체에서 사용하는 데이터베이스 싱글톤.
 * - Firebase 키가 없으면(mock 모드): InMemoryDatabase
 * - Firebase 키가 있으면: FirestoreDatabase
 */
export const db: BabyLogDatabase = isMockMode
  ? new InMemoryDatabase()
  : new FirestoreDatabase();
