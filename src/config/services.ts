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
    label: "Game",
    href: "#gomdori",
    route: "/game",
    status: "beta",
    statusLabel: "베타",
    operatingModel: "Discord Activity + Supabase",
    description: "커뮤니티 멤버가 Discord 음성 채널에 모여 함께 시작하는 비대칭 추리 게임입니다. 천사와 악마, 누가 거짓말을 하고 있을까요.",
    sectionClassName: "bg-[#0a0a0a] text-white",
    primaryAction: { label: "Gomdori 열기", href: "/game" },
    note: "Discord 음성 채널에 입장한 뒤 Activity에서 Gomdori를 실행하면 자동으로 매치가 시작됩니다. 웹에서 직접 열면 채널 컨텍스트가 없어 안내 화면으로 이어집니다.",
  },
  {
    slug: "weave",
    name: "Weave",
    label: "Activity",
    href: "#weave",
    route: "/weave",
    status: "beta",
    statusLabel: "베타",
    operatingModel: "Discord Activity + Supabase Vector",
    description: "Muel이 나와 우리를 어떻게 기억하는지 보고, 맞으면 확인하고 틀리면 바로잡는 기억 교정 Activity입니다.",
    sectionClassName:
      "bg-gradient-to-br from-[#5B21B6] to-[#DB2777] text-white",
    primaryAction: { label: "Weave 열기", href: "/weave" },
    note: "Discord 안에서 Weave를 열면 내 기억을 확인·교정하고, Muel이 알아야 할 것을 직접 알려줄 수 있습니다.",
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
    text: "대화 로그, 사용자 교정, 임베딩 검색 기반으로 기억 구조 확장",
    href: "#server",
  },
  {
    date: "2026년 5월",
    category: "Weave",
    text: "Muel memory correction surface 베타 운영",
    href: "#weave",
  },
];

export const footerLinks = [
  { label: "Muel", href: "#muel" },
  { label: "Gomdori", href: "#gomdori" },
  { label: "Weave", href: "/weave" },
  { label: "Server", href: "#server" },
];
