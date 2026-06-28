import { Infinity as InfinityIcon, Hand } from "lucide-react";

// FR-D4 — visible agentic-loop on/off toggle. Reuses the segmented-control shape
// from GenerationModeToggle so the interaction is consistent across the app.
//
// ON  = after a decided test, the system proposes the NEXT test — still routed
//       through the FR-D1 approval gate (never auto-live; Section 8).
// OFF = a decided test holds; no next proposal is generated until the user starts
//       another round manually.
export default function LoopToggle({ enabled, setEnabled, compact }) {
  return (
    <div className="flex items-center gap-2">
      {!compact && (
        <span className="hidden text-[11px] text-muted sm:inline">Agentic loop</span>
      )}
      <div
        className="flex rounded-lg border border-edge bg-surface-2 p-0.5"
        role="group"
        aria-label="Agentic loop"
      >
        <Seg
          active={enabled}
          onClick={() => setEnabled(true)}
          title="Loop on: after a decision, propose the next test (still approval-gated)"
        >
          <InfinityIcon size={13} />
          <span>Loop on</span>
        </Seg>
        <Seg
          active={!enabled}
          onClick={() => setEnabled(false)}
          title="Loop off: a decided test holds; no next test is proposed automatically"
        >
          <Hand size={13} />
          <span>Manual</span>
        </Seg>
      </div>
    </div>
  );
}

function Seg({ active, onClick, children, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold ${
        active ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
