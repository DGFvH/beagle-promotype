export default function GenerationModeToggle({ mode, setMode, aiAvailable, compact }) {
  return (
    <div className="flex items-center gap-2">
      {!compact && (
        <span className="text-[11px] text-muted">Evolution</span>
      )}
      <div className="flex rounded-lg border border-edge bg-surface-2 p-0.5">
        <Seg active={mode === "simulated"} onClick={() => setMode("simulated")}>
          Simulated
        </Seg>
        <Seg active={mode === "ai"} onClick={() => setMode("ai")}>
          <span className="inline-flex items-center gap-1">
            AI
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                aiAvailable ? "bg-win" : "bg-edge"
              }`}
              title={
                aiAvailable
                  ? "LLM endpoint configured"
                  : "No API key — falls back to simulated"
              }
            />
          </span>
        </Seg>
      </div>
    </div>
  );
}

function Seg({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-2.5 py-1 text-xs font-medium ${
        active ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
