// 현재 가족의 아이 목록 훅
// - 로그인된 멤버의 familyId로 아이 목록을 불러옵니다.
// - 현재 UI는 "첫 번째 아이 기준" 관례를 따르므로 child = children[0] 입니다.
//   (나중에 아이 선택 UI가 생기면 이 훅에서 선택 상태를 관리하면 됩니다.)
// - 로그인 전에는 빈 목록 + 대기 상태로 동작합니다 (크래시 금지).
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { useDatabase } from "./useDatabase";
import type { Child } from "../types";

export function useCurrentChild() {
  const db = useDatabase();
  const { member, loading: authLoading } = useAuth();
  /** 가족의 아이 목록 */
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

  /** 아이 목록 다시 불러오기 (실패 시 예외를 던짐 — 화면에서 Alert 등으로 처리) */
  const reload = useCallback(async () => {
    if (!member) {
      setChildren([]);
      return;
    }
    const list = await db.listChildren(member.familyId);
    setChildren(list);
  }, [db, member]);

  // 인증 세션이 확정된 뒤에 목록 로딩 (자동 로딩 실패는 조용히 빈 목록 유지)
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await reload();
      } catch {
        // 자동 로딩 실패 시 빈 목록 유지 (수동 reload는 화면에서 오류 처리)
        if (!cancelled) setChildren([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, reload]);

  return {
    /** 아이 목록 */
    children,
    /** 현재 아이 (첫 번째 아이 기준, 없으면 null) */
    child: children[0] ?? null,
    /** 로딩 중 (인증 세션 복원 포함) */
    loading: authLoading || loading,
    /** 로그인 여부 */
    isSignedIn: member !== null,
    /** 목록 새로고침 */
    reload,
  };
}
