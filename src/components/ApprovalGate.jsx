// FR-D1 — Explicit approval gate (UI).
//
// The ONLY path to "go live" (injection + experiment creation, FR-D2/D3) routes
// through this component's Approve action. Until the user approves, the UI shows
// an explicit "not live / awaiting approval" state — it never implies a live
// experiment exists (Section 6: no fabricated data presented as real).
//
// The pure state machine lives in src/lib/approval.js; this is its presentation.
import { CheckCircle2, ShieldAlert, ShieldCheck, X } from "lucide-react";
import MenuPreview from "./MenuPreview.jsx";
import { HERO_ATTRIBUTES, HERO_DESIGN_SPACE, normalizeConfig } from "../lib/engine.js";

/**
 * @param {object}   props
 * @param {object}   props.champion     Champion variant view ({ config, label, ... }).
 * @param {object}   props.challenger   Proposed challenger variant view.
 * @param {string}   props.state        APPROVAL_STATES value ("pending" | "approved" | "rejected" | "live").
 * @param {string}   [props.hypothesis] One-paragraph hypothesis (what changed + why).
 *                                       TODO(beagle-hypothesis, FR-C1): real hypothesis text.
 *                                       Until then we show a clearly-labelled placeholder.
 * @param {object}   [props.guardrailBlock]  { reason } when a guardrail blocks approval
 *                                       (FR-F*). When present, Approve is disabled and the
 *                                       reason is surfaced — never hidden, never overridable here.
 * @param {Function} props.onApprove
 * @param {Function} props.onReject
 * @param {boolean}  [props.busy]
 */
export default function ApprovalGate({
  champion,
  challenger,
  state = "pending",
  hypothesis,
  guardrailBlock = null,
  onApprove,
  onReject,
  busy = false,
}) {
  const pending = state === "pending";
  const approved = state === "approved";
  const live = state === "live";
  const rejected = state === "rejected";
  const blocked = Boolean(guardrailBlock);
  const approveDisabled = busy || !pending || blocked;

  return (
    <section className="rounded-lg border border-edge bg-surface p-3 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div
            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold ${
              live
                ? "border border-win/25 bg-win/10 text-win"
                : "border border-accent/20 bg-accent/10 text-accent"
            }`}
          >
            <ShieldCheck size={13} />
            {live ? "Live experiment" : "Approval required"}
          </div>
          <h2 className="mt-2 text-lg font-semibold leading-tight text-ink">
            Review the proposed challenger
          </h2>
          <p className="mt-0.5 text-[12px] leading-snug text-muted">
            {live
              ? "This variant is live. Cookie-based assignment is splitting traffic."
              : "Nothing is injected and no live experiment exists until you approve."}
          </p>
        </div>
        <StatusPill state={state} />
      </header>

      {/* Champion vs proposed challenger heroes */}
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <HeroColumn
          label="Champion (current)"
          tone="champion"
          view={champion}
        />
        <HeroColumn
          label="Challenger (proposed)"
          tone="challenger"
          view={challenger}
        />
      </div>

      {/* Hypothesis + diff: what changed and why */}
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-edge bg-surface-2 p-3">
          <div className="text-[11px] font-semibold text-muted">Hypothesis</div>
          {hypothesis ? (
            <p className="mt-1 text-[12px] leading-snug text-ink">{hypothesis}</p>
          ) : (
            // TODO(beagle-hypothesis, FR-C1): replace with the Claude-generated
            // hypothesis (what changed + expected effect on the chosen metric).
            <p className="mt-1 text-[12px] italic leading-snug text-muted">
              Hypothesis pending — Claude will state what changed and the expected
              effect on the chosen metric before approval.
            </p>
          )}
        </div>
        <div className="rounded-md border border-edge bg-surface-2 p-3">
          <div className="text-[11px] font-semibold text-muted">Change vs current hero</div>
          <div className="mt-1.5">
            <HeroDiff from={champion?.config} to={challenger?.config} />
          </div>
        </div>
      </div>

      {/* Guardrail block — surfaced, never hidden, never overridable here (FR-F*) */}
      {blocked && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-loss/30 bg-loss/10 p-3 text-loss">
          <ShieldAlert size={16} className="mt-0.5 shrink-0" />
          <div className="min-w-0">
            <div className="text-[12px] font-semibold">Blocked by a guardrail</div>
            <p className="mt-0.5 text-[12px] leading-snug">
              {guardrailBlock.reason ||
                "This proposal violates a supplied guardrail and cannot be approved."}
            </p>
          </div>
        </div>
      )}

      {/* Actions — Approve is the only path to go live */}
      {(pending || blocked) && (
        <div className="mt-3 grid grid-cols-[auto_1fr] gap-2">
          <button
            type="button"
            onClick={onReject}
            disabled={busy}
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-edge bg-surface px-3 py-2 text-sm font-semibold text-ink hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X size={16} />
            Reject
          </button>
          <button
            type="button"
            onClick={onApprove}
            disabled={approveDisabled}
            title={blocked ? "Resolve the guardrail block before approving" : undefined}
            className="btn-primary inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CheckCircle2 size={16} />
            Approve &amp; go live
          </button>
        </div>
      )}

      {approved && (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-accent/20 bg-accent/10 px-3 py-2 text-[12px] font-semibold text-accent">
          <CheckCircle2 size={15} />
          Approved — injecting variant and creating the experiment…
        </div>
      )}

      {rejected && (
        <div className="mt-3 rounded-md border border-edge bg-surface-2 px-3 py-2 text-[12px] text-muted">
          Proposal rejected. No variant was injected and no experiment was created.
        </div>
      )}
    </section>
  );
}

function StatusPill({ state }) {
  const map = {
    pending: { label: "Awaiting approval", cls: "border-edge bg-surface-2 text-muted" },
    approved: { label: "Approved", cls: "border-accent/25 bg-accent/10 text-accent" },
    live: { label: "Live", cls: "border-win/25 bg-win/10 text-win" },
    rejected: { label: "Rejected", cls: "border-edge bg-surface-2 text-muted" },
  };
  const s = map[state] ?? map.pending;
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}

// Per-attribute diff over the enum-constrained hero design space. No fabricated
// values: when a config is missing we say so rather than inventing a baseline.
function HeroDiff({ from, to }) {
  if (!from || !to) {
    return (
      <p className="text-[12px] text-muted">Diff unavailable — heroes not loaded.</p>
    );
  }
  const a = normalizeConfig(from);
  const b = normalizeConfig(to);
  const changed = HERO_ATTRIBUTES.filter((k) => a[k] !== b[k]);
  if (changed.length === 0) {
    return (
      <p className="text-[12px] text-muted">No attributes differ from the current hero.</p>
    );
  }
  return (
    <ul className="space-y-1">
      {changed.map((k) => (
        <li key={k} className="flex flex-wrap items-center gap-1 text-[12px]">
          <span className="font-semibold text-ink">{HERO_DESIGN_SPACE[k].label}</span>
          <span className="text-muted line-through">{String(a[k])}</span>
          <span className="text-muted">→</span>
          <span className="font-medium text-accent">{String(b[k])}</span>
        </li>
      ))}
    </ul>
  );
}

function HeroColumn({ label, tone, view }) {
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-muted">{label}</span>
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
            tone === "challenger"
              ? "bg-accent/10 text-accent"
              : "bg-surface-2 text-muted"
          }`}
        >
          {tone === "challenger" ? "B" : "A"}
        </span>
      </div>
      {view?.config ? (
        <MenuPreview config={view.config} variant="compact" />
      ) : (
        // No fabricated hero — explicit empty state (Section 6).
        <div className="grid min-h-[12rem] place-items-center rounded-lg border border-dashed border-edge bg-surface-2 text-[12px] text-muted">
          No hero loaded yet.
        </div>
      )}
    </div>
  );
}
