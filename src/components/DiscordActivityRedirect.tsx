"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { activities, type MuelActivity } from "@/config/activities";
import { ActivityBootScreen } from "@/components/ActivityBootScreen";
import { isInsideDiscord } from "@/lib/discord-launch";

/**
 * Discord Activity 를 자기 라우트로 바로 진입시킨다.
 *
 * Discord 는 Activity iframe 을 배포 루트("/?frame_id=...")로 띄운다. 루트는 모든
 * 서비스를 나열한 공개 마케팅 페이지라, Discord 안에서 사용자가 마케팅 페이지에 떨어진다.
 * 어떤 Activity 인지는 문서 origin 으로 구분한다: Discord 는 각 Activity 를
 * "https://<application_id>.discordsays.com" 에서 서빙하고, 그 application_id 가 곧
 * activity 의 Discord client_id 다.
 *
 * 이동은 반드시 **클라이언트 사이드(SPA) 라우팅**으로 한다. `location.replace` 같은
 * 하드 리로드는 Discord 프록시가 서브패스 문서를 새로 받아오며 부모↔iframe RPC 브리지를
 * 잃어 `sdk.ready()` 가 15초 타임아웃 난다. SPA 이동은 단일 문서를 유지하므로, 기존에
 * 동작하던 "랜딩에서 카드 클릭" 경로와 동일하게 SDK 핸드셰이크가 성립한다.
 *
 * 웹 방문자(frame_id 없음)나 매칭 안 되는 app id 는 그대로 마케팅 페이지를 본다.
 */
export function DiscordActivityRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  // 어떤 Activity 로 가는지 기억해 그 Activity 의 부트 화면(키 아트)을 띄운다.
  const [redirectTarget, setRedirectTarget] = useState<MuelActivity | null>(null);

  useEffect(() => {
    if (pathname !== "/") return;
    if (!isInsideDiscord()) return;

    const appId = window.location.hostname.split(".")[0];
    const target = activities.find((a) => a.discordClientId && a.discordClientId === appId);
    if (!target) return;

    setRedirectTarget(target);
    router.replace(`${target.route}${window.location.search}${window.location.hash}`);
  }, [pathname, router]);

  if (!redirectTarget) return null;

  return (
    <ActivityBootScreen
      boot={redirectTarget.boot}
      label="여는 중..."
      className="fixed inset-0 z-50"
    />
  );
}
