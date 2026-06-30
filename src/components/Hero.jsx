import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileText,
  Gauge,
  GitBranch,
  LineChart,
  Link2,
  MousePointerClick,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { LogoMark } from "./Logo.jsx";

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

const CHANNELS = [
  { label: "Organic", value: 61, change: "+9", tone: "win" },
  { label: "Paid", value: 43, change: "-6", tone: "lose" },
  { label: "Mobile", value: 55, change: "+14", tone: "win" },
];

const SEGMENTS = [
  { key: "organic", label: "Organic search", champion: 52, challenger: 61, delta: "+9", confidence: 82, winner: "challenger" },
  { key: "paid", label: "Paid traffic", champion: 49, challenger: 43, delta: "-6", confidence: 74, winner: "champion" },
  { key: "mobile", label: "Mobile visitors", champion: 41, challenger: 55, delta: "+14", confidence: 88, winner: "challenger" },
  { key: "organic", label: "Returning visitors", champion: 58, challenger: 62, delta: "+4", confidence: 64, winner: "challenger" },
];

const AUDIENCE_DEMOS = [
  {
    key: "organic",
    label: "Organic",
    fullLabel: "Organic search",
    intent: "Researching options",
    traffic: "4,820 sessions",
    championTitle: "Project analytics for scaling teams",
    challengerTitle: "Find the hero message that converts organic demand",
    championProof: "Trusted by modern teams",
    challengerProof: "+9 pts after proof moved above the CTA",
    championCta: "Book a demo",
    challengerCta: "Analyze my landing page",
    championCtr: 52,
    challengerCtr: 61,
    confidence: 82,
    delta: "+9 pts",
    recommendation: "Serve the challenger to organic visitors and queue a proof-depth test.",
    points: [38, 44, 49, 54, 57, 59, 61, 62],
    mutations: [
      { label: "Headline", before: "Project analytics for scaling teams", after: "Find the hero message that converts organic demand" },
      { label: "CTA", before: "Book a demo", after: "Analyze my landing page" },
      { label: "Proof", before: "Trusted by modern teams", after: "+9 pts after proof moved above the CTA" },
      { label: "Layout", before: "Static product mockup", after: "Experiment evidence beside the CTA" },
    ],
  },
  {
    key: "paid",
    label: "Paid",
    fullLabel: "Paid traffic",
    intent: "High-intent click from ads",
    traffic: "2,140 sessions",
    championTitle: "Project analytics for scaling teams",
    challengerTitle: "Cut paid-page waste before the budget scales",
    championProof: "Trusted by modern teams",
    challengerProof: "Sharper ROI copy lost qualified ad clicks",
    championCta: "Book a demo",
    challengerCta: "Audit my paid page",
    championCtr: 49,
    challengerCtr: 43,
    confidence: 74,
    delta: "-6 pts",
    recommendation: "Keep the champion for paid visitors and test pricing-proof instead.",
    points: [49, 48, 47, 45, 44, 43, 43, 42],
    mutations: [
      { label: "Headline", before: "Project analytics for scaling teams", after: "Cut paid-page waste before the budget scales" },
      { label: "CTA", before: "Book a demo", after: "Audit my paid page" },
      { label: "Proof", before: "Trusted by modern teams", after: "Sharper ROI copy lost qualified ad clicks" },
      { label: "Layout", before: "Demo-led hero", after: "Budget-risk proof beside the CTA" },
    ],
  },
  {
    key: "mobile",
    label: "Mobile",
    fullLabel: "Mobile visitors",
    intent: "Short session, fast scan",
    traffic: "3,610 sessions",
    championTitle: "Project analytics for scaling teams",
    challengerTitle: "See the winning hero before your next scroll",
    championProof: "Trusted by modern teams",
    challengerProof: "+14 pts when the CTA and evidence stay above the fold",
    championCta: "Book a demo",
    challengerCta: "Preview mobile hero",
    championCtr: 41,
    challengerCtr: 55,
    confidence: 88,
    delta: "+14 pts",
    recommendation: "Serve the challenger on mobile and test a shorter proof line next.",
    points: [35, 38, 42, 46, 50, 53, 55, 56],
    mutations: [
      { label: "Headline", before: "Project analytics for scaling teams", after: "See the winning hero before your next scroll" },
      { label: "CTA", before: "Book a demo", after: "Preview mobile hero" },
      { label: "Proof", before: "Trusted by modern teams", after: "+14 pts with CTA and evidence above the fold" },
      { label: "Layout", before: "Wide desktop mockup", after: "Stacked evidence and fixed first CTA" },
    ],
  },
];

const TRAFFIC_EVENTS = [
  { source: "Organic", variant: "Challenger", event: "CTA click", lift: "+9" },
  { source: "Paid", variant: "Champion", event: "Demo intent", lift: "+6" },
  { source: "Mobile", variant: "Challenger", event: "Hero tap", lift: "+14" },
  { source: "Returning", variant: "Challenger", event: "Proof hover", lift: "+4" },
  { source: "Organic", variant: "Challenger", event: "Scroll depth", lift: "+11" },
  { source: "Paid", variant: "Champion", event: "Pricing click", lift: "+5" },
];

export default function Hero({ onStart, onConfigure }) {
  const stageRef = useRef(null);
  const [activeAudience, setActiveAudience] = useState(AUDIENCE_DEMOS[0].key);
  const [liveTick, setLiveTick] = useState(0);
  const activeDemo =
    AUDIENCE_DEMOS.find((demo) => demo.key === activeAudience) ?? AUDIENCE_DEMOS[0];

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

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) return undefined;

    const timer = window.setInterval(() => {
      setLiveTick((tick) => (tick + 1) % 240);
    }, 1100);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section
      ref={stageRef}
      aria-labelledby="hero-heading"
      className="hero-stage flex w-full flex-col overflow-hidden"
    >
      <div className="hero-scroll-stack">
        <section className="hero-panel hero-panel-first grid content-center gap-7 py-8 lg:py-10">
          <div className="relative z-10 mx-auto min-w-0 max-w-5xl text-center">
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

            <p className="animate-pop hero-stagger-2 mx-auto mt-5 max-w-3xl text-pretty text-base leading-7 text-muted sm:text-[1.0625rem] sm:leading-8">
              Connect a page, approve the generated hero variant, and watch the
              winner split by audience as live experiment data comes in.
            </p>

            <div className="animate-pop hero-stagger-3 mt-7 flex flex-wrap items-center justify-center gap-2.5">
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
            </div>
          </div>

          <HeroCockpit
            activeDemo={activeDemo}
            activeAudience={activeAudience}
            onAudienceChange={setActiveAudience}
            liveTick={liveTick}
          />
        </section>

        <ScrollSection
          kicker="Actual mutation"
          title="Show the proposed hero change, not a vague optimization score."
          text="The core demo is concrete: current hero, generated challenger, changed fields, expected metric movement, and the approval state before anything can publish."
        >
          <DemoWorkbench
            activeDemo={activeDemo}
            activeAudience={activeAudience}
            onAudienceChange={setActiveAudience}
            liveTick={liveTick}
          />
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
          <ExperimentBoard activeDemo={activeDemo} liveTick={liveTick} />
        </ScrollSection>

        <ScrollSection
          kicker="Heterogeneity"
          title="The average winner is only the start of the decision."
          text="Beagle separates aggregate lift from segment behavior. That lets you ship the variant where it wins, keep the champion where it protects conversion, and queue the next audience-specific test."
          contrast
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_23rem]">
            <SegmentMatrix
              activeAudience={activeAudience}
              onAudienceChange={setActiveAudience}
            />
            <ReportPanel activeDemo={activeDemo} liveTick={liveTick} />
          </div>
        </ScrollSection>
      </div>
    </section>
  );
}

function HeroCockpit({ activeDemo, activeAudience, onAudienceChange, liveTick }) {
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
              {activeDemo.fullLabel} hero mutation in review.
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

        <AudienceSelector
          activeAudience={activeAudience}
          onAudienceChange={onAudienceChange}
        />

        <HeroDataDeck activeDemo={activeDemo} liveTick={liveTick} />

        <LiveTrafficFeed activeDemo={activeDemo} liveTick={liveTick} compact />
      </div>
    </aside>
  );
}

function HeroDataDeck({ activeDemo, liveTick }) {
  const sampledVisitors = 1284 + liveTick * 17;
  const confidence = Math.min(96, activeDemo.confidence + (liveTick % 4));
  const negative = activeDemo.challengerCtr < activeDemo.championCtr;

  return (
    <div className="hero-data-deck mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(17rem,0.62fr)_minmax(15rem,0.5fr)]">
      <AnimatedLineChart
        key={`hero-data-${activeDemo.key}`}
        title={`${activeDemo.label} CTR by generation`}
        points={activeDemo.points}
        badge={activeDemo.delta}
        negative={negative}
        liveTick={liveTick}
        large
      />
      <VariantComparisonPanel activeDemo={activeDemo} />
      <DataPulsePanel
        activeDemo={activeDemo}
        confidence={confidence}
        sampledVisitors={sampledVisitors}
        liveTick={liveTick}
      />
    </div>
  );
}

function VariantComparisonPanel({ activeDemo }) {
  const negative = activeDemo.challengerCtr < activeDemo.championCtr;

  return (
    <div className="rounded-lg border border-edge bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase text-muted">Live comparison</div>
          <h3 className="mt-1 text-base font-semibold text-ink">Champion vs variant</h3>
        </div>
        <span
          className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
            negative ? "bg-lose/10 text-lose" : "bg-win/10 text-win"
          }`}
        >
          {activeDemo.delta}
        </span>
      </div>
      <div className="mt-5 grid gap-4">
        <ComparisonBar label="Champion" value={activeDemo.championCtr} tone={negative ? "win" : "neutral"} />
        <ComparisonBar label="Variant" value={activeDemo.challengerCtr} tone={negative ? "lose" : "win"} />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <MiniMetric label="Intent" value={activeDemo.label} />
        <MiniMetric
          label="Serve"
          value={negative ? "Champion" : "Variant"}
          accent={!negative}
          negative={negative}
        />
      </div>
    </div>
  );
}

function ComparisonBar({ label, value, tone }) {
  const color = tone === "win" ? "bg-win" : tone === "lose" ? "bg-lose" : "bg-accent";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-semibold text-ink">{label}</span>
        <span className={`font-semibold tabular-nums ${tone === "lose" ? "text-lose" : tone === "win" ? "text-win" : "text-muted"}`}>
          {value}%
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-surface-2">
        <div className={`hero-animated-bar h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function DataPulsePanel({ activeDemo, confidence, sampledVisitors, liveTick }) {
  const negative = activeDemo.challengerCtr < activeDemo.championCtr;
  const cells = Array.from({ length: 18 }, (_, index) => {
    const active = (index + liveTick) % 4 === 0;
    const hot = (index + activeDemo.challengerCtr) % 7 === 0;
    return { active, hot };
  });

  return (
    <div className="rounded-lg border border-edge bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase text-muted">Moving evidence</div>
          <h3 className="mt-1 text-base font-semibold text-ink">Samples streaming in</h3>
        </div>
        <span className="live-dot h-2.5 w-2.5 rounded-full bg-accent" aria-hidden />
      </div>
      <div className="data-pulse-grid mt-5 grid grid-cols-6 gap-2" aria-hidden>
        {cells.map((cell, index) => (
          <span
            key={index}
            className={`data-pulse-cell rounded-md ${
              cell.hot ? "is-hot" : cell.active ? "is-active" : ""
            }`}
          />
        ))}
      </div>
      <div className="mt-5 grid gap-2">
        <MiniMetric label="Sampled" value={sampledVisitors.toLocaleString("en-US")} />
        <MiniMetric label="Confidence" value={`${confidence}%`} accent />
        <MiniMetric
          label="Decision"
          value={negative ? "Protect" : "Ship"}
          accent={!negative}
          negative={negative}
        />
      </div>
    </div>
  );
}

function AudienceSelector({ activeAudience, onAudienceChange }) {
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-3" role="tablist" aria-label="Audience demo selector">
      {AUDIENCE_DEMOS.map((demo) => {
        const active = demo.key === activeAudience;
        return (
          <button
            key={demo.key}
            type="button"
            onClick={() => onAudienceChange(demo.key)}
            className={`audience-tab rounded-lg border px-3 py-2 text-left ${
              active ? "is-active border-accent bg-accent text-white" : "border-edge bg-surface text-ink"
            }`}
            role="tab"
            aria-selected={active}
          >
            <span className="block text-xs font-semibold">{demo.label}</span>
            <span className={`mt-1 block text-[11px] ${active ? "text-white/80" : "text-muted"}`}>
              {demo.intent}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function HeroBeforeAfter({ activeDemo, compact = false }) {
  return (
    <div className={`hero-before-after mt-5 grid gap-3 ${compact ? "xl:grid-cols-2" : "lg:grid-cols-2"}`}>
      <HeroDemoCard
        label="Champion"
        tag="Control"
        title={activeDemo.championTitle}
        proof={activeDemo.championProof}
        cta={activeDemo.championCta}
        tone="neutral"
        ctr={activeDemo.championCtr}
      />
      <HeroDemoCard
        label="Challenger"
        tag={activeDemo.delta}
        title={activeDemo.challengerTitle}
        proof={activeDemo.challengerProof}
        cta={activeDemo.challengerCta}
        tone={activeDemo.challengerCtr >= activeDemo.championCtr ? "win" : "lose"}
        ctr={activeDemo.challengerCtr}
      />
    </div>
  );
}

function HeroDemoCard({ label, tag, title, proof, cta, tone, ctr }) {
  const isWin = tone === "win";
  const isLose = tone === "lose";

  return (
    <div className={`demo-hero-card ${isWin ? "demo-hero-card-win" : ""} ${isLose ? "demo-hero-card-lose" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase text-muted">{label}</span>
        <span
          className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
            isWin ? "bg-win/10 text-win" : isLose ? "bg-lose/10 text-lose" : "bg-surface-2 text-muted"
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
          <span className={`rounded-lg px-3 py-2 text-xs font-semibold ${isWin ? "bg-accent text-white" : "bg-surface text-ink"}`}>
            {cta}
          </span>
          <span className="h-2 w-14 rounded-full bg-edge" />
        </div>
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-[11px]">
            <span className="font-semibold uppercase text-muted">Hero CTR</span>
            <span className={`font-semibold tabular-nums ${isLose ? "text-lose" : isWin ? "text-win" : "text-ink"}`}>
              {ctr}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface">
            <div
              className={`hero-animated-bar h-full rounded-full ${isLose ? "bg-lose" : isWin ? "bg-win" : "bg-accent"}`}
              style={{ width: `${ctr}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function DemoWorkbench({ activeDemo, activeAudience, onAudienceChange, liveTick }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)]">
      <div data-reveal className="hero-data-card reveal-card rounded-lg border border-edge bg-surface p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase text-muted">Interactive before and after</div>
            <h3 className="mt-1 text-xl font-semibold text-ink">
              The hero changes with the selected audience
            </h3>
          </div>
          <Sparkles className="text-accent" size={22} />
        </div>
        <AudienceSelector
          activeAudience={activeAudience}
          onAudienceChange={onAudienceChange}
        />
        <HeroBeforeAfter activeDemo={activeDemo} />
        <div className="mt-5 overflow-hidden rounded-lg border border-edge">
          <div className="grid grid-cols-[0.7fr_1fr_1fr] bg-surface-2 px-3 py-2 text-[11px] font-semibold uppercase text-muted">
            <span>Field</span>
            <span>Current</span>
            <span>Challenger</span>
          </div>
          {activeDemo.mutations.map((item, index) => (
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
          <EvidenceRow label="Audience" value={`${activeDemo.fullLabel}: ${activeDemo.intent}`} state="ready" />
          <EvidenceRow label="Hypothesis" value="Audience-aware copy increases CTA intent" state="ready" />
          <EvidenceRow label="Primary KPI" value="Hero CTA click-through rate" state="ready" />
          <EvidenceRow label="Recommendation" value={activeDemo.recommendation} state="review" />
        </div>
        <div className="mt-5 rounded-lg border border-edge bg-surface-2 p-3">
          <div className="mb-3 flex items-center justify-between text-xs">
            <span className="font-semibold text-ink">Traffic plan</span>
            <span className="font-semibold text-muted">{activeDemo.traffic}</span>
          </div>
          <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-edge">
            <div className="bg-surface p-3 text-center text-xs font-semibold text-muted">
              Champion {activeDemo.championCtr}%
            </div>
            <div className={`${activeDemo.challengerCtr >= activeDemo.championCtr ? "bg-accent" : "bg-lose"} hero-traffic-fill p-3 text-center text-xs font-semibold text-white`}>
              Variant {activeDemo.challengerCtr}%
            </div>
          </div>
        </div>
        <LiveTrafficFeed activeDemo={activeDemo} liveTick={liveTick} />
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

function LiveTrafficFeed({ activeDemo, liveTick, compact = false }) {
  const offset = liveTick % TRAFFIC_EVENTS.length;
  const orderedEvents = [
    ...TRAFFIC_EVENTS.slice(offset),
    ...TRAFFIC_EVENTS.slice(0, offset),
  ].slice(0, compact ? 3 : 4);
  const sampled = 420 + liveTick * 9 + activeDemo.challengerCtr;

  return (
    <div className={`${compact ? "mt-4" : "mt-5"} live-feed rounded-lg border border-edge bg-surface p-3`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase text-muted">Live sample feed</div>
          <div className="mt-1 text-sm font-semibold text-ink">
            {activeDemo.fullLabel} evidence stream
          </div>
        </div>
        <span className="rounded-md bg-surface-2 px-2 py-1 text-[11px] font-semibold tabular-nums text-muted">
          {sampled.toLocaleString("en-US")} sampled
        </span>
      </div>
      <div className="mt-3 grid gap-2">
        {orderedEvents.map((event, index) => {
          const active = event.source === activeDemo.label;
          return (
            <div
              key={`${event.source}-${event.event}-${index}-${liveTick}`}
              className={`live-feed-row grid grid-cols-[0.8fr_1fr_0.5fr] items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                active ? "border-accent/25 bg-accent/10" : "border-edge bg-surface-2"
              }`}
            >
              <span className="font-semibold text-ink">{event.source}</span>
              <span className="truncate text-muted">{event.variant}: {event.event}</span>
              <span className={`text-right font-semibold tabular-nums ${event.variant === "Champion" ? "text-ink" : "text-win"}`}>
                {event.lift}
              </span>
            </div>
          );
        })}
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

function ExperimentBoard({ activeDemo, liveTick }) {
  const exposure = 2600 + liveTick * 23;
  const decision =
    activeDemo.challengerCtr >= activeDemo.championCtr ? "Variant leads" : "Champion protects";

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_23rem]">
      <div data-reveal className="hero-data-card reveal-card rounded-lg border border-edge bg-surface p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase text-muted">Experiment telemetry</div>
            <h3 className="mt-1 text-xl font-semibold text-ink">
              {activeDemo.fullLabel}: live lift and confidence
            </h3>
          </div>
          <LineChart className="text-accent" size={22} />
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
          <AnimatedLineChart
            key={`experiment-${activeDemo.key}`}
            title={`${activeDemo.label} CTR over eight approved generations`}
            points={activeDemo.points}
            badge={activeDemo.delta}
            negative={activeDemo.challengerCtr < activeDemo.championCtr}
            liveTick={liveTick}
            large
          />
          <div className="grid gap-3">
            <MetricComparison
              label="Champion vs variant"
              before={`${activeDemo.championCtr}%`}
              after={`${activeDemo.challengerCtr}%`}
              negative={activeDemo.challengerCtr < activeDemo.championCtr}
            />
            <MetricComparison
              label="Confidence"
              before="52%"
              after={`${Math.min(96, activeDemo.confidence + (liveTick % 4))}%`}
            />
            <MetricComparison label="Exposures sampled" before="0" after={exposure.toLocaleString("en-US")} />
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <MiniMetric label="Decision" value={decision} accent={activeDemo.challengerCtr >= activeDemo.championCtr} negative={activeDemo.challengerCtr < activeDemo.championCtr} />
          <MiniMetric label="Delta" value={activeDemo.delta} accent={activeDemo.challengerCtr >= activeDemo.championCtr} negative={activeDemo.challengerCtr < activeDemo.championCtr} />
          <MiniMetric label="Traffic source" value={activeDemo.label} />
        </div>
      </div>

      <div data-reveal className="hero-data-card reveal-card rounded-lg border border-edge bg-surface p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase text-muted">Run state</div>
            <h3 className="mt-1 text-xl font-semibold text-ink">What is moving right now</h3>
          </div>
          <GitBranch className="text-accent" size={22} />
        </div>
        <FlowRail />
        <LiveTrafficFeed activeDemo={activeDemo} liveTick={liveTick} />
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

function AnimatedLineChart({ title, points, badge = "+31 pts", negative = false, liveTick = 0, large = false }) {
  const width = 340;
  const height = large ? 190 : 132;
  const pad = 24;
  const rightPad = 40;
  const min = 34;
  const max = 72;
  const sampleMax = 3200;
  const sampleMin = 600;
  const chartEnd = width - pad - rightPad;
  const movedPoints = points.map((value, index) => {
    const wave = Math.sin((liveTick + index * 1.7) * 0.72) * (negative ? 0.75 : 1.15);
    const lastPointLift = index === points.length - 1 ? Math.sin(liveTick * 0.9) * 0.9 : 0;
    return Math.max(min + 1, Math.min(max - 1, value + wave + lastPointLift));
  });
  const samples = points.map((value, index) => {
    const base = 900 + index * 235 + value * 9;
    const pulse = ((liveTick + index * 2) % 6) * 52;
    return Math.min(sampleMax, base + pulse);
  });
  const step = (chartEnd - pad) / (points.length - 1);
  const coords = movedPoints.map((value, index) => {
    const x = pad + index * step;
    const y = pad + (1 - (value - min) / (max - min)) * (height - pad * 2);
    return [x, y];
  });
  const cursorIndex = liveTick % coords.length;
  const [cursorX, cursorY] = coords[cursorIndex];
  const cursorSample = samples[cursorIndex];
  const line = coords.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `${pad},${height - pad} ${line} ${chartEnd},${height - pad}`;

  return (
    <div className="hero-chart-card rounded-lg border border-edge bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-xs font-semibold uppercase text-muted">{title}</div>
        <span
          className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
            negative ? "bg-lose/10 text-lose" : "bg-win/10 text-win"
          }`}
        >
          {badge}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={`${large ? "h-56" : "h-36"} w-full`}
        role="img"
        aria-label={`${title} across eight approved generations`}
      >
        {[40, 50, 60, 70].map((tick) => {
          const y = pad + (1 - (tick - min) / (max - min)) * (height - pad * 2);
          return (
            <g key={tick}>
              <line x1={pad} x2={chartEnd} y1={y} y2={y} stroke="var(--color-edge)" />
              <text x={0} y={y + 3} className="fill-muted text-[9px]">
                {tick}
              </text>
            </g>
          );
        })}
        {[1000, 2000, 3000].map((tick) => {
          const y = pad + (1 - (tick - sampleMin) / (sampleMax - sampleMin)) * (height - pad * 2);
          return (
            <text key={tick} x={chartEnd + 8} y={y + 3} className="fill-muted text-[8px]">
              {tick / 1000}k
            </text>
          );
        })}
        <text x={0} y={13} className="fill-muted text-[8px]">
          CTR
        </text>
        <text x={chartEnd + 4} y={13} className="fill-muted text-[8px]">
          samples
        </text>
        {samples.map((sample, index) => {
          const barWidth = Math.max(5, step * 0.34);
          const x = pad + index * step - barWidth / 2;
          const barHeight = ((sample - sampleMin) / (sampleMax - sampleMin)) * (height - pad * 2);
          const y = height - pad - barHeight;
          return (
            <rect
              key={`${index}-${sample}`}
              className="hero-sample-bar"
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx="2"
            />
          );
        })}
        <polygon points={area} className="hero-chart-area" />
        <polyline
          points={line}
          className="hero-chart-line"
          fill="none"
          stroke={negative ? "var(--color-lose)" : "var(--color-accent)"}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points={line}
          className="hero-chart-line-flow"
          fill="none"
          stroke={negative ? "var(--color-lose)" : "var(--color-accent)"}
          strokeWidth="2"
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
        <g className="hero-chart-cursor" transform={`translate(${cursorX} 0)`}>
          <line x1="0" x2="0" y1={pad} y2={height - pad} />
          <circle cx="0" cy={cursorY} r="4.5" />
          <text x="7" y={Math.max(pad + 10, cursorY - 8)}>
            {Math.round(movedPoints[cursorIndex])}% / {Math.round(cursorSample / 100) / 10}k
          </text>
        </g>
      </svg>
    </div>
  );
}

function MetricComparison({ label, before, after, negative = false }) {
  return (
    <div className="rounded-lg border border-edge bg-surface-2 p-3">
      <div className="text-[11px] font-semibold uppercase text-muted">{label}</div>
      <div className="mt-3 flex items-center gap-3">
        <span className="text-lg font-semibold tabular-nums text-muted">{before}</span>
        <ArrowRight size={15} className="text-accent" />
        <span className={`text-2xl font-semibold tabular-nums ${negative ? "text-lose" : "text-win"}`}>
          {after}
        </span>
      </div>
    </div>
  );
}

function SegmentMatrix({ activeAudience, onAudienceChange }) {
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
          <SegmentRow
            key={row.label}
            row={row}
            index={index}
            active={row.key === activeAudience}
            onSelect={() => onAudienceChange(row.key)}
          />
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-lose/25 bg-lose/10 p-3 text-sm leading-6 text-ink">
        The aggregate says "ship the variant." Heterogeneity says paid traffic
        needs the champion. That difference becomes the next targeting decision.
      </div>
    </div>
  );
}

function SegmentRow({ row, index, active, onSelect }) {
  const challengerWins = row.winner === "challenger";
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`segment-row rounded-lg border p-3 text-left ${
        active ? "border-accent bg-accent/10" : "border-edge bg-surface-2"
      }`}
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
    </button>
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

function ReportPanel({ activeDemo, liveTick }) {
  const confidence = Math.min(96, activeDemo.confidence + (liveTick % 4));

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
        <ReportLine label="Audience" value={`${activeDemo.fullLabel}: ${activeDemo.intent}`} />
        <ReportLine label="Observed delta" value={`${activeDemo.delta} at ${confidence}% confidence`} />
        <ReportLine label="Serving rule" value={activeDemo.recommendation} />
        <ReportLine label="Next test" value={activeDemo.mutations[0].after} />
      </div>
      <div
        className={`mt-5 rounded-lg border p-3 text-sm font-semibold ${
          activeDemo.challengerCtr >= activeDemo.championCtr
            ? "border-win/25 bg-win/10 text-win"
            : "border-lose/25 bg-lose/10 text-lose"
        }`}
      >
        {activeDemo.recommendation}
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
