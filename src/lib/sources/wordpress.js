// ---------------------------------------------------------------------------
// WordPress source provider (STUBBED — "coming soon") (FR-A1b)
// ---------------------------------------------------------------------------
// MVP scope: GitHub is fully wired; WordPress ships stubbed behind a clear
// "coming soon" state (Section 8 — leave a clean extension point, don't build
// it). This implements the same common interface ({ connect, locatePage }) so a
// real WordPress connector is a drop-in replacement later: wire connect() to a
// secret-bearing /api/connect-source call for kind="wordpress" and flip `wired`.

export const kind = "wordpress";
export const label = "WordPress";
export const wired = false;

export const comingSoonMessage =
  "WordPress connection is coming soon. GitHub is fully supported for the MVP.";

export function validateInput() {
  return { ok: false, comingSoon: true, error: comingSoonMessage };
}

export async function connect() {
  return { ok: false, comingSoon: true, error: comingSoonMessage };
}

export function locatePage() {
  return null;
}
