// ---------------------------------------------------------------------------
// FR-G3 — "Generate report (.pptx)" trigger
// ---------------------------------------------------------------------------
// Enabled once a test has CONCLUDED (a verdict exists). On click it builds the
// run summary from the data the Dashboard already has (the FR-G1 verdict + the
// FR-G2 segmentAnalysis + the chosen metric), POSTs it to /api/generate-report,
// then downloads the returned .pptx. The route makes the Claude call server-side
// (the key never reaches the browser — Section 6) and always returns a valid
// .pptx (Claude-styled or the deterministic fallback). Clear loading/error
// states; disabled with a hint when no test has concluded.

import { useState } from "react";
import { FileDown, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

// Build the run summary the report route consumes from the props the Dashboard
// already holds. No fabricated numbers — every value comes from the verdict /
// segment analysis (or is omitted).
function buildRunSummary({ verdict, metric, segmentAnalysis, hypothesis }) {
  const fmt = (v) => (v == null ? null : metric?.format ? metric.format(v) : String(v));
  const deltaDisplay =
    verdict?.deltaPct != null
      ? `${verdict.deltaPct >= 0 ? "+" : ""}${verdict.deltaPct.toFixed(1)}% vs champion`
      : "";

  const segments = (segmentAnalysis?.recommendations ?? []).map((r) => ({
    segmentLabel: r.segmentLabel,
    winnerLabel: r.winnerLabel,
    divergesFromAggregate: !!r.divergesFromAggregate,
  }));

  return {
    title: `Hero A/B test report — ${metric?.label ?? "key metric"}`,
    hypothesis:
      hypothesis ||
      `The challenger improves ${metric?.label ?? "the chosen metric"} versus the champion hero.`,
    verdict: verdict?.verdict ?? "inconclusive",
    verdictReason: verdict?.reason ?? "",
    metric: { label: metric?.label ?? "Key metric" },
    metricMovement: {
      championLabel: verdict?.championLabel ?? "Champion",
      challengerLabel: verdict?.challengerLabel ?? "Challenger",
      championValue: verdict?.championValue ?? null,
      challengerValue: verdict?.challengerValue ?? null,
      championDisplay: fmt(verdict?.championValue) ?? "--",
      challengerDisplay: fmt(verdict?.challengerValue) ?? "--",
      deltaDisplay,
    },
    segments,
    confidence: {
      pct: verdict?.confidence?.pct ?? 0,
      label: verdict?.confidence?.label ?? "rough indicator (not a production p-value)",
    },
  };
}

function downloadBase64(base64, filename, mimeType) {
  const bytes = atob(base64);
  const buf = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
  const blob = new Blob([buf], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "beagle-report.pptx";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ReportButton({ verdict, metric, segmentAnalysis, hypothesis }) {
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [message, setMessage] = useState("");

  // FR-G3a: a report can only be generated once the test has concluded — i.e.
  // there is a real verdict over measured data (confirmed/rejected/inconclusive
  // with numbers behind it). Without that, the trigger is disabled with a hint.
  const concluded = !!verdict && verdict.challengerWins != null;

  async function onGenerate() {
    if (!concluded || status === "loading") return;
    setStatus("loading");
    setMessage("");
    try {
      const summary = buildRunSummary({ verdict, metric, segmentAnalysis, hypothesis });
      const resp = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary }),
      });
      if (!resp.ok) {
        throw new Error(`Report service returned ${resp.status}`);
      }
      const data = await resp.json();
      if (!data?.pptxBase64) {
        throw new Error("No deck returned");
      }
      downloadBase64(data.pptxBase64, data.filename, data.mimeType);
      setStatus("done");
      setMessage(
        data.source === "claude"
          ? "Deck generated with Claude + style guide."
          : "Deck generated (without Claude — fallback)."
      );
    } catch (err) {
      setStatus("error");
      setMessage(err?.message ? `Could not generate report: ${err.message}` : "Could not generate report.");
    }
  }

  return (
    <section className="rounded-lg border border-edge bg-surface p-3 shadow-sm">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted">
        <FileDown size={13} />
        Meeting report
      </div>
      <p className="mt-1 text-[12px] leading-snug text-muted">
        {concluded
          ? "Generate a PowerPoint summary of this test for a meeting."
          : "Run the test to a conclusion (a verdict) to enable the report."}
      </p>
      <button
        type="button"
        onClick={onGenerate}
        disabled={!concluded || status === "loading"}
        title={concluded ? "Generate a .pptx report via Claude" : "No concluded test yet"}
        className={`mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition ${
          !concluded
            ? "cursor-not-allowed border border-edge bg-surface-2 text-muted/60"
            : "border border-accent/30 bg-accent/10 text-accent hover:bg-accent/20"
        }`}
      >
        {status === "loading" ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Generating…
          </>
        ) : (
          <>
            <FileDown size={14} />
            Generate report (.pptx)
          </>
        )}
      </button>
      {status === "done" && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-win">
          <CheckCircle2 size={12} />
          {message}
        </p>
      )}
      {status === "error" && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-lose">
          <AlertCircle size={12} />
          {message}
        </p>
      )}
    </section>
  );
}
