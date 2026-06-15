const SPEEDS = [1, 2, 4];

export default function ControlBar({
  onSimulate,
  onFastForward,
  onDecide,
  roundProgress,
  totalVisitors,
  roundTarget,
  canDecide,
  busy,
  isPlaying,
  onTogglePlay,
  speed,
  setSpeed,
}) {
  const roundFull = roundProgress >= 1;
  const manualDisabled = busy || isPlaying;

  return (
    <div className="sticky bottom-4 z-20 mx-auto w-full">
      <div className="surface-card rounded-xl p-4">
        <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted">
          <span>
            <span className="font-medium text-ink">{totalVisitors.toLocaleString()}</span>
            {" / "}
            {roundTarget.toLocaleString()} visitors
          </span>
          <span className={roundFull ? "font-medium text-win" : ""}>
            {roundFull ? "Window complete" : `${Math.round(roundProgress * 100)}%`}
          </span>
        </div>

        <div className="mb-3 h-1 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500 ease-out"
            style={{ width: `${Math.round(roundProgress * 100)}%` }}
          />
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            onClick={onTogglePlay}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              isPlaying
                ? "border border-edge bg-surface-2 text-ink"
                : "btn-primary"
            }`}
          >
            {isPlaying ? "Pause autoplay" : "Autoplay"}
          </button>

          <div className="ml-auto flex rounded-lg border border-edge bg-surface-2 p-0.5">
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                  speed === s ? "bg-surface text-ink shadow-sm" : "text-muted"
                }`}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onSimulate(100)}
            disabled={manualDisabled}
            className="flex-1 rounded-lg border border-edge bg-surface px-3 py-2 text-sm font-medium text-ink hover:bg-surface-2 disabled:opacity-40"
          >
            +100 visitors
          </button>
          <button
            onClick={onFastForward}
            disabled={manualDisabled || roundFull}
            className="flex-1 rounded-lg border border-edge bg-surface px-3 py-2 text-sm font-medium text-ink hover:bg-surface-2 disabled:opacity-40"
          >
            Fill window
          </button>
          <button
            onClick={onDecide}
            disabled={manualDisabled || !canDecide}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-40 ${
              roundFull ? "btn-primary" : "border border-edge bg-surface text-ink hover:bg-surface-2"
            }`}
          >
            Decide & evolve
          </button>
        </div>
      </div>
    </div>
  );
}
