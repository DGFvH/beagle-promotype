// ---------------------------------------------------------------------------
// Framer source provider (STUBBED — "coming soon") (FR-A1b)
// ---------------------------------------------------------------------------
// MVP scope: GitHub is fully wired; Framer ships stubbed behind a clear
// "coming soon" state (Section 8 — leave a clean extension point, don't build
// it). Same common interface ({ connect, locatePage }) so a real Framer
// connector is a drop-in replacement later.

export const kind = "framer";
export const label = "Framer";
export const wired = false;

export const comingSoonMessage =
  "Framer connection is coming soon. GitHub is fully supported for the MVP.";

export function validateInput() {
  return { ok: false, comingSoon: true, error: comingSoonMessage };
}

export async function connect() {
  return { ok: false, comingSoon: true, error: comingSoonMessage };
}

export function locatePage() {
  return null;
}
