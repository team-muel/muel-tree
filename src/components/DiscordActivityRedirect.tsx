import { activities } from "@/config/activities";

/**
 * Sends a Discord Activity straight into its own route.
 *
 * A Discord Activity loads the iframe at the deployment ROOT ("/?frame_id=...").
 * That root is the public marketing page (src/app/page.tsx) listing every
 * service, so inside Discord the user lands on the marketing page and has to
 * click a card to reach /weave or /game. We want the Activity to enter its view
 * immediately.
 *
 * Discord serves each Activity from "https://<application_id>.discordsays.com",
 * and that application_id IS the activity's Discord client_id. The launch query
 * does not carry the client_id, but the document origin does — so we read the
 * leading hostname label and match it against the activities config to learn
 * which Activity launched, then replace the URL with that activity's route
 * (carrying the launch params so the SDK still handshakes).
 *
 * This is emitted as a blocking inline <script> at the top of the page body so
 * it runs during HTML parse — before the marketing sections paint — making the
 * redirect flash-free. Web visitors (no frame_id / unknown app id) fall through
 * untouched and see the marketing page. New activities are picked up
 * automatically from the config; no per-activity code required.
 */
export function DiscordActivityRedirect() {
  const clientIdToRoute: Record<string, string> = {};
  for (const a of activities) {
    if (a.discordClientId) clientIdToRoute[a.discordClientId] = a.route;
  }

  const script = `(function(){try{
var s=window.location.search;
if(s.indexOf("frame_id")===-1&&s.indexOf("instance_id")===-1)return;
if(window.location.pathname!=="/")return;
var appId=window.location.hostname.split(".")[0];
var map=${JSON.stringify(clientIdToRoute)};
var route=map[appId];
if(!route)return;
window.location.replace(route+s+window.location.hash);
}catch(e){}})();`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
