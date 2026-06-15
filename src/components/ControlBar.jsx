import { CheckCircle2, FastForward, Pause, Play, UsersRound } from "lucide-react";

const SPEEDS = [1, 2];

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
  const PlayIcon = isPlaying ? Pause : Play;

  return (
    <section className="rounded-lg border border-edge bg-surface p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2 text-[11px] text-muted">
        <span>
          <span className="font-semibold text-ink">{totalVisitors.toLocaleString()}</span>
          {" / "}
          {roundTarget.toLocaleString()}
        </span>
        <span className={roundFull ? "font-semibold text-win" : ""}>
          {roundFull ? "complete" : `${Math.round(roundProgress * 100)}%`}
        </span>
      </div>

      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-accent transition-all duration-700 ease-out"
          style={{ width: `${Math.round(roundProgress * 100)}%` }}
        />
      </div>

      <div className="mb-2 grid grid-cols-[1fr_auto] gap-2">
        <button
          type="button"
          onClick={onTogglePlay}
          className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
            isPlaying
              ? "border border-edge bg-surface-2 text-ink"
              : "btn-primary"
          }`}
        >
          <PlayIcon size={16} />
          {isPlaying ? "Pause" : "Autoplay"}
        </button>

        <div className="flex rounded-lg border border-edge bg-surface-2 p-0.5">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s)}
              className={`h-8 rounded-md px-2 text-xs font-semibold ${
                speed === s ? "bg-surface text-ink shadow-sm" : "text-muted"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-2">
        <ActionButton
          onClick={() => onSimulate(100)}
          disabled={manualDisabled}
          icon={<UsersRound size={15} />}
        >
          +100 visitors
        </ActionButton>
        <ActionButton
          onClick={onFastForward}
          disabled={manualDisabled || roundFull}
          icon={<FastForward size={15} />}
        >
          Fill window
        </ActionButton>
        <ActionButton
          onClick={onDecide}
          disabled={manualDisabled || !canDecide}
          icon={<CheckCircle2 size={15} />}
          primary={roundFull}
        >
          Decide & evolve
        </ActionButton>
      </div>
    </section>
  );
}

function ActionButton({ children, onClick, disabled, icon, primary }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-8 items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
        primary
          ? "btn-primary"
          : "border border-edge bg-surface text-ink hover:bg-surface-2"
      }`}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}
