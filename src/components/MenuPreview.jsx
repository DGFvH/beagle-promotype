// Basic HERO preview (FR-A2). Renders a constrained hero variant from the
// enum-only HERO_DESIGN_SPACE config. Functional, not polished — TODO(beagle-
// hero-visuals / beagle-ui-ux): richer hero rendering, real design-system
// tokens, and per-variant media assets belong in a later visual pass.
import { ImageIcon, PlayCircle, Sparkles, Search } from "lucide-react";
import { normalizeConfig } from "../lib/engine.js";

const ALIGN_CLASS = {
  left: "items-start text-left",
  center: "items-center text-center",
  split: "items-start text-left",
};

function ctaClass(style) {
  if (style === "outline") return "border border-accent text-accent bg-transparent";
  if (style === "soft") return "border border-accent/20 bg-accent/10 text-accent";
  return "bg-accent text-white"; // solid
}

function MediaBlock({ media, compact }) {
  if (media === "none") return null;
  const h = compact ? "h-16" : "h-24";
  const label = { illustration: "Illustration", screenshot: "Screenshot", video: "Video" }[media];
  const Icon = media === "video" ? PlayCircle : media === "illustration" ? Sparkles : ImageIcon;
  return (
    <div
      className={`mt-3 grid w-full ${h} place-items-center rounded-md border border-edge bg-surface-2 text-muted`}
    >
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium">
        <Icon size={compact ? 14 : 16} />
        {label}
      </span>
    </div>
  );
}

export default function MenuPreview({ config, variant = "default" }) {
  const hero = variant === "hero";
  const compact = variant === "compact";
  const c = normalizeConfig(config);
  const split = c.layout === "split";
  const align = ALIGN_CLASS[c.layout] ?? ALIGN_CLASS.left;
  const headingSize = hero ? "text-base sm:text-lg" : compact ? "text-sm" : "text-[15px]";

  const frameCls = hero
    ? "min-h-[18rem] overflow-hidden rounded-lg border border-edge bg-white shadow-sm"
    : compact
      ? "min-h-[12rem] overflow-hidden rounded-lg border border-edge bg-white shadow-sm"
      : "min-h-[13rem] overflow-hidden rounded-lg border border-edge bg-white shadow-sm";

  const copy = (
    <div className={`flex min-w-0 flex-1 flex-col ${align}`}>
      <h3 className={`font-semibold leading-tight text-ink ${headingSize}`}>{c.headline}</h3>
      <p className={`mt-1.5 text-[12px] leading-snug text-muted ${compact ? "line-clamp-2" : ""}`}>
        {c.subheadline}
      </p>
      <div className={`mt-3 flex ${c.layout === "center" ? "justify-center" : "justify-start"}`}>
        <span
          className={`inline-flex items-center rounded-md px-3 py-1.5 text-[12px] font-semibold ${ctaClass(
            c.ctaStyle
          )}`}
        >
          {c.ctaLabel}
        </span>
      </div>
    </div>
  );

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
          <span className="truncate">acme-software.com</span>
        </div>
      </div>

      <div className={`bg-[#f7f9fa] px-4 ${compact ? "py-3" : "py-5"}`}>
        {split && !compact ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {copy}
            <div className="min-w-0 flex-1">
              <MediaBlock media={c.media === "none" ? "screenshot" : c.media} compact={compact} />
            </div>
          </div>
        ) : (
          <>
            {copy}
            <MediaBlock media={c.media} compact={compact} />
          </>
        )}
      </div>
    </div>
  );
}
