// canon-guard — 플레이어 표면 캐논 순수성 가드 (2026-06-27, 재발 방지).
//
// 배경: 구현상태 배지(게임반영/부분반영/예정)와 v1/v2/후속 같은 구현-메타가 플레이어 표면
// (인게임 역할 패널)에 반복해서 되살아났다. 컴포넌트만 지우면 매니페스트가 메타를 계속 들고 와
// 다시 렌더되기 때문. 이 가드가 lint 에 묶여 재발을 차단한다 — 플레이어는 캐논 순수 텍스트만,
// 구현상태·드리프트 메타는 디자이너 도구(preview DesignInventory)에만.
import { readFileSync } from "node:fs";

let failed = 0;
const fail = (m) => { console.error("CANON-GUARD ✗ " + m); failed++; };

// 1) 플레이어 역할 컴포넌트 — 구현상태 배지(StatusBadge) 렌더 금지.
//    (디자이너 도구 preview/DesignInventory 의 AbilityBadge 는 허용 — 검사 대상 아님.)
for (const f of [
  "src/components/game/ui/RoleOriginalAbilities.tsx",
  "src/components/game/ui/RoleAbilityDetails.tsx",
]) {
  const src = readFileSync(f, "utf8");
  if (/<StatusBadge|STATUS_BADGE\b|function StatusBadge/.test(src)) {
    fail(`${f}: 플레이어 표면에 구현상태 배지 금지 — 메타는 preview 전용.`);
  }
}

// 2) 매니페스트 플레이어 텍스트(reveal/passive/abilitySummary/ability.text) — 구현-메타 토큰 금지.
const FORBIDDEN = ["후속", "(v2)", "(v1)", "미반영", "미구현", "plumbing", "backend", "TODO"];
const roles = readFileSync("src/config/gomdori-roles.ts", "utf8");
const FIELD = /(?:reveal|passive|abilitySummary|text):\s*"((?:[^"\\]|\\.)*)"/g;
let m;
while ((m = FIELD.exec(roles))) {
  const text = m[1];
  for (const tok of FORBIDDEN) {
    if (text.includes(tok)) {
      fail(`gomdori-roles.ts 플레이어 텍스트에 구현-메타 '${tok}' 금지: "${text.slice(0, 48)}…"`);
    }
  }
}

if (failed) {
  console.error(`\nCANON-GUARD: ${failed}건 위반 — 플레이어는 캐논 순수 텍스트만 본다(구현상태·v1/v2/후속 메타는 preview 전용).`);
  process.exit(1);
}
console.log("CANON-GUARD ✓ 플레이어 표면 캐논 순수성 통과");
