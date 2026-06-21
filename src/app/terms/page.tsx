import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "이용약관 · Gomdori",
  description: "Gomdori 마피아 Discord 액티비티 이용약관",
};

const UPDATED = "2026년 6월 22일";
const CONTACT = "fancy2794@gmail.com";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20 text-ink">
      <p className="text-xs font-semibold uppercase tracking-widest text-ink/45">
        Gomdori 마피아
      </p>
      <h1 className="mt-3 text-4xl font-bold">이용약관</h1>
      <p className="mt-2 text-sm text-ink/50">시행일: {UPDATED}</p>

      <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-ink/80">
        <section>
          <h2 className="text-xl font-bold text-ink">1. 서비스 개요</h2>
          <p className="mt-3">
            Gomdori(이하 &quot;서비스&quot;)는 Discord 음성 채널에서 여러 명이 함께 즐기는 마피아
            추리 게임 액티비티입니다. 천사·악마·중립 진영의 비대칭 추리를 핵심으로 합니다.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink">2. 약관 동의</h2>
          <p className="mt-3">
            서비스를 실행·이용함으로써 본 약관과{" "}
            <Link href="/privacy" className="underline">
              개인정보 처리방침
            </Link>
            에 동의하는 것으로 간주합니다. 동의하지 않는 경우 서비스를 이용하지 마세요.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink">3. 이용자의 책임</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>다른 플레이어를 괴롭히거나 혐오·차별 발언을 하지 않습니다.</li>
            <li>버그 악용, 부정 행위(치팅), 자동화 도구 사용을 하지 않습니다.</li>
            <li>서비스 운영을 방해하거나 무단으로 접근을 시도하지 않습니다.</li>
            <li>Discord 서비스 약관 및 커뮤니티 가이드라인을 준수합니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink">4. 면책 및 보증의 부인</h2>
          <p className="mt-3">
            서비스는 &quot;있는 그대로(as is)&quot; 제공되며, 특정 목적 적합성·무중단·무오류에
            대한 어떠한 보증도 하지 않습니다. 서비스는 개발·운영 과정에서 예고 없이 변경되거나
            중단될 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink">5. 책임의 제한</h2>
          <p className="mt-3">
            관련 법령이 허용하는 범위 내에서, 운영자는 서비스 이용으로 발생한 간접적·부수적·
            결과적 손해에 대해 책임을 지지 않습니다.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink">6. 약관 변경</h2>
          <p className="mt-3">
            본 약관은 변경될 수 있으며, 변경 시 본 페이지의 시행일이 갱신됩니다. 변경 이후 계속
            이용하면 변경된 약관에 동의한 것으로 간주합니다.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink">7. 준거법 및 연락처</h2>
          <p className="mt-3">
            본 약관은 대한민국 법률에 따라 해석됩니다. 문의:{" "}
            <a className="underline" href={`mailto:${CONTACT}`}>
              {CONTACT}
            </a>
            .
          </p>
        </section>
      </div>

      <div className="mt-12 border-t border-ink/10 pt-6 text-sm">
        <Link href="/privacy" className="text-ink/60 underline hover:text-ink">
          개인정보 처리방침 보기
        </Link>
      </div>
    </main>
  );
}
