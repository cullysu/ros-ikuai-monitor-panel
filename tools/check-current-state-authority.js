const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const readJson = (relative) => JSON.parse(read(relative));
const firstLines = (source, count) => source.split(/\r?\n/).slice(0, count).join("\n");
const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const currentState = read("docs/decision-system/current-state.md");
const decisionIndex = read("docs/decision-system/README.md");
const handoff = read("docs/product-loop-current.md");
const journal = read("docs/panel-redesign-decision-log.md");
const machine = readJson(".product-loop/state.json");

const requestedStep = process.argv[2] === undefined ? null : Number(process.argv[2]);
const journalSteps = [...journal.matchAll(/^##\s*(?:(?:第\s*)|(?:Step\s*))?(\d+)\s*/gm)].map((match) => Number(match[1]));
const latestJournalStep = journalSteps[journalSteps.length - 1];
const expectedStep = requestedStep === null ? latestJournalStep : requestedStep;
if (!Number.isInteger(expectedStep)) {
  console.error("FAIL current-state authority contract: no valid current decision step");
  process.exitCode = 1;
}

const currentHeader = firstLines(currentState, 24);
const indexHeader = firstLines(decisionIndex, 12);
const handoffHeader = firstLines(handoff, 60);
const journalHeader = firstLines(journal, 12);

expect(
  currentHeader.includes(`- currentConclusionForStep: \`${expectedStep}\``),
  `current-state top header is not bound to Step ${expectedStep}`,
);
expect(
  indexHeader.includes(`- latestRecordedStep: \`${expectedStep}\``),
  `decision-system index top header is not bound to Step ${expectedStep}`,
);
expect(
  handoffHeader.includes(`- currentHandoffForStep: \`${expectedStep}\``),
  `product-loop handoff top header is not bound to Step ${expectedStep}`,
);
expect(machine.latest_decision_step === expectedStep, `machine latest_decision_step is not ${expectedStep}`);
expect(machine.current_surface_step === expectedStep, `machine current_surface_step is not ${expectedStep}`);
expect(
  String(machine.latest_decision_outcome || "").startsWith(`${expectedStep}:`),
  `machine latest_decision_outcome is not bound to Step ${expectedStep}`,
);
expect(/当前产品结论：\*\*FAIL/.test(journalHeader), "historical journal top header does not state product FAIL");
expect(/当前权威来源：`docs\/decision-system\/current-state\.md`/.test(journalHeader), "historical journal does not point to current-state authority");
expect(/\*\*FAIL overall/.test(firstLines(handoff, 60)), "handoff top section does not state FAIL overall");
expect(/\| Current product release \| `fail` \|/.test(firstLines(handoff, 60)), "handoff top gate table does not keep release fail-closed");
expect(!/Product release gate:\s*\*\*PASS/.test(firstLines(currentState, 80)), "current-state top section contains a product PASS claim");
expect(!/Current product release\s*\|\s*`pass`/.test(firstLines(handoff, 60)), "handoff top section contains a product release pass");

if (failures.length) {
  console.error(`FAIL current-state authority contract (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`PASS current-state authority contract step=${expectedStep}`);
}
