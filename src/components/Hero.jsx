import { useEffect, useRef } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Database,
  FileText,
  Gauge,
  GitBranch,
  LineChart,
  Link2,
  MousePointerClick,
  PlayCircle,
  Plug,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { LogoMark } from "./Logo.jsx";

const LOOP = ["Connect", "Analyze", "Mutate", "Approve", "Run", "Segment"];

const SIGNALS = [
  { label: "CTR delta in demo", value: "+31pts", detail: "38% baseline to 69% champion" },
  { label: "Audience reversal", value: "-6pts", detail: "paid traffic keeps the old hero" },
  { label: "Next hypotheses", value: "4", detail: "queued from segment evidence" },
];

const STACK_ITEMS = [
  { icon: Plug, label: "Source", value: "GitHub, WordPress, Framer" },
  { icon: Database, label: "Analytics", value: "GA4 or Looker evidence" },
  { icon: ShieldCheck, label: "Control", value: "Approval before launch" },
  { icon: Users, label: "Audience", value: "Segment-level serving" },
];

const PROBLEM_POINTS = [
  {
    icon: AlertTriangle,
    title: "One hero is asked to convert many intents",
    text: "Paid traffic, organic search, AI referrals, mobile visitors, and returning buyers see the same above-the-fold message even when their intent is different.",
  },
  {
    icon: MousePointerClick,
    title: "Teams see the leak but not the mutation",
    text: "A funnel report can show weak hero engagement. It rarely shows which headline, CTA, proof block, or layout change should run next.",
  },
  {
    icon: BarChart3,
    title: "Averages flatten the decision",
    text: "The variant can win on aggregate while hurting a segment you paid to acquire. That is where ordinary A/B reporting stops too early.",
  },
];

const FLOW = [
  {
    icon: Link2,
    title: "Detect the current hero",
    text: "Beagle reads the live URL or source and extracts the actual headline, CTA, proof, media, and layout constraints.",
  },
  {
    icon: Sparkles,
    title: "Generate a concrete mutation",
    text: "Claude proposes a specific hero change: what copy changes, what proof moves, what CTA changes, and why that should affect the KPI.",
  },
  {
    icon: ShieldCheck,
    title: "Gate the diff",
    text: "The exact before/after is reviewed before launch. Guardrails block off-brand, legal, or structurally unsafe changes.",
  },
  {
    icon: GitBranch,
    title: "Run sticky traffic",
    text: "Visitors stay assigned while Beagle records exposure, engagement, conversion, and confidence over each generation.",
  },
  {
    icon: Users,
    title: "Split the winner by audience",
    text: "The final readout separates aggregate lift from heterogeneous outcomes so the next test is not a blind average.",
  },
];

const MUTATIONS = [
  { label: "Headline", before: "Project analytics for scaling teams", after: "Find the hero message that converts each traffic source" },
  { label: "CTA", before: "Book a demo", after: "Analyze my landing page" },
  { label: "Proof", before: "Trusted by modern teams", after: "38% to 69% CTR in 8 approved rounds" },
  { label: "Layout", before: "Generic product mockup", after: "Experiment evidence beside the CTA" },
];

const CHANNELS = [
  { label: "Organic", value: 61, change: "+9", tone: "win" },
  { label: "Paid", value: 43, change: "-6", tone: "lose" },
  { label: "Mobile", value: 55, change: "+14", tone: "win" },
];

const GENERATIONS = [38, 46, 52, 57, 61, 64, 67, 69];

const SEGMENTS = [
  { label: "Organic search", champion: 52, challenger: 61, delta: "+9", confidence: 82, winner: "challenger" },
  { label: "Paid traffic", champion: 49, challenger: 43, delta: "-6", confidence: 74, winner: "champion" },
  { label: "Mobile visitors", champion: 41, challenger: 55, delta: "+14", confidence: 88, winner: "challenger" },
  { label: "Returning visitors", champion: 58, challenger: 62, delta: "+4", confidence: 64, winner: "challenger" },
];

export default function Hero({ onStart, onMethodology, onConfigure }) {
  const stageRef = useRef(null);

  useEffect(() => {
    const root = stageRef.current;
    if (!root) return undefined;

    const items = Array.from(root.querySelectorAll("[data-reveal]"));
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      items.forEach((item) => item.classList.add("is-visible"));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
    );

    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={stageRef}
      aria-labelledby="hero-heading"
      className="hero-stage flex w-full flex-col overflow-hidden"
    >
      <div className="hero-scroll-stack">
        <section className="hero-panel hero-panel-first grid items-center gap-8 py-8 lg:grid-cols-[minmax(0,0.86fr)_minmax(30rem,1fr)] lg:py-10">
          <div className="relative z-10 min-w-0">
            <div className="animate-pop hero-stagger-1">
              <span className="hero-eyebrow inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-[13px] font-semibold text-ink shadow-sm">
                <LogoMark size={18} />
                <span>beagle</span>
                <span className="h-3.5 w-px bg-edge" aria-hidden />
                <span className="inline-flex items-center gap-1 text-[12px] font-medium text-accent">
                  <Sparkles size={12} aria-hidden />
                  Hero mutation engine
                </span>
              </span>
            </div>

            <h1
              id="hero-heading"
              className="hero-headline animate-pop hero-stagger-1 mt-6 text-balance font-sans font-semibold text-ink"
            >
              Stop shipping one hero to every visitor.
            </h1>

            <p className="animate-pop hero-stagger-2 mt-5 max-w-3xl text-pretty text-base leading-7 text-muted sm:text-[1.0625rem] sm:leading-8">
              Beagle turns a landing-page hero into a controlled experiment loop:
              detect the real page, generate a concrete before/after change, gate
              it for approval, run sticky traffic, and show which audience should
              see which winner.
            </p>

            <div className="animate-pop hero-stagger-3 mt-7 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={onConfigure}
                className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold shadow-[0_8px_22px_-8px_rgba(36,87,72,0.55)] hover:-translate-y-0.5"
              >
                <Gauge size={18} />
                Analyze my hero
              </button>
              <button
                type="button"
                onClick={onStart}
                className="glass inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-ink shadow-sm hover:-translate-y-0.5"
              >
                <PlayCircle size={17} />
                Watch the loop
              </button>
              <button
                type="button"
                onClick={onMethodology}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-medium text-muted hover:-translate-y-0.5 hover:text-ink"
              >
                <BookOpen size={17} />
                Methodology
              </button>
            </div>

            <div className="animate-pop hero-stagger-4 mt-8 grid max-w-5xl gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {STACK_ITEMS.map((item) => (
                <StackPill key={item.label} item={item} />
              ))}
            </div>

            <div className="animate-pop hero-stagger-5 mt-5 grid max-w-4xl gap-2 sm:grid-cols-3">
              {SIGNALS.map((signal) => (
                <SignalCard key={signal.label} signal={signal} />
              ))}
            </div>

            <div className="hero-loop animate-pop hero-stagger-5 mt-7 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted">
              <span className="font-semibold uppercase text-muted">The loop</span>
              {LOOP.map((step, i) => (
                <span key={step} className="inline-flex items-center gap-2">
                  {i > 0 && <span className="h-px w-4 bg-edge" aria-hidden />}
                  <span className="font-medium text-ink">{step}</span>
                </span>
              ))}
            </div>
          </div>

          <HeroCockpit />
        </section>

        <ScrollSection
          kicker="Actual mutation"
          title="Show the proposed hero change, not a vague optimization score."
          text="The core demo is concrete: current hero, generated challenger, changed fields, expected metric movement, and the approval state before anything can publish."
        >
          <DemoWorkbench />
        </ScrollSection>

        <ScrollSection
          kicker="Problem data"
          title="The leak is measurable before the experiment starts."
          text="Beagle starts from the behavior already visible in analytics: where visitors reach the page, where the hero loses them, and which audience deserves a different first screen."
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(25rem,1.08fr)]">
            <div className="grid gap-3">
              {PROBLEM_POINTS.map((point, index) => (
                <ProblemCard key={point.title} point={point} index={index} />
              ))}
            </div>
            <ProblemFunnel />
          </div>
        </ScrollSection>

        <ScrollSection
          kicker="Experiment data"
          title="Every round should leave charts, not opinions."
          text="The demo readout tracks generation-by-generation lift, traffic allocation, approvals, confidence, and the exact mutation that produced the current champion."
        >
          <ExperimentBoard />
        </ScrollSection>

        <ScrollSection
          kicker="Heterogeneity"
          title="The average winner is only the start of the decision."
          text="Beagle separates aggregate lift from segment behavior. That lets you ship the variant where it wins, keep the champion where it protects conversion, and queue the next audience-specific test."
          contrast
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_23rem]">
            <SegmentMatrix />
            <ReportPanel />
          </div>
        </ScrollSection>
      </div>
    </section>
  );
}

function StackPill({ item }) {
  const Icon = item.icon;
  return (
    <div className="hero-stack-pill rounded-lg border border-edge bg-surface/85 px-3 py-3 shadow-sm">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase text-muted">
        <Icon size={14} className="text-accent" />
        {item.label}
      </div>
      <div className="mt-1 text-sm font-semibold leading-snug text-ink">{item.value}</div>
    </div>
  );
}

function SignalCard({ signal }) {
  return (
    <div className="hero-signal-card rounded-lg border border-edge bg-surface/80 px-4 py-3 shadow-sm">
      <div className="text-2xl font-semibold leading-none tabular-nums text-ink">
        {signal.value}
      </div>
      <div className="mt-1 text-xs font-semibold text-ink">{signal.label}</div>
      <div className="mt-1 text-[11px] leading-snug text-muted">{signal.detail}</div>
    </div>
  );
}

function HeroCockpit() {
  return (
    <aside
      className="hero-cockpit animate-pop hero-stagger-4 relative z-10"
      aria-label="Animated hero experiment demo"
    >
      <div className="hero-product-frame hero-cockpit-frame overflow-hidden p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase text-muted">Live demo</div>
            <h2 className="mt-1 text-xl font-semibold leading-tight text-ink">
              Pricing hero mutation in review.
            </h2>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-white">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-white" aria-hidden />
            Running
          </span>
        </div>

        <div className="hero-url-strip mt-5 flex items-center gap-2 rounded-lg border border-edge bg-surface-2 px-3 py-2">
          <Link2 size={16} className="shrink-0 text-accent" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
            https://site.com/pricing
          </span>
          <span className="rounded-md bg-win px-2 py-1 text-[11px] font-semibold text-white">
            Gen 08
          </span>
        </div>

        <HeroBeforeAfter compact />

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <MiniMetric label="Baseline CTR" value="38%" />
          <MiniMetric label="Champion CTR" value="69%" accent />
          <MiniMetric label="Paid reversal" value="-6pts" negative />
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_13rem]">
          <AnimatedLineChart title="CTR by generation" points={GENERATIONS} />
          <div className="rounded-lg border border-edge bg-surface p-3">
            <div className="text-[11px] font-semibold uppercase text-muted">Segment readout</div>
            <div className="mt-3 grid gap-3">
              {CHANNELS.map((channel, index) => (
                <AudienceBar
                  key={channel.label}
                  label={channel.label}
                  value={channel.value}
                  change={channel.change}
                  tone={channel.tone}
                  delay={index * 120}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-accent/20 bg-accent/10 p-3 text-sm leading-6 text-ink">
          The demo is not a decorative dashboard. It shows the proposed hero,
          the exact changed fields, the experiment trend, and the audience split
          that decides what ships.
        </div>
      </div>
    </aside>
  );
}

function HeroBeforeAfter({ compact = false }) {
  return (
    <div className={`hero-before-after mt-5 grid gap-3 ${compact ? "xl:grid-cols-2" : "lg:grid-cols-2"}`}>
      <HeroDemoCard
        label="Champion"
        tag="Control"
        title="Project analytics for scaling teams"
        proof="Trusted by modern teams"
        cta="Book a demo"
        tone="neutral"
      />
      <HeroDemoCard
        label="Challenger"
        tag="+31 pts"
        title="Find the hero message that converts each traffic source"
        proof="38% to 69% CTR in 8 approved rounds"
        cta="Analyze my landing page"
        tone="win"
      />
    </div>
  );
}

function HeroDemoCard({ label, tag, title, proof, cta, tone }) {
  return (
    <div className={`demo-hero-card ${tone === "win" ? "demo-hero-card-win" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase text-muted">{label}</span>
        <span
          className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
            tone === "win" ? "bg-win/10 text-win" : "bg-surface-2 text-muted"
          }`}
        >
          {tag}
        </span>
      </div>
      <div className="mt-4 rounded-lg border border-edge bg-surface-2 p-3">
        <div className="h-2 w-16 rounded-full bg-edge" />
        <h3 className="mt-3 text-base font-semibold leading-tight text-ink">{title}</h3>
        <p className="mt-2 text-xs leading-5 text-muted">{proof}</p>
        <div className="mt-4 flex items-center gap-2">
          <span className={`rounded-lg px-3 py-2 text-xs font-semibold ${tone === "win" ? "bg-accent text-white" : "bg-surface text-ink"}`}>
            {cta}
          </span>
          <span className="h-2 w-14 rounded-full bg-edge" />
        </div>
      </div>
    </div>
  );
}

function DemoWorkbench() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)]">
      <div data-reveal className="hero-data-card reveal-card rounded-lg border border-edge bg-surface p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase text-muted">Before and after</div>
            <h3 className="mt-1 text-xl font-semibold text-ink">A real-looking hero mutation</h3>
          </div>
          <Sparkles className="text-accent" size={22} />
        </div>
        <HeroBeforeAfter />
        <div className="mt-5 overflow-hidden rounded-lg border border-edge">
          <div className="grid grid-cols-[0.7fr_1fr_1fr] bg-surface-2 px-3 py-2 text-[11px] font-semibold uppercase text-muted">
            <span>Field</span>
            <span>Current</span>
            <span>Challenger</span>
          </div>
          {MUTATIONS.map((item, index) => (
            <div
              key={item.label}
              className="grid grid-cols-[0.7fr_1fr_1fr] gap-3 border-t border-edge px-3 py-3 text-xs"
              style={{ "--reveal-delay": `${index * 90}ms` }}
            >
              <span className="font-semibold text-ink">{item.label}</span>
              <span className="text-muted">{item.before}</span>
              <span className="font-semibold text-accent">{item.after}</span>
            </div>
          ))}
        </div>
      </div>

      <div data-reveal className="hero-data-card reveal-card rounded-lg border border-edge bg-surface p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase text-muted">Approval package</div>
            <h3 className="mt-1 text-xl font-semibold text-ink">The diff ships with evidence</h3>
          </div>
          <ShieldCheck className="text-accent" size={22} />
        </div>
        <div className="mt-5 grid gap-3">
          <EvidenceRow label="Hypothesis" value="Channel-aware copy increases CTA intent" state="ready" />
          <EvidenceRow label="Primary KPI" value="Hero CTA click-through rate" state="ready" />
          <EvidenceRow label="Guardrail" value="No brand, pricing, or legal claim changed" state="ready" />
          <EvidenceRow label="Launch state" value="Blocked until approval" state="review" />
        </div>
        <div className="mt-5 rounded-lg border border-edge bg-surface-2 p-3">
          <div className="mb-3 flex items-center justify-between text-xs">
            <span className="font-semibold text-ink">Traffic plan</span>
            <span className="font-semibold text-muted">50/50 sticky split</span>
          </div>
          <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-edge">
            <div className="bg-surface p-3 text-center text-xs font-semibold text-muted">Champion</div>
            <div className="hero-traffic-fill bg-accent p-3 text-center text-xs font-semibold text-white">
              Challenger
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EvidenceRow({ label, value, state }) {
  const review = state === "review";
  return (
    <div className="flex items-center gap-3 rounded-lg border border-edge bg-surface-2 px-3 py-3">
      <span
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${
          review ? "bg-accent/10 text-accent" : "bg-win/10 text-win"
        }`}
      >
        {review ? <ShieldCheck size={15} /> : <CheckCircle2 size={15} />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold uppercase text-muted">{label}</div>
        <div className="mt-0.5 text-sm font-semibold text-ink">{value}</div>
      </div>
    </div>
  );
}

function ScrollSection({ kicker, title, text, children, contrast = false }) {
  return (
    <section
      data-reveal
      className={`hero-scroll-section reveal-on-scroll py-10 sm:py-14 ${
        contrast ? "hero-scroll-section-contrast" : ""
      }`}
    >
      <div className="mb-6 max-w-3xl">
        <div className="hero-kicker mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold text-accent">
          <Target size={13} />
          {kicker}
        </div>
        <h2 className="text-balance text-3xl font-semibold leading-tight text-ink sm:text-4xl">
          {title}
        </h2>
        <p className="mt-3 text-base leading-7 text-muted">{text}</p>
      </div>
      {children}
    </section>
  );
}

function ProblemCard({ point, index }) {
  const Icon = point.icon;
  return (
    <div
      data-reveal
      className="hero-info-card reveal-card flex gap-3 rounded-lg border border-edge bg-surface p-4"
      style={{ "--reveal-delay": `${index * 90}ms` }}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
        <Icon size={18} />
      </span>
      <div>
        <h3 className="text-sm font-semibold text-ink">{point.title}</h3>
        <p className="mt-1 text-sm leading-6 text-muted">{point.text}</p>
      </div>
    </div>
  );
}

function ProblemFunnel() {
  const rows = [
    { label: "Reach pricing page", value: 100, count: "10,000" },
    { label: "Bounce before hero engagement", value: 62, count: "6,200" },
    { label: "Read or hover proof block", value: 38, count: "3,800" },
    { label: "Click primary CTA", value: 12, count: "1,200" },
  ];

  return (
    <div
      data-reveal
      className="hero-data-card reveal-card rounded-lg border border-edge bg-surface p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase text-muted">Hero leak map</div>
          <h3 className="mt-1 text-lg font-semibold text-ink">The first screen loses the test first</h3>
        </div>
        <MousePointerClick className="text-accent" size={22} />
      </div>
      <div className="mt-5 grid gap-4">
        {rows.map((row, index) => (
          <div key={row.label}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
              <span className="font-medium text-ink">{row.label}</span>
              <span className="font-semibold tabular-nums text-muted">{row.count}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-surface-2">
              <div
                className="hero-animated-bar h-full rounded-full bg-accent"
                style={{ width: `${row.value}%`, "--bar-delay": `${index * 120}ms` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <MiniMetric label="Hero engagement" value="38%" />
        <MiniMetric label="CTA click" value="12%" negative />
        <MiniMetric label="Test priority" value="High" accent />
      </div>
    </div>
  );
}

function ExperimentBoard() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_23rem]">
      <div data-reveal className="hero-data-card reveal-card rounded-lg border border-edge bg-surface p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase text-muted">Experiment telemetry</div>
            <h3 className="mt-1 text-xl font-semibold text-ink">A visible loop from mutation to lift</h3>
          </div>
          <LineChart className="text-accent" size={22} />
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
          <AnimatedLineChart title="CTR lift over eight approved generations" points={GENERATIONS} large />
          <div className="grid gap-3">
            <MetricComparison label="Champion CTR" before="38%" after="69%" />
            <MetricComparison label="Median confidence" before="52%" after="86%" />
            <MetricComparison label="Approved mutations" before="1" after="8" />
          </div>
        </div>
      </div>

      <div data-reveal className="hero-data-card reveal-card rounded-lg border border-edge bg-surface p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase text-muted">Run state</div>
            <h3 className="mt-1 text-xl font-semibold text-ink">What changed in this generation</h3>
          </div>
          <GitBranch className="text-accent" size={22} />
        </div>
        <FlowRail />
      </div>
    </div>
  );
}

function FlowRail() {
  return (
    <div className="mt-5 grid gap-3">
      {FLOW.map((step, index) => {
        const Icon = step.icon;
        return (
          <div
            key={step.title}
            data-reveal
            className="hero-info-card reveal-card rounded-lg border border-edge bg-surface p-4"
            style={{ "--reveal-delay": `${index * 70}ms` }}
          >
            <div className="flex gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
                <Icon size={18} />
              </span>
              <div>
                <div className="text-[11px] font-semibold uppercase text-muted">
                  Step {index + 1}
                </div>
                <h3 className="mt-0.5 text-sm font-semibold text-ink">{step.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted">{step.text}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AnimatedLineChart({ title, points, large = false }) {
  const width = 320;
  const height = large ? 190 : 132;
  const pad = 22;
  const min = 34;
  const max = 72;
  const step = (width - pad * 2) / (points.length - 1);
  const coords = points.map((value, index) => {
    const x = pad + index * step;
    const y = pad + (1 - (value - min) / (max - min)) * (height - pad * 2);
    return [x, y];
  });
  const line = coords.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `${pad},${height - pad} ${line} ${width - pad},${height - pad}`;

  return (
    <div className="rounded-lg border border-edge bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-xs font-semibold uppercase text-muted">{title}</div>
        <span className="rounded-md bg-win/10 px-2 py-1 text-[11px] font-semibold text-win">
          +31 pts
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={`${large ? "h-56" : "h-36"} w-full`}
        role="img"
        aria-label="CTR rises from 38 percent to 69 percent across eight approved generations"
      >
        {[40, 50, 60, 70].map((tick) => {
          const y = pad + (1 - (tick - min) / (max - min)) * (height - pad * 2);
          return (
            <g key={tick}>
              <line x1={pad} x2={width - pad} y1={y} y2={y} stroke="var(--color-edge)" />
              <text x={0} y={y + 3} className="fill-muted text-[9px]">
                {tick}
              </text>
            </g>
          );
        })}
        <polygon points={area} className="hero-chart-area" />
        <polyline
          points={line}
          className="hero-chart-line"
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {coords.map(([x, y], index) => (
          <circle
            key={index}
            className="hero-chart-point"
            style={{ "--point-delay": `${600 + index * 80}ms` }}
            cx={x}
            cy={y}
            r={index === coords.length - 1 ? 4.5 : 3}
            fill={index === coords.length - 1 ? "var(--color-win)" : "var(--color-accent)"}
          />
        ))}
      </svg>
    </div>
  );
}

function MetricComparison({ label, before, after }) {
  return (
    <div className="rounded-lg border border-edge bg-surface-2 p-3">
      <div className="text-[11px] font-semibold uppercase text-muted">{label}</div>
      <div className="mt-3 flex items-center gap-3">
        <span className="text-lg font-semibold tabular-nums text-muted">{before}</span>
        <ArrowRight size={15} className="text-accent" />
        <span className="text-2xl font-semibold tabular-nums text-win">{after}</span>
      </div>
    </div>
  );
}

function SegmentMatrix() {
  const aggregate = { champion: 47, challenger: 53, delta: "+6" };

  return (
    <div
      data-reveal
      className="hero-data-card reveal-card rounded-lg border border-edge bg-surface p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase text-muted">Segment analysis</div>
          <h3 className="mt-1 text-lg font-semibold text-ink">Aggregate lift, hidden loss</h3>
        </div>
        <Users className="text-accent" size={22} />
      </div>
      <div className="mt-5 rounded-lg border border-win/25 bg-win/10 p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-ink">Overall result</span>
          <span className="rounded-md bg-win px-2 py-1 text-[11px] font-semibold text-white">
            Variant wins {aggregate.delta} pts
          </span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <MiniMetric label="Champion CTR" value={`${aggregate.champion}%`} />
          <MiniMetric label="Variant CTR" value={`${aggregate.challenger}%`} accent />
        </div>
      </div>
      <div className="mt-5 grid gap-3">
        {SEGMENTS.map((row, index) => (
          <SegmentRow key={row.label} row={row} index={index} />
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-lose/25 bg-lose/10 p-3 text-sm leading-6 text-ink">
        The aggregate says "ship the variant." Heterogeneity says paid traffic
        needs the champion. That difference becomes the next targeting decision.
      </div>
    </div>
  );
}

function SegmentRow({ row, index }) {
  const challengerWins = row.winner === "challenger";
  return (
    <div
      className="rounded-lg border border-edge bg-surface-2 p-3"
      style={{ "--reveal-delay": `${index * 90}ms` }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-ink">{row.label}</span>
        <span
          className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
            challengerWins ? "bg-win/10 text-win" : "bg-lose/10 text-lose"
          }`}
        >
          Serve {row.winner}
        </span>
      </div>
      <div className="mt-3 grid gap-2">
        <SplitBar label="Champion" value={row.champion} tone={challengerWins ? "neutral" : "lose"} />
        <SplitBar label="Variant" value={row.challenger} tone={challengerWins ? "win" : "neutral"} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-xs">
        <span className={`font-semibold tabular-nums ${row.delta.startsWith("-") ? "text-lose" : "text-win"}`}>
          Delta {row.delta} pts
        </span>
        <span className="font-medium text-muted">Confidence {row.confidence}%</span>
      </div>
    </div>
  );
}

function SplitBar({ label, value, tone }) {
  const color = tone === "win" ? "bg-win" : tone === "lose" ? "bg-lose" : "bg-accent";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="font-medium text-muted">{label}</span>
        <span className="font-semibold tabular-nums text-ink">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface">
        <div className={`hero-animated-bar h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function ReportPanel() {
  return (
    <div
      data-reveal
      className="hero-data-card reveal-card rounded-lg border border-edge bg-surface p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase text-muted">Decision output</div>
          <h3 className="mt-1 text-lg font-semibold text-ink">What the team gets back</h3>
        </div>
        <FileText className="text-accent" size={22} />
      </div>
      <div className="mt-5 grid gap-3">
        <ReportLine label="Mutation" value="Message, CTA, proof order, evidence panel" />
        <ReportLine label="Aggregate" value="Variant wins overall CTR by 6 points" />
        <ReportLine label="Heterogeneity" value="Paid traffic reverses: champion wins by 6 points" />
        <ReportLine label="Next test" value="Separate paid hero from organic and mobile hero" />
      </div>
      <div className="mt-5 rounded-lg border border-win/25 bg-win/10 p-3 text-sm font-semibold text-win">
        The report turns the split result into a serving rule and the next
        approved hypothesis, not just a chart screenshot.
      </div>
    </div>
  );
}

function AudienceBar({ label, value, change, tone, delay = 0 }) {
  const isWin = tone === "win";
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-semibold text-ink">{label}</span>
        <span className={`font-semibold tabular-nums ${isWin ? "text-win" : "text-lose"}`}>
          {change}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className={`hero-animated-bar h-full rounded-full ${isWin ? "bg-win" : "bg-lose"}`}
          style={{ width: `${value}%`, "--bar-delay": `${delay}ms` }}
        />
      </div>
    </div>
  );
}

function MiniMetric({ label, value, accent = false, negative = false }) {
  return (
    <div className="rounded-lg border border-edge bg-surface-2 px-3 py-2">
      <div className="text-[11px] font-medium text-muted">{label}</div>
      <div
        className={`mt-1 text-xl font-semibold tabular-nums ${
          accent ? "text-win" : negative ? "text-lose" : "text-ink"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function ReportLine({ label, value }) {
  return (
    <div className="rounded-lg border border-edge bg-surface-2 px-3 py-2">
      <div className="text-[11px] font-medium text-muted">{label}</div>
      <div className="mt-1 text-sm font-semibold text-ink">{value}</div>
    </div>
  );
}
