import { normalizeConfig } from "../lib/engine.js";

export default function ConfigChips({ config, size = "sm" }) {
  const c = normalizeConfig(config);
  const pad = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";
  const chips = [
    { k: "layout", v: c.layout },
    { k: "cta", v: c.ctaLabel },
    { k: "cta style", v: c.ctaStyle },
    { k: "media", v: c.media },
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <span
          key={chip.k}
          className={`inline-flex items-center gap-1 rounded-md border border-edge bg-surface-2 ${pad} text-muted`}
        >
          <span>{chip.k}</span>
          <span className="font-medium text-ink">{chip.v}</span>
        </span>
      ))}
    </div>
  );
}
