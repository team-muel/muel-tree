"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Props = {
  href: string;
  className?: string;
  children: React.ReactNode;
};

/**
 * Link that preserves the current query string (Discord Activity launch params
 * such as frame_id / instance_id) when navigating into an activity route.
 *
 * The landing page (src/app/page.tsx) is a server component, so it renders bare
 * hrefs like "/game". Inside a Discord Activity the iframe loads
 * "/?frame_id=...&instance_id=...". A bare <Link href="/game"> drops those
 * params, so /game's isInsideDiscord() sees no Discord context and shows the
 * "open in Discord" gate instead of booting the game. Appending the launch
 * params after hydration lets them survive the hand-off so the Activity boots.
 */
export function OpenActivityLink({ href, className, children }: Props) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    const s = window.location.search;
    if (s && (s.includes("frame_id") || s.includes("instance_id"))) {
      setSearch(s);
    }
  }, []);

  return (
    <Link href={`${href}${search}`} className={className} prefetch={false}>
      {children}
    </Link>
  );
}
