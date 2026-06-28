import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  BookOpen,
  GitBranch,
  Map,
  RotateCcw,
} from "lucide-react";
import { useExperiment } from "./hooks/useExperiment.js";
import { useAutoplay } from "./hooks/useAutoplay.js";
import { usePresenterShortcuts, readDemoParams } from "./hooks/usePresenterShortcuts.js";
import { WALKTHROUGH_STEPS } from "./lib/walkthrough.js";
import { LogoMark } from "./components/Logo.jsx";
import Hero from "./components/Hero.jsx";
import Setup from "./components/Setup.jsx";
import SourceConnect from "./components/SourceConnect.jsx";
import Dashboard from "./components/Dashboard.jsx";
import ApprovalGate from "./components/ApprovalGate.jsx";
import MethodologyModal from "./components/MethodologyModal.jsx";
import WalkthroughRail from "./components/WalkthroughRail.jsx";

const Timeline = lazy(() => import("./components/Timeline.jsx"));

// Warm the lineage chart chunk when the populated demo loads.
function preloadTimeline() {
  import("./components/Timeline.jsx");
}

export default function App() {
  const exp = useExperiment();
  const auto = useAutoplay(exp);
  const [tab, setTab] = useState("dashboard");
  const [busy, setBusy] = useState(false);
  const [showHero, setShowHero] = useState(true);
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [walkthroughActive, setWalkthroughActive] = useState(false);
  const [walkthroughIndex, setWalkthroughIndex] = useState(0);
  const [walkthroughCollapsed, setWalkthroughCollapsed] = useState(false);
  const booted = useRef(false);

  const { experiment, metric, history } = exp;
  const inSetup = experiment.status === "setup";
  const awaitingApproval = experiment.status === "awaiting_approval";
  const showLanding = inSetup && showHero;
  // FR-A1/FR-A3: in the manual flow the user connects a source (and passes the
  // Claude page check) BEFORE configuring the experiment. The seeded demo /
  // walkthrough set status away from "setup" via startSeeded, so they never hit
  // this gate. Once connected, exp.connectedSource is set and Setup shows.
  const needsConnect = inSetup && !showHero && !exp.connectedSource;
  const presenterActive = !inSetup && !awaitingApproval;

  const setSafeWalkthroughIndex = useCallback((nextIndex) => {
    setWalkthroughIndex(
      Math.max(0, Math.min(WALKTHROUGH_STEPS.length - 1, nextIndex))
    );
  }, []);

  const loadPopulatedDemo = useCallback(
    async ({ present = false, walkthrough = false, collapsed = Boolean(walkthrough || present) } = {}) => {
      setBusy(true);
      try {
        await exp.startSeeded();
        setShowHero(false);
        setTab("dashboard");
        setWalkthroughActive(Boolean(walkthrough || present));
        setWalkthroughIndex(0);
        setWalkthroughCollapsed(Boolean((walkthrough || present) && collapsed));
        preloadTimeline();
        if (present) {
          auto.setSpeed(1);
          auto.play();
        }
      } finally {
        setBusy(false);
      }
    },
    [exp, auto]
  );

  useEffect(() => {
    if (booted.current) return;
    const { autoDemo, present, walkthrough } = readDemoParams();
    if (autoDemo || present || walkthrough) {
      booted.current = true;
      loadPopulatedDemo({
        present: present || autoDemo,
        walkthrough: walkthrough || present,
        collapsed: walkthrough || present,
      });
    }
  }, [loadPopulatedDemo]);

  useEffect(() => {
    if (!walkthroughActive || inSetup) return;
    const step = WALKTHROUGH_STEPS[walkthroughIndex];
    if (!step) return;

    if (step.targetView === "timeline") {
      preloadTimeline();
      setTab("timeline");
      setMethodologyOpen(false);
      return;
    }

    setTab("dashboard");
    setMethodologyOpen(step.targetView === "methodology");
  }, [walkthroughActive, walkthroughIndex, inSetup]);

  const handleStartWalkthrough = () =>
    loadPopulatedDemo({ present: false, walkthrough: true });

  const handleStart = async (config) => {
    setBusy(true);
    try {
      setWalkthroughActive(false);
      setMethodologyOpen(false);
      await exp.start(config);
      setTab("dashboard");
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async () => {
    setBusy(true);
    try {
      await exp.approve(); // only path to injection + experiment creation (FR-D1)
      setTab("dashboard");
    } finally {
      setBusy(false);
    }
  };

  const handleReject = () => {
    exp.rejectProposal();
  };

  const handleDecide = async () => {
    setBusy(true);
    try {
      await exp.decide();
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    const keepWalkthrough = walkthroughActive;
    const keepCollapsed = walkthroughCollapsed;
    auto.pause();
    await loadPopulatedDemo({
      present: false,
      walkthrough: keepWalkthrough,
      collapsed: keepCollapsed,
    });
  };

  usePresenterShortcuts({
    enabled: presenterActive,
    onToggleAutoplay: auto.toggle,
    onDecide: handleDecide,
    onTabLive: () => setTab("dashboard"),
    onTabLineage: () => {
      preloadTimeline();
      setTab("timeline");
    },
    onMethodology: () => setMethodologyOpen(true),
    onResetDemo: handleReset,
  });

  const setActiveTab = (nextTab) => {
    if (nextTab === "timeline") preloadTimeline();
    setTab(nextTab);
  };

  return (
    <div className="min-h-full bg-canvas">
      <Header
        exp={exp}
        inSetup={inSetup || awaitingApproval}
        showLanding={showLanding}
        tab={tab}
        setTab={setActiveTab}
        onReset={handleReset}
        onMethodology={() => setMethodologyOpen(true)}
        presenterActive={presenterActive}
        walkthroughActive={walkthroughActive}
        onStartWalkthrough={handleStartWalkthrough}
      />

      <main
        className={`mx-auto w-full px-4 sm:px-6 ${
          showLanding
            ? "flex min-h-[calc(100vh-3.5rem)] max-w-6xl items-stretch pb-10 pt-6"
            : "max-w-6xl pb-8 pt-4"
        }`}
      >
        {!showLanding && walkthroughActive && (
          <WalkthroughRail
            steps={WALKTHROUGH_STEPS}
            currentIndex={walkthroughIndex}
            collapsed={walkthroughCollapsed}
            onStepChange={setSafeWalkthroughIndex}
            onToggleCollapsed={() => setWalkthroughCollapsed((v) => !v)}
            onClose={() => setWalkthroughActive(false)}
          />
        )}

        {showLanding ? (
          <Hero
            onStart={handleStartWalkthrough}
            onMethodology={() => setMethodologyOpen(true)}
            onConfigure={() => setShowHero(false)}
          />
        ) : needsConnect ? (
          <SourceConnect onConnected={({ source }) => exp.connect(source)} />
        ) : inSetup ? (
          <Setup
            defaultName={experiment.name}
            defaultMetric={experiment.goalMetric}
            onStart={handleStart}
          />
        ) : awaitingApproval ? (
          <ApprovalGate
            champion={exp.approvalGate?.proposal?.champion}
            challenger={exp.approvalGate?.proposal?.challenger}
            state={exp.approvalState ?? "pending"}
            hypothesis={exp.approvalGate?.proposal?.hypothesis}
            onApprove={handleApprove}
            onReject={handleReject}
            busy={busy}
          />
        ) : tab === "dashboard" ? (
          <Dashboard exp={{ ...exp, decide: handleDecide }} auto={auto} busy={busy} />
        ) : (
          <Suspense fallback={<ChartLoading />}>
            <Timeline history={history} metric={metric} />
          </Suspense>
        )}
      </main>

      <MethodologyModal
        open={methodologyOpen}
        onClose={() => setMethodologyOpen(false)}
      />
    </div>
  );
}

function ChartLoading() {
  return (
    <div className="surface-card rounded-lg p-12 text-center text-sm text-muted">
      Loading chart...
    </div>
  );
}

function Header({
  exp,
  inSetup,
  showLanding,
  tab,
  setTab,
  onReset,
  onMethodology,
  presenterActive,
  walkthroughActive,
  onStartWalkthrough,
}) {
  const { experiment, metric, history } = exp;
  const generation = experiment.currentGeneration;
  const maxW = showLanding ? "max-w-6xl" : "max-w-6xl";

  return (
    <header className="sticky top-0 z-30 border-b border-edge bg-surface">
      <div className={`mx-auto flex w-full ${maxW} items-center justify-between gap-3 px-4 py-3 sm:px-6`}>
        <div className="flex min-w-0 items-center gap-3">
          <LogoMark size={26} />
          <div className="min-w-0 leading-tight">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-ink">beagle</span>
              <span className="hidden text-[11px] text-muted sm:inline">
                / experimentation
              </span>
            </div>
            {!inSetup && (
              <div className="truncate text-[11px] text-muted">
                {experiment.name} / {metric.short}
              </div>
            )}
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-2">
          {!inSetup && (
            <>
              <div className="hidden items-center gap-3 rounded-lg border border-edge bg-surface-2 px-3 py-1.5 text-xs lg:flex">
                <Stat k="Gen" v={generation} />
                <span className="h-3.5 w-px bg-edge" />
                <Stat k="Rounds" v={history.length} />
              </div>

              <div className="flex rounded-lg border border-edge bg-surface-2 p-0.5">
                <TabBtn active={tab === "dashboard"} onClick={() => setTab("dashboard")}>
                  <Activity size={14} />
                  <span className="hidden sm:inline">Live</span>
                </TabBtn>
                <TabBtn active={tab === "timeline"} onClick={() => setTab("timeline")}>
                  <GitBranch size={14} />
                  <span className="hidden sm:inline">Lineage</span>
                  {history.length > 0 && (
                    <span className="rounded bg-edge px-1.5 text-[10px] font-medium text-muted">
                      {history.length}
                    </span>
                  )}
                </TabBtn>
              </div>

              {!walkthroughActive && (
                <button
                  type="button"
                  onClick={onStartWalkthrough}
                  className="hidden items-center gap-1.5 rounded-lg border border-edge bg-surface px-3 py-1.5 text-xs font-medium text-muted hover:bg-surface-2 hover:text-ink sm:inline-flex"
                  title="Start walkthrough"
                >
                  <Map size={14} />
                  Walkthrough
                </button>
              )}
            </>
          )}

          {!showLanding && (
            <button
              type="button"
              onClick={onMethodology}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-edge bg-surface px-2.5 text-xs text-muted hover:bg-surface-2 hover:text-ink sm:px-3"
              title="Methodology (M)"
            >
              <BookOpen size={14} />
              <span className="hidden sm:inline">Methodology</span>
            </button>
          )}

          {!inSetup && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-edge bg-surface px-2.5 text-xs text-muted hover:bg-surface-2 hover:text-ink sm:px-3"
              title="Reset demo (R)"
            >
              <RotateCcw size={14} />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>

    </header>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium ${
        active ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Stat({ k, v }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted">{k}</span>
      <span className="font-semibold tabular-nums text-ink">{v}</span>
    </div>
  );
}
