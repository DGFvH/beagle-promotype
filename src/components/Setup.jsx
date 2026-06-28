import { useState } from "react";
import { METRICS } from "../lib/metrics.js";
import { DEFAULT_CONFIG, VARIANT_GALLERY } from "../lib/demoSeed.js";
import MenuPreview from "./MenuPreview.jsx";

// One hero attribute away from DEFAULT_CONFIG — the first challenger preview.
const FIRST_CHALLENGER = {
  ...DEFAULT_CONFIG,
  layout: "center",
};

export default function Setup({ defaultName, defaultMetric, onStart }) {
  const [name, setName] = useState(defaultName);
  const [metric, setMetric] = useState(defaultMetric);
  const [busy, setBusy] = useState(false);

  const handleStart = async () => {
    setBusy(true);
    try {
      await onStart({ name, goalMetric: metric });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl animate-pop">
      <div className="rounded-lg border border-edge bg-surface p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-ink">Configure experiment</h2>
        <p className="mt-1 text-sm text-muted">
          Name the test and choose the metric to optimize, or browse the variant
          gallery below for the kinds of champions and challengers beagle cycles through.
        </p>

        <label className="mt-6 block">
          <span className="text-xs font-medium text-muted">Experiment name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-edge bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10"
            placeholder="Homepage hero"
          />
        </label>

        <div className="mt-6">
          <span className="text-xs font-medium text-muted">Goal metric</span>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {Object.values(METRICS).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMetric(m.id)}
                className={`rounded-lg border p-3 text-left ${
                  metric === m.id
                    ? "border-accent/40 bg-surface-2 ring-1 ring-accent/15"
                    : "border-edge bg-surface hover:bg-surface-2"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-ink">{m.short}</span>
                  <span className="text-[10px] font-medium text-muted">
                    {m.direction === "maximize" ? "max" : "min"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-snug text-muted">{m.help}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <span className="text-xs font-medium text-muted">Generation 1 pair</span>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <StarterPreview tag="A" name="Champion" config={DEFAULT_CONFIG} />
            <StarterPreview tag="B" name="Challenger" config={FIRST_CHALLENGER} />
          </div>
        </div>

        <div className="mt-8">
          <span className="text-xs font-medium text-muted">
            Variant gallery - examples from the demo lineage
          </span>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {VARIANT_GALLERY.map((v) => (
              <div key={v.label} className="rounded-lg border border-edge bg-surface-2 p-2">
                <div className="mb-1.5 text-[11px] font-medium text-muted">{v.label}</div>
                <MenuPreview config={v.config} />
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleStart}
          disabled={busy || !name.trim()}
          className="btn-primary mt-6 w-full rounded-lg py-2.5 text-sm font-semibold"
        >
          {busy ? "Starting..." : "Start fresh experiment"}
        </button>
      </div>
    </div>
  );
}

function StarterPreview({ tag, name, config }) {
  return (
    <div className="rounded-lg border border-edge bg-surface-2 p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded bg-surface text-[11px] font-semibold text-accent">
          {tag}
        </span>
        <span className="text-sm font-medium text-ink">{name}</span>
      </div>
      <MenuPreview config={config} />
    </div>
  );
}
