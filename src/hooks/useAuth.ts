// 인증 상태 훅
// 화면에서는 이 훅을 통해 auth 인터페이스만 사용합니다.
// mock → Firebase Auth 전환 시에도 이 훅의 사용 코드는 바뀌지 않습니다.
import { useCallback, useEffect, useState } from "react";
import { auth, type AuthResult } from "../lib/auth";
import type { Member } from "../types";

export function useAuth() {
  /** 현재 로그인된 멤버 (없으면 null) */
  const [member, setMember] = useState<Member | null>(null);
  /** 세션 복원 중 여부 */
  const [loading, setLoading] = useState(true);

  /** 세션에서 현재 멤버를 다시 읽어 상태에 반영 */
  const refresh = useCallback(async () => {
    const current = await auth.getCurrentMember();
    setMember(current);
  }, []);

  // 인증 상태 변경을 구독 — 어느 화면에서 로그인/로그아웃해도
  // 이 훅을 쓰는 모든 곳의 상태가 함께 바뀝니다.
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((current) => {
      setMember(current);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  /** 새 가족 만들기 (성공 시 로그인 상태로 전환) */
  const createFamily = useCallback(
    async (familyName: string, displayName: string): Promise<AuthResult> => {
      const result = await auth.createFamily(familyName, displayName);
      setMember(result.member);
      return result;
    },
    []
  );

  /** 초대코드로 가족에 합류 (성공 시 로그인 상태로 전환) */
  const joinFamily = useCallback(
    async (inviteCode: string, displayName: string): Promise<AuthResult> => {
      const result = await auth.joinFamily(inviteCode, displayName);
      setMember(result.member);
      return result;
    },
    []
  );

  /** 로그아웃 */
  const signOut = useCallback(async () => {
    await auth.signOut();
    setMember(null);
  }, []);

  return {
    member,
    loading,
    /** 로그인 여부 */
    isSignedIn: member !== null,
    createFamily,
    joinFamily,
    signOut,
    refresh,
  };
}
