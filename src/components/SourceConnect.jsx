import { useState } from "react";
import { GitBranch, Globe, Frame, Check, AlertTriangle, Loader2, Search } from "lucide-react";
import {
  SOURCE_OPTIONS,
  connectSource,
  checkConnectedPage,
} from "../lib/sources/index.js";

// FR-A1 + FR-A3 connect step. Presents the three source options (GitHub /
// WordPress / Framer), wires GitHub end-to-end (repo URL + token, validated,
// secrets stay server-side), shows "coming soon" for the stubbed providers, and
// after a successful connect runs the Claude "can we find your page?" check.
// A not-found / unsuitable verdict BLOCKS progress (the Continue button stays
// disabled and tells the user what to fix).
//
// onConnected({ source, check }) is called when the user proceeds with a found +
// suitable page. The parent inserts this step before Setup/analytics.

const ICONS = { github: GitBranch, wordpress: Globe, framer: Frame };

export default function SourceConnect({ onConnected }) {
  const [kind, setKind] = useState("github");
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [phase, setPhase] = useState("idle"); // idle | connecting | checking | done
  const [error, setError] = useState(null);
  const [comingSoon, setComingSoon] = useState(null);
  const [source, setSource] = useState(null);
  const [check, setCheck] = useState(null);

  const selected = SOURCE_OPTIONS.find((o) => o.kind === kind);
  const busy = phase === "connecting" || phase === "checking";

  const resetResult = () => {
    setError(null);
    setComingSoon(null);
    setSource(null);
    setCheck(null);
    setPhase("idle");
  };

  const handleSelect = (k) => {
    setKind(k);
    resetResult();
  };

  const handleConnect = async () => {
    setError(null);
    setComingSoon(null);
    setSource(null);
    setCheck(null);

    setPhase("connecting");
    const result = await connectSource(kind, { url, token });

    if (result.comingSoon) {
      setComingSoon(result.error);
      setPhase("idle");
      return;
    }
    if (!result.ok) {
      setError(result.error || "Could not connect. Try again.");
      setPhase("idle");
      return;
    }

    setSource(result.source);

    // FR-A3: Claude sanity check immediately after connect.
    setPhase("checking");
    const verdict = await checkConnectedPage();
    setCheck(verdict);
    setPhase("done");
  };

  const canProceed = Boolean(
    source && check && check.found === true && check.suitable === true
  );

  return (
    <div className="mx-auto max-w-3xl animate-pop">
      <div className="rounded-lg border border-edge bg-surface p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-ink">Connect your site</h2>
        <p className="mt-1 text-sm text-muted">
          Connect the source that hosts the page you want to optimize. Beagle
          locates the hero, then Claude confirms it can find your page before you
          continue.
        </p>

        {/* FR-A1a: the three source options. */}
        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          {SOURCE_OPTIONS.map((opt) => {
            const Icon = ICONS[opt.kind] ?? Globe;
            const active = kind === opt.kind;
            return (
              <button
                key={opt.kind}
                type="button"
                onClick={() => handleSelect(opt.kind)}
                className={`rounded-lg border p-3 text-left ${
                  active
                    ? "border-accent/40 bg-surface-2 ring-1 ring-accent/15"
                    : "border-edge bg-surface hover:bg-surface-2"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-medium text-ink">
                    <Icon size={16} />
                    {opt.label}
                  </span>
                  {!opt.wired && (
                    <span className="rounded bg-edge px-1.5 py-0.5 text-[10px] font-medium text-muted">
                      Soon
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* GitHub form (wired) vs coming-soon for the stubs (FR-A1b). */}
        {selected?.wired ? (
          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-muted">Repository URL</span>
              <input
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (error) setError(null);
                }}
                disabled={busy}
                className="mt-1.5 w-full rounded-lg border border-edge bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10"
                placeholder="https://github.com/owner/repo"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted">
                Access token (Personal Access Token)
              </span>
              <input
                type="password"
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  if (error) setError(null);
                }}
                disabled={busy}
                className="mt-1.5 w-full rounded-lg border border-edge bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10"
                placeholder="ghp_…"
              />
              <span className="mt-1 block text-[11px] text-muted">
                Used only on the server to read your repo — never stored in the
                browser.
              </span>
            </label>

            <button
              type="button"
              onClick={handleConnect}
              disabled={busy || !url.trim() || !token.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {phase === "connecting" ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Connecting…
                </>
              ) : phase === "checking" ? (
                <>
                  <Search size={15} className="animate-pulse" /> Checking page…
                </>
              ) : (
                "Connect & locate page"
              )}
            </button>
          </div>
        ) : (
          <div className="mt-6 rounded-lg border border-edge bg-surface-2 p-4 text-sm text-muted">
            {selected?.label} connection is coming soon. GitHub is fully
            supported for the MVP.
          </div>
        )}

        {/* Clear error state with retry path (FR-A1c / Section 6). */}
        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-300/40 bg-rose-50/60 p-3 text-sm text-rose-700">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div>
              <div className="font-medium">Could not connect</div>
              <div className="text-rose-700/90">{error}</div>
            </div>
          </div>
        )}

        {comingSoon && (
          <div className="mt-4 rounded-lg border border-edge bg-surface-2 p-3 text-sm text-muted">
            {comingSoon}
          </div>
        )}

        {/* FR-A3: the found / not-found verdict. */}
        {phase === "done" && check && (
          <VerdictPanel source={source} check={check} />
        )}

        {/* Continue is blocked unless the page is found + suitable (FR-A3b). */}
        {phase === "done" && (
          <div className="mt-6 flex items-center justify-between gap-3">
            <span className="text-xs text-muted">
              {canProceed
                ? "Page confirmed. Continue to connect analytics."
                : "Resolve the issue above, then reconnect to continue."}
            </span>
            <button
              type="button"
              onClick={() => onConnected?.({ source, check })}
              disabled={!canProceed}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function VerdictPanel({ source, check }) {
  const good = check.found && check.suitable;
  return (
    <div
      className={`mt-4 flex items-start gap-2 rounded-lg border p-3 text-sm ${
        good
          ? "border-emerald-300/40 bg-emerald-50/60 text-emerald-700"
          : "border-amber-300/50 bg-amber-50/60 text-amber-800"
      }`}
    >
      {good ? (
        <Check size={16} className="mt-0.5 shrink-0" />
      ) : (
        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      )}
      <div>
        <div className="font-medium">
          {good
            ? "We found your page"
            : check.checked
            ? "We could not use this page"
            : "Page check unavailable"}
        </div>
        <div className="opacity-90">{check.reason}</div>
        {source?.page?.path && (
          <div className="mt-1 text-[11px] opacity-75">
            Located: {source.page.path}
          </div>
        )}
      </div>
    </div>
  );
}
