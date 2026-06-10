const mailboxData = [
  {
    id: "qa-login",
    name: "QA Login Flow",
    address: "qa-login@wemail.dev",
    unread: 7,
    extractions: 12,
    attachments: 3
  },
  {
    id: "staging",
    name: "Staging Accounts",
    address: "staging@wemail.dev",
    unread: 3,
    extractions: 6,
    attachments: 1
  },
  {
    id: "billing",
    name: "Billing Sandbox",
    address: "billing@wemail.dev",
    unread: 2,
    extractions: 2,
    attachments: 0
  },
  {
    id: "security",
    name: "Security Review",
    address: "security@wemail.dev",
    unread: 0,
    extractions: 1,
    attachments: 5
  }
];

const messageData = [
  {
    id: "msg-vercel",
    mailboxId: "qa-login",
    sender: "Vercel",
    from: "login@vercel.com",
    subject: "Your Vercel verification code",
    preview: "Use this code to continue signing in. The code expires in 10 minutes.",
    time: "09:42",
    unread: true,
    type: "code",
    extractionLabel: "验证码",
    extractionValue: "482913",
    confidence: 96,
    attachments: 0,
    body: [
      "You requested a sign-in code for the Vercel staging workspace.",
      "Enter the code above in the browser to complete login. If this was not you, ignore this message.",
      "Workspace: WeOpen QA. Region: Singapore edge."
    ],
    meta: {
      "提取类型": "auth_code",
      "来源规则": "six-digit-code",
      "处理链路": "inbound-email-routing",
      "Headers": "DKIM pass, SPF pass"
    },
    timeline: ["收到 Cloudflare Email Routing 事件", "postal-mime 解析正文", "命中验证码提取规则", "已推送 macOS 通知"]
  },
  {
    id: "msg-github",
    mailboxId: "qa-login",
    sender: "GitHub",
    from: "noreply@github.com",
    subject: "Confirm your device for WeMail tests",
    preview: "A new device is trying to access your GitHub account. Confirm this sign-in request.",
    time: "09:31",
    unread: true,
    type: "link",
    extractionLabel: "LOGIN LINK",
    extractionValue: "github.com/login/device/verify",
    confidence: 91,
    attachments: 0,
    body: [
      "A new device wants to access the WeMail QA organization.",
      "Use the login link above to confirm the request. This link is only valid for this session.",
      "Device: Chrome macOS. IP range: internal QA network."
    ],
    meta: {
      "提取类型": "auth_link",
      "来源规则": "login-url-primary",
      "处理链路": "inbound-email-routing",
      "Headers": "DKIM pass, SPF neutral"
    },
    timeline: ["收到邮件", "识别登录按钮 URL", "折叠长链接", "标记为高价值消息"]
  },
  {
    id: "msg-linear",
    mailboxId: "qa-login",
    sender: "Linear",
    from: "security@linear.app",
    subject: "Magic link for QA session",
    preview: "Click the link to finish signing in to Linear. The link will expire shortly.",
    time: "09:10",
    unread: false,
    type: "link",
    extractionLabel: "MAGIC LINK",
    extractionValue: "linear.app/login/magic/QA-7K",
    confidence: 88,
    attachments: 0,
    body: [
      "Here is your magic link for Linear.",
      "Use it only if you requested access from the WeMail disposable inbox flow."
    ],
    meta: {
      "提取类型": "service_link",
      "来源规则": "magic-link-button",
      "处理链路": "inbound-email-routing",
      "Headers": "DKIM pass"
    },
    timeline: ["收到邮件", "解析 HTML 正文", "命中 magic link", "记录提取 JSON"]
  },
  {
    id: "msg-notion",
    mailboxId: "qa-login",
    sender: "Notion",
    from: "team@makenotion.com",
    subject: "Welcome to the QA workspace",
    preview: "Your workspace is ready. No verification code was detected in this message.",
    time: "08:48",
    unread: false,
    type: "muted",
    extractionLabel: "未提取",
    extractionValue: "",
    confidence: 0,
    attachments: 1,
    body: [
      "Welcome to the QA workspace.",
      "This message contains onboarding context but no login code or link. It remains readable in the desktop client for audit trails."
    ],
    meta: {
      "提取类型": "none",
      "来源规则": "no-match",
      "处理链路": "inbound-email-routing",
      "Headers": "DKIM pass, SPF pass"
    },
    timeline: ["收到邮件", "正文解析完成", "未命中验证码或链接", "保留完整正文"]
  },
  {
    id: "msg-stripe",
    mailboxId: "staging",
    sender: "Stripe",
    from: "support@stripe.com",
    subject: "Confirm your staging payout account",
    preview: "Your Stripe staging account requires a confirmation code before continuing.",
    time: "08:18",
    unread: true,
    type: "code",
    extractionLabel: "验证码",
    extractionValue: "761228",
    confidence: 94,
    attachments: 0,
    body: [
      "Use this confirmation code to continue setting up the staging payout account.",
      "This code expires soon. Do not share it with anyone outside the QA run."
    ],
    meta: {
      "提取类型": "auth_code",
      "来源规则": "six-digit-code",
      "处理链路": "inbound-email-routing",
      "Headers": "DKIM pass"
    },
    timeline: ["收到邮件", "解析纯文本正文", "提取验证码", "写入收件箱视图模型"]
  },
  {
    id: "msg-slack",
    mailboxId: "staging",
    sender: "Slack",
    from: "feedback@slack.com",
    subject: "Security alert for staging login",
    preview: "We noticed a sign-in from a new browser. Review the session if you do not recognize it.",
    time: "07:54",
    unread: true,
    type: "muted",
    extractionLabel: "未提取",
    extractionValue: "",
    confidence: 0,
    attachments: 0,
    body: [
      "A sign-in happened from a browser that has not been seen before.",
      "No actionable login code or link was present, so WeMail keeps the message in a lower-priority state."
    ],
    meta: {
      "提取类型": "none",
      "来源规则": "no-match",
      "处理链路": "inbound-email-routing",
      "Headers": "DKIM pass"
    },
    timeline: ["收到邮件", "安全提示分类", "未提取", "保留给人工确认"]
  },
  {
    id: "msg-aws",
    mailboxId: "billing",
    sender: "AWS",
    from: "no-reply-aws@amazon.com",
    subject: "Root account verification",
    preview: "Enter the verification code for the billing sandbox root account.",
    time: "昨天",
    unread: true,
    type: "code",
    extractionLabel: "验证码",
    extractionValue: "390144",
    confidence: 97,
    attachments: 0,
    body: [
      "Enter this verification code to complete access to the AWS billing sandbox.",
      "This is a controlled disposable mailbox for test automation and manual QA only."
    ],
    meta: {
      "提取类型": "auth_code",
      "来源规则": "six-digit-code",
      "处理链路": "inbound-email-routing",
      "Headers": "DKIM pass, SPF pass"
    },
    timeline: ["收到邮件", "提取验证码", "命中账单沙箱邮箱", "通知已发送"]
  },
  {
    id: "msg-security-report",
    mailboxId: "security",
    sender: "Cloudflare",
    from: "notify@cloudflare.com",
    subject: "Email Routing weekly digest",
    preview: "Weekly routing digest with attachment logs and delivery summary.",
    time: "周一",
    unread: false,
    type: "muted",
    extractionLabel: "未提取",
    extractionValue: "",
    confidence: 0,
    attachments: 5,
    body: [
      "This digest summarizes inbound routing events for the WeMail project.",
      "The macOS client keeps these messages available, but does not promote them above verification tasks."
    ],
    meta: {
      "提取类型": "none",
      "来源规则": "digest-message",
      "处理链路": "inbound-email-routing",
      "Headers": "DKIM pass"
    },
    timeline: ["收到 digest", "识别附件", "无验证码", "归档到安全审查邮箱"]
  }
];

const navItems = [
  { id: "inbox", label: "收件处理", icon: "inbox", count: 12 },
  { id: "outbound", label: "发件箱", icon: "send", count: 3 },
  { id: "settings", label: "邮件规则", icon: "sliders-horizontal", count: 0 }
];

Object.assign(window, {
  mailboxData,
  messageData,
  navItems
});
