"use client";

import { useState } from "react";

// 후원(편의 stopgap): AQR(간편 입금요청) 링크가 있으면 우선 사용 — 계좌 노출 없이
// 카카오/네이버페이 등 다양한 페이. 없으면 모임통장 계좌를 표시/복사.
// PG·수수료·백엔드 0. 정식 결제(Toss Payments)는 lib/toss + /api/payments/confirm 에 휴면 보존.
const DONATION_URL = process.env.NEXT_PUBLIC_DONATION_URL; // 예: AQR 페이지 URL
const BANK = process.env.NEXT_PUBLIC_DONATION_BANK; // 예: 토스뱅크
const ACCOUNT = process.env.NEXT_PUBLIC_DONATION_ACCOUNT; // 예: 1002-4404-0062

export function DonateButton() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const hasAccount = Boolean(BANK && ACCOUNT);
  if (!DONATION_URL && !hasAccount) return null;

  async function copyAccount() {
    if (!ACCOUNT) return;
    try {
      await navigator.clipboard.writeText(ACCOUNT.replace(/\s/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard 불가 — 무시 */
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-30 select-none text-[11px] text-white/20 transition-colors hover:text-white/35"
      >
        ☕ 후원
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-30 w-[230px] rounded-xl border border-white/10 bg-black/75 px-4 py-3 text-[12px] text-white/80 shadow-lg backdrop-blur">
      <div className="mb-2 text-white/90">☕ Muel 후원</div>

      {DONATION_URL ? (
        <a
          href={DONATION_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-md bg-[#0064FF]/85 px-2 py-1.5 text-center text-white hover:bg-[#0064FF]"
        >
          후원하기 ↗
        </a>
      ) : null}

      {hasAccount ? (
        <div className={DONATION_URL ? "mt-2" : ""}>
          <div className="font-mono text-white/90">
            {BANK} {ACCOUNT}
          </div>
          <button
            type="button"
            onClick={copyAccount}
            className="mt-1 rounded-md bg-white/10 px-2 py-1 hover:bg-white/20"
          >
            {copied ? "복사됨 ✓" : "계좌 복사"}
          </button>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen(false)}
        className="mt-2 block text-[10px] text-white/35 hover:text-white/55"
      >
        닫기
      </button>
      <div className="mt-1 text-[10px] text-white/30">커뮤니티 운영에 쓰여요. 고마워요 🙏</div>
    </div>
  );
}
