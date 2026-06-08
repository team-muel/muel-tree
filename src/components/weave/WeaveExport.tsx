"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { appFetch } from "@/lib/app-fetch";
import type { ActivitySession } from "@/components/ActivityLayout";

type Memory = { id: string; kind: string; content: string; created_at: string };
type Memo = { id: string; content: string; created_at: string };
type Paper = { id: string; author_id: string; content: string; created_at: string };

const KIND: Record<string, { label: string; accent: string }> = {
  fact: { label: "사실", accent: "#7fa8df" },
  preference: { label: "선호", accent: "#d9b46a" },
  decision: { label: "결정", accent: "#d97170" },
  project: { label: "프로젝트", accent: "#b388e0" },
  dream: { label: "꿈", accent: "#3fae86" },
};
const kindOf = (k: string) => KIND[k] ?? { label: k, accent: "#8b87a0" };

function fmtDate(s: string | null): string {
  if (!s) return "";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

// 인쇄영역: html2canvas(jspdf.html)가 oklch(Tailwind v4)에서 깨지므로 인라인 hex 만 사용.
function Card({ accent, label, content, date }: { accent: string; label: string; content: string; date: string }) {
  return (
    <div style={{ borderLeft: `4px solid ${accent}`, background: "#ffffff", border: "1px solid #e7e7ee", borderLeftWidth: 4, borderLeftColor: accent, borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: accent }}>{label}</span>
        <span style={{ fontSize: 10, color: "#9a9aa6" }}>{date}</span>
      </div>
      <div style={{ fontSize: 13, color: "#1c1c24", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{content}</div>
    </div>
  );
}

export function WeaveExport({ session }: { session: ActivitySession }) {
  const { accessToken, hasDiscordAuth, discordUser } = session;
  const [memories, setMemories] = useState<Memory[]>([]);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const authHeader = useMemo(
    () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined),
    [accessToken],
  );

  useEffect(() => {
    if (!hasDiscordAuth || !accessToken) {
      setLoading(false);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const [meRes, memoRes, rpRes] = await Promise.all([
          appFetch("/api/weave/me", { headers: authHeader }),
          appFetch("/api/weave/memo", { headers: authHeader }),
          appFetch("/api/rolling/me", { headers: authHeader }),
        ]);
        const me = meRes.ok ? await meRes.json() : {};
        const memo = memoRes.ok ? await memoRes.json() : {};
        const rp = rpRes.ok ? await rpRes.json() : {};
        if (!alive) return;
        setMemories(Array.isArray(me.memories) ? me.memories : []);
        setMemos(Array.isArray(memo.memos) ? memo.memos : []);
        setPapers(Array.isArray(rp.papers) ? rp.papers : []);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [authHeader, hasDiscordAuth, accessToken]);

  const downloadPdf = useCallback(async () => {
    const el = document.getElementById("weave-export-root");
    if (!el) return;
    setExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      await doc.html(el, {
        callback: (d) => d.save(`muel-weave-${new Date().toISOString().slice(0, 10)}.pdf`),
        x: 20,
        y: 20,
        width: 555,
        windowWidth: 760,
        autoPaging: "text",
      });
    } catch (e) {
      setError("PDF 생성 실패: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setExporting(false);
    }
  }, []);

  if (!hasDiscordAuth || !accessToken) {
    return <div style={{ padding: 24, color: "#9a9aa6" }}>로그인이 필요해요. Discord에서 열어줘.</div>;
  }
  if (loading) return <div style={{ padding: 24, color: "#9a9aa6" }}>불러오는 중…</div>;

  const empty = memories.length === 0 && memos.length === 0 && papers.length === 0;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h1 style={{ fontSize: 16, color: "#e8e8f0", margin: 0 }}>📄 내 Muel 기록 내보내기</h1>
        <button
          type="button"
          onClick={downloadPdf}
          disabled={exporting || empty}
          style={{ fontSize: 13, fontWeight: 600, color: "#fff", background: "#6b6bff", border: "none", borderRadius: 8, padding: "8px 14px", cursor: exporting || empty ? "default" : "pointer", opacity: exporting || empty ? 0.5 : 1 }}
        >
          {exporting ? "PDF 만드는 중…" : "PDF로 저장"}
        </button>
      </div>
      {error ? <div style={{ color: "#d97170", fontSize: 12, marginBottom: 10 }}>{error}</div> : null}

      {/* 인쇄영역 — 흰 배경 + 인라인 hex (html2canvas 안전) */}
      <div id="weave-export-root" style={{ width: 760, background: "#ffffff", color: "#1c1c24", padding: 28, boxSizing: "border-box" }}>
        <div style={{ borderBottom: "2px solid #6b6bff", paddingBottom: 10, marginBottom: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 800 }}>Muel이 보는 나</div>
          <div style={{ fontSize: 12, color: "#9a9aa6", marginTop: 2 }}>
            {discordUser?.username ?? "나"} · {new Date().toISOString().slice(0, 10)}
          </div>
        </div>

        {empty ? <div style={{ color: "#9a9aa6", fontSize: 13 }}>아직 기록이 없어요.</div> : null}

        {memories.length > 0 ? (
          <section style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: 14, color: "#3a3a48", margin: "0 0 8px" }}>🧠 Muel의 기억 ({memories.length})</h2>
            {memories.map((m) => {
              const k = kindOf(m.kind);
              return <Card key={m.id} accent={k.accent} label={k.label} content={m.content} date={fmtDate(m.created_at)} />;
            })}
          </section>
        ) : null}

        {papers.length > 0 ? (
          <section style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: 14, color: "#3a3a48", margin: "0 0 8px" }}>💌 받은 롤링페이퍼 ({papers.length})</h2>
            {papers.map((p) => <Card key={p.id} accent="#9b87f5" label="롤링페이퍼" content={p.content} date={fmtDate(p.created_at)} />)}
          </section>
        ) : null}

        {memos.length > 0 ? (
          <section>
            <h2 style={{ fontSize: 14, color: "#3a3a48", margin: "0 0 8px" }}>📝 내 메모 ({memos.length})</h2>
            {memos.map((m) => <Card key={m.id} accent="#5fa8a0" label="메모" content={m.content} date={fmtDate(m.created_at)} />)}
          </section>
        ) : null}
      </div>
    </div>
  );
}
