import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Database,
  FileText,
  GitBranch,
  LineChart,
  MousePointerClick,
  PlayCircle,
  Plug,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { LogoMark } from "./Logo.jsx";
import HeroEvolutionVisual from "./HeroEvolutionVisual.jsx";

const LOOP = ["Connect", "Propose", "Approve", "Run", "Learn"];

const SIGNALS = [
  { label: "Hero baseline", value: "38%", detail: "seeded CTR before the loop" },
  { label: "Winning hero", value: "69%", detail: "after eight decisions" },
  { label: "Current gate", value: "G9", detail: "awaiting approval" },
];

const PROBLEM_POINTS = [
  {
    icon: AlertTriangle,
    title: "Hero decisions are still subjective",
    text: "Teams debate headline, CTA, proof, layout, and media without a clean way to prove which change moved the KPI.",
  },
  {
    icon: BarChart3,
    title: "Manual tests move too slowly",
    text: "Briefing, implementation, QA, analytics setup, and reporting make teams test less than the hero deserves.",
  },
  {
    icon: Users,
    title: "Averages hide audience behavior",
    text: "A challenger can win overall while losing for paid traffic, mobile visitors, or another segment you care about.",
  },
];

const FLOW = [
  {
    icon: Plug,
    title: "Connect the page",
    text: "GitHub, WordPress, or Framer source. Claude checks that the hero can be found.",
  },
  {
    icon: Database,
    title: "Load analytics",
    text: "GA4 or Looker metrics become the source for CTR, conversion, and segment readout.",
  },
  {
    icon: Sparkles,
    title: "Generate a hypothesis",
    text: "Claude proposes a hero variant inside your style guide, legal limits, and do-not-change list.",
  },
  {
    icon: ShieldCheck,
    title: "Approve before launch",
    text: "Nothing ships until a human approves the exact change and hypothesis.",
  },
  {
    icon: GitBranch,
    title: "Run and learn",
    text: "Cookie-based assignment keeps visitors sticky while Beagle reads back the result and queues the next test.",
  },
];

const SEGMENTS = [
  { label: "Organic", champion: 52, challenger: 61, winner: "challenger" },
  { label: "Paid", champion: 49, challenger: 43, winner: "champion" },
  { label: "Mobile", champion: 41, challenger: 55, winner: "challenger" },
];

export default function Hero({ onStart, onMethodology, onConfigure }) {
  return (
    <section
      aria-labelledby="hero-heading"
      className="hero-stage flex w-full flex-col overflow-hidden"
    >
      <div className="hero-scroll-stack">
        <section className="hero-panel hero-panel-first grid items-center gap-10 py-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(28rem,1.1fr)] lg:gap-14 lg:py-12">
          <div className="relative z-10 min-w-0">
            <div className="animate-pop hero-stagger-1">
              <span className="hero-eyebrow inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-[13px] font-semibold text-ink shadow-sm">
                <LogoMark size={18} />
                <span>beagle</span>
                <span className="h-3.5 w-px bg-edge" aria-hidden />
                <span className="inline-flex items-center gap-1 text-[12px] font-medium text-accent">
                  <Sparkles size={12} aria-hidden />
                  Hero optimization loop
                </span>
              </span>
            </div>

            <h1
              id="hero-heading"
              className="hero-headline animate-pop hero-stagger-1 mt-6 text-balance font-sans font-semibold text-ink"
            >
              Stop guessing which hero converts.
            </h1>

            <p className="animate-pop hero-stagger-2 mt-5 max-w-2xl text-pretty text-base leading-7 text-muted sm:text-[1.0625rem] sm:leading-8">
              Beagle connects your page and analytics, lets Claude propose a
              guardrailed hero test, waits for approval, runs sticky A/B traffic,
              and explains the result by KPI and audience segment.
            </p>

            <div className="animate-pop hero-stagger-3 mt-7 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={onStart}
                className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold shadow-[0_8px_22px_-8px_rgba(36,87,72,0.55)] hover:-translate-y-0.5"
              >
                <PlayCircle size={18} />
                Watch the loop
              </button>
              <button
                type="button"
                onClick={onConfigure}
                className="glass inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-ink shadow-sm hover:-translate-y-0.5"
              >
                <Plug size={17} />
                Connect a page
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

            <div className="animate-pop hero-stagger-4 mt-8 grid max-w-2xl gap-2 sm:grid-cols-3">
              {SIGNALS.map((signal) => (
                <SignalCard key={signal.label} signal={signal} />
              ))}
            </div>

            <div className="hero-loop animate-pop hero-stagger-5 mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted">
              <span className="font-semibold uppercase text-muted">The loop</span>
              {LOOP.map((step, i) => (
                <span key={step} className="inline-flex items-center gap-2">
                  {i > 0 && <span className="h-px w-4 bg-edge" aria-hidden />}
                  <span className="font-medium text-ink">{step}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="relative z-10 min-w-0">
            <div className="hero-showcase animate-pop hero-stagger-3 relative mx-auto max-w-2xl px-2 lg:mx-0">
              <div className="hero-showcase-panel">
                <HeroEvolutionVisual />
              </div>
            </div>
          </div>
        </section>

        <ScrollSection
          kicker="Problem"
          title="The highest-impact section is usually changed by taste."
          text="If the hero fails, the rest of the page barely gets a chance. But most teams still choose hero changes in meetings, then struggle to connect the result back to real visitor behavior."
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(24rem,1.05fr)]">
            <div className="grid gap-3">
              {PROBLEM_POINTS.map((point) => (
                <ProblemCard key={point.title} point={point} />
              ))}
            </div>
            <ProblemFunnel />
          </div>
        </ScrollSection>

        <ScrollSection
          kicker="How Beagle works"
          title="A closed loop from source code to experiment evidence."
          text="Beagle turns hero work into a repeatable operating system: source connection, analytics, Claude hypothesis, approval, sticky traffic assignment, and readout."
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <FlowRail />
            <GenerationChart />
          </div>
        </ScrollSection>

        <ScrollSection
          kicker="Data depth"
          title="It does not stop at the average winner."
          text="The MVP is built to surface heterogeneity: where the aggregate says one thing, but traffic source or device tells a more useful story for the next hero."
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <SegmentMatrix />
            <ReportPanel />
          </div>
        </ScrollSection>
      </div>
    </section>
  );
}

function SignalCard({ signal }) {
  return (
    <div className="rounded-lg border border-edge bg-surface/80 px-4 py-3 shadow-sm">
      <div className="text-2xl font-semibold leading-none tabular-nums text-ink">
        {signal.value}
      </div>
      <div className="mt-1 text-xs font-semibold text-ink">{signal.label}</div>
      <div className="mt-1 text-[11px] leading-snug text-muted">{signal.detail}</div>
    </div>
  );
}

function ScrollSection({ kicker, title, text, children }) {
  return (
    <section className="hero-scroll-section scroll-pop py-8 sm:py-12">
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

function ProblemCard({ point }) {
  const Icon = point.icon;
  return (
    <div className="hero-info-card flex gap-3 rounded-lg border border-edge bg-surface p-4">
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
    { label: "Visitors reach the page", value: 100, count: "1,000" },
    { label: "Bounce before action", value: 62, count: "620" },
    { label: "Engage with the hero", value: 38, count: "380" },
    { label: "Click the primary CTA", value: 12, count: "120" },
  ];

  return (
    <div className="hero-data-card rounded-lg border border-edge bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase text-muted">Example funnel</div>
          <h3 className="mt-1 text-lg font-semibold text-ink">Where hero waste shows up</h3>
        </div>
        <MousePointerClick className="text-accent" size={22} />
      </div>
      <div className="mt-5 grid gap-4">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
              <span className="font-medium text-ink">{row.label}</span>
              <span className="font-semibold tabular-nums text-muted">{row.count}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${row.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-5 rounded-lg border border-edge bg-surface-2 p-3 text-xs leading-5 text-muted">
        The point is not the example numbers. It is the operating problem:
        without a loop, nobody knows which hero change reduced the leak.
      </p>
    </div>
  );
}

function FlowRail() {
  return (
    <div className="grid gap-3">
      {FLOW.map((step, index) => {
        const Icon = step.icon;
        return (
          <div key={step.title} className="hero-info-card rounded-lg border border-edge bg-surface p-4">
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

function GenerationChart() {
  const points = [38, 46, 52, 57, 61, 64, 67, 69];
  const width = 280;
  const height = 140;
  const pad = 18;
  const min = 34;
  const max = 72;
  const step = (width - pad * 2) / (points.length - 1);
  const coords = points.map((value, index) => {
    const x = pad + index * step;
    const y = pad + (1 - (value - min) / (max - min)) * (height - pad * 2);
    return [x, y];
  });
  const line = coords.map(([x, y]) => `${x},${y}`).join(" ");

  return (
    <div className="hero-data-card rounded-lg border border-edge bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase text-muted">Seeded lineage</div>
          <h3 className="mt-1 text-lg font-semibold text-ink">Every round leaves evidence</h3>
        </div>
        <LineChart className="text-accent" size={22} />
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-5 h-40 w-full"
        role="img"
        aria-label="CTR climbs from 38 percent to 69 percent across eight seeded generations"
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
        <polyline
          points={line}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {coords.map(([x, y], index) => (
          <circle
            key={index}
            cx={x}
            cy={y}
            r={index === coords.length - 1 ? 4.5 : 3}
            fill={index === coords.length - 1 ? "var(--color-win)" : "var(--color-accent)"}
          />
        ))}
      </svg>
      <div className="grid gap-2 sm:grid-cols-2">
        <MiniMetric label="Initial CTR" value="38%" />
        <MiniMetric label="Current champion" value="69%" accent />
      </div>
    </div>
  );
}

function SegmentMatrix() {
  return (
    <div className="hero-data-card rounded-lg border border-edge bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase text-muted">Segment analysis</div>
          <h3 className="mt-1 text-lg font-semibold text-ink">One average, different winners</h3>
        </div>
        <Users className="text-accent" size={22} />
      </div>
      <div className="mt-5 overflow-hidden rounded-lg border border-edge">
        <div className="grid grid-cols-[1fr_0.8fr_0.8fr_0.9fr] bg-surface-2 px-3 py-2 text-[11px] font-semibold text-muted">
          <span>Segment</span>
          <span>Champion</span>
          <span>Variant</span>
          <span>Serve</span>
        </div>
        {SEGMENTS.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[1fr_0.8fr_0.8fr_0.9fr] items-center border-t border-edge px-3 py-3 text-xs"
          >
            <span className="font-semibold text-ink">{row.label}</span>
            <span className="tabular-nums text-muted">{row.champion}%</span>
            <span className="tabular-nums text-muted">{row.challenger}%</span>
            <span
              className={`w-fit rounded-md px-2 py-1 text-[11px] font-semibold ${
                row.winner === "challenger"
                  ? "bg-win/10 text-win"
                  : "bg-accent/10 text-accent"
              }`}
            >
              {row.winner}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportPanel() {
  return (
    <div className="hero-data-card rounded-lg border border-edge bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase text-muted">Decision output</div>
          <h3 className="mt-1 text-lg font-semibold text-ink">Meeting-ready evidence</h3>
        </div>
        <FileText className="text-accent" size={22} />
      </div>
      <div className="mt-5 grid gap-3">
        <ReportLine label="Hypothesis" value="Punchier headline improves CTA intent" />
        <ReportLine label="Decision" value="Confirmed for CTR, watch paid traffic" />
        <ReportLine label="Next test" value="Target hero by traffic source" />
      </div>
      <div className="mt-5 rounded-lg border border-win/25 bg-win/10 p-3 text-sm font-semibold text-win">
        Report can include metric movement, confirmed or rejected hypothesis, and segment findings.
      </div>
    </div>
  );
}

function MiniMetric({ label, value, accent = false }) {
  return (
    <div className="rounded-lg border border-edge bg-surface-2 px-3 py-2">
      <div className="text-[11px] font-medium text-muted">{label}</div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${accent ? "text-win" : "text-ink"}`}>
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
