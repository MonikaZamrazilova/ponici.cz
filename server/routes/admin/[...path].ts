import { defineEventHandler } from "h3";

/**
 * Dev-only "unlocker" — nitro dev server přeskočí cesty s příponou
 * (.js/.css) jako statické assety dřív, než dojde na middleware.
 * Registrace routy zajistí, že se request dostane do nitro aplikace,
 * kde ho obslouží admin-proxy middleware (01.admin-proxy.ts).
 * Tato routa nikdy nic nevrací — jen propadá dál.
 */
export default defineEventHandler(() => undefined);
