import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useExperiment } from "./hooks/useExperiment.js";
import { useAutoplay } from "./hooks/useAutoplay.js";
import { usePresenterShortcuts, readDemoParams } from "./hooks/usePresenterShortcuts.js";
import { LogoMark } from "./components/Logo.jsx";
import Hero from "./components/Hero.jsx";
import Setup from "./components/Setup.jsx";
import Dashboard from "./components/Dashboard.jsx";
import MethodologyModal from "./components/MethodologyModal.jsx";

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
  const booted = useRef(false);

  const { experiment, metric, history } = exp;
  const inSetup = experiment.status === "setup";
  const showLanding = inSetup && showHero;
  const presenterActive = !inSetup;

  const loadPopulatedDemo = useCallback(
    async ({ present = false } = {}) => {
      setBusy(true);
      await exp.startSeeded();
      setShowHero(false);
      setTab("dashboard");
      preloadTimeline();
      if (present) {
        auto.setSpeed(4);
        auto.play();
      }
      setBusy(false);
    },
    [exp, auto]
  );

  useEffect(() => {
    if (booted.current) return;
    const { autoDemo, present } = readDemoParams();
    if (autoDemo || present) {
      booted.current = true;
      loadPopulatedDemo({ present: present || autoDemo });
    }
  }, [loadPopulatedDemo]);

  const handleStartDemo = () => loadPopulatedDemo({ present: false });

  const handleStart = async (config) => {
    setBusy(true);
    await exp.start(config);
    setTab("dashboard");
    setBusy(false);
  };

  const handleDecide = async () => {
    setBusy(true);
    await exp.decide();
    setBusy(false);
  };

  const handleReset = async () => {
    auto.pause();
    await loadPopulatedDemo({ present: false });
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

  return (
    <div className="min-h-full bg-canvas">
      <Header
        exp={exp}
        inSetup={inSetup}
        showLanding={showLanding}
        tab={tab}
        setTab={(t) => {
          if (t === "timeline") preloadTimeline();
          setTab(t);
        }}
        onReset={handleReset}
        onMethodology={() => setMethodologyOpen(true)}
        presenterActive={presenterActive}
      />

      <main
        className={`mx-auto w-full px-4 sm:px-6 ${
          showLanding
            ? "flex min-h-[calc(100vh-3.5rem)] max-w-6xl items-center pb-12 pt-8"
            : "max-w-5xl pb-28 pt-6"
        }`}
      >
        {showLanding ? (
          <Hero
            onStart={handleStartDemo}
            onMethodology={() => setMethodologyOpen(true)}
            onConfigure={() => setShowHero(false)}
          />
        ) : inSetup ? (
          <Setup
            defaultName={experiment.name}
            defaultMetric={experiment.goalMetric}
            onStart={handleStart}
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
    <div className="surface-card rounded-xl p-12 text-center text-sm text-muted">
      Loading chart…
    </div>
  );
}

function Header({ exp, inSetup, showLanding, tab, setTab, onReset, onMethodology, presenterActive }) {
  const { experiment, metric, history } = exp;
  const generation = experiment.currentGeneration;
  const maxW = showLanding ? "max-w-6xl" : "max-w-5xl";

  return (
    <header className="sticky top-0 z-30 border-b border-edge bg-surface/95 backdrop-blur-sm">
      <div className={`mx-auto flex w-full ${maxW} items-center justify-between gap-4 px-4 py-3 sm:px-6`}>
        <div className="flex items-center gap-3">
          <LogoMark size={24} />
          <div className="leading-tight">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-ink">beagle</span>
              <span className="hidden text-[11px] text-muted sm:inline">
                · experimentation
              </span>
            </div>
            {!inSetup && (
              <div className="text-[11px] text-muted">
                {experiment.name} · {metric.short}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!inSetup && (
            <>
              <div className="hidden items-center gap-3 rounded-lg border border-edge bg-surface-2 px-3 py-1.5 text-xs sm:flex">
                <Stat k="Gen" v={generation} />
                <span className="h-3.5 w-px bg-edge" />
                <Stat k="Rounds" v={history.length} />
              </div>

              <div className="flex rounded-lg border border-edge bg-surface-2 p-0.5">
                <TabBtn active={tab === "dashboard"} onClick={() => setTab("dashboard")}>
                  Live
                </TabBtn>
                <TabBtn active={tab === "timeline"} onClick={() => setTab("timeline")}>
                  Lineage
                  {history.length > 0 && (
                    <span className="ml-1 rounded bg-edge px-1.5 text-[10px] font-medium text-muted">
                      {history.length}
                    </span>
                  )}
                </TabBtn>
              </div>
            </>
          )}

          {!showLanding && (
            <button
              onClick={onMethodology}
              className="rounded-lg border border-edge bg-surface px-3 py-1.5 text-xs text-muted hover:bg-surface-2 hover:text-ink"
              title="Methodology (M)"
            >
              Methodology
            </button>
          )}

          {!inSetup && (
            <button
              onClick={onReset}
              className="rounded-lg border border-edge bg-surface px-3 py-1.5 text-xs text-muted hover:bg-surface-2 hover:text-ink"
              title="Reset demo (R)"
            >
              Reset demo
            </button>
          )}
        </div>
      </div>

      {presenterActive && (
        <div className="hidden border-t border-edge bg-surface-2/80 px-4 py-1 text-center text-[10px] text-muted sm:block">
          Shortcuts: Space autoplay · D decide · V live · L lineage · M methodology · R reset
        </div>
      )}
    </header>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-2.5 py-1 text-xs font-medium ${
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
