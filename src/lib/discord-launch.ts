/**
 * Discord Activity launch-context survival.
 *
 * A Discord Activity loads the iframe at "/?frame_id=...&instance_id=...". Those
 * launch params are how the app knows it is inside Discord AND how the embedded
 * SDK handshakes (DiscordSDK reads frame_id from window.location). But any
 * client-side navigation with a bare <Link> drops the query string, so an
 * activity route reached via navigation loses the context and falls back to the
 * "open in Discord" gate.
 *
 * Fix the class of bug (not one button): capture the launch params once on first
 * load into sessionStorage, then restore them into the URL before the SDK is
 * constructed. This makes Discord context survive ANY navigation path and any
 * future Activity automatically — no per-link convention required.
 */

const STORE_KEY = "discord_launch_search";
const DISCORD_PARAM_KEYS = ["frame_id", "instance_id"];

function hasDiscordParams(search: string): boolean {
  return DISCORD_PARAM_KEYS.some((k) => search.includes(k));
}

/** Capture launch params on first load (call app-wide, e.g. root layout). */
export function captureLaunchParams(): void {
  if (typeof window === "undefined") return;
  const search = window.location.search;
  if (hasDiscordParams(search)) {
    try {
      sessionStorage.setItem(STORE_KEY, search);
    } catch {
      // sessionStorage unavailable — degrade to URL-only behaviour
    }
  }
}

function getStoredLaunchSearch(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(STORE_KEY);
  } catch {
    return null;
  }
}

/**
 * Inside Discord if the URL still carries the launch params OR we captured them
 * earlier this session (i.e. we arrived via navigation that dropped them).
 */
export function isInsideDiscord(): boolean {
  if (typeof window === "undefined") return false;
  if (hasDiscordParams(window.location.search)) return true;
  const stored = getStoredLaunchSearch();
  return stored != null && hasDiscordParams(stored);
}

/**
 * Restore captured launch params into the URL (no reload) so the Discord SDK,
 * which reads frame_id from window.location at construction, can handshake even
 * when navigation dropped the query.
 */
export function restoreLaunchParamsToUrl(): void {
  if (typeof window === "undefined") return;
  if (hasDiscordParams(window.location.search)) return; // already present
  const stored = getStoredLaunchSearch();
  if (stored && hasDiscordParams(stored)) {
    try {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + stored + window.location.hash,
      );
    } catch {
      // replaceState blocked — nothing else we can do client-side
    }
  }
}
