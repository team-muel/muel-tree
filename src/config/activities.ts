export type MuelActivity = {
  slug: string;
  name: string;
  route: string;
  serviceSlug: string;
  description: string;
  discordClientId?: string;
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
  },
];

export function getActivity(slug: string): MuelActivity | undefined {
  return activities.find((a) => a.slug === slug);
}
