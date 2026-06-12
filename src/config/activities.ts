export type MuelActivity = {
  slug: string;
  name: string;
  route: string;
  serviceSlug: string;
  description: string;
  discordClientId?: string;
  /** Discord CSP 우회를 위해 /supabase URL 매핑(patchUrlMappings)이 필요한 Activity. */
  needsSupabaseProxy?: boolean;
  /**
   * Activity 전용 진입(부트) 화면 (2026-06-12). 지정하면 공용 실타래(🧵) 로더 대신
   * 키 아트 부트 화면(ActivityBootScreen)이 뜬다 — "여는 중/불러오는 중" 모두.
   */
  boot?: { illustrationId: string; title: string };
};

export const activities: MuelActivity[] = [
  {
    slug: "weave",
    name: "일기",
    route: "/weave",
    serviceSlug: "weave",
    description: "꿈을 기록하고 연결하는 인터랙티브 앱",
    discordClientId: process.env.NEXT_PUBLIC_WEAVE_DISCORD_CLIENT_ID,
  },
  {
    slug: "gomdori-mafia",
    name: "마피아",
    route: "/game",
    serviceSlug: "gomdori",
    description: "Gomdori 마피아 — 천사와 악마의 비대칭 추리 게임",
    discordClientId: process.env.NEXT_PUBLIC_GOMDORI_DISCORD_CLIENT_ID,
    needsSupabaseProxy: true,
    boot: { illustrationId: "night-muse", title: "Gomdori Mafia" },
  },
];

export function getActivity(slug: string): MuelActivity | undefined {
  return activities.find((a) => a.slug === slug);
}
