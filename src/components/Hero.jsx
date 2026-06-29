import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  BookOpen,
  PlayCircle,
  Plug,
  ShieldCheck,
  Sparkles,
  BarChart3,
  Users,
  CheckCircle2,
} from "lucide-react";
import { LogoMark } from "./Logo.jsx";
import HeroEvolutionVisual from "./HeroEvolutionVisual.jsx";

const LOOP = ["Test", "Measure", "Decide", "Evolve"];

const PILLARS = [
  { icon: Sparkles, label: "Claude proposes the variant" },
  { icon: ShieldCheck, label: "Respects your design system & guardrails" },
  { icon: BarChart3, label: "Real GA4 results, read back live" },
  { icon: Users, label: "Per-segment breakdown" },
  { icon: CheckCircle2, label: "Human-approved — nothing ships unseen" },
];

// Candidate keywords the headline cycles through — dramatizes Beagle "testing"
// the very hero you are reading. Each must stay truthful and on-message.
const CYCLE_WORDS = ["self-improving", "self-optimizing", "always-on", "evidence-based"];

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const isTouch = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(hover: none)").matches;

/* ── Cycling A/B headline keyword ─────────────────────────────────────────────
   Keeps the parent <h1> non-empty at all times (the smoke test asserts a visible
   non-empty h1); only the inner span crossfades. Pins slot width to the widest
   variant so layout never shifts. Static under reduced motion. */
function CyclingWord() {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState("in"); // "in" | "out"
  const [minWidth, setMinWidth] = useState(null);
  const measureRef = useRef(null);
  const reduced = useRef(false);

  useLayoutEffect(() => {
    reduced.current = prefersReducedMotion();
    // Measure the widest candidate so the inline slot never reflows.
    const el = measureRef.current;
    if (el) {
      let w = 0;
      for (const span of el.children) w = Math.max(w, span.offsetWidth);
      if (w > 0) setMinWidth(w);
    }
  }, []);

  useEffect(() => {
    if (reduced.current) return;
    let outT;
    const cycle = setInterval(() => {
      setPhase("out");
      outT = setTimeout(() => {
        setIdx((i) => (i + 1) % CYCLE_WORDS.length);
        setPhase("in");
      }, 400);
    }, 2600);
    return () => {
      clearInterval(cycle);
      clearTimeout(outT);
    };
  }, []);

  return (
    <span
      className="hero-cycle"
      style={minWidth ? { minWidth: `${minWidth}px` } : undefined}
    >
      {/* Hidden measurement rig — all candidates, used once to size the slot. */}
      <span
        ref={measureRef}
        aria-hidden
        style={{
          position: "absolute",
          visibility: "hidden",
          pointerEvents: "none",
          whiteSpace: "nowrap",
        }}
      >
        {CYCLE_WORDS.map((w) => (
          <span key={w} style={{ display: "inline-block" }}>
            {w}
          </span>
        ))}
      </span>
      <span
        key={idx}
        className={`hero-cycle-word ${phase === "out" ? "is-out" : "is-in"}`}
      >
        {CYCLE_WORDS[idx]}
      </span>
      <span className="hero-caret" aria-hidden />
    </span>
  );
}

/* ── Count-up stat ────────────────────────────────────────────────────────────
   Animates from 0 → value on mount with rAF. Reduced motion / no-rAF shows the
   final value immediately. Always renders a real number (never blank). */
function CountUp({ value, suffix = "", prefix = "", className = "", duration = 1400 }) {
  const [display, setDisplay] = useState(() =>
    prefersReducedMotion() ? value : 0
  );
  const [popped, setPopped] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDisplay(value);
      return;
    }
    let raf;
    const start = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3); // easeOutCubic
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      setDisplay(Math.round(ease(t) * value));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setPopped(true);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return (
    <span className={`hero-stat ${popped ? "hero-stat-pop" : ""} ${className}`}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

export default function Hero({ onStart, onMethodology, onConfigure }) {
  const stageRef = useRef(null);

  /* ── Cursor-reactive spotlight + parallax chips (desktop, pointer only) ──────
     One pointermove listener, throttled to one rAF/frame. Updates CSS vars on the
     stage (--mx/--my for the spotlight, --par-x/--par-y for chip parallax). No
     React re-render. Disabled on touch and under reduced motion. */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (prefersReducedMotion() || isTouch()) return;

    let raf = 0;
    let pending = null;

    const apply = () => {
      raf = 0;
      if (!pending) return;
      const { x, y } = pending;
      const rect = stage.getBoundingClientRect();
      const px = ((x - rect.left) / rect.width) * 100;
      const py = ((y - rect.top) / rect.height) * 100;
      stage.style.setProperty("--mx", `${px.toFixed(2)}%`);
      stage.style.setProperty("--my", `${py.toFixed(2)}%`);
      stage.style.setProperty("--spot-on", "1");
      // Parallax: chips drift opposite the cursor, ~ ±10px from centre.
      const dx = (x - (rect.left + rect.width / 2)) / rect.width;
      const dy = (y - (rect.top + rect.height / 2)) / rect.height;
      stage.style.setProperty("--par-x", `${(-dx * 16).toFixed(1)}px`);
      stage.style.setProperty("--par-y", `${(-dy * 16).toFixed(1)}px`);
    };

    const onMove = (e) => {
      pending = { x: e.clientX, y: e.clientY };
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      stage.style.setProperty("--spot-on", "0");
      stage.style.setProperty("--par-x", "0px");
      stage.style.setProperty("--par-y", "0px");
    };

    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerleave", onLeave);
    return () => {
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section
      ref={stageRef}
      className="hero-stage flex w-full flex-col justify-center overflow-hidden py-8 sm:py-12"
    >
      {/* Living background layers — aurora mesh + cursor spotlight. Decorative,
          behind content, never intercept pointer events. */}
      <div className="hero-aurora" aria-hidden />
      <div className="hero-spotlight" aria-hidden />

      <div className="grid w-full items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
        {/* ── Left column: copy + CTAs + trust row ─────────────────────────── */}
        <div className="relative z-10 min-w-0">
          {/* Eyebrow — one refined pill (brand + product), the restrained badge
              treatment shared across all three references. */}
          <div className="animate-pop hero-stagger-1">
            <span className="hero-eyebrow inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-[13px] font-semibold tracking-tight text-ink shadow-sm">
              <LogoMark size={18} />
              <span className="text-ink">beagle</span>
              <span className="h-3.5 w-px bg-edge" aria-hidden />
              <span className="inline-flex items-center gap-1 text-[12px] font-medium text-accent">
                <Sparkles size={12} aria-hidden />
                Powered by Claude
              </span>
            </span>
          </div>

          {/* Stable, always-non-empty h1; only the keyword span cycles. */}
          <h1 className="hero-headline animate-pop hero-stagger-1 mt-6 text-balance font-serif font-medium text-ink">
            Let Claude turn your hero section into a{" "}
            <CyclingWord />{" "}
            A/B test.
          </h1>

          {/* "testing variant n" micro-indicator — dramatizes the live test. */}
          <div className="animate-pop hero-stagger-2 mt-3" aria-hidden>
            <span className="hero-testing">
              <span className="hero-testing-dot" />
              optimizing — testing variants live
            </span>
          </div>

          <p className="animate-pop hero-stagger-2 mt-4 max-w-xl text-pretty text-base leading-7 text-muted sm:text-[1.0625rem] sm:leading-8">
            Connect your real page and analytics. Claude proposes a hero variant and
            a hypothesis that respect your design system and guardrails — you approve
            it, Beagle ships it with cookie-based assignment, then reads the{" "}
            <span className="font-medium text-ink">real results</span> back and breaks
            them down per segment.
          </p>

          {/* Bold count-up stat callouts (fibr-style). Animate on mount. */}
          <div className="animate-pop hero-stagger-3 mt-6 flex flex-wrap items-stretch gap-3">
            <div className="hero-float-chip flex items-center gap-3 rounded-2xl px-4 py-3">
              <CountUp
                value={81}
                prefix="+"
                suffix="%"
                className="text-2xl font-bold leading-none text-accent sm:text-3xl"
              />
              <span className="text-[12px] font-medium leading-tight text-muted">
                CTR lift
                <br />
                over 8 rounds
              </span>
            </div>
            <div className="hero-float-chip flex items-center gap-3 rounded-2xl px-4 py-3">
              <span className="flex items-baseline gap-1 text-2xl font-bold leading-none text-ink sm:text-3xl">
                <CountUp value={38} suffix="%" className="text-muted" />
                <span className="text-base font-semibold text-muted">→</span>
                <CountUp value={69} suffix="%" className="text-accent" />
              </span>
              <span className="text-[12px] font-medium leading-tight text-muted">
                champion
                <br />
                conversion
              </span>
            </div>
          </div>

          <div className="animate-pop hero-stagger-3 mt-7 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onStart}
              className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold shadow-[0_8px_22px_-8px_rgba(36,87,72,0.55)] hover:-translate-y-0.5"
            >
              <PlayCircle size={18} />
              See it work
            </button>
            <button
              type="button"
              onClick={onConfigure}
              className="glass inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-ink shadow-sm hover:-translate-y-0.5"
            >
              <Plug size={17} />
              Connect your site
            </button>
            <button
              type="button"
              onClick={onMethodology}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-medium text-muted hover:text-ink hover:-translate-y-0.5"
            >
              <BookOpen size={17} />
              How it works
            </button>
          </div>

          <ul className="animate-pop hero-stagger-4 mt-8 grid gap-x-6 gap-y-2.5 text-[13px] text-muted sm:grid-cols-2">
            {PILLARS.map(({ icon: Icon, label }) => (
              <li key={label} className="inline-flex items-center gap-2">
                <Icon size={15} className="shrink-0 text-accent" aria-hidden />
                {label}
              </li>
            ))}
          </ul>

          {/* Loop / stats strip — a designed footer element, dot-separated like
              the references' subtle trust rows. */}
          <div className="hero-loop animate-pop hero-stagger-5 mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted">
            <span className="font-semibold uppercase tracking-wide text-[11px] text-muted">
              The loop
            </span>
            {LOOP.map((step, i) => (
              <span key={step} className="inline-flex items-center gap-2">
                {i > 0 && <span className="h-px w-4 bg-edge" aria-hidden />}
                <span className="font-medium text-ink">{step}</span>
              </span>
            ))}
            <span className="text-muted">— nothing goes live without your approval.</span>
          </div>
        </div>

        {/* ── Right column: elevated product centerpiece ───────────────────── */}
        <div className="relative z-10 min-w-0">
          <div className="hero-showcase animate-pop hero-stagger-3 relative mx-auto max-w-xl px-3 lg:mx-0">
            {/* Floating accent chips — parallax-drift opposite the cursor for
                depth, plus the existing slow bob. Decorative. */}
            <div
              className="hero-parallax pointer-events-none absolute -bottom-4 left-5 z-20 hidden sm:block"
              aria-hidden
            >
              <div className="hero-float-chip hero-chip-float inline-flex -rotate-1 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium text-muted">
                <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-win" />
                live traffic
              </div>
            </div>

            {/* Rotating gradient ring wraps the pedestal panel — coframe-style
                living card border. */}
            <div className="hero-ring">
              <div className="hero-showcase-panel relative">
                <HeroEvolutionVisual />
                {/* Diagonal scan sweep over the whole frame. Decorative. */}
                <div className="hero-scan" aria-hidden />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
