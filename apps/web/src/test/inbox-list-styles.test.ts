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
    const inboxMessageFiltersRule = getRuleBody(".inbox-message-filters");
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
    const messageBatchSelectRule = getRuleBody(".message-batch-select-all");
    const messageBatchToolbarRule = getRuleBody(".message-batch-toolbar");
    const messageBatchCountRule = getRuleBody(".message-batch-count");
    const messageWorkbenchRule = getRuleBody(".message-workbench-panel");
    const messagePaginationRule = getRuleBody(".message-pagination");
    const inboxMessageListRule = getRuleBody(".inbox-message-list");
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
    const linkRiskCardRule = getRuleBody(".link-risk-card");
    const detailActionsRule = getRuleBody(".detail-panel-actions");
    const detailSubjectRule = getRuleBody(".detail-panel-subject");
    const detailActionGroupRule = getRuleBody(".detail-panel-action-group");
    const announcementsItemOpenRule = getRuleBody(".announcements-item-open.ui-button");

    expect(inboxGridRule).toContain("minmax(360px, 0.72fr)");
    expect(inboxGridRule).toContain("minmax(320px, 0.76fr)");
    expect(inboxMessageFiltersRule).toContain("grid-column: 1 / -1");
    expect(inboxMessageFiltersRule).toContain("grid-template-columns: minmax(320px, 1fr) minmax(190px, 0.32fr) minmax(190px, 0.32fr)");
    expect(messageFilterTabsRule).toContain("justify-content: center");
    expect(messageFilterTabsListRule).toContain("margin-inline: auto");
    expect(messageFilterTabRule).toContain("gap: 6px");
    expect(messageBatchSelectRule).toContain("justify-self: start");
    expect(messageBatchSelectRule).toContain("text-align: left");
    expect(messageBatchToolbarRule).toContain("grid-template-columns: auto minmax(0, 1fr) auto");
    expect(messageBatchCountRule).toContain("justify-self: start");
    expect(messageWorkbenchRule).toContain("flex-direction: column");
    expect(messageWorkbenchRule).toContain("height: auto");
    expect(messagePaginationRule).toContain("margin-top: auto");
    expect(inboxMessageListRule).toContain("flex: 1 1 auto");
    expect(messageItemRule).toContain("overflow: visible");
    expect(announcementsItemOpenRule).toContain("overflow: visible");
    expect(announcementsItemOpenRule).toContain("border-radius: 16px");
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
    expect(extractionCardRule).toContain("width: 100%");
    expect(extractionCardRule).toContain("justify-self: stretch");
    expect(extractionCardRule).toContain("min-height: 72px");
    expect(extractionCardRule).toContain("padding: 12px 14px");
    expect(extractionCardRule).toContain("background: #fff1e5");
    expect(extractionCardPrimaryRule).toContain("font-size: clamp(1.35rem, 2.1vw, 2.15rem)");
    expect(extractionCardLinkRule).toContain("\"SFMono-Regular\", Consolas, \"Liberation Mono\", monospace");
    expect(extractionCardLinkRule).toContain("font-size: clamp(0.86rem, 1.15vw, 1.02rem)");
    expect(extractionConfidenceFillRule).toContain("linear-gradient(90deg, #ff7a00 0%, #20c997 100%)");
    expect(linkRiskCardRule).toContain("width: 100%");
    expect(messageMainRule).toContain("line-height: 1.35");
    expect(messageTimeRule).toContain("font-size: 0.86rem");
    expect(messageTimeRule).toContain("font-variant-numeric: tabular-nums");
    expect(detailActionsRule).toContain("grid-template-columns: minmax(0, 1fr) auto");
    expect(detailSubjectRule).toContain("text-overflow: ellipsis");
    expect(detailSubjectRule).toContain("white-space: nowrap");
    expect(detailActionGroupRule).toContain("justify-content: flex-end");
  });

  it("skips offscreen work for repeated list items with content visibility", () => {
    const messageItemRule = getRuleBody(".message-item.ui-button");
    const announcementsItemRule = getRuleBody(".announcements-item");

    expect(messageItemRule).toContain("content-visibility: auto");
    expect(messageItemRule).toContain("contain-intrinsic-size: 132px");
    expect(announcementsItemRule).toContain("content-visibility: auto");
    expect(announcementsItemRule).toContain("contain-intrinsic-size:");
  });
});

describe("users governance styles", () => {
  it("lays rate limit policies out as four cards before responsive collapse", () => {
    const policyListRule = getRuleBody(".users-governance-policy-list");
    const policyCardRule = getRuleBody(".users-governance-policy");

    expect(policyListRule).toContain("grid-template-columns: repeat(4, minmax(0, 1fr))");
    expect(policyListRule).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
    expect(policyListRule).toContain("grid-template-columns: minmax(0, 1fr)");
    expect(policyCardRule).toContain("grid-template-columns: minmax(0, 1fr)");
    expect(policyCardRule).toContain("min-height: 132px");
  });

  it("keeps commercial plans in a colored responsive three-tier row", () => {
    const planGridRule = getRuleBody(".users-commercial-plan-grid");
    const freePlanRule = getRuleBody(".users-commercial-plan[data-plan=\"free\"]");
    const proPlanRule = getRuleBody(".users-commercial-plan[data-plan=\"pro\"]");
    const teamPlanRule = getRuleBody(".users-commercial-plan[data-plan=\"team\"]");

    expect(planGridRule).toContain("grid-template-columns: repeat(3, minmax(0, 1fr))");
    expect(planGridRule).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
    expect(planGridRule).toContain("grid-template-columns: 1fr");
    expect(freePlanRule).toContain("--users-commercial-plan-color: var(--info-500)");
    expect(proPlanRule).toContain("--users-commercial-plan-color: var(--success-500)");
    expect(teamPlanRule).toContain("--users-commercial-plan-color: var(--accent)");
  });

  it("places quota governance users and quota targets in a responsive two-column layout", () => {
    const quotaLayoutRule = getRuleBody(".users-quota-layout");
    const quotaUserListRule = getRuleBody(".users-quota-user-list");
    const quotaUserRowRule = getRuleBody(".users-quota-user-row");
    const quotaLimitGridRule = getRuleBody(".users-quota-limit-grid");
    const quotaFormFooterRule = getRuleBody(".users-quota-form-footer");
    const quotaSaveButtonRule = getRuleBody(".users-quota-form-footer .ui-button");
    const quotaPaginationRule = getRuleBody(".users-quota-pagination");
    const quotaPaginationListRule = getRuleBody(".users-quota-pagination .ui-pagination-list");

    expect(quotaLayoutRule).toContain("grid-template-columns: minmax(340px, 1fr) minmax(380px, 1fr)");
    expect(quotaLayoutRule).toContain("grid-template-columns: minmax(0, 1fr)");
    expect(quotaUserListRule).toContain("max-height: none");
    expect(quotaUserListRule).toContain("overflow: visible");
    expect(quotaUserRowRule).toContain("grid-template-columns: minmax(0, 1fr) auto");
    expect(quotaUserRowRule).toContain("min-height: 86px");
    expect(quotaLimitGridRule).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
    expect(quotaLimitGridRule).toContain("grid-template-columns: minmax(0, 1fr)");
    expect(quotaFormFooterRule).toContain("justify-content: space-between");
    expect(quotaSaveButtonRule).toContain("margin-left: auto");
    expect(quotaPaginationRule).toContain("justify-content: center");
    expect(quotaPaginationListRule).toContain("justify-content: center");
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
