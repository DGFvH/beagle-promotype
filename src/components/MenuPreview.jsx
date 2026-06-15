import { Grid2X2, Search } from "lucide-react";
import { normalizeConfig } from "../lib/engine.js";

const ITEMS = ["Home", "Products", "Pricing", "About", "Contact"];

const JUSTIFY = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
};

const SPACING = {
  compact: "gap-1",
  comfortable: "gap-2",
  loose: "gap-3",
};

const ITEM_PAD = {
  compact: "px-1.5 py-1",
  comfortable: "px-2 py-1",
  loose: "px-2.5 py-1.5",
};

function NavIcon({ size = 12 }) {
  return <Grid2X2 size={size} strokeWidth={2} className="opacity-55" />;
}

function itemClass(navStyle, weight) {
  const w = weight === "bold" ? "font-semibold" : "font-normal";
  if (navStyle === "pills") {
    return `rounded-md border border-accent/20 bg-accent/10 text-accent ${w}`;
  }
  if (navStyle === "underline") {
    return `border-b-2 border-accent text-accent ${w}`;
  }
  return `${w} text-ink`;
}

export default function MenuPreview({ config, variant = "default" }) {
  const hero = variant === "hero";
  const compact = variant === "compact";
  const c = normalizeConfig(config);
  const justify = JUSTIFY[c.align] ?? "justify-start";
  const gap = SPACING[c.spacing] ?? SPACING.comfortable;
  const pad = ITEM_PAD[c.spacing] ?? ITEM_PAD.comfortable;
  const navSize = hero ? "text-[12px] sm:text-[13px]" : "text-[12px]";

  const frameCls = hero
    ? "min-h-[18rem] overflow-hidden rounded-lg border border-edge bg-white shadow-sm"
    : compact
      ? "min-h-[12rem] overflow-hidden rounded-lg border border-edge bg-white shadow-sm"
      : "min-h-[13rem] overflow-hidden rounded-lg border border-edge bg-white shadow-sm";

  return (
    <div className={frameCls}>
      <div className={`flex items-center gap-2 border-b border-edge bg-surface-2 px-3 ${compact ? "py-1.5" : "py-2"}`}>
        <div className="flex gap-1">
          <span className="h-2 w-2 rounded-full bg-edge" />
          <span className="h-2 w-2 rounded-full bg-edge" />
          <span className="h-2 w-2 rounded-full bg-edge" />
        </div>
        <div className="ml-1 flex min-w-0 flex-1 items-center gap-1.5 rounded-md border border-edge bg-surface px-2 py-1 text-[10px] text-muted">
          <Search size={11} />
          <span className="truncate">acme-software.com/navigation</span>
        </div>
      </div>

      <div className={`border-b border-edge bg-surface px-3 ${compact ? "py-2" : "py-3"}`}>
        <div className={`${compact ? "mb-2" : "mb-3"} flex items-center justify-between gap-3`}>
          <div className="flex items-center gap-2">
            <div className="grid h-5 w-5 place-items-center rounded-md bg-accent text-[10px] font-semibold text-white">
              A
            </div>
            <div>
              <div className="text-xs font-semibold text-ink">Acme</div>
              {!compact && (
                <div className="text-[10px] text-muted">Customer workspace</div>
              )}
            </div>
          </div>
          <div className="hidden rounded-md border border-edge bg-surface-2 px-2 py-1 text-[10px] font-medium text-muted lg:block">
            Live variant
          </div>
        </div>

        <nav className={`flex flex-wrap items-center ${gap} ${justify}`}>
          {ITEMS.map((label) => (
            <span
              key={label}
              className={`inline-flex whitespace-nowrap items-center gap-1 ${navSize} ${pad} ${itemClass(
                c.navStyle,
                c.weight
              )}`}
            >
              {c.icon && <NavIcon size={hero ? 13 : 12} />}
              {label}
            </span>
          ))}
        </nav>
      </div>

      <div className={`bg-[#f7f9fa] px-3 ${compact ? "py-3" : "py-4"}`}>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="min-w-0 flex-1">
            <div className="h-2 w-3/5 rounded-sm bg-[#d9e1e5]" />
            <div className="mt-1.5 h-2 w-4/5 rounded-sm bg-[#e4eaed]" />
            <div className="mt-1.5 h-2 w-2/5 rounded-sm bg-[#e4eaed]" />
            <div className={`${compact ? "mt-3" : "mt-4"} flex gap-2`}>
              <div className={`${compact ? "h-6 w-16" : "h-8 w-20"} rounded-md bg-accent`} />
              <div className={`${compact ? "h-6 w-12" : "h-8 w-16"} rounded-md border border-edge bg-white`} />
            </div>
          </div>
          <div className={`grid w-full grid-cols-3 gap-1.5 sm:w-28`}>
            <PreviewTile hot={c.navStyle === "pills"} />
            <PreviewTile hot={c.align === "center"} />
            <PreviewTile hot={c.icon} />
            <PreviewTile hot={c.weight === "bold"} />
            <PreviewTile hot={c.spacing === "loose"} />
            <PreviewTile hot={c.navStyle === "underline"} />
          </div>
        </div>

        {!hero && !compact && (
          <div className="mt-4 rounded-lg border border-edge bg-white p-3">
            <div className="mb-2 flex items-center justify-between text-[10px] text-muted">
              <span>Observed click path</span>
              <span className="font-semibold tabular-nums text-accent">sample</span>
            </div>
            <div className="flex h-9 items-end gap-1">
              {[38, 52, 46, 68, 58, 74, 62].map((h, i) => (
                <span
                  key={i}
                  className="flex-1 rounded-sm bg-accent/25"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewTile({ hot }) {
  return (
    <div
      className={`h-8 rounded-md border ${
        hot ? "border-accent/25 bg-accent/15" : "border-edge bg-white"
      }`}
    />
  );
}
