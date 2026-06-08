"use client";

import { ActivityLayout } from "@/components/ActivityLayout";
import { getActivity } from "@/config/activities";
import { WeaveExport } from "@/components/weave/WeaveExport";

const WEAVE_ACTIVITY = getActivity("weave")!;

// 내 Muel 기록(기억·받은 롤링페이퍼·메모)을 embed-스타일 카드로 모아 PDF로 내보내는 화면.
export default function WeaveExportPage() {
  return (
    <ActivityLayout activity={WEAVE_ACTIVITY}>
      {(session) => <WeaveExport session={session} />}
    </ActivityLayout>
  );
}
