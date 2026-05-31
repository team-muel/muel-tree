"use client";

import { useEffect } from "react";
import { captureLaunchParams } from "@/lib/discord-launch";

/**
 * Captures Discord Activity launch params (frame_id / instance_id …) on first
 * load so they survive client-side navigation into activity routes. Mounted
 * app-wide in the root layout. Renders nothing.
 */
export function DiscordLaunchCapture() {
  useEffect(() => {
    captureLaunchParams();
  }, []);
  return null;
}
