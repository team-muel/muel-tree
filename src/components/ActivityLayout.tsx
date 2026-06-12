"use client";

import { useEffect, useRef, useState } from "react";
import { appFetch } from "@/lib/app-fetch";
import { initDiscord, subscribeInstanceParticipants, getInstanceParticipants, type DiscordUser, type InstanceParticipant } from "@/lib/discord";
import { ActivityBootScreen } from "@/components/ActivityBootScreen";
import type { MuelActivity } from "@/config/activities";

export type ActivitySession = {
  discordUser: DiscordUser | null;
  hasDiscordAuth: boolean;
  accessToken: string | null;
  activityContext: Record<string, string | null>;
  instanceParticipants: InstanceParticipant[];
};

type Props = {
  activity: MuelActivity;
  children: (session: ActivitySession) => React.ReactNode;
};

export function ActivityLayout({ activity, children }: Props) {
  const [discordUser, setDiscordUser] = useState<DiscordUser | null>(null);
  const [hasDiscordAuth, setHasDiscordAuth] = useState(false);
  const accessToken = useRef<string | null>(null);
  const activityContext = useRef<Record<string, string | null>>({});
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [instanceParticipants, setInstanceParticipants] = useState<InstanceParticipant[]>([]);
  const unsubParticipants = useRef<(() => void) | null>(null);

  useEffect(() => {
    initDiscord(activity.slug)
      .then((session) => {
        if (session?.accessToken) {
          accessToken.current = session.accessToken;
          setHasDiscordAuth(true);
          activityContext.current = session.context;
          getInstanceParticipants(activity.slug)
            .then(setInstanceParticipants)
            .catch(() => {});
          unsubParticipants.current = subscribeInstanceParticipants(
            activity.slug,
            setInstanceParticipants,
          );
          appFetch("/api/service-events", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.accessToken}`,
            },
            body: JSON.stringify({
              serviceSlug: activity.serviceSlug,
              eventType: "opened",
              route: activity.route,
              context: session.context,
            }),
          }).catch(() => {});
        }
        if (session?.user) setDiscordUser(session.user);
        if (session && !session.accessToken && session.authError) {
          setInitError(session.authError);
        }
      })
      .catch((e) => {
        setInitError(e instanceof Error ? e.message : "Discord 연결 실패");
      })
      .finally(() => setReady(true));

    return () => {
      unsubParticipants.current?.();
    };
  }, [activity.slug, activity.serviceSlug, activity.route]);

  const session: ActivitySession = {
    discordUser,
    hasDiscordAuth,
    accessToken: accessToken.current,
    activityContext: activityContext.current,
    instanceParticipants,
  };

  return (
    <div className="w-screen h-screen relative overflow-hidden">
      {/* Activity 전용 부트 화면(activities.boot — Gomdori = 키 아트), 미지정은 실타래 폴백. */}
      {!ready && (
        <div className="pointer-events-none absolute inset-0 z-10">
          <ActivityBootScreen boot={activity.boot} label="불러오는 중..." />
        </div>
      )}

      {initError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-red-900/60 text-red-300 text-xs px-4 py-2 rounded-lg pointer-events-none max-w-xs text-center">
          {initError}
        </div>
      )}

      {ready && children(session)}
    </div>
  );
}
