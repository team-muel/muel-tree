export type ServiceStatus = "live" | "beta" | "planned";

export type MuelService = {
  slug: "muel" | "gomdori" | "weave" | "server";
  name: string;
  label: string;
  href: string;
  route: string | null;
  status: ServiceStatus;
  statusLabel: string;
  operatingModel: string;
  description: string;
  sectionClassName: string;
  badgeLight?: boolean;
  primaryAction: {
    label: string;
    href: string | null;
  };
  note?: string;
};

export const services = [
  {
    slug: "muel",
    name: "Muel",
    label: "Bot",
    href: "#muel",
    route: null,
    status: "beta",
    statusLabel: "베타",
    operatingModel: "Discord Bot + Supabase",
    description: "Discord에서 멘션하면 서버 맥락, 대화 기억, 구독 정보를 바탕으로 바로 답하는 커뮤니티 캐릭터입니다.",
    sectionClassName:
      "bg-gradient-to-br from-[#a2e61d] to-[#ffde90] text-ink",
    badgeLight: true,
    primaryAction: { label: "Discord에서 @Muel 멘션", href: null },
    note: "초대 링크를 열어두기보다, 지금은 운영 중인 서버 안에서 멘션 기반으로 사용합니다.",
  },
  {
    slug: "gomdori",
    name: "Gomdori",
    label: "커뮤니티 놀이",
    href: "#gomdori",
    route: "/game",
    status: "beta",
    statusLabel: "베타",
    operatingModel: "커뮤니티 내부 도구",
    description: "커뮤니티 멤버끼리 함께 노는 비대칭 추리 시간. 음성 채널에 모여서 시작합니다.",
    sectionClassName: "bg-[#0a0a0a] text-white",
    primaryAction: { label: "Gomdori 열기", href: "/game" },
    note: "팔러 가는 제품이 아니라 커뮤니티 안에서 같이 노는 도구. 새 멤버가 들어와도 부담 없이 끼면 됩니다.",
  },
  {
    slug: "weave",
    name: "Weave",
    label: "지식의 나무",
    href: "#weave",
    route: "/weave",
    status: "beta",
    statusLabel: "베타",
    operatingModel: "커뮤니티 내부 도구",
    description: "여러분이 가꾸어 나가는 지식의 나무. 커뮤니티 멤버가 함께 잇고 적어 만드는 특수한 나무위키예요. Muel이 옆에서 보조합니다.",
    sectionClassName:
      "bg-gradient-to-br from-[#5B21B6] to-[#DB2777] text-white",
    primaryAction: { label: "나무로 들어가기", href: "/weave" },
    note: "팔러 가는 제품이 아니라, 멤버가 직접 가꾸는 내부 도구. 노트가 늘면 가지가 자랍니다.",
  },
  {
    slug: "server",
    name: "Server",
    label: "Discord",
    href: "#server",
    route: null,
    status: "live",
    statusLabel: "운영 중",
    operatingModel: "Discord Server + Supabase",
    description: "유저 경험은 Discord에 남기고, 기억과 이벤트는 Supabase로 모아 Muel이 다시 읽을 수 있게 합니다.",
    sectionClassName: "bg-[#1e2433] text-white",
    primaryAction: { label: "서버 안에서 사용", href: null },
    note: "공개 초대보다 Activity, 멘션, 구독 명령의 진입면을 먼저 정리합니다.",
  },
] satisfies MuelService[];

export const navigationItems = [
  { label: "Home", href: "/" },
  { label: "Team", href: "#team" },
  ...services.map(({ name, href }) => ({ label: name, href })),
];

export const teamUpdates = [
  {
    date: "2026년 5월",
    category: "Muel",
    text: "멘션 기반 봇과 Discord Activity 엔트리포인트 정리",
    href: "#muel",
  },
  {
    date: "2026년 5월",
    category: "Memory",
    text: "대화 로그, 꿈 기록, 임베딩 검색 기반으로 기억 구조 확장",
    href: "#server",
  },
  {
    date: "2026년 5월",
    category: "Weave",
    text: "꿈 기록과 공개 그래프 베타 운영",
    href: "#weave",
  },
];

export const footerLinks = [
  { label: "Muel", href: "#muel" },
  { label: "Gomdori", href: "#gomdori" },
  { label: "Weave", href: "/weave" },
  { label: "Server", href: "#server" },
];
