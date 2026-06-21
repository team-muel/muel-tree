import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "개인정보 처리방침 · Gomdori",
  description: "Gomdori 마피아 Discord 액티비티 개인정보 처리방침",
};

const UPDATED = "2026년 6월 22일";
const CONTACT = "fancy2794@gmail.com";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20 text-ink">
      <p className="text-xs font-semibold uppercase tracking-widest text-ink/45">
        Gomdori 마피아
      </p>
      <h1 className="mt-3 text-4xl font-bold">개인정보 처리방침</h1>
      <p className="mt-2 text-sm text-ink/50">시행일: {UPDATED}</p>

      <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-ink/80">
        <section>
          <p>
            Gomdori(이하 &quot;서비스&quot;)는 Discord 음성 채널에서 즐기는 마피아 추리 게임
            액티비티입니다. 본 방침은 서비스가 어떤 정보를 수집하고 어떻게 이용·보관하는지를
            설명합니다. 서비스를 실행하면 본 방침에 동의하는 것으로 간주합니다.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink">1. 수집하는 정보</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>
              <strong>Discord 계정 정보</strong> — Discord OAuth2 <code>identify</code> 범위로
              제공되는 사용자 ID, 사용자명/표시 이름, 아바타 이미지.
            </li>
            <li>
              <strong>게임 플레이 데이터</strong> — 매치 참가 기록, 역할·행동·생존 상태,
              게임 내 채팅 메시지, 접속 시각(presence).
            </li>
          </ul>
          <p className="mt-3">
            서비스는 이메일, 비밀번호, 결제 정보, Discord 메시지 내역 등 위에 명시되지 않은
            정보는 수집하지 않습니다.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink">2. 이용 목적</h2>
          <p className="mt-3">
            수집한 정보는 오직 게임 진행을 위해 사용됩니다 — 플레이어 식별·표시, 매치 상태
            동기화, 역할·행동 처리, 게임 내 채팅 전달. 광고 및 제3자 판매 목적으로 사용하지
            않습니다.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink">3. 보관 및 위탁(제3자 처리)</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>
              <strong>Supabase</strong> — 게임 데이터베이스 및 백엔드 호스팅.
            </li>
            <li>
              <strong>Vercel</strong> — 웹 애플리케이션 호스팅.
            </li>
            <li>
              <strong>AI 용병 기능</strong> — AI 플레이어를 초대한 매치에서는 해당 매치의 공개
              게임 채팅 일부가 AI 응답 생성을 위해 AI 제공자(OpenAI, Google, Anthropic)로
              전송될 수 있습니다. 개인 식별 목적의 전송은 아닙니다.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink">4. 보관 기간 및 삭제</h2>
          <p className="mt-3">
            게임 데이터는 서비스 운영에 필요한 합리적 기간 동안 보관되며, 종료된 매치 데이터는
            주기적으로 정리됩니다. 본인 데이터의 열람 또는 삭제를 원하시면 아래 연락처로 요청해
            주세요.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink">5. 연령 제한</h2>
          <p className="mt-3">
            서비스는 Discord 서비스 약관에 따라 만 13세 이상(거주 지역에서 더 높은 연령을
            규정하는 경우 그 연령) 사용자를 대상으로 합니다.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink">6. 이용자의 권리</h2>
          <p className="mt-3">
            이용자는 자신의 데이터에 대한 열람·정정·삭제를 요청할 수 있습니다. Discord에서 앱
            연동을 해제하면 이후 정보 수집이 중단됩니다.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-ink">7. 방침 변경 및 연락처</h2>
          <p className="mt-3">
            본 방침은 변경될 수 있으며, 변경 시 본 페이지의 시행일이 갱신됩니다. 문의:{" "}
            <a className="underline" href={`mailto:${CONTACT}`}>
              {CONTACT}
            </a>
            .
          </p>
        </section>
      </div>

      <div className="mt-12 border-t border-ink/10 pt-6 text-sm">
        <Link href="/terms" className="text-ink/60 underline hover:text-ink">
          이용약관 보기
        </Link>
      </div>
    </main>
  );
}
