"use client";

import { ActivityLayout } from "@/components/ActivityLayout";
import { getActivity } from "@/config/activities";
import { MuelMindView } from "@/components/weave/MuelMindView";

const WEAVE_ACTIVITY = getActivity("weave")!;

// Weave 재포지셔닝: "당신의 꿈을 입력하세요" → "Muel이 보는 우리".
// 사용자가 Muel 의 기억·해석을 보고 교정(맞음/틀림)하고, 알아야 할 것을 알려주는 공간.
// 기존 꿈(dreams)은 '꿈' 종류 카드로 흡수해 함께 표시한다.
export default function WeavePage() {
  return (
    <ActivityLayout activity={WEAVE_ACTIVITY}>
      {(session) => <MuelMindView session={session} />}
    </ActivityLayout>
  );
}
