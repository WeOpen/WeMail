import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NotificationDeliveryPanel } from "../features/settings/NotificationDeliveryPanel";
import { NotificationRuleTester } from "../features/settings/NotificationRuleTester";

const summary = { counts: { pending: 0, processing: 0, retrying: 0, succeeded: 0, failed: 1, suppressed: 0 }, backlogCount: 0, lastSucceededAt: null };
const delivery = { id: "task-1", eventId: "event-1", eventType: "message.received", target: "webhook", targetId: "endpoint-1", targetName: "Codes webhook", status: "failed", attempts: 1, nextAttemptAt: "2026-10-06T00:00:00Z", errorText: "HTTP 503", createdAt: "2026-10-06T00:00:00Z", updatedAt: "2026-10-06T00:00:00Z", expiresAt: "2099-01-01T00:00:00Z" };

describe("notification status and rule testing", () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it("shows a failed target, replays it and reloads its successful state", async () => {
    const successful = { summary: { ...summary, counts: { ...summary.counts, failed: 0, succeeded: 1 } }, deliveries: [{ ...delivery, status: "succeeded", attempts: 2, errorText: null }] };
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ summary, deliveries: [delivery] }))
      .mockResolvedValueOnce(Response.json(successful)).mockResolvedValueOnce(Response.json(successful));
    vi.stubGlobal("fetch", fetchMock);
    render(<NotificationDeliveryPanel />);
    expect(await screen.findByText("HTTP 503")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "重试通知 task-1" }));
    await waitFor(() => expect(screen.getByText("投递成功 · 本轮已尝试 2 次")).toBeInTheDocument());
    expect(fetchMock.mock.calls[1][0]).toContain("/api/notification/deliveries/task-1/retry");
    expect(fetchMock.mock.calls[1][1]?.method).toBe("POST");
  });

  it("keeps a retryable loading error local to the notification panel", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockRejectedValueOnce(new Error("network unavailable")).mockResolvedValueOnce(Response.json({ summary, deliveries: [] })));
    render(<NotificationDeliveryPanel />);
    expect(await screen.findByRole("alert")).toHaveTextContent("network unavailable");
    fireEvent.click(screen.getByRole("button", { name: "刷新通知状态" }));
    expect(await screen.findByText(/暂无通知记录/)).toBeInTheDocument();
  });

  it("displays the conditions that suppressed a dry-run event", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(Response.json({
      shouldSend: false, reason: "no_matching_rules", evaluatedAt: "2026-10-06T00:00:00Z",
      rules: [{ id: "rule-1", name: "Night codes", matched: false, reasons: ["quiet_hours", "keyword_mismatch"], quietHoursTimezone: "Asia/Shanghai" }]
    }));
    vi.stubGlobal("fetch", fetchMock);
    render(<NotificationRuleTester />);
    fireEvent.change(screen.getByRole("textbox", { name: "测试邮件内容" }), { target: { value: "Verification sample" } });
    fireEvent.click(screen.getByRole("button", { name: "测试通知规则" }));
    expect(await screen.findByText("此事件未通过通知规则")).toBeInTheDocument();
    expect(screen.getByText(/处于免打扰时间、关键词未匹配/)).toBeInTheDocument();
    expect(screen.getByText(/时区 Asia\/Shanghai/)).toBeInTheDocument();
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).data.subject).toBe("Verification sample");
  });
});
