export interface StatusEffect {
  id: string;
  label: string;
  icon: string;
  badgeClass: string;
  description: string;
}

export const STATUS_EFFECTS: Record<string, StatusEffect> = {
  sealed: {
    id: "sealed",
    label: "봉인",
    icon: "🔇",
    badgeClass: "bg-slate-500/20 text-slate-300 border-slate-400/30",
    description: "밤에 능동 능력을 시전할 수 없는 상태입니다.",
  },
  enchanted: {
    id: "enchanted",
    label: "매료",
    icon: "💖",
    badgeClass: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-400/30",
    description: "처형 투표 권한이 매료 시전자에게 위임된 상태입니다.",
  },
  saved: {
    id: "saved",
    label: "구원",
    icon: "😇",
    badgeClass: "bg-amber-500/20 text-amber-300 border-amber-400/30",
    description: "사망 시 자동으로 부활할 대기 상태입니다.",
  },
  protected: {
    id: "protected",
    label: "보호",
    icon: "🛡️",
    badgeClass: "bg-sky-500/20 text-sky-300 border-sky-400/30",
    description: "밤 동안 가해지는 처치 효과로부터 보호받습니다.",
  },
  corrupted: {
    id: "corrupted",
    label: "타락",
    icon: "😈",
    badgeClass: "bg-rose-500/20 text-rose-300 border-rose-400/30",
    description: "악마의 영향력에 굴복해 진영이 타락했습니다.",
  },
  converted: {
    id: "converted",
    label: "전향",
    icon: "🕊️",
    badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
    description: "구원자(파스아) 진영에 영입되어 전향된 상태입니다.",
  },
};

export function resolveMyStatusEffects(
  myUserId: string | null | undefined,
  events: Array<{ event_type: string; phase_id?: string; payload?: Record<string, unknown> }>,
  currentPhaseId?: string | null
): string[] {
  if (!myUserId) return [];
  
  const relevantEvents = events.filter((e) => {
    if (currentPhaseId && e.phase_id !== currentPhaseId) return false;
    return true;
  });

  const effects = new Set<string>();

  for (const e of relevantEvents) {
    switch (e.event_type) {
      case "silenced":
      case "possessed":
        effects.add("sealed");
        break;
      case "charmed":
        effects.add("enchanted");
        break;
      case "nightmare_marked":
        effects.add("sealed");
        break;
      case "faction_changed": {
        const payload = e.payload ?? {};
        if (payload.new_faction === "neutral") {
          effects.add("converted");
        } else {
          effects.add("corrupted");
        }
        break;
      }
      case "rebranded":
        effects.add("corrupted");
        break;
      case "attack_prevented":
        effects.add("protected");
        break;
      default:
        break;
    }
  }

  return Array.from(effects);
}
