import { readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

const assetsDir = resolve(process.cwd(), "dist/assets");
const budgets = [
  { prefix: "index", maxBytes: 270_000 },
  { prefix: "WorkspaceApp", maxBytes: 75_000 },
  { prefix: "react-vendor", maxBytes: 90_000 },
  { prefix: "react-dom-vendor", maxBytes: 250_000 },
  { prefix: "router-vendor", maxBytes: 100_000 },
  { prefix: "state-vendor", maxBytes: 25_000 },
  { prefix: "nivo-legends", maxBytes: 190_000 },
  { prefix: "nivo-line", maxBytes: 65_000 },
  { prefix: "nivo-bar", maxBytes: 55_000 },
  { prefix: "nivo-pie", maxBytes: 45_000 }
];

function findChunk(prefix) {
  return readdirSync(assetsDir).find((fileName) => fileName.startsWith(`${prefix}-`) && fileName.endsWith(".js"));
}

const failures = [];

for (const budget of budgets) {
  const chunk = findChunk(budget.prefix);
  if (!chunk) {
    failures.push(`${budget.prefix}: chunk not found`);
    continue;
  }

  const size = statSync(resolve(assetsDir, chunk)).size;
  if (size > budget.maxBytes) {
    failures.push(`${chunk}: ${size} bytes exceeds ${budget.maxBytes} byte budget`);
  }
}

if (failures.length > 0) {
  console.error("Bundle budget check failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Bundle budget check passed.");
