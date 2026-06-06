"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WeaveEdge, WeaveNode } from "@/types";
import { appFetch, toErrorMessage } from "@/lib/app-fetch";
import { DonateButton } from "@/components/DonateButton";
import { ActivityLayout, type ActivitySession } from "@/components/ActivityLayout";
import { getActivity } from "@/config/activities";
import { emotionRadius, tagColor } from "@/config/weave-tokens";

const WEAVE_ACTIVITY = getActivity("weave")!;
const REFRESH_INTERVAL = 30_000;

function submitErrorMessage(status: number, fallback?: string): string {
  if (status === 401) return "Discord 안에서 다시 열어주세요.";
  if (status === 403) return "허용된 경로에서만 저장할 수 있어요.";
  if (status === 400) return fallback ?? "내용을 조금 더 적어주세요.";
  return "지금은 저장하지 못했어요. 잠시 후 다시 시도해주세요.";
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
  const [submitOk, setSubmitOk] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const newNodeTimer = useRef<ReturnType<typeof setTimeout>>();
  const pendingIds = useRef<Set<string>>(new Set());
  const [myDreams, setMyDreams] = useState<MyDream[]>([]);
  const [showMyDreams, setShowMyDreams] = useState(false);
  const [myDreamsLoading, setMyDreamsLoading] = useState(false);
  const [myDreamsError, setMyDreamsError] = useState<string | null>(null);
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
  const [exporting, setExporting] = useState(false);
  const [viewMode, setViewMode] = useState<"graph" | "list">("graph");

  const fetchDreams = useCallback(() => {
    appFetch("/api/dreams", {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    })
      .then((r) => r.json())
      .then(({ nodes: n, edges: e, error: err }) => {
        if (err) {
          setError(err);
        } else {
          setNodes((prev) => {
            const prevById = new Map(prev.map((node) => [node.id, node]));
            return ((n ?? []) as WeaveNode[]).map((srv) => {
              const old = prevById.get(srv.id);
              if (!old) return srv;
              if (pendingIds.current.has(srv.id)) {
                pendingIds.current.delete(srv.id);
                return srv;
              }
              return { ...srv, x: old.x, y: old.y, z: old.z, vx: 0, vy: 0, vz: 0 };
            });
          });
          setEdges(e ?? []);
          setError(null);
        }
      })
      .catch((e) => setError(toErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [accessToken]);

  useEffect(() => {
    fetchDreams();
    const timer = setInterval(() => {
      if (typeof document === "undefined" || document.visibilityState === "visible") {
        fetchDreams();
      }
    }, REFRESH_INTERVAL);
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchDreams();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchDreams]);

  const fetchMyDreams = useCallback(async () => {
    if (!accessToken) return;
    setMyDreamsLoading(true);
    setMyDreamsError(null);
    try {
      const res = await appFetch("/api/dreams/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (res.ok) setMyDreams(data.dreams ?? []);
      else setMyDreamsError("내 기록을 불러오지 못했어요.");
    } catch {
      setMyDreamsError("내 기록을 불러오지 못했어요.");
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

  const focusDream = useCallback(
    (id: string) => {
      const node = nodes.find((n) => n.id === id);
      if (node) {
        setSelectedNode(node);
        setShowMyDreams(false);
      }
    },
    [nodes]
  );

  const submit = useCallback(async () => {
    const content = text.trim();
    if (!content || submitting) return;

    setSubmitting(true);
    setSubmitError(null);
    setSubmitOk(false);

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
        mine: true,
      };

      setNodes((prev) => [...prev, newNode]);
      setNewNodeIds((prev) => new Set(prev).add(dream.id));
      pendingIds.current.add(dream.id);
      setText("");
      setSubmitOk(true);
      if (showMyDreams) fetchMyDreams();
      fetchDreams();

      clearTimeout(newNodeTimer.current);
      newNodeTimer.current = setTimeout(() => {
        setNewNodeIds((prev) => {
          const next = new Set(prev);
          next.delete(dream.id);
          return next;
        });
        setSubmitOk(false);
      }, 2500);
    } catch (e) {
      setSubmitError(
        toErrorMessage(e) || "지금은 저장하지 못했어요. 잠시 후 다시 시도해주세요."
      );
    } finally {
      setSubmitting(false);
    }
  }, [text, submitting, accessToken, activityContext, showMyDreams, fetchMyDreams, fetchDreams]);

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
  const myNodeCount = useMemo(
    () => nodes.filter((node) => node.mine).length,
    [nodes]
  );

  const visibleNodes = useMemo(() => {
    if (scopeFilter === "shared") {
      return nodes.filter((node) => node.visibility !== "private");
    }
    if (scopeFilter === "mine") {
      return nodes.filter((node) => node.mine);
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

  // ADR-002 / dreamweave 차용: 본인 지식 그래프를 PNG/PDF 로 내보내기 ("내 나무 가져가기").
  // R3F WebGL 캔버스를 toDataURL 로 캡처(Canvas gl.preserveDrawingBuffer=true 필요) →
  // 2D 캔버스에 한글 헤더와 합성 → PNG 다운로드 또는 jsPDF 임베드. jsPDF 텍스트 레이어를
  // 쓰지 않으므로 한글 폰트 문제를 피한다. 현재 보이는 그래프(필터 반영)를 그대로 캡처.
  const exportTree = useCallback(
    async (format: "png" | "pdf") => {
      if (exporting) return;
      const source = document.querySelector("canvas") as HTMLCanvasElement | null;
      if (!source) return;
      setExporting(true);
      try {
        const snapshot = source.toDataURL("image/png");
        const img = document.createElement("img");
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("snapshot load failed"));
          img.src = snapshot;
        });

        const headerH = 78;
        const out = document.createElement("canvas");
        out.width = img.width || 1280;
        out.height = (img.height || 720) + headerH;
        const ctx = out.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = "#070712";
        ctx.fillRect(0, 0, out.width, out.height);
        ctx.drawImage(img, 0, headerH);

        const title = scopeFilter === "mine" ? "내 지식의 나무" : "Muel Weave";
        const dateStr = new Date().toLocaleDateString("ko-KR");
        ctx.fillStyle = "#ffffff";
        ctx.font = "600 30px sans-serif";
        ctx.fillText(title, 28, 46);
        ctx.fillStyle = "#9ca3af";
        ctx.font = "16px sans-serif";
        ctx.fillText(`${visibleNodes.length}개 노드 · ${dateStr} · Muel`, 28, 67);

        const composite = out.toDataURL("image/png");
        const stamp = new Date().toISOString().slice(0, 10);

        if (format === "png") {
          const a = document.createElement("a");
          a.href = composite;
          a.download = `weave-${stamp}.png`;
          a.click();
        } else {
          const { jsPDF } = await import("jspdf");
          const pdf = new jsPDF({
            orientation: out.width >= out.height ? "landscape" : "portrait",
            unit: "px",
            format: [out.width, out.height],
          });
          pdf.addImage(composite, "PNG", 0, 0, out.width, out.height);
          pdf.save(`weave-${stamp}.pdf`);
        }
      } catch {
        // best-effort export; 실패해도 조용히 통과
      } finally {
        setExporting(false);
      }
    },
    [exporting, scopeFilter, visibleNodes.length]
  );

  useEffect(() => {
    return () => clearTimeout(newNodeTimer.current);
  }, []);

  useEffect(() => {
    if (scopeFilter === "mine" && myNodeCount === 0) {
      setScopeFilter("all");
    }
  }, [myNodeCount, scopeFilter]);

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

      {viewMode === "list" && (
        <div className="absolute inset-0 z-10 overflow-y-auto bg-[#070712]/95 backdrop-blur-sm">
          <div className="mx-auto max-w-2xl px-4 pt-20 pb-44">
            {visibleNodes.length === 0 ? (
              <p className="mt-24 text-center text-sm text-white/30">표시할 노드가 없어요.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {visibleNodes.map((node) => (
                  <div
                    key={node.id}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 transition-colors hover:bg-white/[0.06]"
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: node.color ?? "#818cf8" }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-relaxed text-white/85">{node.label}</p>
                        {node.metaLabel && (
                          <p className="mt-0.5 text-[11px] text-white/35">{node.metaLabel}</p>
                        )}
                        {node.keywords && node.keywords.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {node.keywords.map((k) => (
                              <span
                                key={k}
                                className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/30"
                              >
                                {k}
                              </span>
                            ))}
                          </div>
                        )}
                        {node.href && (
                          <a
                            href={node.href}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex text-[11px] text-white/45 underline decoration-white/20 underline-offset-2 hover:text-white/70"
                          >
                            원문 열기
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
          <div className="text-4xl animate-pulse" role="img" aria-label="불러오는 중">🧵</div>
          <p className="text-white/30 text-sm mt-3">Weave를 불러오는 중...</p>
        </div>
      )}

      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-red-900/60 text-red-300 text-xs px-4 py-2 rounded-lg pointer-events-none max-w-xs text-center">
          {error}
        </div>
      )}

      {nodes.length > 0 && (
        <div role="group" aria-label="범위 필터" className="absolute top-4 left-4 z-20 flex items-center gap-1 rounded-full border border-white/10 bg-black/40 p-1 backdrop-blur-sm">
          {([
            ["all", "전체", nodes.length],
            ["shared", "공개", sharedNodeCount],
            ["mine", "내 기록", myNodeCount],
          ] as const).map(([value, label, count]) => {
            const disabled = value === "mine" && (!hasDiscordAuth || count === 0);
            return (
              <button
                key={value}
                type="button"
                disabled={disabled}
                aria-pressed={scopeFilter === value}
                aria-label={`${label} ${count}`}
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

      {nodes.length > 0 && (
        <div className="absolute top-4 left-1/2 z-20 -translate-x-1/2 flex items-center gap-1 rounded-full border border-white/10 bg-black/40 p-1 backdrop-blur-sm">
          {([["graph", "그래프"], ["list", "목록"]] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setViewMode(value)}
              className={`min-w-12 rounded-full px-3 py-1 text-[11px] transition-colors ${
                viewMode === value
                  ? "bg-white/12 text-white/80"
                  : "text-white/35 hover:bg-white/5 hover:text-white/60"
              }`}
            >
              {label}
            </button>
          ))}
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
              aria-label="내 꿈 기록" aria-expanded={showMyDreams} onClick={toggleMyDreams}
              className={`bg-black/40 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1.5 text-xs transition-colors ${
                showMyDreams ? "text-indigo-300 border-indigo-500/30" : "text-white/40 hover:text-white/60"
              }`}
            >
              내 기록
            </button>
          )}
          {hasDiscordAuth && nodes.length > 0 && (
            <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/40 p-1 backdrop-blur-sm">
              <span className="px-1 text-[10px] text-white/30">내보내기</span>
              <button
                type="button"
                onClick={() => exportTree("png")}
                disabled={exporting}
                className="rounded-full px-2 py-0.5 text-[11px] text-white/45 transition-colors hover:bg-white/10 hover:text-white/70 disabled:cursor-not-allowed disabled:opacity-30"
              >
                {exporting ? "..." : "PNG"}
              </button>
              <button
                type="button"
                onClick={() => exportTree("pdf")}
                disabled={exporting}
                className="rounded-full px-2 py-0.5 text-[11px] text-white/45 transition-colors hover:bg-white/10 hover:text-white/70 disabled:cursor-not-allowed disabled:opacity-30"
              >
                {exporting ? "..." : "PDF"}
              </button>
            </div>
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
            ) : myDreamsError ? (
              <p role="alert" className="text-red-300/80 text-xs text-center py-8">{myDreamsError}</p>
            ) : myDreams.length === 0 ? (
              <p className="text-white/30 text-xs text-center py-8">아직 기록된 꿈이 없어요</p>
            ) : (
              myDreams.map((d) => (
                <div
                  key={d.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => focusDream(d.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      focusDream(d.id);
                    }
                  }}
                  className="cursor-pointer px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.03] transition focus:bg-white/[0.05] focus:outline-none"
                >
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
          {visibleNodes.length > 0
            ? `${visibleNodes.length}개의 노드가 연결됨`
            : nodes.length === 0
              ? "아직 기록이 없어요. 아래에 꿈을 적어보세요."
              : "이 필터에 표시할 노드가 없어요."}
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
              {submitError ? <span className="text-red-400/80">{submitError}</span> : submitOk ? <span className="text-emerald-300/80">저장됨</span> : ""}
            </p>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-3">
              <span className="text-white/15 text-xs">
                {submitting ? "" : hasDiscordAuth ? "Enter로 저장" : "Discord 전용"}
              </span>
              <button
                onClick={submit}
                aria-label="꿈 저장"
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
