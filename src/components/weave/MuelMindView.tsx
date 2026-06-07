"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { appFetch } from "@/lib/app-fetch";
import type { ActivitySession } from "@/components/ActivityLayout";

type Memory = {
  id: string;
  kind: string;
  content: string;
  importance: number | null;
  confidence: number | null;
  status: string;
  created_at: string;
  source_channel?: string | null;
};
type Stats = { messageCount: number; memoryCount: number; lastSeen: string | null; avgConfidence: number | null };
type Dream = { id: string; content: string; main_tag: string | null; created_at: string };
type ServerUser = { userId: string; username: string | null; messages: number; lastSeen: string | null };
type ServerData = { users: ServerUser[]; totals: { memories?: number; profiles?: number; messages?: number; contributions?: number } };

const KIND: Record<string, { label: string; accent: string; bar: string }> = {
  fact: { label: "사실", accent: "#7fa8df", bar: "#7fa8df" },
  preference: { label: "선호", accent: "#d9b46a", bar: "#d9b46a" },
  decision: { label: "결정", accent: "#d97170", bar: "#d97170" },
  project: { label: "프로젝트", accent: "#b388e0", bar: "#b388e0" },
  dream: { label: "꿈", accent: "#6ee7b7", bar: "#6ee7b7" },
};
const kindOf = (k: string) => KIND[k] ?? { label: k, accent: "#8b87a0", bar: "#8b87a0" };

function fmtDate(s: string | null): string {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return "오늘";
  if (days === 1) return "어제";
  if (days < 30) return `${days}일 전`;
  return `${Math.floor(days / 30)}달 전`;
}

export function MuelMindView({ session }: { session: ActivitySession }) {
  const { accessToken, hasDiscordAuth, discordUser } = session;
  const [tab, setTab] = useState<"me" | "server">("me");
  const [memories, setMemories] = useState<Memory[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [server, setServer] = useState<ServerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memo, setMemo] = useState("");
  const [memoState, setMemoState] = useState<"idle" | "sending" | "done">("idle");
  const [pending, setPending] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const authHeader = useMemo(
    () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined),
    [accessToken],
  );

  const loadMe = useCallback(async () => {
    if (!authHeader) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [meRes, dreamRes] = await Promise.all([
        appFetch("/api/weave/me", { headers: authHeader }),
        appFetch("/api/dreams/me", { headers: authHeader }).catch(() => null),
      ]);
      const me = await meRes.json();
      if (!meRes.ok) throw new Error(me?.error ?? "불러오기 실패");
      const dreams: Dream[] = dreamRes && dreamRes.ok ? (await dreamRes.json()).dreams ?? [] : [];
      const dreamMems: Memory[] = dreams.map((d) => ({
        id: `dream:${d.id}`,
        kind: "dream",
        content: d.content,
        importance: null,
        confidence: null,
        status: "active",
        created_at: d.created_at,
      }));
      setMemories([...(me.memories ?? []), ...dreamMems]);
      setStats(me.stats ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  }, [authHeader]);

  const loadServer = useCallback(async () => {
    if (!authHeader || server) return;
    setServerError(null);
    try {
      const res = await appFetch("/api/weave/server", { headers: authHeader });
      const data = await res.json();
      if (res.ok) setServer(data);
      else setServerError(data?.error ?? "서버 정보를 불러오지 못했어.");
    } catch {
      setServerError("서버 정보를 불러오지 못했어.");
    }
  }, [authHeader, server]);

  useEffect(() => {
    loadMe();
  }, [loadMe]);
  useEffect(() => {
    if (tab === "server") loadServer();
  }, [tab, loadServer]);

  const sendFeedback = useCallback(
    async (id: string, verdict: "correct" | "wrong") => {
      if (!authHeader || id.startsWith("dream:")) return;
      setPending(id);
      try {
        const res = await appFetch("/api/weave/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify({ memoryId: id, verdict }),
        });
        if (res.ok) {
          const { status, confidence } = await res.json();
          setMemories((prev) => prev.map((m) => (m.id === id ? { ...m, status, confidence } : m)));
        }
      } finally {
        setPending(null);
      }
    },
    [authHeader],
  );

  const sendMemo = useCallback(async () => {
    const content = memo.trim();
    if (!authHeader || content.length < 2 || memoState === "sending") return;
    setMemoState("sending");
    try {
      const res = await appFetch("/api/weave/memo", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        setMemo("");
        setMemoState("done");
        setTimeout(() => setMemoState("idle"), 1800);
      } else {
        setMemoState("idle");
      }
    } catch {
      setMemoState("idle");
    }
  }, [memo, authHeader, memoState]);

  if (!hasDiscordAuth || !accessToken) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#0e0c16] p-6 text-center">
        <p className="text-sm text-white/50">Discord 안에서 Weave를 열어주세요.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#0e0c16] text-[#e7e5ee]">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setTab("me")}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${tab === "me" ? "bg-[#1c1830] text-[#cdc8e6]" : "text-white/40 hover:text-white/70"}`}
          >
            나
          </button>
          <button
            type="button"
            onClick={() => setTab("server")}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${tab === "server" ? "bg-[#1c1830] text-[#cdc8e6]" : "text-white/40 hover:text-white/70"}`}
          >
            서버
          </button>
        </div>

        {tab === "me" ? (
          <>
            <div className="mb-1 text-xs uppercase tracking-[0.18em] text-white/35">Muel이 보는 나</div>
            <h1 className="text-xl font-semibold">{discordUser?.username ?? "나"}</h1>
            {stats ? (
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/45">
                <span>대화 {stats.messageCount}회</span><span>·</span>
                <span>최근 {fmtDate(stats.lastSeen)}</span><span>·</span>
                <span>기억 {memories.length}개</span>
                {stats.avgConfidence != null ? (<><span>·</span><span>평균 신뢰도 {Math.round(stats.avgConfidence * 100)}%</span></>) : null}
              </div>
            ) : null}

            {loading ? (
              <p className="mt-8 text-sm text-white/40">Muel의 기억을 불러오는 중…</p>
            ) : error ? (
              <p className="mt-8 text-sm text-rose-300">{error}</p>
            ) : memories.length === 0 ? (
              <p className="mt-8 text-sm text-white/40">아직 Muel이 당신에 대해 기억하는 게 없어요. 아래에 알려주세요.</p>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {memories.map((m) => {
                  const k = kindOf(m.kind);
                  const conf = m.confidence == null ? null : Math.round(m.confidence * 100);
                  const faded = m.status === "disputed" || (conf != null && conf < 40);
                  const isDream = m.id.startsWith("dream:");
                  return (
                    <div
                      key={m.id}
                      style={{ borderLeftColor: k.accent }}
                      className={`rounded-lg border border-white/8 border-l-2 bg-[#15131e] p-3 ${faded ? "opacity-60" : ""}`}
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span style={{ color: k.accent }} className="text-[10px] tracking-wide">
                          {k.label}{m.status === "confirmed" ? " · 확인됨" : m.status === "disputed" ? " · 정정함" : ""}
                        </span>
                        <span className="text-[10px] text-white/35">{fmtDate(m.created_at)}</span>
                      </div>
                      <div className={`text-[13px] leading-relaxed ${faded ? "text-white/55 line-through decoration-white/20" : ""}`}>{m.content}</div>
                      {conf != null ? (
                        <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-[#26233a]">
                          <div style={{ width: `${conf}%`, background: k.bar }} className="h-full" />
                        </div>
                      ) : null}
                      {!isDream ? (
                        <div className="mt-2 flex gap-1.5">
                          <button
                            type="button"
                            disabled={pending === m.id}
                            onClick={() => sendFeedback(m.id, "correct")}
                            className="rounded-md border border-emerald-400/30 px-2 py-0.5 text-[11px] text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-40"
                          >
                            맞음
                          </button>
                          <button
                            type="button"
                            disabled={pending === m.id}
                            onClick={() => sendFeedback(m.id, "wrong")}
                            className="rounded-md border border-rose-400/30 px-2 py-0.5 text-[11px] text-rose-300 hover:bg-rose-500/10 disabled:opacity-40"
                          >
                            틀림
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-5 rounded-lg border border-dashed border-white/14 bg-[#13111c] p-3">
              <div className="mb-2 text-xs text-white/45">Muel이 알아야 할 것을 알려주기</div>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={2}
                maxLength={1000}
                placeholder="예: 나는 보통 새벽에 작업해. / 명일방주 얘기를 좋아해."
                className="w-full resize-none rounded-md border border-white/10 bg-black/30 p-2 text-[13px] text-white/85 placeholder:text-white/25 focus:border-white/25 focus:outline-none"
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={sendMemo}
                  disabled={memo.trim().length < 2 || memoState === "sending"}
                  className="rounded-md bg-[#5b4fb0] px-3 py-1.5 text-[13px] text-white disabled:opacity-40"
                >
                  {memoState === "sending" ? "보내는 중…" : memoState === "done" ? "전했어요 ✓" : "알려주기"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="mb-1 text-xs uppercase tracking-[0.18em] text-white/35">서버에서의 Muel</div>
            <h1 className="text-xl font-semibold">우리</h1>
            {server ? (
              <>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    ["기억", server.totals.memories],
                    ["사람", server.totals.profiles],
                    ["대화", server.totals.messages],
                    ["기여", server.totals.contributions],
                  ].map(([label, val]) => (
                    <div key={label as string} className="rounded-lg bg-[#15131e] p-3">
                      <div className="text-[11px] text-white/40">{label}</div>
                      <div className="mt-0.5 text-lg font-medium">{(val as number) ?? 0}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-xs uppercase tracking-widest text-white/35">Muel이 아는 사람들</div>
                <div className="mt-2 flex flex-col gap-1.5">
                  {server.users.map((u) => (
                    <div key={u.userId} className="flex items-center justify-between rounded-md border border-white/8 bg-[#15131e] px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2a2540] text-xs text-[#cbb6f0]">
                          {(u.username ?? "?").slice(0, 1)}
                        </span>
                        <span className="text-sm text-white/80">{u.username ?? "알 수 없음"}</span>
                      </div>
                      <span className="text-xs text-white/40">대화 {u.messages} · {fmtDate(u.lastSeen)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-8 text-sm text-white/40">{serverError ?? "불러오는 중…"}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
