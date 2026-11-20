# DEV-07 提取质量验证记录

日期：2026-11-20。样本来自人工编写的合成邮件，使用保留示例域名与虚构验证码；没有读取生产邮箱或真实用户邮件。该集合用于可重复回归，不能代表真实流量分布或证明链接安全。

## 固定规则评估

样本：`packages/shared/tests/extraction-corpus.ts` 共 60 封。覆盖中英文、全角数字、多个验证码和链接、转发与引用、List-Unsubscribe、有效期缺失、HTML、钓鱼式链接、价格、日期、订单号、电话和异常格式。每封显式标注期望的 type + value；同封重复值按集合计数。

精确率 = TP / (TP + FP)，召回率 = TP / (TP + FN)。以完整类型和值精确匹配计算，47 个期望结果；空结果样本同样参与误识别统计。有效期独立断言。

| 同一固定集合 | TP | FP | FN | 精确率 | 召回率 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 修改前 `eb83e65`（extraction.ts blob `acf6425f`） | 40 | 18 | 7 | 68.97% | 85.11% |
| 本次实现 | 47 | 0 | 0 | 100% | 100% |

修改前主要错误：只保留每类首个链接，订阅偏好同时误标服务链接，security/verify 邻近的金额、年份、订单或电话误当验证码，引用内容、脚本、URL 参数也产生验证码，链接尾标点与 HTML entity 未清理，全角数字遗漏。改动后修复这些具体问题，并保留原有提取测试。金额/日期紧邻 code 关键词也有额外负向回归。

性能边界：去重使用 Set，持久化提取项上限 32，单个链接最多 2,048 字符；多结果不再只取每类第一个，但也不让含几千链接的邮件产生无界详情列表。受信 header 退订结果仍保留主结果优先级。

执行：`pnpm --dir packages/shared exec vitest run`。质量测试会打印样本数、TP/FP/FN、precision/recall 与差异，任意错误都会失败。集合中钓鱼式 HTTP/仿冒域名仍被作为链接提取；提取不承担安全判定。

## 认证结果信任边界

依据 2026-11-20 核对的 [Cloudflare Email Workers Runtime API](https://developers.cloudflare.com/email-routing/email-workers/runtime-api/#authentication-results)：平台调用 Worker 前会 prepend Authentication-Results。只读取 `message.headers` 的首条，并要求 authserv-id 精确为 `mx.cloudflare.net`；后面的头可能由发件人提供，不可信。[RFC 8601](https://www.rfc-editor.org/rfc/rfc8601#section-1.2) 同样要求可信边界。

实现仅由平台入口设置 `trusted_upstream`，原始 MIME 即使声称 `mx.cloudflare.net` 也保持 `unverified_header`；旧数据未记录来源时同样保持未验证。只解析机制字段开头的 verdict，忽略评论/属性中的伪 verdict。详情页可信来源显示 Cloudflare 入站验证；其他来源显示身份未验证，既不使用绿色通过样式，也不把 HTTPS 等同于身份安全。独立测试覆盖伪造原始头、错误/仿冒 authserv-id、可信头之前/之后的头与可信失败覆盖伪造通过。

## AI fallback 独立边界与限制

规则有结果时不调用模型；没有 binding 时不调用。AI 输入上限 16,000 字符，每次输出最多保留 8 项、值最多 2,048 字符、标签最多 80 字符；值必须出现在实际送入模型的文本中，链接必须为 HTTP(S)，验证码需包含数字且符合长度。控制响应回归证明虚构验证码、虚构链接、危险 scheme、错误格式被丢弃，合法但规则未命中的原文数字可保留。超出 prompt 的内容不会作为证据。此前测试直接接受不存在于正文的“AI结果”，已改成检验这一真实限制。

这一轮没有调用真实 Workers AI，因此没有真实模型 precision/recall、token 账单或延迟数据；不能将受控响应回归称为模型质量验收。原有每日 fallbackLimit 仍是成功提取的审计计数，不能据此宣称精确限制所有失败请求的供应商费用。发布前应使用隔离真实模型对固定样本记录调用次数、耗时、输入输出 token/费用与误报，尤其检查价格/日期负样本在规则未命中后是否被模型错误建议。

## 用户界面

固定“96% / 92%”置信度没有数据依据，已替换为实际规则 / AI 提取方式。AI 结果要求核对原文；验证码未注明有效期时明确显示缺失。每个次要提取结果可独立复制，链接展示目标域名与 HTTPS/风险信息。

本阶段定向验证：shared 全部测试、入站/通知 Worker 回归、AI 边界回归、收件页集成测试、相关 lint/typecheck。完整批次及浏览器实测由根执行记录统一保留；本文件不把组件测试等同于真实页面验收。
