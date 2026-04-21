import type { PartialTheme } from "@nivo/theming";

export const nivoTheme: PartialTheme = {
  background: "transparent",
  text: {
    fill: "var(--text)",
    fontFamily: "inherit",
    fontSize: 12
  },
  axis: {
    domain: {
      line: { stroke: "transparent" }
    },
    ticks: {
      line: { stroke: "var(--border)", strokeWidth: 1 },
      text: { fill: "var(--text-muted)", fontSize: 11 }
    },
    legend: {
      text: { fill: "var(--text-muted)", fontSize: 11 }
    }
  },
  grid: {
    line: {
      stroke: "var(--border)",
      strokeWidth: 1,
      strokeDasharray: "2 4"
    }
  },
  legends: {
    text: { fill: "var(--text-muted)" }
  },
  tooltip: {
    container: {
      background: "var(--surface-strong)",
      color: "var(--text)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: "10px 12px",
      fontSize: 12,
      boxShadow: "0 8px 22px rgba(0, 0, 0, 0.14)"
    }
  },
  crosshair: {
    line: {
      stroke: "var(--text-muted)",
      strokeWidth: 1,
      strokeOpacity: 0.55
    }
  }
};
