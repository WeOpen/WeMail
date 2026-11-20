import { createHmac } from "node:crypto";

import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const apiUrl = process.env.BUSINESS_API_URL ?? "http://127.0.0.1:8789";
const testHeaders = { authorization: `Bearer ${process.env.BUSINESS_TEST_TOKEN}` };
const password = "business-password-123";

async function driver(request: APIRequestContext, path: string, data: unknown) {
  const response = await request.post(`${apiUrl}/__test/${path}`, { headers: testHeaders, data });
  expect(response.ok(), await response.text()).toBe(true);
  return response.json();
}

async function register(request: APIRequestContext, index: number) {
  const email = `business-member-${index}@example.com`;
  const response = await request.post(`${apiUrl}/api/auth/register`, {
    data: { email, password, name: `Member ${index}`, inviteCode: `BUSINESS-${index}` }
  });
  expect(response.status(), await response.text()).toBe(201);
  return email;
}

async function createMailbox(request: APIRequestContext, label: string) {
  const response = await request.post(`${apiUrl}/api/accounts`, { data: { label, domain: "example.com" } });
  expect(response.status(), await response.text()).toBe(201);
  return (await response.json()).mailbox as { id: string; address: string };
}

async function receive(request: APIRequestContext, mailbox: { address: string }, id: string, body = "验证码 654321，10 分钟内有效。Verify your login: https://example.net/verify/token") {
  return driver(request, "inbound", {
    to: mailbox.address,
    raw: ["From: Security <security@example.net>", `To: ${mailbox.address}`, `Message-ID: <${id}@example.net>`, "Subject: Business verification", "Content-Type: text/plain; charset=utf-8", "", body].join("\r\n")
  });
}

async function createKey(request: APIRequestContext, scopes: string[]) {
  const response = await request.post(`${apiUrl}/api/api-keys`, { data: { label: "Business integration", scopes } });
  expect(response.status(), await response.text()).toBe(201);
  return (await response.json()).key as { id: string; secret: string };
}

async function registerInBrowser(page: Page) {
  await page.goto("/register?next=/accounts/list");
  await page.getByRole("textbox", { name: "用户名", exact: true }).fill("Business Member");
  await page.getByRole("textbox", { name: "邮箱", exact: true }).fill("business-member-1@example.com");
  await page.locator("#register-password").fill(password);
  await page.getByRole("textbox", { name: "邀请码", exact: true }).fill("BUSINESS-1");
  await page.getByRole("button", { name: "立即注册", exact: true }).click();
  await expect(page).toHaveURL(/\/accounts\/list$/);
}

test("registers a member, creates a mailbox in the browser, reads real inbound mail and revokes an API key", async ({ page, playwright }, testInfo) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  let expectedAuthRejections = 0;
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("response", (response) => { if (response.status() === 401 && new URL(response.url()).pathname === "/api/auth/session") expectedAuthRejections += 1; });
  await registerInBrowser(page);
  await expect(page.getByRole("button", { name: "新建账号", exact: true })).toBeVisible();
  await page.context().clearCookies();
  await page.goto("/login?next=/accounts/list");
  await page.getByRole("textbox", { name: "邮箱", exact: true }).fill("business-member-1@example.com");
  await page.locator("#login-password").fill(password);
  await page.getByRole("button", { name: "立即登录", exact: true }).click();
  await expect(page).toHaveURL(/\/accounts\/list$/);
  await expect(page.getByRole("button", { name: "新建账号", exact: true })).toBeVisible();
  const sessionResponse = await page.evaluate(async (url) => {
    const response = await fetch(`${url}/api/auth/session`, { credentials: "include" });
    return { status: response.status, body: await response.json() };
  }, apiUrl);
  expect(sessionResponse.status).toBe(200);
  const session = sessionResponse.body;
  expect(session.user.role).toBe("member");
  await page.getByRole("button", { name: "新建账号", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "创建新账号" });
  await dialog.getByLabel("账号标签", { exact: true }).fill("Business Inbox");
  await dialog.getByRole("combobox", { name: "邮箱域名", exact: true }).click();
  await page.getByRole("option", { name: "example.com", exact: true }).click();
  const creation = page.waitForResponse((response) => response.url() === `${apiUrl}/api/accounts` && response.request().method() === "POST");
  await dialog.getByRole("button", { name: "创建账号", exact: true }).click();
  const createdResponse = await creation;
  expect(createdResponse.status()).toBe(201);
  const mailbox = (await createdResponse.json()).mailbox;
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: mailbox.address })).toBeVisible();
  const browserApi = await playwright.request.newContext({ storageState: await page.context().storageState() });
  const mailboxes = await (await browserApi.get(`${apiUrl}/api/accounts`)).json();
  expect(mailboxes.mailboxes.map((item: { id: string }) => item.id)).toContain(mailbox.id);
  const received = await receive(page.request, mailbox, "browser-first");
  await page.goto("/mail/list");
  await expect(page).toHaveTitle(/邮件列表.*WeMail/);
  await expect(page.getByText("Business verification", { exact: true }).first()).toBeVisible();
  await page.getByText("Business verification", { exact: true }).first().click();
  await expect(page.getByRole("region", { name: "邮件识别结果" }).or(page.locator('[aria-label="邮件识别结果"]'))).toContainText("654321");
  await expect(page.locator('[aria-label="其他提取结果"]')).toContainText("https://example.net/verify/token");
  await expect(page.locator('[aria-label="阅读与提取详情"]')).toContainText("10 分钟内有效");
  const screenshot = testInfo.outputPath("inbox.png");
  await page.screenshot({ path: screenshot, fullPage: false });
  await testInfo.attach("real-inbox", { path: screenshot, contentType: "image/png" });
  expect(pageErrors).toEqual([]);
  const authConsoleErrors = consoleErrors.filter((message) => message.includes("401 (Unauthorized)"));
  expect(authConsoleErrors.length).toBeLessThanOrEqual(expectedAuthRejections);
  expect(consoleErrors.filter((message) => !message.includes("401 (Unauthorized)"))).toEqual([]);
  await testInfo.attach("browser-console", { body: JSON.stringify({ consoleErrors, pageErrors, expectedAuthRejections }), contentType: "application/json" });
  const key = await createKey(browserApi, ["mail:read"]);
  expect(key.secret).toBeTruthy();
  const keyClient = await playwright.request.newContext({ extraHTTPHeaders: { authorization: `Bearer ${key.secret}` } });
  try {
    const list = await keyClient.get(`${apiUrl}/api/mail/messages?accountId=${mailbox.id}`);
    expect(list.status()).toBe(200);
    expect((await list.json()).messages[0].id).toBe(received.message.id);
    expect((await browserApi.delete(`${apiUrl}/api/api-keys/${key.id}`)).status()).toBe(200);
    expect((await keyClient.get(`${apiUrl}/api/mail/messages?accountId=${mailbox.id}`)).status()).toBe(401);
  } finally { await keyClient.dispose(); await browserApi.dispose(); }
});

test("rejects unauthenticated test drivers and invalid invites", async ({ request }) => {
  const driverResponse = await request.post(`${apiUrl}/__test/inbound`, { data: { to: "nobody@example.com", raw: "" } });
  expect(driverResponse.status()).toBe(403);
  const registration = await request.post(`${apiUrl}/api/auth/register`, { data: { email: "invalid-invite@example.com", password, name: "Invalid invite", inviteCode: "INVALID-BUSINESS-INVITE" } });
  expect(registration.status()).toBe(403);
  expect(registration.headers()["set-cookie"]).toBeUndefined();
});

test("enforces ownership, API scopes and per-user call quotas in D1", async ({ request, playwright }) => {
  const email = await register(request, 2);
  const mailbox = await createMailbox(request, "Permission inbox");
  const inbound = await receive(request, mailbox, "permissions");
  const other = await playwright.request.newContext();
  const scoped = await playwright.request.newContext();
  try {
    await register(other, 3);
    expect((await other.get(`${apiUrl}/api/mail/messages/${inbound.message.id}`)).status()).toBe(404);
    const key = await createKey(request, ["mail:read"]);
    const headers = { authorization: `Bearer ${key.secret}` };
    expect((await scoped.post(`${apiUrl}/api/mail/send`, { headers, data: { mailboxId: mailbox.id, toAddress: "recipient@example.net", subject: "Forbidden", bodyText: "No send scope" } })).status()).toBe(403);
    expect((await scoped.get(`${apiUrl}/api/notification/deliveries`, { headers })).status()).toBe(403);
    await driver(request, "quota", { email, apiDailyLimit: 1 });
    expect((await scoped.get(`${apiUrl}/api/mail/messages?accountId=${mailbox.id}`, { headers })).status()).toBe(200);
    expect((await scoped.get(`${apiUrl}/api/mail/messages?accountId=${mailbox.id}`, { headers })).status()).toBe(429);
  } finally { await other.dispose(); await scoped.dispose(); }
});

test("deduplicates Message-ID, preserves distinct mail and stores HTML attachments in R2", async ({ request }) => {
  await register(request, 4);
  const mailbox = await createMailbox(request, "MIME inbox");
  const first = await receive(request, mailbox, "duplicate");
  const duplicate = await receive(request, mailbox, "duplicate");
  expect(duplicate.message.id).toBe(first.message.id);
  await receive(request, mailbox, "distinct");
  const mime = [
    "From: Security <security@example.net>", `To: ${mailbox.address}`, "Message-ID: <mime@example.net>", "Subject: HTML attachment",
    'MIME-Version: 1.0', 'Content-Type: multipart/mixed; boundary="business-boundary"', "", "--business-boundary",
    'Content-Type: text/html; charset="utf-8"', "", '<p>Your verification code is <b>482914</b>.</p>', "--business-boundary",
    'Content-Type: text/plain; name="note.txt"', 'Content-Disposition: attachment; filename="note.txt"', 'Content-Transfer-Encoding: base64', "", "YnVzaW5lc3MtYXR0YWNobWVudA==", "--business-boundary--"
  ].join("\r\n");
  const { message } = await driver(request, "inbound", { to: mailbox.address, raw: mime });
  const detail = await (await request.get(`${apiUrl}/api/mail/messages/${message.id}`)).json();
  expect(detail.message.bodyText).toContain("482914");
  expect(detail.message.attachments).toHaveLength(1);
  const attachment = await request.get(`${apiUrl}/api/mail/messages/${message.id}/attachments/${detail.message.attachments[0].id}`);
  expect(attachment.status()).toBe(200);
  expect(await attachment.text()).toBe("business-attachment");
  const messages = await (await request.get(`${apiUrl}/api/mail/messages?accountId=${mailbox.id}`)).json();
  expect(messages.total).toBe(3);
});

test("shows notification failures, replays from the UI and explains rule matches", async ({ request, page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error" && !message.text().includes("401 (Unauthorized)")) consoleErrors.push(message.text()); });
  await register(request, 5);
  const mailbox = await createMailbox(request, "Notifications inbox");
  const endpoint = await request.post(`${apiUrl}/api/webhook/endpoints`, { data: { name: "Business webhook", url: "https://hooks.business.test/inbound", events: ["message.extracted"], enabled: true } });
  expect(endpoint.status()).toBe(201);
  await driver(request, "providers", { webhookFailures: 1 });
  await receive(request, mailbox, "webhook-recovery");
  const deliveries = await (await request.get(`${apiUrl}/api/webhook/deliveries?status=failed`)).json();
  expect(deliveries.deliveries).toHaveLength(1);
  expect(deliveries.deliveries[0].payload.data.extraction.value).toBe("654321");
  const tasks = await (await request.get(`${apiUrl}/api/notification/deliveries`)).json();
  expect(tasks.summary.counts.retrying).toBe(1);
  const rule = await request.post(`${apiUrl}/api/notification/rules`, { data: { name: "Verification only", target: "webhook", eventTypes: ["message.extracted"], keyword: "verification", quietHoursTimezone: "Asia/Shanghai" } });
  expect(rule.status()).toBe(201);
  await page.goto("/login?next=/webhook");
  await page.getByRole("textbox", { name: "邮箱", exact: true }).fill("business-member-5@example.com");
  await page.locator("#login-password").fill(password);
  await page.getByRole("button", { name: "立即登录", exact: true }).click();
  await expect(page).toHaveURL(/\/webhook$/);
  const panel = page.getByRole("region", { name: "通知状态", exact: true });
  await expect(panel.getByText("HTTP 503: Controlled webhook outage", { exact: true })).toBeVisible();
  await panel.getByRole("button", { name: `重试通知 ${tasks.deliveries[0].id}` }).click();
  await expect(panel.getByText("投递成功 · 本轮已尝试 1 次", { exact: true })).toBeVisible();
  const tester = page.getByRole("region", { name: "通知规则试运行" });
  await tester.getByRole("textbox", { name: "测试邮件内容" }).fill("Other mail");
  await tester.getByRole("button", { name: "测试通知规则" }).click();
  await expect(tester.getByText("此事件未通过通知规则", { exact: true })).toBeVisible();
  await expect(tester.getByText(/事件未匹配、关键词未匹配/)).toBeVisible();
  await panel.screenshot({ path: "/tmp/wemail-notification-status-desktop.png" });
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(panel.getByText("投递成功 · 本轮已尝试 1 次", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await panel.screenshot({ path: "/tmp/wemail-notification-status-mobile.png" });
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
  const provider = await request.get(`${apiUrl}/__test/providers`, { headers: testHeaders });
  const attempts = (await provider.json()).requests;
  expect(attempts).toHaveLength(2);
  expect(JSON.parse(attempts[1].body).data.extraction.value).toBe("654321");
});

test("recovers a failed notification automatically when its scheduled retry becomes due", async ({ request }) => {
  await register(request, 7);
  const mailbox = await createMailbox(request, "Automatic recovery");
  expect((await request.post(`${apiUrl}/api/webhook/endpoints`, { data: { name: "Recovery webhook", url: "https://hooks.business.test/recovery", events: ["message.extracted"], enabled: true } })).status()).toBe(201);
  await driver(request, "providers", { webhookFailures: 1 });
  await receive(request, mailbox, "automatic-recovery");
  const before = await (await request.get(`${apiUrl}/api/notification/deliveries`)).json();
  expect(before.deliveries[0].status).toBe("retrying");
  await driver(request, "dispatch", { now: before.deliveries[0].nextAttemptAt });
  const after = await (await request.get(`${apiUrl}/api/notification/deliveries`)).json();
  expect(after.deliveries[0]).toMatchObject({ eventId: before.deliveries[0].eventId, status: "succeeded", attempts: 2 });
});

test("sends with the real outbound route and enforces D1 quota after provider retry", async ({ request }) => {
  const email = await register(request, 6);
  const mailbox = await createMailbox(request, "Outbound inbox");
  await driver(request, "providers", { resendFailures: 1 });
  const payload = { mailboxId: mailbox.id, toAddress: "recipient@example.net", subject: "Business outbound", bodyText: "A controlled outbound test", requestId: "business-outbound" };
  const response = await request.post(`${apiUrl}/api/mail/send`, { data: payload });
  expect(response.status(), await response.text()).toBe(202);
  const outbound = await (await request.get(`${apiUrl}/api/mail/outbound?accountId=${mailbox.id}`)).json();
  expect(outbound.messages[0].subject).toBe(payload.subject);
  expect(outbound.messages[0].status).toBe("queued");
  await driver(request, "dispatch", { now: outbound.messages[0].nextAttemptAt });
  const submitted = await (await request.get(`${apiUrl}/api/mail/outbound?accountId=${mailbox.id}`)).json();
  expect(submitted.messages[0].status).toBe("accepted");
  const providerCalls = await (await request.get(`${apiUrl}/__test/providers`, { headers: testHeaders })).json();
  expect(providerCalls.requests).toHaveLength(2);
  expect(providerCalls.requests[0].idempotencyKey).toBe(providerCalls.requests[1].idempotencyKey);
  expect(providerCalls.requests[0].body).toBe(providerCalls.requests[1].body);
  expect((await request.post(`${apiUrl}/api/mail/send`, { data: payload })).status()).toBe(200);
  await driver(request, "quota", { email, dailyLimit: 0 });
  expect((await request.post(`${apiUrl}/api/mail/send`, { data: { ...payload, requestId: "new-request" } })).status()).toBe(403);
});

test("buffers signed delivery events before the D1 send is linked and renders the final timeline", async ({ page }, testInfo) => {
  await register(page.request, 8);
  const mailbox = await createMailbox(page.request, "Delivery timeline");
  const providerId = "business-early-delivery";
  await driver(page.request, "providers", { resendProviderId: providerId });
  async function event(id: string, type: string, tamper = false) {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const raw = JSON.stringify({ type, created_at: new Date().toISOString(), data: { email_id: providerId } });
    const signature = createHmac("sha256", "business-test-signing-key").update(`${id}.${timestamp}.${raw}`).digest("base64");
    return page.request.post(`${apiUrl}/api/mail/providers/resend/events`, {
      headers: { "content-type": "application/json", "svix-id": id, "svix-timestamp": timestamp, "svix-signature": `v1,${signature}` },
      data: tamper ? `${raw} ` : raw
    });
  }
  expect((await event("early-delivered", "email.delivered", true)).status()).toBe(401);
  expect((await event("early-delivered", "email.delivered")).status()).toBe(200);
  const send = await page.request.post(`${apiUrl}/api/mail/send`, { data: { mailboxId: mailbox.id, toAddress: "recipient@example.net", subject: "Confirmed delivery", bodyText: "Provider callback test", requestId: "early-callback-send" } });
  expect(send.status(), await send.text()).toBe(200);
  expect((await event("early-delivered", "email.delivered")).status()).toBe(200);
  expect((await event("late-sent", "email.sent")).status()).toBe(200);
  const listing = await (await page.request.get(`${apiUrl}/api/mail/outbound?accountId=${mailbox.id}&status=delivered`)).json();
  expect(listing.messages).toHaveLength(1);
  expect(listing.messages[0].status).toBe("delivered");
  const detail = await (await page.request.get(`${apiUrl}/api/mail/outbound/${listing.messages[0].id}`)).json();
  expect(detail.message.timeline.filter((item: { type: string }) => item.type === "email.delivered")).toHaveLength(1);

  await page.goto("/mail/outbound");
  const timeline = page.getByRole("region", { name: "投递时间线" });
  await expect(timeline).toContainText("已送达");
  await expect(page.getByRole("region", { name: "发件记录详情" })).toContainText("供应商已确认送达收件服务器");
  await page.screenshot({ path: testInfo.outputPath("outbound-delivered-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(timeline).toContainText("已送达");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("outbound-delivered-mobile.png"), fullPage: true });
});

test("guides a first inbox through receipt and copying and opens task documentation in the app", async ({ page }, testInfo) => {
  await register(page.request, 9);
  const mailbox = await createMailbox(page.request, "First mail guide");
  await page.goto("/mail/list");
  const guide = page.getByRole("region", { name: "首封邮件引导" });
  await expect(guide).toContainText(mailbox.address);
  await expect(guide.getByRole("link", { name: "打开邮件客户端" })).toHaveAttribute("href", /^mailto:/);
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("first-mail-mobile.png"), fullPage: true });
  await receive(page.request, mailbox, "first-guide", "Your verification code is 482913. https://example.net/verify/first https://example.net/reset/second");
  await guide.getByRole("button", { name: "检查收件" }).click();
  await expect(guide).toContainText("482913");
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await guide.getByRole("button", { name: "复制收到的提取结果" }).click();
  await expect(guide.getByRole("link", { name: "配置 Telegram 通知" })).toBeVisible();
  await expect(page.locator('[aria-label="阅读与提取详情"]')).toContainText("规则提取");
  await expect(page.locator('[aria-label="阅读与提取详情"]')).toContainText("邮件未注明验证码有效期");
  await expect(page.locator('[aria-label="其他提取结果"]')).toContainText("https://example.net/reset/second");
  await page.goto("/docs");
  await page.getByRole("article").filter({ hasText: "用 API 取得验证码" }).getByRole("link", { name: "阅读步骤" }).click();
  await expect(page.getByRole("heading", { name: "用 API 取得验证码", exact: true })).toBeVisible();
  await expect(page.locator("pre").filter({ hasText: 'export WEMAIL_API_URL=' })).toBeVisible();
  await page.getByRole("link", { name: "推送聊天平台", exact: true }).click();
  await expect(page.getByRole("heading", { name: "推送聊天平台", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("task-docs-mobile.png"), fullPage: true });
  await page.request.post(`${apiUrl}/api/auth/login`, { data: { email: "business-admin@example.com", password } });
  await page.goto("/system/settings#setup-checks");
  const diagnostics = page.getByRole("region", { name: "自托管检查" });
  await expect(diagnostics).toContainText("配置快照");
  await expect(diagnostics).toContainText("配置存在不代表服务已连通");
  await diagnostics.getByRole("link", { name: "查看收件路由步骤" }).click();
  await expect(page.getByRole("heading", { name: "Email Routing", exact: true })).toBeVisible();
});
