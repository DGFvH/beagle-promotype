import { Bot, FlaskConical } from "lucide-react";

export default function GenerationModeToggle({ mode, setMode, aiAvailable, compact }) {
  return (
    <div className="flex items-center gap-2">
      {!compact && (
        <span className="hidden text-[11px] text-muted sm:inline">Evolution</span>
      )}
      <div className="flex rounded-lg border border-edge bg-surface-2 p-0.5">
        <Seg active={mode === "simulated"} onClick={() => setMode("simulated")}>
          <FlaskConical size={13} />
          <span>Simulated</span>
        </Seg>
        <Seg active={mode === "ai"} onClick={() => setMode("ai")}>
          <Bot size={13} />
          <span>AI</span>
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              aiAvailable ? "bg-win" : "bg-edge"
            }`}
            title={
              aiAvailable
                ? "LLM endpoint configured"
                : "No API key - falls back to simulated"
            }
          />
        </Seg>
      </div>
    </div>
  );
}

function Seg({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold ${
        active ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
