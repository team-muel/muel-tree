"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WeaveEdge, WeaveNode } from "@/types";
import { appFetch, toErrorMessage } from "@/lib/app-fetch";
import { DonateButton } from "@/components/DonateButton";
import { ActivityLayout, type ActivitySession } from "@/components/ActivityLayout";
import { getActivity } from "@/config/activities";

const WEAVE_ACTIVITY = getActivity("weave")!;
const REFRESH_INTERVAL = 30_000;

function submitErrorMessage(status: number, fallback?: string): string {
  if (status === 401) return "Discord 안에서 다시 열어주세요.";
  if (status === 403) return "허용된 경로에서만 저장할 수 있어요.";
  if (status === 400) return fallback ?? "내용을 조금 더 적어주세요.";
  return "지금은 저장하지 못했어요. 잠시 후 다시 시도해주세요.";
}

const TAG_PALETTE = [
  "#f472b6", "#a78bfa", "#60a5fa", "#34d399",
  "#fbbf24", "#fb923c", "#f87171", "#38bdf8",
  "#818cf8", "#6ee7b7", "#c4b5fd", "#e879f9",
];

function tagColor(tag?: string): string {
  if (!tag) return "#818cf8";
  let hash = 0;
  for (const c of tag) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return TAG_PALETTE[hash % TAG_PALETTE.length];
}

function emotionRadius(emotions?: string[]): number {
  const count = Math.min(Math.max(emotions?.length ?? 1, 1), 4);
  return 0.7 + (count - 1) * 0.233;
}

const WeaveCanvas = dynamic(() => import("@/components/WeaveCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#070712]">
      <p className="text-gray-600 text-sm">불러오는 중...</p>
    </div>
  ),
});

function randomSpawn(radius = 8) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const r = radius * 0.4 + Math.random() * radius * 0.6;
  return {
    x: r * Math.sin(phi) * Math.cos(theta),
    y: r * Math.sin(phi) * Math.sin(theta),
    z: r * Math.cos(phi),
  };
}

type MyDream = { id: string; content: string; main_tag: string; emotions: string[]; keywords: string[]; created_at: string };
type ScopeFilter = "all" | "shared" | "mine";

function WeaveContent({ session }: { session: ActivitySession }) {
  const { discordUser, hasDiscordAuth, accessToken, activityContext } = session;

  const [nodes, setNodes] = useState<WeaveNode[]>([]);
  const [edges, setEdges] = useState<WeaveEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newNodeIds, setNewNodeIds] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<WeaveNode | null>(null);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const newNodeTimer = useRef<ReturnType<typeof setTimeout>>();
  const [myDreams, setMyDreams] = useState<MyDream[]>([]);
  const [showMyDreams, setShowMyDreams] = useState(false);
  const [myDreamsLoading, setMyDreamsLoading] = useState(false);
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");

  const fetchDreams = useCallback(() => {
    appFetch("/api/dreams", {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    })
      .then((r) => r.json())
      .then(({ nodes: n, edges: e, error: err }) => {
        if (err) {
          setError(err);
        } else {
          setNodes(n ?? []);
          setEdges(e ?? []);
          setError(null);
        }
      })
      .catch((e) => setError(toErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [accessToken]);

  useEffect(() => {
    fetchDreams();
    const timer = setInterval(fetchDreams, REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchDreams]);

  const fetchMyDreams = useCallback(async () => {
    if (!accessToken) return;
    setMyDreamsLoading(true);
    try {
      const res = await appFetch("/api/dreams/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (res.ok) setMyDreams(data.dreams ?? []);
    } catch {
      // silently fail
    } finally {
      setMyDreamsLoading(false);
    }
  }, [accessToken]);

  const toggleMyDreams = useCallback(() => {
    setShowMyDreams((prev) => {
      const next = !prev;
      if (next && myDreams.length === 0) fetchMyDreams();
      return next;
    });
  }, [myDreams.length, fetchMyDreams]);

  const submit = useCallback(async () => {
    const content = text.trim();
    if (!content || submitting) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await appFetch("/api/dreams/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          content,
          visibility: "anonymous",
          context: activityContext,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(submitErrorMessage(res.status, data.error));
        return;
      }

      const { dream, extracted } = data;
      const kw = extracted?.keywords ?? [];
      const tag = extracted?.main_tag ?? "";
      const nodeLabel = tag
        ? [tag, ...kw.slice(0, 2)].join(" · ")
        : kw.slice(0, 3).join(" · ") || "꿈";
      const newNode: WeaveNode = {
        id: dream.id,
        label: nodeLabel,
        ...randomSpawn(),
        vx: 0,
        vy: 0,
        vz: 0,
        color: tagColor(extracted?.main_tag),
        radius: emotionRadius(extracted?.emotions),
        emotion: extracted?.emotions?.[0],
        keywords: kw,
        sourceKind: "dream",
        sourceLabel: "꿈",
        visibility: "public",
      };

      setNodes((prev) => [...prev, newNode]);
      setNewNodeIds((prev) => new Set(prev).add(dream.id));
      setText("");
      if (showMyDreams) fetchMyDreams();

      clearTimeout(newNodeTimer.current);
      newNodeTimer.current = setTimeout(() => {
        setNewNodeIds((prev) => {
          const next = new Set(prev);
          next.delete(dream.id);
          return next;
        });
      }, 2500);
    } catch (e) {
      setSubmitError(
        toErrorMessage(e) || "지금은 저장하지 못했어요. 잠시 후 다시 시도해주세요."
      );
    } finally {
      setSubmitting(false);
    }
  }, [text, submitting, accessToken, activityContext, showMyDreams, fetchMyDreams]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    },
    [submit]
  );

  const sharedNodeCount = useMemo(
    () => nodes.filter((node) => node.visibility !== "private").length,
    [nodes]
  );
  const privateNodeCount = useMemo(
    () => nodes.filter((node) => node.visibility === "private").length,
    [nodes]
  );

  const visibleNodes = useMemo(() => {
    if (scopeFilter === "shared") {
      return nodes.filter((node) => node.visibility !== "private");
    }
    if (scopeFilter === "mine") {
      return nodes.filter((node) => node.visibility === "private");
    }
    return nodes;
  }, [nodes, scopeFilter]);

  const visibleNodeIds = useMemo(
    () => new Set(visibleNodes.map((node) => node.id)),
    [visibleNodes]
  );

  const visibleEdges = useMemo(
    () => edges.filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)),
    [edges, visibleNodeIds]
  );

  useEffect(() => {
    if (scopeFilter === "mine" && privateNodeCount === 0) {
      setScopeFilter("all");
    }
  }, [privateNodeCount, scopeFilter]);

  useEffect(() => {
    if (selectedNode && !visibleNodeIds.has(selectedNode.id)) {
      setSelectedNode(null);
    }
  }, [selectedNode, visibleNodeIds]);

  return (
    <>
      <WeaveCanvas
        nodes={visibleNodes}
        edges={visibleEdges}
        newNodeIds={newNodeIds}
        onNodeClick={setSelectedNode}
      />

      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
          <div className="text-4xl animate-pulse">🧵</div>
          <p className="text-white/30 text-sm mt-3">Weave를 불러오는 중...</p>
        </div>
      )}

      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-red-900/60 text-red-300 text-xs px-4 py-2 rounded-lg pointer-events-none max-w-xs text-center">
          {error}
        </div>
      )}

      {nodes.length > 0 && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-1 rounded-full border border-white/10 bg-black/40 p-1 backdrop-blur-sm">
          {([
            ["all", "전체", nodes.length],
            ["shared", "공개", sharedNodeCount],
            ["mine", "나만", privateNodeCount],
          ] as const).map(([value, label, count]) => {
            const disabled = value === "mine" && (!hasDiscordAuth || count === 0);
            return (
              <button
                key={value}
                type="button"
                disabled={disabled}
                onClick={() => setScopeFilter(value)}
                className={`min-w-12 rounded-full px-2.5 py-1 text-[11px] transition-colors ${
                  scopeFilter === value
                    ? "bg-white/12 text-white/80"
                    : "text-white/35 hover:bg-white/5 hover:text-white/60"
                } disabled:cursor-not-allowed disabled:opacity-30`}
              >
                {label} {count}
              </button>
            );
          })}
        </div>
      )}

      {selectedNode && (
        <div
          className="absolute top-16 left-4 md:top-20 md:left-6 z-20 max-w-[calc(100vw-2rem)] md:max-w-xs bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-3 md:p-4 cursor-pointer"
          onClick={() => setSelectedNode(null)}
        >
          <p className="text-white/80 text-sm leading-relaxed">
            {selectedNode.label}
          </p>
          {selectedNode.metaLabel && (
            <p className="text-white/35 text-[11px] mt-1">
              {selectedNode.metaLabel}
            </p>
          )}
          {selectedNode.emotion && (
            <p className="text-white/40 text-xs mt-1">
              {selectedNode.emotion}
            </p>
          )}
          {selectedNode.keywords && selectedNode.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedNode.keywords.map((k) => (
                <span
                  key={k}
                  className="text-white/30 text-[10px] border border-white/10 px-2 py-0.5 rounded-full"
                >
                  {k}
                </span>
              ))}
            </div>
          )}
          {selectedNode.href && (
            <a
              href={selectedNode.href}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="mt-3 inline-flex text-[11px] text-white/45 underline decoration-white/20 underline-offset-2 hover:text-white/70"
            >
              원문 열기
            </a>
          )}
          <p className="text-white/20 text-[10px] mt-3">눌러서 닫기</p>
        </div>
      )}

      {discordUser && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          {hasDiscordAuth && (
            <button
              onClick={toggleMyDreams}
              className={`bg-black/40 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1.5 text-xs transition-colors ${
                showMyDreams ? "text-indigo-300 border-indigo-500/30" : "text-white/40 hover:text-white/60"
              }`}
            >
              내 기록
            </button>
          )}
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1.5">
            {discordUser.avatar && (
              <Image
                src={`https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png?size=32`}
                alt=""
                width={20}
                height={20}
                className="rounded-full"
              />
            )}
            <span className="text-white/60 text-xs">{discordUser.username}</span>
          </div>
        </div>
      )}

      {showMyDreams && (
        <div className="absolute top-14 right-4 z-20 w-80 max-h-[60vh] bg-black/70 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <span className="text-white/70 text-xs font-medium">내 꿈 기록 ({myDreams.length})</span>
            <button onClick={() => setShowMyDreams(false)} className="text-white/30 text-xs hover:text-white/60">닫기</button>
          </div>
          <div className="overflow-y-auto flex-1">
            {myDreamsLoading ? (
              <p className="text-white/30 text-xs text-center py-8">불러오는 중...</p>
            ) : myDreams.length === 0 ? (
              <p className="text-white/30 text-xs text-center py-8">아직 기록된 꿈이 없어요</p>
            ) : (
              myDreams.map((d) => (
                <div key={d.id} className="px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.03] transition">
                  <div className="flex items-center gap-2 mb-1.5">
                    {d.main_tag && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {d.main_tag}
                      </span>
                    )}
                    <span className="text-white/20 text-[10px]">
                      {new Date(d.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <p className="text-white/70 text-xs leading-relaxed line-clamp-3">{d.content}</p>
                  {d.emotions && d.emotions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {d.emotions.slice(0, 3).map((em) => (
                        <span key={em} className="text-white/25 text-[10px] border border-white/[0.06] px-1.5 py-0.5 rounded-full">
                          {em}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="absolute bottom-36 left-1/2 -translate-x-1/2 text-center pointer-events-none select-none">
        <p className="text-white/20 text-xs">
          {visibleNodes.length > 0 ? `${visibleNodes.length}개의 노드가 연결됨` : ""}
        </p>
        <p className="text-white/10 text-[10px] mt-1 md:hidden">
          터치로 회전 · 핀치로 줌
        </p>
      </div>

      <DonateButton />

      <div className="absolute bottom-4 inset-x-3 z-20 md:bottom-8 md:left-1/2 md:right-auto md:w-full md:max-w-lg md:-translate-x-1/2 md:px-4">
        <div className="bg-black/50 backdrop-blur-md border border-white/[0.08] rounded-xl md:rounded-2xl p-3 md:p-4 shadow-xl">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder="꿈을 적어보세요..."
            rows={2}
            disabled={submitting}
            className="w-full bg-transparent text-white/90 text-sm placeholder:text-white/20 resize-none outline-none leading-relaxed min-h-[2.5rem] max-h-40 overflow-y-auto"
          />
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-h-[1rem] w-full text-xs text-red-400/80 sm:flex-1">
              {submitError ?? ""}
            </p>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-3">
              <span className="text-white/15 text-xs">
                {submitting ? "" : hasDiscordAuth ? "Enter로 저장" : "Discord 전용"}
              </span>
              <button
                onClick={submit}
                disabled={!text.trim() || submitting || !hasDiscordAuth}
                className="w-full rounded-lg bg-indigo-500/70 px-4 py-1.5 text-xs text-white transition-colors hover:bg-indigo-400/70 disabled:cursor-not-allowed disabled:opacity-30 sm:w-auto"
              >
                {submitting ? "분석 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function WeavePage() {
  return (
    <ActivityLayout activity={WEAVE_ACTIVITY}>
      {(session) => <WeaveContent session={session} />}
    </ActivityLayout>
  );
}
