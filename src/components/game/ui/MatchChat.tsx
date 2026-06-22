"use client";
/* eslint-disable @next/next/no-img-element */

/**
 * MatchChat — Feign식 중앙 채팅. 채널은 서버(match-chat)가 페이즈+상태로 결정한다.
 * 클라이언트는 match_chats 를 구독하고(가시성은 RLS 가 강제: town=전원, dead=사망자,
 * demon_circle=회로원), 어떤 채널이든 같은 입력창으로 보낸다(서버가 라우팅).
 * 사망자 영혼('dead') 메시지는 "영혼" 표식으로 구분 — 산 자에겐 애초에 도착하지 않는다.
 */

import { useEffect, useRef, useState } from "react";
import type { PlayerSummary } from "@/lib/game/api";
import { sendChat } from "@/lib/game/api";
import { getGameSupabase } from "@/lib/game/client";
import { useInspectGuesses } from "@/lib/game/inspect";
import { PlayerInspectSheet } from "@/components/game/ui/PlayerInspectSheet";

type ChatRow = {
  id: string;
  sender_user_id: string;
  message: string;
  channel?: string;
  created_at?: string;
};

// AI 용병 브랜드 마크(PlayerToken 과 동일 톤) — 채팅 아바타도 로비 토큰처럼 정체를 드러낸다.
const AI_CHAT_VIS: Record<string, { glyph: string; bg: string }> = {
  chatgpt: { glyph: "✺", bg: "#10a37f" },
  gemini: { glyph: "✦", bg: "#3b82f6" },
  claude: { glyph: "✳", bg: "#d97757" },
};

// 채팅 행 왼쪽 프로필 사진(로비 Discord 아바타 토큰과 같은 방식): 아바타 → AI 브랜드 → 이니셜.
// onClick 이 있으면 누를 수 있는 버튼(정체 추측 시트 열기) — hover 링으로 어포던스.
function ChatAvatar({ player, onClick }: { player?: PlayerSummary; onClick?: () => void }) {
  const name = player?.displayName ?? "?";
  const aiVis = player?.isAi && player.aiProvider ? AI_CHAT_VIS[player.aiProvider] ?? null : null;
  const base = "h-7 w-7 shrink-0 overflow-hidden rounded-full border border-white/15 text-[0.6875rem] font-semibold";
  const inner = player?.avatarUrl ? (
    <img src={player.avatarUrl} alt="" className={`${base} object-cover`} />
  ) : aiVis ? (
    <span className={`${base} inline-flex items-center justify-center text-white`} style={{ backgroundColor: aiVis.bg }} aria-hidden="true">
      {aiVis.glyph}
    </span>
  ) : (
    <span className={`${base} inline-flex items-center justify-center bg-white/10 text-white/70`} aria-hidden="true">
      {name.trim() ? Array.from(name.trim())[0].toUpperCase() : "?"}
    </span>
  );
  if (!onClick) return inner;
  return (
    <button type="button" onClick={onClick} aria-label={`${name} 정체 추측`} className="shrink-0 rounded-full transition hover:opacity-80 hover:ring-2 hover:ring-white/40">
      {inner}
    </button>
  );
}

export function MatchChat({
  matchId,
  gameJwt,
  myPlayer,
  players,
  placeholder = "메시지 입력...",
  emptyHint = "대화를 시작하세요",
  canSend = true,
  disabledHint,
  accent = "town",
  channels,
  systemNotices,
}: {
  matchId: string;
  gameJwt: string;
  myPlayer: PlayerSummary | null;
  players: PlayerSummary[];
  /** 채팅창 안에 표시할 시스템 통지(예: 토론 시간 조절) — 가운데 정렬 회색 라인. */
  systemNotices?: Array<{ id: string; text: string }>;
  placeholder?: string;
  emptyHint?: string;
  /** false 면 입력창을 잠근다(예: 발화 불가 페이즈). */
  canSend?: boolean;
  disabledHint?: string;
  /** 강조색 — town(호박)·circle(장미). */
  accent?: "town" | "circle";
  /** 표시할 채널 화이트리스트(채널 격리). 없으면 RLS 가 허용하는 전체. */
  channels?: string[];
}) {
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  // 실시간 채널 토픽은 인스턴스마다 고유해야 한다. supabase client 는 토픽 이름으로
  // 채널을 식별·재사용하므로, 같은 matchId 의 패널이 둘 이상(낮 마을 + 영혼 채팅,
  // 프리뷰 다중 마운트) 동시에 뜨면 두 번째가 이미 subscribe() 된 채널에 .on() 을
  // 걸다 "cannot add postgres_changes callbacks after subscribe()" 로 죽었다.
  // 인스턴스 고유 id 로 토픽을 분리해 충돌을 없앤다.
  const topicIdRef = useRef<string>("");
  if (!topicIdRef.current) {
    const scope = channels && channels.length > 0 ? channels.join("_") : "all";
    topicIdRef.current = `${scope}-${Math.random().toString(36).slice(2, 10)}`;
  }
  // 채팅 아바타 클릭 → 정체 추측 시트(토큰과 같은 localStorage 저장소).
  const { guesses, save } = useInspectGuesses(matchId);
  const [inspectId, setInspectId] = useState<string | null>(null);
  const inspectPlayer = inspectId ? players.find((p) => p.userId === inspectId) : null;

  useEffect(() => {
    if (!matchId || !gameJwt) return;
    let cancelled = false;
    const supabase = getGameSupabase(gameJwt);

    const allowChannel = (c?: string) => !channels || (typeof c === "string" && channels.includes(c));

    let query = supabase
      .schema("mafia")
      .from("match_chats")
      .select("*")
      .eq("match_id", matchId);
    if (channels && channels.length > 0) query = query.in("channel", channels);
    query
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (!cancelled && data) setChats(data as ChatRow[]);
      });

    const channel = supabase
      .channel(`match-chat-${matchId}-${topicIdRef.current}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "mafia", table: "match_chats", filter: `match_id=eq.${matchId}` },
        (payload) => {
          const row = payload.new as ChatRow;
          if (allowChannel(row.channel)) setChats((prev) => [...prev, row]);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // channels 는 마운트 시 고정(페이즈별 호출부가 리터럴 전달) — 재구독 불필요.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, gameJwt]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    const msg = message;
    setMessage("");
    setError(null);
    try {
      await sendChat(matchId, msg, gameJwt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "채팅 전송 실패");
      setMessage(msg);
    }
  };

  const sendColor =
    accent === "circle"
      ? "bg-rose-500/25 text-rose-100 focus-within:border-rose-500/60"
      : "bg-amber-500/25 text-amber-50 focus-within:border-amber-400/60";
  // 콘트라스트 (2026-06-16 복구): 어두운 배경(slate-950/92) 위에서 bg-white/10 은
  // 너무 흐릿했다. 채팅 거품을 진하게 + 테두리 한 줄을 둬 메시지 경계를 또렷이.
  const mineBubble = accent === "circle"
    ? "bg-rose-500/30 text-rose-50 ring-1 ring-rose-300/25"
    : "bg-amber-500/25 text-amber-50 ring-1 ring-amber-300/25";
  const theirBubble = "bg-white/20 text-white ring-1 ring-white/20";

  return (
    <div className="flex h-72 flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {chats.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-white/45">{emptyHint}</div>
        ) : (
          chats.map((chat) => {
            const isMe = chat.sender_user_id === myPlayer?.userId;
            const senderPlayer = players.find((p) => p.userId === chat.sender_user_id);
            const sender = senderPlayer?.displayName || "알 수 없음";
            const isGhost = chat.channel === "dead";
            const bubble = (
              <div
                className={`max-w-full break-words rounded-lg px-3 py-2 text-sm shadow-sm ${
                  isMe
                    ? `rounded-tr-sm ${isGhost ? "bg-violet-500/30 text-violet-50 ring-1 ring-violet-300/25" : mineBubble}`
                    : `rounded-tl-sm ${isGhost ? "bg-violet-500/20 text-violet-100 ring-1 ring-violet-400/25" : theirBubble}`
                }`}
              >
                {chat.message}
              </div>
            );
            if (isMe) {
              return (
                <div key={chat.id} className="flex flex-col items-end">
                  <div className="max-w-[85%]">{bubble}</div>
                </div>
              );
            }
            // 남이 친 메시지: 로비 아바타 토큰처럼 프로필 사진을 왼쪽에 둬 누가 쳤는지 바로 보이게.
            return (
              <div key={chat.id} className="flex items-start gap-2">
                <ChatAvatar player={senderPlayer} onClick={senderPlayer ? () => setInspectId(chat.sender_user_id) : undefined} />
                <div className="min-w-0 max-w-[85%]">
                  <div className="mb-1 flex items-center gap-1 pl-0.5 text-[0.625rem] font-semibold text-white/80">
                    {sender}
                    {isGhost ? <span className="rounded-full bg-white/15 px-1.5 text-[0.5625rem] font-medium text-white/70">영혼</span> : null}
                  </div>
                  {bubble}
                </div>
              </div>
            );
          })
        )}
        {(systemNotices ?? []).map((n) => (
          <div key={n.id} className="flex items-center gap-2 py-0.5 text-[0.625rem] text-white/40">
            <span className="h-px flex-1 bg-white/10" />
            <span className="shrink-0">{n.text}</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="border-t border-white/5 pt-3">
        {error ? <p role="alert" className="mb-2 text-xs text-rose-300">{error}</p> : null}
        {canSend ? (
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={placeholder}
              aria-label="채팅 메시지"
              maxLength={2000}
              className="min-w-0 flex-1 rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none"
            />
            <button
              type="submit"
              disabled={!message.trim()}
              className={`whitespace-nowrap rounded px-3 text-sm font-medium disabled:opacity-50 ${sendColor}`}
            >
              전송
            </button>
          </form>
        ) : (
          <p className="text-center text-xs text-white/35">{disabledHint ?? "지금은 발화할 수 없습니다."}</p>
        )}
      </div>

      <PlayerInspectSheet
        open={!!inspectPlayer}
        onClose={() => setInspectId(null)}
        name={inspectPlayer?.displayName ?? ""}
        avatarUrl={inspectPlayer?.avatarUrl}
        initial={inspectId ? guesses[inspectId] : undefined}
        onSave={(g) => { if (inspectId) save(inspectId, g); }}
      />
    </div>
  );
}
