import type { ExtractionType } from "../src/types";

type CorpusFinding = [Exclude<ExtractionType, "none">, string];

export type ExtractionSample = {
  id: string;
  category: string;
  input: { subject?: string; text?: string; html?: string; listUnsubscribe?: string };
  findings: CorpusFinding[];
  expiresHint?: string;
};

// Hand-labelled synthetic mail only. Reserved example domains and invented
// codes make this corpus safe to publish; it is a regression set, not a
// representative sample of production traffic or a security classifier.
export const extractionCorpus: ExtractionSample[] = [
  { id: "en-code", category: "english", input: { text: "Your verification code: 123456" }, findings: [["auth_code", "123456"]] },
  { id: "en-security", category: "english", input: { text: "Security code: A7B2C9" }, findings: [["auth_code", "A7B2C9"]] },
  { id: "en-otp", category: "english", input: { text: "OTP: 998877" }, findings: [["auth_code", "998877"]] },
  { id: "en-pin", category: "english", input: { text: "Your login PIN is 7492." }, findings: [["auth_code", "7492"]] },
  { id: "en-before", category: "english", input: { text: "572014 is your verification code." }, findings: [["auth_code", "572014"]] },
  { id: "en-newline", category: "english", input: { text: "Your one-time code is below.\n\n582014\n\nDo not share it." }, findings: [["auth_code", "582014"]] },
  { id: "en-hyphen", category: "english", input: { text: "Verification code: 836-592" }, findings: [["auth_code", "836592"]] },
  { id: "en-leading-zero", category: "english", input: { text: "Use code 004721 to sign in." }, findings: [["auth_code", "004721"]] },
  { id: "cn-code", category: "chinese", input: { text: "您的验证码：482914，请勿泄露。" }, findings: [["auth_code", "482914"]] },
  { id: "cn-dynamic", category: "chinese", input: { text: "动态码为：836-592。" }, findings: [["auth_code", "836592"]] },
  { id: "cn-before", category: "chinese", input: { text: "483920 为您的验证码。" }, findings: [["auth_code", "483920"]] },
  { id: "cn-login", category: "chinese", input: { text: "登录码 7319" }, findings: [["auth_code", "7319"]] },
  { id: "cn-one-time", category: "chinese", input: { text: "一次性密码：A1B2C3" }, findings: [["auth_code", "A1B2C3"]] },
  { id: "cn-adjacent", category: "chinese", input: { text: "验证码582019请尽快输入" }, findings: [["auth_code", "582019"]] },
  { id: "two-codes", category: "multiple", input: { text: "Login code: 123456\nBackup code: 987654" }, findings: [["auth_code", "123456"], ["auth_code", "987654"]] },
  { id: "repeat-code", category: "multiple", input: { subject: "Verification code 123456", text: "Verification code: 123456" }, findings: [["auth_code", "123456"]] },
  { id: "two-auth-links", category: "multiple", input: { text: "https://account.example/verify/a\nhttps://account.example/reset/b" }, findings: [["auth_link", "https://account.example/verify/a"], ["auth_link", "https://account.example/reset/b"]] },
  { id: "code-plus-link", category: "multiple", input: { text: "OTP: 843921\nhttps://account.example/login?t=token" }, findings: [["auth_code", "843921"], ["auth_link", "https://account.example/login?t=token"]] },
  { id: "two-service-links", category: "multiple", input: { text: "https://github.example/issues/1\nhttps://docs.example/guide" }, findings: [["service_link", "https://github.example/issues/1"], ["service_link", "https://docs.example/guide"]] },
  { id: "two-other-links", category: "multiple", input: { text: "https://example.test/a\nhttps://example.test/b" }, findings: [["other_link", "https://example.test/a"], ["other_link", "https://example.test/b"]] },
  { id: "digest-unsubscribe", category: "subscription", input: { text: "https://news.example/unsubscribe?token=x" }, findings: [["subscription_link", "https://news.example/unsubscribe?token=x"]] },
  { id: "header-unsubscribe", category: "subscription", input: { text: "Weekly news", listUnsubscribe: "<https://news.example/u/one>, <mailto:leave@example.test>" }, findings: [["subscription_link", "https://news.example/u/one"]] },
  { id: "mailto-unsubscribe", category: "subscription", input: { listUnsubscribe: "<mailto:leave@example.test>" }, findings: [] },
  { id: "subscription-precedence", category: "subscription", input: { text: "https://dashboard.example/preferences" }, findings: [["subscription_link", "https://dashboard.example/preferences"]] },
  { id: "en-expiry", category: "expiry", input: { text: "Code: 691827. Valid for 10 minutes." }, findings: [["auth_code", "691827"]], expiresHint: "10 分钟内有效" },
  { id: "cn-expiry", category: "expiry", input: { text: "验证码 382716，5 分钟内有效。" }, findings: [["auth_code", "382716"]], expiresHint: "5 分钟内有效" },
  { id: "cn-expiry-label", category: "expiry", input: { text: "校验码：273819，有效期：2小时。" }, findings: [["auth_code", "273819"]], expiresHint: "2 小时内有效" },
  { id: "en-hours", category: "expiry", input: { text: "OTP 827361 expires in 2 hours." }, findings: [["auth_code", "827361"]], expiresHint: "2 小时内有效" },
  { id: "missing-expiry", category: "expiry", input: { text: "Security code 372819. Keep it private." }, findings: [["auth_code", "372819"]] },
  { id: "forward", category: "forwarded", input: { subject: "Fwd: Login", text: "Forwarded message\nFrom: sender@example.test\nVerification code: 645192" }, findings: [["auth_code", "645192"]] },
  { id: "reply-quote", category: "forwarded", input: { text: "Thanks, received.\n> Verification code: 123456" }, findings: [] },
  { id: "current-and-quote", category: "forwarded", input: { text: "New code: 321987\n> Old code: 123456" }, findings: [["auth_code", "321987"]] },
  { id: "invoice-price", category: "negative-price", input: { text: "Total due: 4932.00 USD. Thank you." }, findings: [] },
  { id: "security-price", category: "negative-price", input: { text: "Security service invoice. Total: $4932.00" }, findings: [] },
  { id: "login-price", category: "negative-price", input: { subject: "Login service", text: "Your payment: USD 8492.00" }, findings: [] },
  { id: "pin-price", category: "negative-price", input: { text: "PIN security subscription costs 4932 EUR per year." }, findings: [] },
  { id: "date", category: "negative-date", input: { text: "Invoice issued 2026-09-05." }, findings: [] },
  { id: "security-date", category: "negative-date", input: { text: "Security bulletin published 2026-09-05." }, findings: [] },
  { id: "verify-year", category: "negative-date", input: { text: "Verify your details before 2026-12-31." }, findings: [] },
  { id: "code-and-date", category: "negative-date", input: { text: "Verification code: 938172. Date: 2026-09-05." }, findings: [["auth_code", "938172"]] },
  { id: "order-number", category: "negative-order", input: { subject: "Security equipment", text: "Order 4932108 has shipped." }, findings: [] },
  { id: "phone-number", category: "negative-order", input: { text: "For security questions call 8001234567." }, findings: [] },
  { id: "prose", category: "malformed", input: { text: "Your verification code will expire shortly." }, findings: [] },
  { id: "three-digits", category: "malformed", input: { text: "Code: 123" }, findings: [] },
  { id: "long-number", category: "malformed", input: { text: "Code: 123456789012" }, findings: [] },
  { id: "html-code", category: "html", input: { html: "<p>Your verification code:</p><strong>592047</strong>" }, findings: [["auth_code", "592047"]] },
  { id: "html-hidden", category: "html", input: { html: "<style>.code { width: 123456px }</style><script>const code=765432;</script><p>Hello</p>" }, findings: [] },
  { id: "link-punctuation", category: "links", input: { text: "Open https://account.example/verify?t=x." }, findings: [["auth_link", "https://account.example/verify?t=x"]] },
  { id: "link-cn-punctuation", category: "links", input: { text: "https://account.example/verify?t=x，点击继续。" }, findings: [["auth_link", "https://account.example/verify?t=x"]] },
  { id: "link-entities", category: "html", input: { html: '<a href="https://account.example/verify?a=1&amp;b=2">Verify</a>' }, findings: [["auth_link", "https://account.example/verify?a=1&b=2"]] },
  { id: "link-http", category: "phishing", input: { text: "http://account.example/login" }, findings: [["auth_link", "http://account.example/login"]] },
  { id: "link-lookalike", category: "phishing", input: { text: "https://bank.example.attacker.test/login" }, findings: [["auth_link", "https://bank.example.attacker.test/login"]] },
  { id: "link-javascript", category: "phishing", input: { text: "javascript:alert(123456)" }, findings: [] },
  { id: "code-in-url", category: "phishing", input: { text: "https://account.example/verify?code=123456" }, findings: [["auth_link", "https://account.example/verify?code=123456"]] },
  { id: "code-and-order", category: "negative-order", input: { text: "Code: 583921. Order number: 4928173." }, findings: [["auth_code", "583921"]] },
  { id: "code-and-price", category: "negative-price", input: { text: "Your code: 493827. Total $1499.99." }, findings: [["auth_code", "493827"]] },
  { id: "cn-date", category: "negative-date", input: { text: "验证服务更新于2026年11月20日。" }, findings: [] },
  { id: "expiry-no-code", category: "expiry", input: { text: "The link expires in 15 minutes. https://account.example/reset" }, findings: [["auth_link", "https://account.example/reset"]], expiresHint: "15 分钟内有效" },
  { id: "empty", category: "malformed", input: {}, findings: [] },
  { id: "unicode-code", category: "chinese", input: { text: "您的验证码：１２３４５６。" }, findings: [["auth_code", "123456"]] }
];
