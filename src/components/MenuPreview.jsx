import { normalizeConfig } from "../lib/engine.js";

const ITEMS = ["Home", "Products", "Pricing", "About", "Contact"];

const JUSTIFY = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
};

const SPACING = {
  compact: "gap-0.5",
  comfortable: "gap-1.5",
  loose: "gap-3",
};

const ITEM_PAD = {
  compact: "px-1.5 py-0.5",
  comfortable: "px-2 py-1",
  loose: "px-2.5 py-1.5",
};

function NavIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" className="opacity-50">
      <rect x="1" y="1" width="5" height="5" rx="1" fill="currentColor" />
      <rect x="8" y="1" width="5" height="5" rx="1" fill="currentColor" />
      <rect x="1" y="8" width="5" height="5" rx="1" fill="currentColor" />
      <rect x="8" y="8" width="5" height="5" rx="1" fill="currentColor" />
    </svg>
  );
}

function itemClass(navStyle, weight, hero) {
  const w = weight === "bold" ? "font-semibold" : "font-normal";
  if (navStyle === "pills")
    return `rounded-md ${hero ? "bg-[#eceae6]" : "bg-[#e8e4dc]"} ${w}`;
  if (navStyle === "underline")
    return `border-b-2 border-[#3a5248] pb-0.5 ${w}`;
  return w;
}

export default function MenuPreview({ config, variant = "default" }) {
  const hero = variant === "hero";
  const c = normalizeConfig(config);
  const justify = JUSTIFY[c.align] ?? "justify-start";
  const gap = SPACING[c.spacing] ?? SPACING.comfortable;
  const pad = ITEM_PAD[c.spacing] ?? ITEM_PAD.comfortable;
  const navSize = hero ? "text-[13px]" : "text-[12px]";

  const frameCls = hero
    ? "hero-preview-frame overflow-hidden rounded-lg"
    : "overflow-hidden rounded-lg border border-[#d4cfc6] bg-[#f0ece6] shadow-sm";

  const chromeBorder = hero ? "border-[#e2e0dc]" : "border-[#d4cfc6]";
  const barBg = hero ? "bg-[#f5f4f2]" : "bg-[#e8e4dc]";
  const surfaceBg = hero ? "bg-white" : "bg-[#f0ece6]";
  const bodyBg = hero ? "bg-[#faf9f7]" : "bg-[#e8e4dc]";

  return (
    <div className={frameCls}>
      <div className={`flex items-center gap-2 border-b ${chromeBorder} ${barBg} px-3 py-2`}>
        <div className="flex gap-1">
          <span className={`h-2 w-2 rounded-full ${hero ? "bg-[#ddd9d4]" : "bg-[#d4cfc6]"}`} />
          <span className={`h-2 w-2 rounded-full ${hero ? "bg-[#ddd9d4]" : "bg-[#d4cfc6]"}`} />
          <span className={`h-2 w-2 rounded-full ${hero ? "bg-[#ddd9d4]" : "bg-[#d4cfc6]"}`} />
        </div>
        <div
          className={`ml-1 flex-1 rounded-md border ${chromeBorder} ${surfaceBg} px-2 py-0.5 text-[10px] text-[#7a756e]`}
        >
          acme-software.com
        </div>
      </div>

      <div className={`border-b ${chromeBorder} ${surfaceBg} px-4 ${hero ? "py-2" : "py-2.5"}`}>
        <div className={`flex items-center gap-2 ${hero ? "mb-1.5" : "mb-2"}`}>
          <div className="h-4 w-4 rounded bg-[#3a5248]" />
          <span className="text-[11px] font-semibold text-[#1c1b19]">Acme</span>
        </div>
        <nav className={`flex flex-wrap items-center ${gap} ${justify}`}>
          {ITEMS.map((label) => (
            <span
              key={label}
              className={`flex items-center gap-1 ${navSize} text-[#3d3a36] ${pad} ${itemClass(c.navStyle, c.weight, hero)}`}
            >
              {c.icon && <NavIcon size={hero ? 13 : 12} />}
              {label}
            </span>
          ))}
        </nav>
      </div>

      <div className={`space-y-2 ${bodyBg} px-4 ${hero ? "py-3" : "py-4"}`}>
        <div className={`h-2 w-3/5 rounded-sm ${hero ? "bg-[#e8e6e2]" : "bg-[#d4cfc6]"}`} />
        <div className={`h-2 w-2/5 rounded-sm ${hero ? "bg-[#eceae6]" : "bg-[#d9d4cc]"}`} />
        {!hero && (
          <>
            <p className="pt-1 text-[10px] leading-relaxed text-[#7a756e]">
              Visitors land here and use the navigation to find what they need.
            </p>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              <div className="h-10 rounded border border-[#d4cfc6] bg-[#f0ece6]" />
              <div className="h-10 rounded border border-[#d4cfc6] bg-[#f0ece6]" />
              <div className="h-10 rounded border border-[#d4cfc6] bg-[#f0ece6]" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
