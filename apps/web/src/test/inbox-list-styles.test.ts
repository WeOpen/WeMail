import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const styles = readFileSync(join(process.cwd(), "src/shared/styles/index.css"), "utf8");
const tooltipStyles = readFileSync(join(process.cwd(), "src/shared/tooltip/tooltip.css"), "utf8");

function getRuleBody(selector: string, source = styles) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = source.matchAll(new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\}`, "g"));

  return Array.from(matches, (match) => match[1]).join("\n");
}

describe("inbox list styles", () => {
  it("keeps the message list column compact with centered filter tabs", () => {
    const inboxGridRule = getRuleBody(".inbox-grid");
    const messageItemRule = getRuleBody(".message-item.ui-button");
    const messageExtractionChipRule = getRuleBody(".message-extraction-chip");
    const messageCodeChipRule = getRuleBody(".message-extraction-chip.code");
    const activeMessageCodeChipRule = getRuleBody(".message-item.active .message-extraction-chip.code");
    const darkActiveMessageCodeChipRule = getRuleBody(":root[data-theme=\"dark\"] .message-item.active .message-extraction-chip.code");
    const messageExtractionChipLabelRule = getRuleBody(".message-extraction-chip-label");
    const activeMessageExtractionChipLabelRule = getRuleBody(".message-item.active .message-extraction-chip-label");
    const messageAttachmentChipRule = getRuleBody(".message-item-attachment-chip");
    const messageMainRule = getRuleBody(".message-item-main");
    const messageTimeRule = getRuleBody(".message-item-time");
    const messageFilterTabsRule = getRuleBody(".message-filter-tabs");
    const messageFilterTabsListRule = getRuleBody(".message-filter-tabs .message-filter-tabs-list.ui-tabs-list[data-variant=\"segmented\"]");
    const messageFilterTabRule = getRuleBody(".message-filter-tabs .message-filter-tab.ui-tabs-trigger[data-variant=\"segmented\"]");
    const messageIconRule = getRuleBody(".message-item-attachment-chip svg,\n.message-extraction-chip-icon,\n.message-filter-tab-icon");
    const mailboxSelectShellRule = getRuleBody(".mailbox-select-trigger-shell");
    const mailboxSelectClearRule = getRuleBody(".mailbox-select-clear.ui-button");
    const mailboxSelectClearHoverRule = getRuleBody(".mailbox-select-trigger-shell.has-selection:hover .mailbox-select-clear.ui-button,\n.mailbox-select-trigger-shell.has-selection:focus-within .mailbox-select-clear.ui-button");
    const mailboxSelectTableRule = getRuleBody(".mailbox-select-table");
    const mailboxSelectPaginationRule = getRuleBody(".mailbox-select-pagination");
    const extractionCardRule = getRuleBody(".inbox-detail-panel .extraction-card");
    const extractionCardPrimaryRule = getRuleBody(".extraction-card-primary strong");
    const extractionCardLinkRule = getRuleBody(".extraction-card-primary .extraction-card-value-link");
    const extractionConfidenceFillRule = getRuleBody(".extraction-confidence-fill");
    const detailActionsRule = getRuleBody(".detail-panel-actions");
    const detailSubjectRule = getRuleBody(".detail-panel-subject");
    const detailActionGroupRule = getRuleBody(".detail-panel-action-group");

    expect(inboxGridRule).toContain("minmax(360px, 0.72fr)");
    expect(inboxGridRule).toContain("minmax(320px, 0.76fr)");
    expect(messageFilterTabsRule).toContain("justify-content: center");
    expect(messageFilterTabsListRule).toContain("margin-inline: auto");
    expect(messageFilterTabRule).toContain("gap: 6px");
    expect(messageItemRule).toContain("overflow: visible");
    expect(messageItemRule).toContain("min-height: 132px");
    expect(messageItemRule).toContain("align-content: start");
    expect(messageItemRule).toContain("gap: 12px");
    expect(messageItemRule).toContain("padding: 22px 24px");
    expect(messageExtractionChipRule).toContain("gap: 8px");
    expect(messageCodeChipRule).toContain("background: #fff0e4");
    expect(messageCodeChipRule).toContain("color: #c84f00");
    expect(activeMessageCodeChipRule).toContain("background: #fff7ef");
    expect(activeMessageCodeChipRule).toContain("color: #b64500");
    expect(darkActiveMessageCodeChipRule).toContain("background: #fff7ef");
    expect(darkActiveMessageCodeChipRule).toContain("color: #b64500");
    expect(activeMessageExtractionChipLabelRule).toContain("color: currentColor");
    expect(messageExtractionChipLabelRule).toContain("text-overflow: ellipsis");
    expect(messageAttachmentChipRule).toContain("gap: 6px");
    expect(messageIconRule).toContain("flex: 0 0 auto");
    expect(mailboxSelectShellRule).toContain("grid-template-columns: minmax(0, 1fr) auto");
    expect(mailboxSelectClearRule).toContain("opacity: 0");
    expect(mailboxSelectClearRule).toContain("pointer-events: none");
    expect(mailboxSelectClearHoverRule).toContain("opacity: 1");
    expect(mailboxSelectClearHoverRule).toContain("pointer-events: auto");
    expect(mailboxSelectTableRule).toContain("table-layout: fixed");
    expect(mailboxSelectPaginationRule).toContain("justify-content: space-between");
    expect(extractionCardRule).toContain("grid-template-columns: minmax(0, 1fr) minmax(132px, 0.28fr)");
    expect(extractionCardRule).toContain("width: min(100%, 660px)");
    expect(extractionCardRule).toContain("min-height: 72px");
    expect(extractionCardRule).toContain("padding: 12px 14px");
    expect(extractionCardRule).toContain("background: #fff1e5");
    expect(extractionCardPrimaryRule).toContain("font-size: clamp(1.35rem, 2.1vw, 2.15rem)");
    expect(extractionCardLinkRule).toContain("\"SFMono-Regular\", Consolas, \"Liberation Mono\", monospace");
    expect(extractionCardLinkRule).toContain("font-size: clamp(0.86rem, 1.15vw, 1.02rem)");
    expect(extractionConfidenceFillRule).toContain("linear-gradient(90deg, #ff7a00 0%, #20c997 100%)");
    expect(messageMainRule).toContain("line-height: 1.35");
    expect(messageTimeRule).toContain("font-size: 0.86rem");
    expect(messageTimeRule).toContain("font-variant-numeric: tabular-nums");
    expect(detailActionsRule).toContain("grid-template-columns: minmax(0, 1fr) auto");
    expect(detailSubjectRule).toContain("text-overflow: ellipsis");
    expect(detailSubjectRule).toContain("white-space: nowrap");
    expect(detailActionGroupRule).toContain("justify-content: flex-end");
  });
});

describe("shared tooltip styles", () => {
  it("centers tooltip copy inside a stable pill", () => {
    const tooltipContentRule = getRuleBody(".ui-tooltip-content", tooltipStyles);

    expect(tooltipContentRule).toContain("display: inline-flex");
    expect(tooltipContentRule).toContain("align-items: center");
    expect(tooltipContentRule).toContain("justify-content: center");
    expect(tooltipContentRule).toContain("min-height: 32px");
    expect(tooltipContentRule).toContain("line-height: 1");
    expect(tooltipContentRule).toContain("text-align: center");
  });
});
