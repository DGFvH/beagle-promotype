import { normalizeConfig } from "../lib/engine.js";

export default function ConfigChips({ config, size = "sm" }) {
  const c = normalizeConfig(config);
  const pad = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";
  const chips = [
    { k: "align", v: c.align },
    { k: "weight", v: c.weight },
    { k: "icons", v: c.icon ? "on" : "off" },
    { k: "spacing", v: c.spacing },
    { k: "style", v: c.navStyle },
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
