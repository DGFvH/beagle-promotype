export const WALKTHROUGH_STEPS = [
  {
    id: "promise",
    label: "Promise",
    title: "Autonomous UI evolution",
    body:
      "beagle starts with a live UI surface, measures the chosen goal, picks a winner, and breeds the next challenger.",
    targetView: "dashboard",
  },
  {
    id: "evolution",
    label: "Evolution",
    title: "Before and after, not a static test",
    body:
      "The seeded demo already contains eight completed generations, so the room can see the path from baseline navigation to the current champion.",
    targetView: "dashboard",
  },
  {
    id: "live",
    label: "Live G9",
    title: "Generation 9 is running now",
    body:
      "Use autoplay or fill the visitor window to complete the live round without leaving the populated experiment.",
    targetView: "dashboard",
  },
  {
    id: "decision",
    label: "Decision",
    title: "The decision moment",
    body:
      "When the window fills, Decide & evolve records the winner and generates a new challenger from that winning interface.",
    targetView: "dashboard",
  },
  {
    id: "lineage",
    label: "Lineage",
    title: "Every generation leaves proof",
    body:
      "The lineage view shows the metric path, winning configs, losing configs, and the mutation that created the next challenger.",
    targetView: "timeline",
  },
  {
    id: "methodology",
    label: "Method",
    title: "What is real and what is simulated",
    body:
      "The methodology panel separates the implemented loop from the synthetic traffic and the roadmap for production-grade experimentation.",
    targetView: "methodology",
  },
];
