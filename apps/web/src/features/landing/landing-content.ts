export const landingNavLinks = [
  { label: "产品能力", href: "#features" },
  { label: "使用流程", href: "#how-it-works" },
  { label: "开发接入", href: "#developers" },
  { label: "方案价格", href: "#pricing" }
] as const;

export const heroWords = ["收信", "提取", "协同", "治理"] as const;

export const heroStats = [
  { value: "5 分钟", label: "搭起首个临时邮箱流程", company: "启用" },
  { value: "20 / 天", label: "默认单用户外发额度", company: "配额" },
  { value: "7 天", label: "消息默认保留窗口", company: "留存" },
  { value: "1 个界面", label: "收件与管理统一操作面", company: "协同" }
] as const;

export const featureCards = [
  {
    number: "01",
    title: "按需创建收件箱",
    description: "为 QA、灰度发布、营销投放或内部自动化快速开出临时邮箱，不用在脚本、浏览器标签页和共享账号之间来回切换。",
    visual: "deploy"
  },
  {
    number: "02",
    title: "结构化提取邮件信息",
    description: "把验证码、确认链接、状态字段和原始正文放进同一个视图里，让团队看到的不是噪音，而是可执行的信息。",
    visual: "ai"
  },
  {
    number: "03",
    title: "收件、外发与协作同屏",
    description: "收件箱浏览、API 调用、Telegram 通知和外发历史放在统一工作台里，适合跨角色共同排查和推进流程。",
    visual: "collab"
  },
  {
    number: "04",
    title: "邀请制与运营治理",
    description: "通过邀请码、配额、功能开关和收件箱监管维持系统可控，让临时邮箱服务既能开放使用，也能长期运营。",
    visual: "security"
  }
] as const;

export const workflowSteps = [
  {
    number: "I",
    title: "创建或分配收件箱",
    description: "几秒内为测试流程、活动链路或具体成员分配一个邮箱入口，不需要手工切换域名、账号和转发规则。",
    code: `POST /api/mailboxes
{
  "label": "qa-signup"
}

// 为当前登录用户返回 mailbox 对象`
  },
  {
    number: "II",
    title: "收信、查看并提取关键信息",
    description: "在同一界面查看正文、附件、提取结果和外发记录，QA、运营和支持团队能用同一份上下文推进处理。",
    code: `GET /api/messages?mailboxId=<mailbox-id>
GET /api/outbound?mailboxId=<mailbox-id>

// 前端在同一工作台读取收件、详情与外发历史`
  },
  {
    number: "III",
    title: "集中治理访问与额度",
    description: "当流量变化或滥用风险出现时，统一在管理端调整邀请码、每日额度、功能开关和收件箱监管策略。",
    code: `PATCH /admin/quotas/<user-id>
{
  "dailyLimit": 20,
  "disabled": false
}

// 仅管理员会话可调用`
  }
] as const;

export const infrastructureLocations = [
  { city: "Cloudflare Workers", region: "边缘执行层", latency: "edge" },
  { city: "Pages UI", region: "操作台界面", latency: "instant" },
  { city: "D1 + R2", region: "数据与附件", latency: "bounded" },
  { city: "Telegram", region: "事件通知", latency: "push" },
  { city: "Resend", region: "外发例外通道", latency: "quota" },
  { city: "Feature Flags", region: "运营治理", latency: "live" }
] as const;

export const metrics = [
  { value: 5, label: "单用户默认收件箱上限", suffix: "", prefix: "" },
  { value: 7, label: "消息默认保留天数", suffix: "", prefix: "" },
  { value: 20, label: "单用户每日默认外发上限", suffix: "", prefix: "" },
  { value: 1, label: "统一收件与治理操作面", suffix: "", prefix: "" }
] as const;

export const integrations = [
  { name: "Cloudflare", category: "平台底座" },
  { name: "Telegram", category: "通知" },
  { name: "Resend", category: "外发邮件" },
  { name: "D1", category: "数据库" },
  { name: "R2", category: "附件" },
  { name: "Workers AI", category: "提取兜底" },
  { name: "GitHub", category: "自动化" },
  { name: "Linear", category: "QA 流程" },
  { name: "Notion", category: "文档协作" },
  { name: "OpenAI", category: "Agent 工作流" },
  { name: "HTTP API", category: "程序接入" },
  { name: "Feature Flags", category: "运营控制" }
] as const;

export const securityCards = [
  { icon: "shield", title: "邀请制注册", description: "注册入口默认受邀请码控制，避免服务刚开放就被滥用流量吞没。" },
  { icon: "lock", title: "会话与 API 分层", description: "浏览器会话、API 密钥和管理员操作彼此隔离，权限边界更清晰。" },
  { icon: "eye", title: "收件箱监管", description: "在高峰活动或异常流量出现前，就能看到活跃收件箱、使用量和异常趋势。" },
  { icon: "file-check", title: "操作可追溯", description: "邀请码、额度和功能开关的变更都有迹可循，方便排查和团队协作。" }
] as const;

export const certifications = ["邀请制", "额度可控", "功能开关", "收件箱监管", "变更留痕"] as const;

export const developerTabs = [
  {
    label: "创建收件箱",
    code: `curl -X POST https://wemail.local/api/mailboxes \\
  -H 'Authorization: Bearer <api-key>' \\
  -H 'Content-Type: application/json' \\
  -d '{"label":"qa-signup"}'`
  },
  {
    label: "读取消息",
    code: `curl 'https://wemail.local/api/messages?mailboxId=<mailbox-id>' \\
  -H 'Authorization: Bearer <api-key>'`
  },
  {
    label: "发送外发",
    code: `curl -X POST https://wemail.local/api/outbound/send \\
  -H 'Authorization: Bearer <api-key>' \\
  -H 'Content-Type: application/json' \\
  -d '{"mailboxId":"<mailbox-id>","toAddress":"user@example.com","subject":"Test","bodyText":"Hello from WeMail"}'`
  }
] as const;

export const developerFeatures = [
  { title: "HTTP 优先的自动化接口", description: "用 API 密钥创建收件箱、轮询消息和触发外发流程，方便挂进测试脚本或内部工具。" },
  { title: "提取结果与原文同源", description: "验证码、链接、状态和原始邮件内容放在同一份载荷里，减少二次拼装成本。" },
  { title: "配额感知的工作流", description: "自动化流程在调用时就能遵守系统限制，而不是上线后才发现额度问题。" },
  { title: "运营也能直接上手", description: "小团队不用再额外搭一个后台，产品、技术和运营共享同一套控制面。" }
] as const;

export const testimonials = [
  {
    quote: "我们不用再把验证码截图发群里了，QA、运营和客服都能在同一条邮箱历史里核对问题。",
    author: "林遥",
    role: "QA 负责人",
    company: "北辰增长",
    metric: "减少跨角色转发"
  },
  {
    quote: "邀请码和额度策略让我们可以放心把服务开放给更多同事，而不是把它变成没人管的公共邮箱池。",
    author: "陈拓",
    role: "平台工程师",
    company: "向量系统",
    metric: "上线更稳"
  },
  {
    quote: "通知、监管和外发历史在一个界面里，活动上线当天支持和运营终于能看同一份事实。",
    author: "周岚",
    role: "运营经理",
    company: "回声工作室",
    metric: "响应更快"
  },
  {
    quote: "它终于不像一堆脚本和标签页的拼装，而像一个真的可以持续运营的产品。",
    author: "许知",
    role: "创始人",
    company: "光标实验室",
    metric: "流程更清晰"
  }
] as const;

export const pricingPlans = [
  {
    name: "起步版",
    description: "适合个人测试和低频验证流程",
    price: { monthly: 0, annual: 0 },
    features: ["最多 5 个收件箱", "7 天消息保留", "基础提取卡片", "邀请码注册", "基础 API 访问"],
    cta: "受邀注册",
    popular: false
  },
  {
    name: "协作版",
    description: "适合共享运营、增长和客服协同",
    price: { monthly: 29, annual: 24 },
    features: [
      "包含起步版全部能力",
      "共享管理视图",
      "Telegram 通知",
      "外发历史",
      "配额管理",
      "功能开关",
      "更高吞吐"
    ],
    cta: "申请试用",
    popular: true
  },
  {
    name: "管控版",
    description: "适合对外提供临时邮箱能力的团队",
    price: { monthly: null, annual: null },
    features: [
      "包含协作版全部能力",
      "运营策略细化",
      "保留期控制",
      "收件箱监管流程",
      "上线支持",
      "结构化发布评审"
    ],
    cta: "联系团队",
    popular: false
  }
] as const;

export const footerQuickLinks = [
  {
    name: "GitHub",
    href: "https://github.com/WeOpen/WeMail",
    icon: "github"
  },
  {
    name: "Telegram",
    href: "#",
    icon: "telegram"
  },
  {
    name: "状态页",
    href: "#",
    icon: "status"
  },
  {
    name: "部署文档",
    href: "/docs",
    icon: "docs"
  }
] as const;

export const trustedCompanies = [
  "北辰增长",
  "向量系统",
  "回声工作室",
  "光标实验室",
  "凌镜支持",
  "跃迁团队",
  "灰度引擎",
  "信标运营"
] as const;
