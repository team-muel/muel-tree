"use client";

/**
 * 직업 추측 로컬 저장소 (R3 1단계 — 백엔드 0).
 *
 * 사용자 의도 (2026-06-12): 타인의 프로필을 눌러 진영·직업을 추측하고 메모로
 * "저장해놓는" 흐름. 1단계는 내 화면 한정 — matchId 별로 localStorage 에 보관해
 * 새로고침에도 살아남는다. 서버 집계(추리 정확도)는 후속 트랜치.
 */

import { useCallback, useEffect, useState } from "react";

export type InspectGuess = {
  /** 추측 진영: "angel" | "demon" | "neutral" | "" (미정). */
  faction?: string;
  /** 추측 직업 id (gomdori-roles). */
  role?: string;
  memo?: string;
};

export type InspectGuessMap = Record<string, InspectGuess>;

function keyFor(matchId?: string | null): string {
  return `gomdori:inspect:${matchId ?? "preview"}`;
}

function read(matchId?: string | null): InspectGuessMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(keyFor(matchId));
    return raw ? (JSON.parse(raw) as InspectGuessMap) : {};
  } catch {
    return {};
  }
}

/** matchId 범위의 추측 맵 + 저장기. localStorage 백엔드(없으면 메모리). */
export function useInspectGuesses(matchId?: string | null) {
  const [guesses, setGuesses] = useState<InspectGuessMap>({});

  // 마운트/매치변경 시 로드.
  useEffect(() => {
    setGuesses(read(matchId));
  }, [matchId]);

  const save = useCallback(
    (userId: string, guess: InspectGuess) => {
      setGuesses((prev) => {
        const next = { ...prev, [userId]: guess };
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(keyFor(matchId), JSON.stringify(next));
          } catch {
            // 저장 실패(프라이빗 모드 등) — 메모리 상태만 유지.
          }
        }
        return next;
      });
    },
    [matchId],
  );

  return { guesses, save };
}
