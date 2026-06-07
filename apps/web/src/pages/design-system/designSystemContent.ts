export const DESIGN_SYSTEM_SECTION_IDS = [
  "foundations",
  "color-theme",
  "layout-spacing",
  "elevation-radius",
  "typography-content",
  "buttons-actions",
  "form-inputs",
  "selection-controls",
  "navigation-wayfinding",
  "surfaces-cards",
  "data-display",
  "feedback-status",
  "overlays-utilities"
] as const;

export type DesignSystemSectionId = (typeof DESIGN_SYSTEM_SECTION_IDS)[number];

export interface DesignSystemDocSection {
  title: string;
  body: string[];
}

export interface DesignSystemCodeSample {
  title: string;
  code: string;
}

export interface DesignSystemApiField {
  prop: string;
  type: string;
  defaultValue: string;
  description: string;
}

export interface DesignSystemComponentDoc {
  id: string;
  title: string;
  chineseTitle: string;
  summary: string;
  sectionIds: DesignSystemSectionId[];
  docSections?: DesignSystemDocSection[];
  codeSamples?: DesignSystemCodeSample[];
  api?: DesignSystemApiField[];
}

export interface DesignSystemGroupDoc {
  id: string;
  title: string;
  chineseTitle: string;
  summary: string;
  overviewDescription: string;
  sectionIds: DesignSystemSectionId[];
  docSections?: DesignSystemDocSection[];
  components: DesignSystemComponentDoc[];
}

function createHeroDocSections({
  accessibility,
  anatomy,
  avoid,
  usage,
  variants
}: {
  accessibility: string[];
  anatomy: string[];
  avoid: string[];
  usage: string[];
  variants: string[];
}): DesignSystemDocSection[] {
  return [
    { title: "适用场景", body: usage },
    { title: "不适用场景", body: avoid },
    { title: "状态与变体", body: variants },
    { title: "交互示例", body: anatomy },
    { title: "设计规范", body: accessibility }
  ];
}

function createApiField(prop: string, type: string, defaultValue: string, description: string): DesignSystemApiField {
  return { prop, type, defaultValue, description };
}

function createCodeSample(title: string, code: string): DesignSystemCodeSample {
  return { title, code };
}

const baseDesignSystemGroups: DesignSystemGroupDoc[] = [
  {
    id: "foundations",
    title: "Foundations",
    chineseTitle: "基础层",
    summary: "统一设计 token、主题、布局节奏和表面层级，作为所有共享原语的视觉地基。",
    overviewDescription: "Design tokens、预览地图、文档入口与视觉回归基线都会先在这里校准，后续组件都只复用这套基础语言。",
    sectionIds: ["foundations", "color-theme", "layout-spacing", "elevation-radius"],
    docSections: [
      {
        title: "适用范围",
        body: [
          "Foundations 用来集中说明设计 token、主题切换、布局节奏和表面层级，作为所有共享原语的统一视觉起点。",
          "当页面需要定义新的颜色、间距或容器层级时，应先回到这一组基础说明确认是否已经存在可复用规范。"
        ]
      },
      {
        title: "适用场景",
        body: [
          "用于统一解释颜色、间距、圆角、阴影和页面骨架的来源，帮助设计稿、实现代码和文档站保持同一套视觉语言。",
          "当团队准备新增共享组件、重排页面层级或扩展主题时，应先确认这一组基础规范是否已经覆盖需求。"
        ]
      },
      {
        title: "不适用场景",
        body: [
          "不要把业务规则、页面专属文案或一次性视觉修饰写进 Foundations；这些内容应留在具体组件或业务页面文档中。",
          "不要绕过 token 直接在页面里临时定义颜色、间距或阴影，否则会让设计系统失去统一约束。"
        ]
      },
      {
        title: "状态与变体",
        body: [
          "当前首批基础层主要覆盖 color theme、layout spacing、elevation radius 三类文档块，分别负责主题、节奏和表面层级。",
          "light / dark 主题、页面容器密度和 surface 层级都应视为基础变体，由共享 token 控制而不是由业务组件各自分叉。"
        ]
      },
      {
        title: "交互示例",
        body: [
          "右侧预览会同时展示 token 清单、主题卡片和基础布局样例，作为设计评审与视觉回归的共同参考。",
          "如果某个组件在不同主题下表现不一致，应先回到 Foundations 预览确认问题来自 token 还是具体组件实现。"
        ]
      },
      {
        title: "代码片段",
        body: [
          "示例片段：import \"./tokens.css\"; import \"./primitives.css\"; 页面与组件都只消费已经定义好的 CSS variables。",
          "示例片段：const surfaceStyle = { borderRadius: \"var(--radius-lg)\", boxShadow: \"var(--shadow-sm)\" }; 用统一 token 映射视觉层级。"
        ]
      },
      {
        title: "设计规范",
        body: [
          "基础层文档需要和 tokens、README、CHANGELOG 保持同一套命名，避免组件页和样式变量出现双重口径。",
          "新增组件只能复用这里已经定义的主题、间距与 elevation 语言，不在业务页单独引入新的视觉档位。"
        ]
      },
      {
        title: "维护约束",
        body: [
          "基础层变更需要同步检查设计系统首页、共享样式文件和对应文档，避免只更新其中一个入口。",
          "任何新增 token 都应回答它解决了哪一类复用问题，而不是只为当前页面补一个临时值。"
        ]
      }
    ],
    components: [
      {
        id: "design-tokens",
        title: "Design tokens",
        chineseTitle: "设计令牌",
        summary: "品牌色、语义色、间距、圆角和阴影的统一定义。",
        sectionIds: ["foundations", "color-theme", "layout-spacing", "elevation-radius"],
        api: [
          {
            prop: "scope",
            type: '"brand" | "semantic" | "spacing" | "radius" | "elevation"',
            defaultValue: '"brand"',
            description: "标记当前 token 所属的设计域，帮助页面按主题、间距和表面层级组织说明。"
          },
          {
            prop: "varName",
            type: "string",
            defaultValue: '"--brand-500"',
            description: "对应共享样式里实际消费的 CSS custom property 名称。"
          },
          {
            prop: "usage",
            type: "string",
            defaultValue: '"component surfaces"',
            description: "说明这个 token 在按钮、卡片、表格或页面容器中的典型落点。"
          }
        ],
        docSections: [
          {
            title: "适用场景",
            body: [
              "用于统一记录品牌色、语义色、间距、圆角和阴影等基础 token，保证页面与共享原语使用同一套视觉变量。",
              "当团队准备新增颜色档位、页面节奏或表面层级时，应先确认是否可以直接复用现有 token。"
            ]
          },
          {
            title: "不适用场景",
            body: [
              "不要把业务字段、页面专属文案或一次性视觉修饰包装成 design token；这些内容应留在具体组件或页面实现中。",
              "不要绕过共享变量在业务页面直接手写颜色、阴影或间距，否则文档与实现会很快失去同步。"
            ]
          },
          {
            title: "状态与变体",
            body: [
              "当前预览重点覆盖 brand、semantic、spacing、radius 和 elevation 五类 token，分别对应主题、节奏与表面层级。",
              "light / dark 主题切换只应替换 token 值，不应要求组件层额外维护一套独立样式。"
            ]
          },
          {
            title: "交互示例",
            body: [
              "右侧真实示例会同时展示色板、主题卡片与 token 行项目，帮助设计评审快速确认命名与视觉映射是否一致。",
              "如果某个组件在不同主题下观感异常，应先回到 design tokens 检查语义色和表面层级映射。"
            ]
          },
          {
            title: "设计规范",
            body: [
              "新增 token 需要能解释跨页面复用价值，而不是只为当前一个业务块补临时变量。",
              "token 名称应与 shared styles、README 和文档站入口保持一致，避免出现多套别名。"
            ]
          }
        ]
      },
      {
        id: "page-layout",
        title: "PageLayout",
        chineseTitle: "页面布局",
        summary: "页面头部、工具栏、主内容区和侧栏的组合骨架。",
        sectionIds: ["layout-spacing"],
        api: [
          {
            prop: "Page",
            type: "layout root",
            defaultValue: "required",
            description: "提供页面整体容器与垂直节奏，承接 header、body 和局部分区。"
          },
          {
            prop: "PageBody",
            type: '"with-sidebar" body region',
            defaultValue: '"main only"',
            description: "定义主内容区与侧栏的排布关系，用于列表页、详情页和带过滤器的工作台页面。"
          },
          {
            prop: "PageToolbar",
            type: "toolbar region",
            defaultValue: "optional",
            description: "承接筛选条、批量操作和摘要信息，避免业务页面重复拼装工具栏骨架。"
          }
        ],
        docSections: [
          {
            title: "适用场景",
            body: [
              "用于管理后台页面、设置页和列表详情页的页面骨架，统一 header、toolbar、main 与 sidebar 的关系。",
              "当页面需要稳定的主次区域，而不是一次性自由摆放卡片时，应优先使用 PageLayout 原语。"
            ]
          },
          {
            title: "不适用场景",
            body: [
              "不要把单个内容卡片或弹层局部结构包装成 PageLayout；它只处理页面级骨架，不负责局部信息块样式。",
              "如果页面只有一个简短正文区域，也不需要为了形式完整强行引入 sidebar 或 toolbar 容器。"
            ]
          },
          {
            title: "状态与变体",
            body: [
              "当前预览覆盖 header + toolbar + main + sidebar 的标准工作台布局，以及无侧栏时的紧凑编排节奏。",
              "布局密度应通过 spacing token 与容器组合控制，而不是为每个页面重新手写 margin 和 max-width。"
            ]
          },
          {
            title: "交互示例",
            body: [
              "真实示例展示了页头操作、筛选条和双栏正文的组合，便于验证 PageLayout 与 Card、FilterBar 的拼接边界。",
              "切换不同页面时应保持相同的 toolbar 与 sidebar 节奏，这样用户能更快建立导航预期。"
            ]
          },
          {
            title: "设计规范",
            body: [
              "页面级布局优先依赖 Page、PageHeader、PageBody、PageMain、PageSidebar 等原语，不在业务页面重复定义骨架。",
              "新增区域前先确认它属于 header、toolbar、main 还是 sidebar，避免内容层与布局层混在一起。"
            ]
          }
        ]
      }
    ]
  },
  {
    id: "content-actions",
    title: "Content & Actions",
    chineseTitle: "内容与动作",
    summary: "承接排版、按钮、卡片和数据展示组件，负责页面中的主要内容编排。",
    overviewDescription: "这组组件负责把设计系统真正落到业务页面，包括标题层级、主次动作、卡片容器和数据摘要。",
    sectionIds: ["typography-content", "buttons-actions", "surfaces-cards", "data-display"],
    components: [
      {
        id: "typography",
        title: "Typography",
        chineseTitle: "排版",
        summary: "统一标题、正文、说明、代码和快捷键标签的语义层级。",
        sectionIds: ["typography-content"],
        api: [
          {
            prop: "as",
            type: '"h1" | "h2" | "h3" | "p" | "span"',
            defaultValue: '"p"',
            description: "控制排版原语输出的语义标签，保证层级结构与无障碍阅读顺序一致。"
          },
          {
            prop: "size",
            type: '"hero" | "title-lg" | "title-md" | "body" | "caption"',
            defaultValue: '"body"',
            description: "映射共享排版 token，控制标题、正文和辅助文案的视觉层级。"
          },
          {
            prop: "tone",
            type: '"default" | "muted" | "brand"',
            defaultValue: '"default"',
            description: "为正文、说明文字或强调内容附加统一的文本色语义。"
          }
        ],
        docSections: [
          {
            title: "适用场景",
            body: [
              "用于统一标题、正文、说明、代码与快捷键标签的层级，让页面在高密度内容下仍然保持清晰阅读节奏。",
              "当页面需要表达主标题、区块说明或辅助提示时，应优先使用共享排版原语，而不是直接手写字号和行高。"
            ]
          },
          {
            title: "不适用场景",
            body: [
              "不要把 Typography 当作布局容器使用；它负责文本语义和层级，不负责卡片、栅格或页面骨架。",
              "不要为了特殊视觉效果跳过现有排版档位单独写字体大小，否则标题与正文很难跨页面保持一致。"
            ]
          },
          {
            title: "状态与变体",
            body: [
              "当前示例覆盖 hero、section title、正文、caption、code、kbd 与 muted copy 等高频文本形态。",
              "不同文本强调程度应通过 size 与 tone 组合表达，而不是额外定义不透明度或临时色值。"
            ]
          },
          {
            title: "交互示例",
            body: [
              "真实示例会同时展示标题层级、说明文字、代码片段和快捷键标签，帮助团队快速检查同页阅读节奏。",
              "在表单、卡片和提示组件里复用同一套排版原语，可以减少页面之间的字体风格漂移。"
            ]
          },
          {
            title: "设计规范",
            body: [
              "先确定语义标签，再选择视觉档位；不要为了视觉效果牺牲正确的 heading 或 paragraph 结构。",
              "正文、说明、代码与快捷键标签都应复用共享排版 token，避免页面各自定义字体系统。"
            ]
          }
        ]
      },
      {
        id: "button",
        title: "Button",
        chineseTitle: "按钮",
        summary: "覆盖主要、次要、轻量、危险和 icon-only 等动作样式。",
        sectionIds: ["buttons-actions"],
        codeSamples: [
          {
            title: "主次操作组合",
            code: `<Button variant="primary">保存变更</Button>\n<Button variant="secondary">查看历史</Button>`
          },
          {
            title: "危险与加载状态",
            code: `<Button variant="danger">停用账号</Button>\n<Button isLoading loadingLabel="保存中" variant="primary">\n  保存\n</Button>`
          }
        ],
        api: [
          {
            prop: "variant",
            type: '"primary" | "secondary" | "subtle" | "ghost" | "danger" | "icon"',
            defaultValue: '"primary"',
            description: "定义按钮的视觉层级与语义强度。"
          },
          {
            prop: "size",
            type: '"xs" | "sm" | "md" | "lg"',
            defaultValue: '"md"',
            description: "控制按钮的高度、内边距和文本密度。"
          },
          {
            prop: "isLoading",
            type: "boolean",
            defaultValue: "false",
            description: "在异步提交中显示加载态并阻止重复触发。"
          }
        ],
        docSections: [
          {
            title: "适用场景",
            body: [
              "用于页面主次操作、确认提交、轻量辅助动作以及需要明确点击反馈的交互入口。",
              "当界面需要把一个动作表达成清晰的按钮层级，而不是纯文本链接时，优先使用 Button。"
            ]
          },
          {
            title: "不适用场景",
            body: [
              "不要用 Button 承担纯导航文本、正文内联引用或不需要强调的次级跳转；这类场景更适合链接样式。",
              "不要在同一个操作区并列多个 primary 按钮，也不要把危险操作伪装成普通次按钮。"
            ]
          },
          {
            title: "状态与变体",
            body: [
              "当前文档站优先覆盖 primary、secondary、subtle、ghost、danger、icon-only 与 loading 几类高频动作变体。",
              "同一个动作组里应保留明确主次关系，避免在同一区块并列多个视觉上同权重的主按钮。"
            ]
          },
          {
            title: "交互示例",
            body: [
              "推荐同时展示一个主操作按钮、一个次操作按钮和一个危险操作按钮，帮助评审动作层级是否清晰。",
              "需要展示加载态时，应让按钮保留原位置并明确 loading label，避免用户误以为点击没有生效。"
            ]
          },
          {
            title: "代码片段",
            body: [
              "静态示例：<Button variant=\"primary\">保存变更</Button> 与 <Button variant=\"secondary\">取消</Button> 组合展示主次操作。",
              "静态示例：<Button isLoading loadingLabel=\"保存中\" variant=\"primary\">保存变更</Button> 用于异步提交中的禁用反馈。"
            ]
          },
          {
            title: "设计规范",
            body: [
              "按钮文案应直接表达结果或下一步动作，避免使用模糊词汇如“确认一下”“继续处理”。",
              "icon-only 按钮必须补充 aria-label，危险操作优先使用 danger 变体并与普通动作拉开视觉距离。"
            ]
          }
        ]
      },
      {
        id: "card",
        title: "Card",
        chineseTitle: "卡片",
        summary: "统一信息分组、数据容器和空状态承载方式。",
        sectionIds: ["surfaces-cards"],
        api: [
          {
            prop: "variant",
            type: '"default" | "data" | "status"',
            defaultValue: '"default"',
            description: "定义卡片承载普通信息、数据摘要还是状态提示的视觉结构。"
          },
          {
            prop: "tone",
            type: '"default" | "brand" | "warning" | "info"',
            defaultValue: '"default"',
            description: "控制卡片在品牌、提醒或信息语义下的强调方式。"
          },
          {
            prop: "padding",
            type: '"sm" | "md" | "lg"',
            defaultValue: '"md"',
            description: "统一 header、body、footer 的内边距密度，避免页面局部手写 spacing。"
          }
        ],
        docSections: [
          {
            title: "适用场景",
            body: [
              "用于承接一组相关信息、摘要数据或局部操作，让页面在高密度信息里仍然保留清晰分区。",
              "当内容需要共享同一标题、正文和底部动作容器时，优先使用 Card，而不是在页面里手写边框盒子。"
            ]
          },
          {
            title: "不适用场景",
            body: [
              "不要把整页布局直接塞进单个 Card；页面级栅格、分栏和主次区域仍应由 PageLayout 或 section 容器承担。",
              "不要为了制造层级而无节制堆叠阴影卡片，连续信息块更适合通过间距和标题分组来解决。"
            ]
          },
          {
            title: "状态与变体",
            body: [
              "常见卡片变体包括基础信息卡、带操作 footer 的任务卡、带空状态说明的容器卡以及数据摘要卡。",
              "是否需要 header、body、footer 应由内容结构决定，而不是为了视觉完整强行补齐三段式。"
            ]
          },
          {
            title: "交互示例",
            body: [
              "适合展示一个含标题与正文的基础卡片，再补一个带底部操作区的任务卡，帮助团队校验结构边界。",
              "如果卡片内含按钮、标签或复制工具，应验证这些动作不会把卡片误导成整块可点击容器。"
            ]
          },
          {
            title: "代码片段",
            body: [
              "静态示例：<Card><CardHeader>域名配额</CardHeader><CardBody>展示剩余可用量与说明</CardBody></Card>。",
              "静态示例：<Card><CardBody>摘要信息</CardBody><CardFooter><Button variant=\"secondary\">查看详情</Button></CardFooter></Card>。"
            ]
          },
          {
            title: "设计规范",
            body: [
              "卡片只负责建立信息边界，不应该再承担页面级布局职责；页面编排仍由 PageLayout 和 section 容器控制。",
              "同一视图中的卡片层级应依赖统一的 radius 与 elevation token，不为单个业务块临时定义新的阴影或圆角。"
            ]
          }
        ]
      },
      {
        id: "data-display",
        title: "Data display",
        chineseTitle: "数据展示",
        summary: "表格、键值列表、头像和统计卡等摘要展示原语。",
        sectionIds: ["data-display"],
        api: [
          {
            prop: "TableContainer.variant",
            type: '"default" | "liquid"',
            defaultValue: '"default"',
            description: "控制表格容器的表面风格，适配常规列表与更轻盈的数据面板。"
          },
          {
            prop: "KVList.items",
            type: "Array<{ key: string; value: ReactNode; hint?: string; action?: ReactNode }>",
            defaultValue: "[]",
            description: "定义键值列表的字段、提示与附加操作，用于环境信息和配置摘要。"
          },
          {
            prop: "MetricCard.tone",
            type: '"default" | "hero"',
            defaultValue: '"default"',
            description: "区分普通 KPI 卡与强调型指标卡，让关键数据有更明确的视觉层级。"
          }
        ],
        docSections: [
          {
            title: "适用场景",
            body: [
              "用于承接表格、键值列表、头像身份块和指标摘要卡，帮助页面稳定展示结构化信息。",
              "当页面需要在不依赖真实接口的情况下校验数据密度与层级时，应优先复用这组展示原语。"
            ]
          },
          {
            title: "不适用场景",
            body: [
              "不要把 Data display 组件当作输入控件或导航容器使用；它们负责展示结果，不负责采集或切换。",
              "如果内容只是简短正文说明，没有结构化字段或指标层级，也不需要强行包装成数据展示原语。"
            ]
          },
          {
            title: "状态与变体",
            body: [
              "当前预览覆盖 Avatar、KVList、MetricCard 和 Table shell，分别对应身份摘要、键值信息、核心指标和列表结果。",
              "数据展示组件的层级应依赖统一的 badge、caption 与 container tone，而不是在业务页额外发明新的强调样式。"
            ]
          },
          {
            title: "交互示例",
            body: [
              "真实示例同时摆放头像组、键值列表、指标卡和紧凑表格，方便对比不同数据密度下的节奏是否协调。",
              "列表里的状态展示可以直接复用 Badge、Tag 等反馈原语，避免数据组件内部再重复定义语义色。"
            ]
          },
          {
            title: "设计规范",
            body: [
              "优先保证字段标签、指标标题和状态色在不同数据组件之间语义一致，再考虑局部强调样式。",
              "如果一个数据块需要解释、动作和状态提示，应通过 Card、Badge、Alert 等原语组合，而不是让单一展示组件承担所有职责。"
            ]
          }
        ]
      }
    ]
  },
  {
    id: "forms-navigation-feedback",
    title: "Forms, Navigation & Feedback",
    chineseTitle: "表单、导航与反馈",
    summary: "覆盖输入、选择、路径导航、状态反馈和系统提示等高频交互组件。",
    overviewDescription: "输入控件、路径组件和反馈组件会一起定义页面交互密度，让用户既能完成操作，也能获得明确状态回馈。",
    sectionIds: ["form-inputs", "selection-controls", "navigation-wayfinding", "feedback-status"],
    components: [
      {
        id: "search-input",
        title: "SearchInput",
        chineseTitle: "搜索输入框",
        summary: "统一搜索、筛选和快速清除交互。",
        sectionIds: ["form-inputs"],
        api: [
          {
            prop: "placeholder",
            type: "string",
            defaultValue: '"搜索…"',
            description: "说明搜索对象和预期输入内容，帮助用户快速理解筛选范围。"
          },
          {
            prop: "aria-label",
            type: "string",
            defaultValue: '"搜索"',
            description: "为仅含图标或弱化 label 的搜索场景补充明确的无障碍名称。"
          },
          {
            prop: "value / defaultValue",
            type: "string",
            defaultValue: '""',
            description: "支持受控与非受控输入，适配即时搜索与初始化筛选值两类场景。"
          }
        ],
        docSections: [
          {
            title: "适用场景",
            body: [
              "用于列表页、筛选条和弹层内的快速搜索入口，统一前缀图标、占位文案与清除交互。",
              "当用户需要频繁按关键字缩小结果范围时，应优先使用 SearchInput，而不是普通 TextInput。"
            ]
          },
          {
            title: "不适用场景",
            body: [
              "不要把 SearchInput 用作需要复杂格式校验的表单字段，例如邮箱、密码或 API Key 输入；这类场景应使用普通输入控件。",
              "如果页面没有即时筛选或查询反馈，单独放一个搜索框会制造误导，应该先明确搜索对象和结果承载区。"
            ]
          },
          {
            title: "状态与变体",
            body: [
              "首批文档优先覆盖默认搜索态、已输入可清除态以及与筛选条并列时的紧凑布局态。",
              "是否显示清除按钮、是否带前缀图标、是否放进 FilterBar，都是 SearchInput 的常见组合变体。"
            ]
          },
          {
            title: "交互示例",
            body: [
              "典型示例是账号列表页顶部搜索框：输入关键字后立即过滤列表，并支持一键清除恢复默认结果。",
              "当搜索与标签、状态等筛选器联动时，应保证控件同行对齐，并让占位文案说明搜索对象。"
            ]
          },
          {
            title: "代码片段",
            body: [
              "静态示例：<SearchInput aria-label=\"搜索账号\" placeholder=\"搜索账号、域名或创建人\" />。",
              "静态示例：<FilterBar><SearchInput aria-label=\"搜索 API Key\" placeholder=\"搜索名称或前缀\" /></FilterBar>。"
            ]
          },
          {
            title: "设计规范",
            body: [
              "搜索框应直接表达可搜索对象，例如账号、地址或创建人，避免只写泛化的“请输入关键字”。",
              "如果搜索会和其他筛选联动，建议放进 FilterBar 组合里保持同一行节奏。"
            ]
          }
        ]
      },
      {
        id: "multi-select",
        title: "MultiSelect",
        chineseTitle: "多选器",
        summary: "统一标签筛选、权限筛选和组合条件选择。",
        sectionIds: ["form-inputs"],
        api: [
          {
            prop: "options",
            type: "Array<{ label: string; value: string }>",
            defaultValue: "[]",
            description: "定义可选标签、权限或筛选条件，是多选器渲染候选项的基础数据。"
          },
          {
            prop: "defaultValue",
            type: "string[]",
            defaultValue: "[]",
            description: "用于带初始筛选值的列表页，让多选器在首屏就呈现当前过滤结果。"
          },
          {
            prop: "aria-label",
            type: "string",
            defaultValue: '"多选器"',
            description: "为紧凑筛选条或无可视标签场景补充清晰的控件名称。"
          }
        ],
        docSections: [
          {
            title: "适用场景",
            body: [
              "用于标签筛选、权限筛选和组合条件选择，让用户可以在同一控件内快速选择多个维度。",
              "当页面需要展示已选状态并允许继续增删条件时，应优先使用 MultiSelect，而不是多个离散 checkbox。"
            ]
          },
          {
            title: "不适用场景",
            body: [
              "不要把只有两三个永久可见选项的场景强行做成 MultiSelect；这类场景更适合直接使用 checkbox 组。",
              "如果筛选条件之间互斥，只能单选，也不应使用多选器，应改用 Select 或 Radio。"
            ]
          },
          {
            title: "状态与变体",
            body: [
              "当前预览覆盖默认空态与带默认值的已选态，重点验证标签筛选与组合条件在同一筛选条中的节奏。",
              "多选器的展示重点是已选项反馈、候选列表滚动与紧凑布局对齐，不额外承担复杂表单校验。"
            ]
          },
          {
            title: "交互示例",
            body: [
              "真实示例展示了标签筛选场景：默认勾选异常账号，再结合搜索框和状态下拉形成组合过滤。",
              "如果多选器放进 FilterBar，应确保选中项不会撑破工具栏节奏，并保留清晰的 aria-label。"
            ]
          },
          {
            title: "设计规范",
            body: [
              "多选器应清楚区分候选项与已选结果，避免用户在筛选面板里反复确认当前状态。",
              "当条件较多时，优先使用统一滚动区域与标签密度，不在业务页面私自扩展弹层样式。"
            ]
          }
        ]
      },
      {
        id: "selection-controls",
        title: "Selection controls",
        chineseTitle: "选择控件",
        summary: "Checkbox、Radio、Switch 等二元与组选项控件。",
        sectionIds: ["selection-controls"],
        api: [
          {
            prop: "checked / defaultChecked",
            type: "boolean",
            defaultValue: "false",
            description: "控制二元开关和单项选择的默认状态，适配受控与非受控场景。"
          },
          {
            prop: "label",
            type: "string",
            defaultValue: '""',
            description: "为 Checkbox、Radio、Switch 提供统一可读标签，减少页面自行拼接文案。"
          },
          {
            prop: "variant",
            type: '"default" | "card"',
            defaultValue: '"default"',
            description: "让单项选择既能作为普通表单控件，也能作为卡片式筛选块出现。"
          }
        ],
        docSections: [
          {
            title: "适用场景",
            body: [
              "用于承接 Checkbox、Radio、Switch 等二元与组选项控件，统一选择状态、标签和排列密度。",
              "当页面需要让用户启用功能、勾选筛选条件或在互斥选项中做决定时，应优先复用这组控件。"
            ]
          },
          {
            title: "不适用场景",
            body: [
              "不要把大量标签筛选塞进 selection controls；当选项数量较多且需要折叠、搜索或多选反馈时应切到 MultiSelect。",
              "不要让单个 Switch 承担复杂确认逻辑，涉及危险操作时仍应配合按钮、弹层或说明文案。"
            ]
          },
          {
            title: "状态与变体",
            body: [
              "当前示例覆盖 checked、unchecked、card-style 与 grouped controls 等高频状态，便于回归开关、单选与多选的视觉一致性。",
              "同一组选择控件应共享标签密度、禁用态和焦点反馈，不在业务层额外定义不同交互语言。"
            ]
          },
          {
            title: "交互示例",
            body: [
              "真实示例展示了通知开关、异常筛选 checkbox、汇总方式 radio 和卡片式选择块四种组合方式。",
              "如果选择控件出现在设置页和筛选条两个场景，应优先复用同一套 label 与状态说明，避免术语漂移。"
            ]
          },
          {
            title: "设计规范",
            body: [
              "选择控件首先表达状态切换与范围边界，不要通过颜色或阴影单独创造新的语义。",
              "当同一视图存在多组选项时，优先按用途分组并给出清晰标签，而不是靠视觉距离让用户自行猜测。"
            ]
          }
        ]
      },
      {
        id: "navigation",
        title: "Navigation",
        chineseTitle: "导航组件",
        summary: "Breadcrumb、Tabs、Pagination、Steps 等路径与流程组件。",
        sectionIds: ["navigation-wayfinding"],
        api: [
          {
            prop: "Breadcrumb items",
            type: "ReactNode[]",
            defaultValue: "[]",
            description: "按路径层级描述当前位置与返回入口，适合详情页和多层管理后台。"
          },
          {
            prop: "Tabs.defaultValue",
            type: "string",
            defaultValue: '"overview"',
            description: "定义首屏展示的标签页，让局部视图切换有稳定默认态。"
          },
          {
            prop: "Pagination.page / total / pageSize",
            type: "number",
            defaultValue: "1 / 0 / 20",
            description: "统一分页栏的页码、总量和每页数量结构，避免列表页各自定义分页规则。"
          }
        ],
        docSections: [
          {
            title: "适用场景",
            body: [
              "用于表达页面路径、内容分段、结果分页和任务流程，帮助用户理解自己当前所在的位置与下一步去向。",
              "当页面需要在多个平级视图之间切换，或需要展示多步操作进度时，应优先复用这一组导航原语。"
            ]
          },
          {
            title: "不适用场景",
            body: [
              "不要把 Navigation 当成主要操作区来承载保存、删除等动作；导航负责定位与切换，不负责提交业务结果。",
              "同一层级内容不要同时叠加 Tabs、Steps 和二级 Breadcrumb，重复路径信号会增加理解成本。"
            ]
          },
          {
            title: "状态与变体",
            body: [
              "当前常见变体包括 Breadcrumb 路径导航、Tabs 内容切换、Pagination 结果分页与 Steps 流程进度。",
              "是否需要图标、数字、禁用态或完成态，应跟随组件职责，而不是为视觉丰富度额外增加状态。"
            ]
          },
          {
            title: "交互示例",
            body: [
              "管理后台详情页适合组合 Breadcrumb 与 Tabs：上层路径帮助返回列表，局部视图切换交由 Tabs 处理。",
              "涉及多步配置流程时，可以用 Steps 展示进度，但每一步的主操作仍应留在正文或底部操作区。"
            ]
          },
          {
            title: "代码片段",
            body: [
              "静态示例：<Breadcrumb><BreadcrumbItem><BreadcrumbLink href=\"/accounts\">账号</BreadcrumbLink></BreadcrumbItem><BreadcrumbCurrent>详情</BreadcrumbCurrent></Breadcrumb>。",
              "静态示例：<Tabs><TabsList><TabsTrigger value=\"overview\">概览</TabsTrigger><TabsTrigger value=\"activity\">活动</TabsTrigger></TabsList></Tabs>。"
            ]
          },
          {
            title: "设计规范",
            body: [
              "导航组件首先服务于定位和切换，不应混入主操作按钮语义；主动作仍应留在工具栏或正文操作区。",
              "同一页面里不要同时堆叠多个相同层级的导航模式，避免用户同时处理 breadcrumb、tabs 和 steps 的重复路径信号。"
            ]
          }
        ]
      },
      {
        id: "feedback",
        title: "Feedback",
        chineseTitle: "反馈组件",
        summary: "Tag、Badge、Alert、Progress、Skeleton 和 Spinner 等反馈状态。",
        sectionIds: ["feedback-status"],
        api: [
          {
            prop: "variant",
            type: '"success" | "warning" | "danger" | "info" | "brand"',
            defaultValue: '"info"',
            description: "统一 Badge、Tag、Alert 等反馈组件的语义色映射。"
          },
          {
            prop: "title",
            type: "string",
            defaultValue: '""',
            description: "用于 Alert 等强提示组件的标题文案，帮助用户快速理解事件性质。"
          },
          {
            prop: "value",
            type: "number",
            defaultValue: "0",
            description: "用于 Progress 等进度型反馈，表达任务完成比例与当前阶段。"
          }
        ],
        docSections: [
          {
            title: "适用场景",
            body: [
              "用于提示当前状态、异步进度、风险警告和加载占位，让用户及时理解系统是否成功响应了操作。",
              "当页面需要补充状态密度但不想打断主流程时，优先使用 Badge、Tag 或 Progress；需要明确提醒时再升级到 Alert。"
            ]
          },
          {
            title: "不适用场景",
            body: [
              "不要用高优先级 Alert 展示每一条普通提示，否则真正的风险提醒会被淹没。",
              "不要让 Skeleton 或 Spinner 长时间替代真实内容；如果加载超过合理时长，应补充明确说明或失败反馈。"
            ]
          },
          {
            title: "状态与变体",
            body: [
              "首批反馈文档覆盖 success、warning、danger、info 几类语义状态，以及 loading、empty、in-progress 等交互阶段。",
              "Badge、Tag、Progress、Alert、Skeleton 和 Spinner 分别对应不同强度的反馈层级，选择时应先判断是否会打断用户主流程。"
            ]
          },
          {
            title: "交互示例",
            body: [
              "例如在 API Key 列表中，用 Badge 标识状态、用 Alert 呈现失败原因、用 Spinner 或 Skeleton 承接短暂加载。",
              "涉及批量任务时，可以用 Progress 展示完成度，同时在任务结束后切换为明确的成功或失败文案。"
            ]
          },
          {
            title: "代码片段",
            body: [
              "静态示例：<Alert tone=\"warning\" title=\"域名即将过期\">请在 3 天内完成续费。</Alert>。",
              "静态示例：<Badge variant=\"success\">运行中</Badge> 与 <Progress value={64} aria-label=\"同步进度\" /> 组合展示状态。"
            ]
          },
          {
            title: "设计规范",
            body: [
              "反馈组件的颜色必须复用语义色 token，让 success、warning、danger 等状态在全站保持同一套认知映射。",
              "Skeleton 和 Spinner 只用于短暂加载反馈，不应替代真正的空状态说明。"
            ]
          }
        ]
      }
    ]
  },
  {
    id: "overlays-utilities",
    title: "Overlays & Utilities",
    chineseTitle: "弹层与工具型原语",
    summary: "提供弹层、提示层、滚动区域和复制等辅助能力。",
    overviewDescription: "这组能力主要解决复杂交互和信息补充，不改变主页面结构，但决定整个系统的细节完成度。",
    sectionIds: ["overlays-utilities"],
    components: [
      {
        id: "overlay",
        title: "Overlay",
        chineseTitle: "弹层",
        summary: "统一对话框、抽屉、聚焦管理和背景锁定。",
        sectionIds: ["overlays-utilities"],
        api: [
          {
            prop: "title",
            type: "string",
            defaultValue: '""',
            description: "为对话框或抽屉提供清晰标题，帮助用户理解当前弹层任务。"
          },
          {
            prop: "closeOnBackdrop",
            type: "boolean",
            defaultValue: "false",
            description: "控制点击遮罩时是否允许关闭，适配轻量预览与需要强确认的两类场景。"
          },
          {
            prop: "onClose",
            type: "() => void",
            defaultValue: "required",
            description: "统一弹层关闭出口，承接 Esc、关闭按钮和遮罩点击等收尾动作。"
          }
        ],
        docSections: [
          {
            title: "适用场景",
            body: [
              "用于承接对话框、抽屉等需要临时打断主流程的交互，同时统一 focus trap、背景锁定与 portal 挂载。",
              "当页面需要补充配置、确认危险操作或展示分步信息时，应优先使用 Overlay 原语，而不是页面里手写 fixed panel。"
            ]
          },
          {
            title: "不适用场景",
            body: [
              "不要把轻量提示或只读补充说明做成 Overlay；这类场景更适合 Tooltip、Popover 或页内提示块。",
              "不要在同一时刻堆叠多个业务弹层，除非流程明确要求，否则会让焦点与关闭语义失控。"
            ]
          },
          {
            title: "状态与变体",
            body: [
              "当前真实示例覆盖 dialog 与 drawer 两种壳层，重点验证 focus trap、closeOnBackdrop 与统一 footer 行为。",
              "弹层的宽度、关闭方式和 footer 组合应作为变体处理，但背景锁定和焦点管理必须保持同一套规则。"
            ]
          },
          {
            title: "交互示例",
            body: [
              "设计系统首页顶部已挂出打开对话框与打开抽屉两个真实入口，用于验证共享壳层而不是业务专属样式。",
              "在弹层内部嵌入搜索、告警和键值摘要时，应确保 Tab 顺序与关闭行为仍然稳定。"
            ]
          },
          {
            title: "设计规范",
            body: [
              "弹层首先解决交互收束与焦点管理，不应承担页面级布局职责。",
              "所有对话框和抽屉都应通过统一 overlay layer 渲染，避免每个业务模块各自实现 portal 与 scroll lock。"
            ]
          }
        ]
      },
      {
        id: "tooltip-popover",
        title: "Tooltip & Popover",
        chineseTitle: "提示层与浮层",
        summary: "承接轻量提示和补充操作面板。",
        sectionIds: ["overlays-utilities"],
        api: [
          {
            prop: "TooltipContent",
            type: "ReactNode",
            defaultValue: "required",
            description: "承载 hover 或 focus 后出现的简短说明文案。"
          },
          {
            prop: "PopoverContent",
            type: "ReactNode",
            defaultValue: "required",
            description: "用于展示补充操作或上下文信息面板，内容可以比 tooltip 更丰富。"
          },
          {
            prop: "Trigger",
            type: "interactive element",
            defaultValue: "required",
            description: "定义触发提示层或浮层的入口，保证 hover、focus 与 click 行为一致。"
          }
        ],
        docSections: [
          {
            title: "适用场景",
            body: [
              "Tooltip 用于承载简短解释、术语说明或图标按钮提示；Popover 用于展示补充操作面板和上下文设置。",
              "当页面需要在不离开当前上下文的情况下补充说明或附加动作时，应优先考虑这一组轻量浮层。"
            ]
          },
          {
            title: "不适用场景",
            body: [
              "不要把长篇文档、表单流程或危险确认放进 Tooltip 或 Popover；这类场景应升级为 Overlay 或独立页面。",
              "Tooltip 不应用来承载必须阅读的信息，因为用户在移动端或键盘场景下不一定稳定触发悬停。"
            ]
          },
          {
            title: "状态与变体",
            body: [
              "当前预览重点覆盖 hover / focus 提示与 click 打开的快捷面板两类模式，帮助区分 Tooltip 和 Popover 的职责边界。",
              "这组组件的关键变体不是颜色，而是内容密度、触发方式与是否允许继续操作。"
            ]
          },
          {
            title: "交互示例",
            body: [
              "真实示例同时展示聚焦提示和快捷面板，便于验证 tooltip 文案、popover 操作区与触发器之间的距离感。",
              "如果同一个图标既需要解释又需要动作，优先判断用户真正需要的是提示还是操作面板，避免两者叠加。"
            ]
          },
          {
            title: "设计规范",
            body: [
              "Tooltip 文案应短促直接，Popover 内容应围绕当前上下文，不要让用户在浮层里重新理解一套页面结构。",
              "两类浮层都应复用统一的定位、层级和间距语言，避免每个业务入口呈现不同的悬浮体验。"
            ]
          }
        ]
      },
      {
        id: "copy-utility",
        title: "Copy utility",
        chineseTitle: "复制工具",
        summary: "统一命令、链接和片段复制反馈。",
        sectionIds: ["overlays-utilities"],
        api: [
          {
            prop: "value",
            type: "string",
            defaultValue: '""',
            description: "定义要复制到剪贴板的命令、链接或代码片段内容。"
          },
          {
            prop: "children",
            type: "ReactNode",
            defaultValue: '"复制"',
            description: "控制按钮展示文案，让复制动作可以适配命令、链接和字段值等不同语境。"
          },
          {
            prop: "copiedLabel",
            type: "string",
            defaultValue: '"已复制"',
            description: "复制成功后的即时反馈文案，帮助用户确认动作已经完成。"
          }
        ],
        docSections: [
          {
            title: "适用场景",
            body: [
              "用于命令行指令、API key 前缀、访问链接和代码片段复制，让用户在高频操作中得到统一反馈。",
              "当页面包含需要重复复制的短文本时，应优先使用 Copy utility，而不是自己实现按钮与成功提示。"
            ]
          },
          {
            title: "不适用场景",
            body: [
              "不要把长篇正文或整块富文本直接交给 Copy utility；这类场景更适合下载、导出或专门的代码块复制方案。",
              "如果内容本身不可见或用户无法判断复制对象，也不应只放一个复制按钮而不补充上下文说明。"
            ]
          },
          {
            title: "状态与变体",
            body: [
              "当前预览覆盖测试命令复制、Playwright 命令复制和片段复制反馈，重点验证默认态与已复制态的切换。",
              "复制工具的主要变体来自文案语境与所在容器，而不是重新设计一套独立按钮样式。"
            ]
          },
          {
            title: "交互示例",
            body: [
              "设计系统首页基础层与 Overlays & Utilities 区块都保留了复制命令按钮，方便验证不同容器中的反馈一致性。",
              "如果复制动作出现在卡片、代码示例和工具栏中，应保持相同的成功提示和可聚焦行为。"
            ]
          },
          {
            title: "设计规范",
            body: [
              "复制按钮必须让用户知道将要复制什么内容，避免只显示抽象动词导致误操作。",
              "复制反馈应短促、明确且不会打断主流程，优先使用同一套 success 文案和按钮状态切换。"
            ]
          }
        ]
      }
    ]
  }
];

type HeroComponentDocConfig = {
  id: string;
  title: string;
  chineseTitle: string;
  summary: string;
  sectionIds: DesignSystemSectionId[];
  usage: string[];
  avoid: string[];
  variants: string[];
  anatomy: string[];
  accessibility: string[];
  api: DesignSystemApiField[];
  codeSamples: DesignSystemCodeSample[];
};

function createHeroComponentDoc({
  accessibility,
  anatomy,
  api,
  avoid,
  codeSamples,
  id,
  sectionIds,
  summary,
  title,
  chineseTitle,
  usage,
  variants
}: HeroComponentDocConfig): DesignSystemComponentDoc {
  return {
    id,
    title,
    chineseTitle,
    summary,
    sectionIds,
    api,
    codeSamples,
    docSections: createHeroDocSections({
      accessibility,
      anatomy,
      avoid,
      usage,
      variants
    })
  };
}

const heroUiInspiredComponentAdditions: Record<string, DesignSystemComponentDoc[]> = {
  "content-actions": [
    createHeroComponentDoc({
      id: "avatar",
      title: "Avatar",
      chineseTitle: "头像",
      summary: "展示用户、团队、服务账号或自动化身份的紧凑视觉标识。",
      sectionIds: ["data-display"],
      usage: [
        "用于账号列表、评论署名、审计记录、团队成员摘要和弹层中的用户身份预览。",
        "当页面需要在很小空间里区分个人、团队或系统身份时，Avatar 比纯文本邮箱更容易被快速扫描。"
      ],
      avoid: [
        "不要把 Avatar 当作权限状态或风险等级使用；身份与状态应分别由 Avatar 与 Badge/Tag 表达。",
        "如果缺少 name、alt 或 fallback 信息，应先补齐可读身份，不要只展示无意义的图片占位。"
      ],
      variants: [
        "支持 xs、sm、md、lg、xl 尺寸，以及 circle 和 square 形状，用于列表密度、资料页和团队标识。",
        "支持图片加载失败后的 fallback initials，确保头像资源不可用时仍能保留身份线索。"
      ],
      anatomy: [
        "Avatar root 承接尺寸与形状，内部优先渲染 image，失败或缺失时切换为 fallback slot。",
        "与 HeroUI Avatar 类似，业务页面只组合 src、alt、name、fallback，不在列表页临时拼接首字母逻辑。"
      ],
      accessibility: [
        "图片头像必须给出 alt；纯装饰头像可交给相邻文本承担可读名称，但 fallback 不应成为唯一业务信息。",
        "头像组需要配合可见姓名、邮箱或 aria-label，避免屏幕阅读器只读到重复的首字母。"
      ],
      api: [
        createApiField("name", "string", "undefined", "用于生成 fallback initials，也是身份展示的语义来源。"),
        createApiField("src", "string", "undefined", "头像图片地址；加载失败后自动回退到 fallback。"),
        createApiField("size", '"xs" | "sm" | "md" | "lg" | "xl"', '"md"', "控制头像尺寸，匹配列表、卡片和详情页密度。")
      ],
      codeSamples: [
        createCodeSample("基础头像", `<Avatar name="Will Xue" />\n<Avatar name="Ops Team" shape="square" />`),
        createCodeSample("图片与 fallback", `<Avatar alt="QA Bot" fallback="QA" src="/avatars/qa.png" />`)
      ]
    }),
    createHeroComponentDoc({
      id: "table",
      title: "Table",
      chineseTitle: "表格",
      summary: "展示账号、消息、API Key、审计日志等高密度结构化数据。",
      sectionIds: ["data-display"],
      usage: [
        "用于字段明确、行列关系稳定、需要横向比较的数据列表，例如账号列表、外发历史和系统审计。",
        "当数据需要排序、分页、状态标识或行级操作时，Table 应与 Badge、Button、Pagination 组合使用。"
      ],
      avoid: [
        "不要用 Table 展示自由文本、营销内容或只有一两行的摘要；这类信息更适合 Card 或 KVList。",
        "不要把表格单元格塞成复杂页面，超过两层交互时应切到详情页或抽屉。"
      ],
      variants: [
        "TableContainer 支持 liquid 与 solid 表面，density 支持 compact、comfortable、spacious。",
        "TableRow 支持 interactive 和 selected 状态，用于可点击列表和批量选择后的视觉反馈。"
      ],
      anatomy: [
        "组合顺序固定为 TableContainer -> Table -> TableHead/TableBody -> TableRow -> TableHeaderCell/TableCell。",
        "列宽、对齐、nowrap 等单元格行为集中在 cell props，避免业务页面各自写 table CSS。"
      ],
      accessibility: [
        "表头必须使用 TableHeaderCell 和 scope，状态列需要保留文本或 aria-label，而不仅靠颜色。",
        "行级点击需要保证键盘可达；如果行内已有按钮，应避免整行和按钮形成冲突点击目标。"
      ],
      api: [
        createApiField("density", '"compact" | "comfortable" | "spacious"', '"comfortable"', "控制表格行高与内边距密度。"),
        createApiField("variant", '"liquid" | "solid"', '"liquid"', "控制表格容器表面样式。"),
        createApiField("isInteractive", "boolean", "false", "标记可点击或可聚焦的数据行。")
      ],
      codeSamples: [
        createCodeSample("紧凑账号表", `<TableContainer density="compact">\n  <Table>\n    <TableHead><TableRow><TableHeaderCell>地址</TableHeaderCell></TableRow></TableHead>\n    <TableBody><TableRow><TableCell>ops@wemail.ai</TableCell></TableRow></TableBody>\n  </Table>\n</TableContainer>`)
      ]
    }),
    createHeroComponentDoc({
      id: "kv-list",
      title: "KVList",
      chineseTitle: "键值列表",
      summary: "展示环境、配额、域名、开关状态等短字段摘要。",
      sectionIds: ["data-display"],
      usage: [
        "用于详情页侧栏、弹层摘要、系统环境信息和只读配置块，让字段标签和值保持稳定对齐。",
        "当字段数量不多但需要比普通正文更结构化时，KVList 比 Table 更轻。"
      ],
      avoid: [
        "不要用 KVList 承载可编辑表单；需要输入、校验和提交时应使用 FormField。",
        "不要把长段正文放进 value，否则会破坏键值扫描节奏。"
      ],
      variants: [
        "density 支持 compact 和 comfortable，用于侧栏摘要与主内容详情两种密度。",
        "每一项支持 hint 和 action slot，可展示默认标记、复制按钮或跳转入口。"
      ],
      anatomy: [
        "KVList 使用 dl/dt/dd 结构，items 只描述 key、value、hint、action。",
        "业务页面负责准备可读字段，组件负责统一字段密度、对齐和附加操作位置。"
      ],
      accessibility: [
        "key 和 value 需要保持可读文本，不要只放图标；action 要有清晰名称。",
        "列表用于摘要而非导航，除非 action 明确提供独立交互。"
      ],
      api: [
        createApiField("items", "Array<{ key; value; hint?; action? }>", "[]", "定义键值列表所有字段。"),
        createApiField("density", '"compact" | "comfortable"', '"comfortable"', "控制字段行的纵向密度。"),
        createApiField("action", "ReactNode", "undefined", "为单个字段补充复制、跳转等轻量动作。")
      ],
      codeSamples: [
        createCodeSample("环境摘要", `<KVList items={[{ key: "环境", value: "Prod" }, { key: "区域", value: "APAC", hint: "默认" }]} />`)
      ]
    }),
    createHeroComponentDoc({
      id: "metric-card",
      title: "MetricCard",
      chineseTitle: "指标卡",
      summary: "展示关键 KPI、趋势说明和仪表盘核心数字。",
      sectionIds: ["data-display"],
      usage: [
        "用于仪表盘顶部、管理端摘要和监控面板，让关键数值在复杂页面里有明确视觉优先级。",
        "当数字需要附带 kicker、title、detail、caption 或 icon 时，MetricCard 能保持信息槽位一致。"
      ],
      avoid: [
        "不要用指标卡展示普通段落或配置详情；它应该聚焦一个主要数值。",
        "不要在同一屏放太多 hero tone 指标，否则用户会失去优先级判断。"
      ],
      variants: [
        "tone 支持 default 和 hero，valueSize 支持 lg 与 xl，用于普通指标与关键指标。",
        "caption 和 detail 分别表达趋势与解释，避免把所有辅助信息挤进 title。"
      ],
      anatomy: [
        "MetricCard 的顺序为 kicker、title、value、detail、caption、visualIcon，适合固定视觉扫描路径。",
        "它可以放在 PageLayout 或 Card grid 中，但不应再嵌套复杂交互。"
      ],
      accessibility: [
        "title 和 value 必须共同表达指标含义，不能只显示数字。",
        "趋势色需要有文字 caption，避免只靠绿色/红色传达升降。"
      ],
      api: [
        createApiField("value", "ReactNode", "required", "指标主数值。"),
        createApiField("tone", '"default" | "hero"', '"default"', "控制指标卡强调程度。"),
        createApiField("caption", "ReactNode", "undefined", "展示趋势、周期或对比说明。")
      ],
      codeSamples: [
        createCodeSample("仪表盘指标", `<MetricCard kicker="KPI" title="活跃账号" value="128" detail="较上周提升" caption="+8.4%" tone="hero" />`)
      ]
    }),
    createHeroComponentDoc({
      id: "empty-state",
      title: "EmptyState",
      chineseTitle: "空状态",
      summary: "为空列表、权限受限、错误恢复和初始引导提供统一占位结构。",
      sectionIds: ["surfaces-cards", "feedback-status"],
      usage: [
        "用于没有数据、没有权限、筛选无结果或首次使用时的解释和下一步操作。",
        "当页面否则会只剩一片空白时，EmptyState 应给出原因、影响和可执行动作。"
      ],
      avoid: [
        "不要把普通 loading 状态做成 EmptyState；短暂等待应使用 Skeleton 或 Spinner。",
        "不要只写“暂无数据”，至少说明为什么为空以及用户能做什么。"
      ],
      variants: [
        "variant 支持 default、error、no-access，对应普通空态、失败恢复和权限受限。",
        "actions slot 用于放置主按钮或次按钮，但应控制在一到两个动作内。"
      ],
      anatomy: [
        "EmptyState 包含 media、title、description、content、actions 五个槽位。",
        "它通常作为列表容器的替代内容，而不是页面最外层布局。"
      ],
      accessibility: [
        "组件输出 region，并通过 title/description 建立 aria 关联。",
        "错误空态的恢复动作必须可聚焦，不能只依赖说明文字。"
      ],
      api: [
        createApiField("title", "ReactNode", "required", "空状态标题。"),
        createApiField("description", "ReactNode", "undefined", "解释当前为空的原因与影响。"),
        createApiField("variant", '"default" | "error" | "no-access"', '"default"', "控制空状态语义。")
      ],
      codeSamples: [
        createCodeSample("筛选无结果", `<EmptyState\n  title="暂无账号结果"\n  description="调整状态或创建人后会在这里刷新。"\n  actions={<Button variant="primary">新建筛选</Button>}\n/>`)
      ]
    })
  ],
  "forms-navigation-feedback": [
    createHeroComponentDoc({
      id: "form-field",
      title: "FormField",
      chineseTitle: "字段容器",
      summary: "统一表单 label、description、message、required 和控件关联。",
      sectionIds: ["form-inputs"],
      usage: [
        "用于所有需要 label、帮助文案、错误信息或必填标记的输入字段。",
        "当一个输入需要描述或校验反馈时，应优先包进 FormField，而不是手写 label 和 message。"
      ],
      avoid: [
        "不要把 FormField 当作页面布局 grid；它只负责单个字段的语义结构。",
        "不要在 label 里放复杂交互，说明和动作应进入 description 或外层工具栏。"
      ],
      variants: [
        "tone 支持 default、error、success，message 可表达校验结果。",
        "required 标记只表达视觉和语义提示，业务校验仍在表单层处理。"
      ],
      anatomy: [
        "FormField 由 label、description、control、message 组成，并自动关联 id 与 aria-describedby。",
        "它能包裹 SearchInput、SelectInput、TextareaInput 等共享表单原语。"
      ],
      accessibility: [
        "每个可编辑字段必须有可读 label；sr-only label 只适合筛选条等空间受限场景。",
        "错误信息需要通过 message 进入 aria-describedby，而不是只靠红色边框。"
      ],
      api: [
        createApiField("label", "ReactNode", "required", "字段可读名称。"),
        createApiField("description", "ReactNode", "undefined", "字段帮助说明。"),
        createApiField("message", "ReactNode", "undefined", "错误、成功或提示消息。")
      ],
      codeSamples: [
        createCodeSample("带说明字段", `<FormField label="搜索账号" description="支持邮箱、域名或创建人">\n  <SearchInput aria-label="搜索账号" />\n</FormField>`)
      ]
    }),
    createHeroComponentDoc({
      id: "select-input",
      title: "SelectInput",
      chineseTitle: "选择输入",
      summary: "用于单选下拉、状态筛选和较短枚举字段。",
      sectionIds: ["form-inputs"],
      usage: [
        "用于角色、状态、域名、保留期等互斥枚举选择。",
        "当候选项数量较少且不需要搜索时，SelectInput 比 MultiSelect 更直接。"
      ],
      avoid: [
        "不要用 SelectInput 做多选；多标签筛选应使用 MultiSelect。",
        "不要把关键危险操作隐藏在下拉里，危险动作应使用显式按钮和确认流程。"
      ],
      variants: [
        "保留 value/defaultValue/onChange/name 等表单 API，可配合 FormField 展示错误和帮助文案。",
        "可用于紧凑 FilterBar 或普通表单，通过外层布局决定宽度。"
      ],
      anatomy: [
        "SelectInput 使用系统风格 combobox 触发器和自定义 listbox 面板，底层同步隐藏 select 以兼容表单提交。",
        "选项文案应业务可读，不要直接暴露后端枚举值。"
      ],
      accessibility: [
        "必须有可见 label 或 aria-label；默认选项应清楚表达“全部/请选择/未设置”。",
        "支持键盘打开、上下移动、选择与 Escape 关闭；禁用态需要保留解释，避免用户不知道为什么无法选择。"
      ],
      api: [
        createApiField("value / defaultValue", "string", "undefined", "控制当前选中项。"),
        createApiField("disabled", "boolean", "false", "禁用选择器。"),
        createApiField("children", "option[]", "required", "提供原生 option 列表。")
      ],
      codeSamples: [
        createCodeSample("状态筛选", `<SelectInput aria-label="状态" defaultValue="all">\n  <option value="all">全部状态</option>\n  <option value="active">正常</option>\n</SelectInput>`)
      ]
    }),
    createHeroComponentDoc({
      id: "textarea-input",
      title: "TextareaInput",
      chineseTitle: "多行输入",
      summary: "用于备注、说明、邮件正文和 Webhook payload 等多行文本。",
      sectionIds: ["form-inputs"],
      usage: [
        "用于需要多行编辑、保留换行或输入较长说明的字段。",
        "当文本会被保存、发送或复制时，应配合 FormField 给出范围、格式或风险说明。"
      ],
      avoid: [
        "不要用 TextareaInput 展示只读长文档；只读内容更适合正文排版或代码块。",
        "不要让用户在一个大文本框里配置复杂结构化数据，能拆成字段就拆成字段。"
      ],
      variants: [
        "支持原生 value、defaultValue、readOnly、disabled 等状态。",
        "高度由内容场景和外层样式控制，设计系统只保证基础可读性和焦点态。"
      ],
      anatomy: [
        "TextareaInput 通常与 FormField 组合，FormField 提供 label、description、message。",
        "在弹层中使用时，需要确认滚动区域不会遮挡底部操作。"
      ],
      accessibility: [
        "多行输入必须明确用途；如果有长度限制或格式要求，放在 description 或 message。",
        "readOnly 与 disabled 语义不同，展示系统生成内容时优先使用 readOnly。"
      ],
      api: [
        createApiField("value / defaultValue", "string", "undefined", "控制文本内容。"),
        createApiField("readOnly", "boolean", "false", "允许聚焦复制但不允许编辑。"),
        createApiField("disabled", "boolean", "false", "完全禁用输入。")
      ],
      codeSamples: [
        createCodeSample("备注字段", `<FormField label="内部备注" description="仅管理员可见">\n  <TextareaInput defaultValue="这个账号主要给 QA 使用。" />\n</FormField>`)
      ]
    }),
    createHeroComponentDoc({
      id: "switch",
      title: "Switch",
      chineseTitle: "开关",
      summary: "表达启用/停用、开启/关闭等即时二元状态。",
      sectionIds: ["selection-controls"],
      usage: [
        "用于通知、功能开关、策略启用状态等二元设置。",
        "当切换结果可以即时保存或清楚表达时，Switch 比 Checkbox 更贴近用户预期。"
      ],
      avoid: [
        "不要用 Switch 承担危险或不可逆操作；这类操作需要按钮和确认弹层。",
        "不要把互斥选项做成多个 Switch，互斥选择应使用 Radio 或 Select。"
      ],
      variants: [
        "支持 checked、defaultChecked、disabled 和 label。",
        "可以放在设置卡片或表单字段中，但应保留明确说明。"
      ],
      anatomy: [
        "Switch 由可点击 control 和 label 组成，状态通过 checked/unchecked 表达。",
        "业务页面不应自行绘制滑块，只传递状态和变更回调。"
      ],
      accessibility: [
        "必须有 label 或 aria-label；状态变化需要让用户知道会影响什么功能。",
        "如果切换需要保存，加载和失败反馈应由相邻 Alert 或 toast 承接。"
      ],
      api: [
        createApiField("checked / defaultChecked", "boolean", "false", "控制开关状态。"),
        createApiField("label", "ReactNode", "undefined", "显示开关说明。"),
        createApiField("disabled", "boolean", "false", "禁用开关。")
      ],
      codeSamples: [
        createCodeSample("通知开关", `<Switch checked label="Telegram 通知" aria-label="Telegram 通知" />`)
      ]
    }),
    createHeroComponentDoc({
      id: "tabs",
      title: "Tabs",
      chineseTitle: "标签页",
      summary: "在同一页面区域内切换平级内容视图。",
      sectionIds: ["navigation-wayfinding"],
      usage: [
        "用于详情页局部视图、设置页分组和文档示例切换。",
        "当多个内容面板平级、用户只需一次看一个面板时，Tabs 能减少页面长度。"
      ],
      avoid: [
        "不要把主导航或跨页面跳转伪装成 Tabs；跨路由应使用导航链接。",
        "不要在标签页里隐藏关键错误或必须完成的操作。"
      ],
      variants: [
        "variant 支持 segmented 和 underline，orientation 支持 horizontal 和 vertical。",
        "activationMode 支持 automatic 和 manual，适配轻量切换和复杂面板。"
      ],
      anatomy: [
        "Tabs root 提供上下文，TabsList 包裹 TabsTrigger，TabsPanel 与 value 一一对应。",
        "结构接近 HeroUI 的 compound component：root/list/trigger/panel 必须保持配对。"
      ],
      accessibility: [
        "TabsList 输出 tablist，Trigger 输出 tab，Panel 输出 tabpanel，并自动关联 controls。",
        "键盘方向键、Home、End 需要保持可用；禁用项不能进入正常焦点流。"
      ],
      api: [
        createApiField("defaultValue / value", "string", "undefined", "控制当前标签值。"),
        createApiField("variant", '"segmented" | "underline"', '"segmented"', "控制视觉样式。"),
        createApiField("activationMode", '"automatic" | "manual"', '"automatic"', "控制聚焦时是否自动切换。")
      ],
      codeSamples: [
        createCodeSample("分段标签", `<Tabs defaultValue="overview">\n  <TabsList aria-label="账号详情">\n    <TabsTrigger value="overview">概览</TabsTrigger>\n    <TabsTrigger value="activity">活动</TabsTrigger>\n  </TabsList>\n  <TabsPanel value="overview">概览内容</TabsPanel>\n</Tabs>`)
      ]
    }),
    createHeroComponentDoc({
      id: "pagination",
      title: "Pagination",
      chineseTitle: "分页",
      summary: "用于长列表结果的页码切换、上一页和下一页导航。",
      sectionIds: ["navigation-wayfinding"],
      usage: [
        "用于账号、消息、审计日志等结果数量较多但仍按页加载的列表。",
        "当列表已经有总量、当前页和 pageSize 时，Pagination 提供统一页码结构。"
      ],
      avoid: [
        "不要在只有一页或无限滚动场景强行显示分页。",
        "不要让分页和筛选状态脱节，筛选变化后应回到第一页或给出明确结果。"
      ],
      variants: [
        "siblings 控制当前页左右可见页码数量。",
        "上一页/下一页会根据边界自动 disabled，中间过长页码折叠为 ellipsis。"
      ],
      anatomy: [
        "Pagination root 输出 nav，内部 list/item/button 组成页码序列。",
        "它只负责页码交互，不负责数据请求；业务层在 onChange 里刷新列表。"
      ],
      accessibility: [
        "组件默认 aria-label 为“分页导航”，当前页使用 aria-current=\"page\"。",
        "键盘支持方向键、Home、End 在页码按钮之间移动。"
      ],
      api: [
        createApiField("page", "number", "required", "当前页。"),
        createApiField("total", "number", "required", "结果总量。"),
        createApiField("pageSize", "number", "required", "每页数量。")
      ],
      codeSamples: [
        createCodeSample("列表分页", `<Pagination page={2} pageSize={20} total={120} onChange={setPage} />`)
      ]
    }),
    createHeroComponentDoc({
      id: "steps",
      title: "Steps",
      chineseTitle: "步骤",
      summary: "展示多阶段流程、配置向导和发布检查进度。",
      sectionIds: ["navigation-wayfinding"],
      usage: [
        "用于多步配置、上线检查、引导流程和需要展示当前阶段的任务。",
        "当流程有明确顺序且用户需要知道已完成/当前/未完成阶段时，Steps 比普通列表更清晰。"
      ],
      avoid: [
        "不要用 Steps 表示无顺序的功能清单。",
        "不要在步骤标题里塞完整说明，长内容应放在 description 或正文区域。"
      ],
      variants: [
        "currentStep 控制当前进度；StepItem 提供 step、title、description。",
        "可以用于页面顶部进度，也可以作为设置页侧栏的流程摘要。"
      ],
      anatomy: [
        "Steps root 管理当前步骤，StepsList 包裹多个 StepItem。",
        "StepItem 的 title 负责扫描，description 负责补充上下文。"
      ],
      accessibility: [
        "当前步骤需要通过文本和视觉共同表达，不能只靠色彩。",
        "如果步骤可点击，必须额外提供按钮或链接语义；静态 Steps 不应假装可操作。"
      ],
      api: [
        createApiField("currentStep", "number", "1", "当前流程步骤。"),
        createApiField("StepItem.step", "number", "required", "步骤序号。"),
        createApiField("StepItem.description", "ReactNode", "undefined", "步骤补充说明。")
      ],
      codeSamples: [
        createCodeSample("发布流程", `<Steps currentStep={2}>\n  <StepsList>\n    <StepItem step={1} title="准备" />\n    <StepItem step={2} title="验证" />\n  </StepsList>\n</Steps>`)
      ]
    }),
    createHeroComponentDoc({
      id: "alert",
      title: "Alert",
      chineseTitle: "提示",
      summary: "用于页内重要消息、风险警告、成功反馈和可关闭提醒。",
      sectionIds: ["feedback-status"],
      usage: [
        "用于需要用户停下来阅读的状态变化，例如保存失败、配额风险、域名即将过期。",
        "当反馈需要标题、正文、动作或关闭按钮时，Alert 比 Badge/Tag 更适合。"
      ],
      avoid: [
        "不要用 Alert 展示每个普通状态，否则真正重要的信息会被稀释。",
        "不要在 Alert 内放复杂表单；需要处理流程时应升级为 Overlay 或独立页面。"
      ],
      variants: [
        "variant 支持 info、success、warning、error；appearance 支持 soft 与 outline。",
        "actions slot 用于放置恢复、查看详情或重试操作。"
      ],
      anatomy: [
        "Alert 包含 icon、title、body、actions、close button。",
        "它应放在相关内容附近，让用户知道提示影响哪块区域。"
      ],
      accessibility: [
        "默认 role 为 alert，非紧急提示可按场景调整 role。",
        "可关闭提示需要明确 dismissLabel，并确保关闭后不会丢失关键状态信息。"
      ],
      api: [
        createApiField("variant", '"info" | "success" | "warning" | "error"', '"info"', "控制提示语义。"),
        createApiField("appearance", '"soft" | "outline"', '"soft"', "控制提示外观强度。"),
        createApiField("actions", "ReactNode", "undefined", "提示内的轻量操作。")
      ],
      codeSamples: [
        createCodeSample("风险提示", `<Alert title="域名即将过期" variant="warning">\n  请在 3 天内完成续费。\n</Alert>`)
      ]
    }),
    createHeroComponentDoc({
      id: "badge",
      title: "Badge",
      chineseTitle: "徽标",
      summary: "展示短状态、计数、运行情况和轻量语义标识。",
      sectionIds: ["feedback-status", "data-display"],
      usage: [
        "用于表格状态列、列表摘要、导航计数和配置状态。",
        "当信息很短且不需要打断用户时，Badge 是比 Alert 更低强度的反馈。"
      ],
      avoid: [
        "不要用 Badge 展示长句或操作按钮。",
        "不要只靠颜色区分状态，文案必须能独立说明含义。"
      ],
      variants: [
        "variant 支持 neutral、brand、info、success、warning、danger。",
        "appearance 支持 soft 和 solid，size 支持 sm 与 md。"
      ],
      anatomy: [
        "Badge 是单一 inline status slot，适合嵌入表格、卡片和工具栏。",
        "它与 Tag 的区别是 Badge 偏状态，Tag 偏分类或标签。"
      ],
      accessibility: [
        "动态状态可使用 statusRole=\"status\" 提供 polite 更新。",
        "不要把 Badge 当成唯一可点击目标；需要操作时组合 Button 或 Link。"
      ],
      api: [
        createApiField("variant", '"neutral" | "brand" | "info" | "success" | "warning" | "danger"', '"neutral"', "语义色。"),
        createApiField("appearance", '"soft" | "solid"', '"soft"', "视觉强度。"),
        createApiField("statusRole", '"none" | "status"', '"none"', "是否作为动态状态播报。")
      ],
      codeSamples: [
        createCodeSample("表格状态", `<Badge variant="success" size="md">启用</Badge>\n<Badge variant="danger" size="md">阻塞</Badge>`)
      ]
    }),
    createHeroComponentDoc({
      id: "tag",
      title: "Tag",
      chineseTitle: "标签",
      summary: "展示分类、筛选条件、能力标记和轻量上下文。",
      sectionIds: ["feedback-status", "data-display"],
      usage: [
        "用于显示分类标签、筛选结果、功能标记和实体属性。",
        "当内容更像“类别”而不是“状态”时，Tag 比 Badge 更合适。"
      ],
      avoid: [
        "不要把 Tag 用作主要按钮；可移除标签需要另外提供明确 close 交互。",
        "不要在同一行堆太多标签，超过可读范围应折叠或汇总。"
      ],
      variants: [
        "支持 dot、icon、shape、size、variant，用于分类和强调。",
        "shape 支持 rounded 与 pill，适配紧凑列表和营销式标记。"
      ],
      anatomy: [
        "Tag 包含 optional dot、optional icon 和 label。",
        "可与 MultiSelect、FilterBar 和 Table 状态列组合。"
      ],
      accessibility: [
        "dot 和 icon 默认装饰，标签文字必须表达完整含义。",
        "如果标签可删除，应使用按钮语义并提供 aria-label。"
      ],
      api: [
        createApiField("variant", '"neutral" | "brand" | "info" | "success" | "warning" | "danger"', '"neutral"', "语义色。"),
        createApiField("dot", "boolean", "false", "是否显示状态点。"),
        createApiField("shape", '"rounded" | "pill"', '"pill"', "控制标签形状。")
      ],
      codeSamples: [
        createCodeSample("分类标签", `<Tag dot variant="brand">新版</Tag>\n<Tag variant="info">合规</Tag>`)
      ]
    }),
    createHeroComponentDoc({
      id: "progress",
      title: "Progress",
      chineseTitle: "进度条",
      summary: "展示同步、导入、扫描、配额使用等进度反馈。",
      sectionIds: ["feedback-status"],
      usage: [
        "用于有明确完成比例的后台任务、批量操作、配额使用和导入流程。",
        "当任务没有明确百分比时，使用 indeterminate 或 Spinner，而不是伪造进度。"
      ],
      avoid: [
        "不要用 Progress 表示普通状态；状态更适合 Badge 或 Alert。",
        "不要只显示进度条不解释任务名称，用户需要知道正在处理什么。"
      ],
      variants: [
        "支持 determinate 和 indeterminate，size 支持 sm/md/lg，variant 支持语义色。",
        "showValueLabel 可显示格式化后的百分比或配额文本。"
      ],
      anatomy: [
        "Progress 包含 track、indicator 和 optional label。",
        "外层负责提供 aria-label 或上下文标题，组件负责 role=progressbar。"
      ],
      accessibility: [
        "确定进度需要 aria-valuenow/min/max；不确定进度不应输出误导性数值。",
        "进度条应配合文本说明，避免用户只看到百分比却不知道任务。"
      ],
      api: [
        createApiField("value", "number", "0", "当前进度值。"),
        createApiField("max", "number", "100", "最大值。"),
        createApiField("indeterminate", "boolean", "false", "是否为不确定进度。")
      ],
      codeSamples: [
        createCodeSample("同步进度", `<Progress aria-label="同步进度" showValueLabel value={68} />`)
      ]
    }),
    createHeroComponentDoc({
      id: "skeleton",
      title: "Skeleton",
      chineseTitle: "骨架屏",
      summary: "在内容加载前保持页面结构和视觉节奏。",
      sectionIds: ["feedback-status", "typography-content"],
      usage: [
        "用于列表、卡片、正文和图表加载前的短暂占位。",
        "当数据预计很快返回且页面结构稳定时，Skeleton 比 Spinner 更能减少布局跳动。"
      ],
      avoid: [
        "不要让 Skeleton 长时间替代错误或空状态；加载失败后应切换到 Alert 或 EmptyState。",
        "不要为未知结构生成复杂骨架，否则用户会误判页面内容。"
      ],
      variants: [
        "shape 支持 rect、text、circle；rounded 支持多档圆角；animated 控制 shimmer。",
        "announce 可把骨架作为 status 播报，默认作为装饰元素隐藏。"
      ],
      anatomy: [
        "Skeleton 是轻量占位 primitive，宽高由 props 或容器控制。",
        "多个 Skeleton 应组合成真实内容的大致轮廓，而不是随机灰条。"
      ],
      accessibility: [
        "默认 aria-hidden，避免屏幕阅读器读到没有意义的占位。",
        "需要播报加载时使用 announce，并给出清晰 label。"
      ],
      api: [
        createApiField("shape", '"rect" | "text" | "circle"', '"rect"', "骨架形状。"),
        createApiField("animated", "boolean", "false", "是否展示加载动画。"),
        createApiField("announce", "boolean", "false", "是否作为加载状态播报。")
      ],
      codeSamples: [
        createCodeSample("卡片骨架", `<Skeleton animated rounded width="100%" height={44} />\n<Skeleton shape="text" width="62%" />`)
      ]
    }),
    createHeroComponentDoc({
      id: "spinner",
      title: "Spinner",
      chineseTitle: "加载指示",
      summary: "展示不确定时长的短暂加载、按钮内部等待和局部刷新。",
      sectionIds: ["feedback-status", "typography-content"],
      usage: [
        "用于按钮加载态、局部刷新或无法估算进度的短任务。",
        "当加载区域没有稳定结构可占位时，Spinner 比 Skeleton 更直接。"
      ],
      avoid: [
        "不要在整页长时间只放 Spinner，应提供说明、超时反馈或重试操作。",
        "不要在已经有明确进度值时使用 Spinner；此时应使用 Progress。"
      ],
      variants: [
        "size 支持 xs、sm、md、lg；tone 支持 default、muted、accent、success、warning、danger。",
        "decorative 可用于按钮内部装饰，showLabel 可展示“加载中”等文本。"
      ],
      anatomy: [
        "Spinner 包含 indicator 和 optional label，外层决定它是在按钮内还是页面局部。",
        "按钮加载态优先使用 Button 的 isLoading，独立区域才直接使用 Spinner。"
      ],
      accessibility: [
        "非装饰 Spinner 输出 role=status 和 aria-live；装饰 Spinner 应设置 decorative。",
        "显示 label 时文案要说明具体任务，例如“同步中”优于泛化“加载中”。"
      ],
      api: [
        createApiField("size", '"xs" | "sm" | "md" | "lg"', '"md"', "加载指示尺寸。"),
        createApiField("decorative", "boolean", "false", "是否隐藏给辅助技术。"),
        createApiField("showLabel", "boolean", "false", "是否展示可见文本。")
      ],
      codeSamples: [
        createCodeSample("局部加载", `<Spinner showLabel size="sm" label="同步中" />`)
      ]
    })
  ],
  "overlays-utilities": [
    createHeroComponentDoc({
      id: "tooltip",
      title: "Tooltip",
      chineseTitle: "提示气泡",
      summary: "为图标按钮、术语和短提示提供 hover/focus 说明。",
      sectionIds: ["overlays-utilities"],
      usage: [
        "用于解释图标按钮、缩写术语、禁用原因和短辅助说明。",
        "当信息不是必须阅读、但能帮助理解当前控件时，Tooltip 是最低打扰的选择。"
      ],
      avoid: [
        "不要把必须阅读的规则、错误或长文档放进 Tooltip。",
        "不要依赖 Tooltip 作为移动端唯一说明，因为悬停触发不稳定。"
      ],
      variants: [
        "支持 defaultOpen/open 受控状态，openDelay 控制 hover 延迟。",
        "TooltipContent 支持 top/bottom side，后续可扩展 placement。"
      ],
      anatomy: [
        "Tooltip root 包裹 TooltipTrigger 和 TooltipContent，通过 portal 渲染浮层。",
        "Trigger 负责 hover、focus、Escape，Content 负责定位、文本和关闭语义。"
      ],
      accessibility: [
        "打开时 Trigger 通过 aria-describedby 关联 Content。",
        "Tooltip 内容应短促直接，最好一行内解释完。"
      ],
      api: [
        createApiField("open / defaultOpen", "boolean", "false", "控制提示层打开状态。"),
        createApiField("openDelay", "number", "120", "鼠标悬停打开延迟。"),
        createApiField("TooltipContent.side", '"top" | "bottom"', '"top"', "浮层优先方向。")
      ],
      codeSamples: [
        createCodeSample("图标提示", `<Tooltip>\n  <TooltipTrigger aria-label="显示说明">?</TooltipTrigger>\n  <TooltipContent>用于解释当前字段。</TooltipContent>\n</Tooltip>`)
      ]
    }),
    createHeroComponentDoc({
      id: "popover",
      title: "Popover",
      chineseTitle: "浮层面板",
      summary: "承接上下文操作、轻量设置和局部说明面板。",
      sectionIds: ["overlays-utilities"],
      usage: [
        "用于更多操作、快捷筛选、用户资料卡和不需要完整 Modal 的上下文面板。",
        "当内容比 Tooltip 更丰富、但仍不应打断主流程时，Popover 是合适的中间层。"
      ],
      avoid: [
        "不要在 Popover 里放长流程表单或危险确认；应升级为 OverlayDialog。",
        "不要在同一个触发器上同时叠 Tooltip 和 Popover，先判断用户需要说明还是操作。"
      ],
      variants: [
        "支持 controlled/open、defaultOpen、onOpenChange。",
        "PopoverContent 支持 align start/center/end 与 side top/bottom。"
      ],
      anatomy: [
        "Popover root 管理状态，PopoverTrigger 打开面板，PopoverContent 通过 portal 定位。",
        "内容区应围绕当前触发器，不要变成第二个页面。"
      ],
      accessibility: [
        "Trigger 使用 aria-haspopup=\"dialog\"、aria-expanded、aria-controls。",
        "Escape 和点击外部会关闭，并把焦点返回触发器。"
      ],
      api: [
        createApiField("open / defaultOpen", "boolean", "false", "控制浮层打开状态。"),
        createApiField("onOpenChange", "(open: boolean) => void", "undefined", "打开状态变化回调。"),
        createApiField("PopoverContent.align", '"start" | "center" | "end"', '"start"', "浮层与触发器的对齐方式。")
      ],
      codeSamples: [
        createCodeSample("快捷面板", `<Popover>\n  <PopoverTrigger>打开快捷面板</PopoverTrigger>\n  <PopoverContent><Text size="md">这里放轻量操作。</Text></PopoverContent>\n</Popover>`)
      ]
    }),
    createHeroComponentDoc({
      id: "scroll-area",
      title: "ScrollArea",
      chineseTitle: "滚动区域",
      summary: "为列表、弹层和预览面板提供稳定滚动容器。",
      sectionIds: ["overlays-utilities", "layout-spacing"],
      usage: [
        "用于抽屉内部长列表、设计系统预览、日志片段和需要局部滚动的容器。",
        "当局部内容可能超过可视区域但不应滚动整页时，应使用 ScrollArea。"
      ],
      avoid: [
        "不要给每个卡片都套 ScrollArea，过多嵌套滚动会让用户迷路。",
        "不要用 ScrollArea 掩盖信息架构问题；内容太多时优先拆分。"
      ],
      variants: [
        "由 ScrollArea、ScrollAreaViewport、ScrollAreaScrollbar、ScrollAreaThumb 组合。",
        "可配合 maxHeight 或容器高度控制滚动范围。"
      ],
      anatomy: [
        "root 提供滚动上下文，viewport 承接内容，scrollbar/thumb 提供视觉滚动条。",
        "它更像 HeroUI ScrollShadow/ScrollArea 的布局辅助，而不是业务组件。"
      ],
      accessibility: [
        "可滚动区域需要 aria-label，特别是在页面里有多个滚动容器时。",
        "不要阻断键盘滚动；内部交互元素应保持自然 Tab 顺序。"
      ],
      api: [
        createApiField("ScrollAreaViewport", "HTMLDivElement props", "required", "承载实际可滚动内容。"),
        createApiField("aria-label", "string", "recommended", "为滚动区域提供可读名称。"),
        createApiField("ScrollAreaThumb", "ReactNode", "optional", "自定义滚动条 thumb。")
      ],
      codeSamples: [
        createCodeSample("局部滚动", `<ScrollArea aria-label="日志预览">\n  <ScrollAreaViewport style={{ maxHeight: 160, overflow: "auto" }}>...</ScrollAreaViewport>\n  <ScrollAreaScrollbar><ScrollAreaThumb /></ScrollAreaScrollbar>\n</ScrollArea>`)
      ]
    })
  ]
};

const heroUiInspiredCodeSamplesById: Record<string, DesignSystemCodeSample[]> = {
  "copy-utility": [
    createCodeSample("复制命令", `<CopyButton value="pnpm test:web">复制测试命令</CopyButton>`),
    createCodeSample("复制链接", `<CopyButton copiedLabel="链接已复制" value="https://wemail.example/docs">\n  复制文档链接\n</CopyButton>`)
  ],
  card: [
    createCodeSample("三段式卡片", `<Card>\n  <CardHeader>域名配额</CardHeader>\n  <CardBody>展示剩余可用量与说明</CardBody>\n  <CardFooter><Button variant="secondary">查看详情</Button></CardFooter>\n</Card>`),
    createCodeSample("状态卡片", `<Card tone="warning" variant="status">\n  <CardBody>3 个账号需要复核。</CardBody>\n</Card>`)
  ],
  "data-display": [
    createCodeSample("表格状态列", `<TableContainer density="compact">\n  <Table>\n    <TableBody>\n      <TableRow><TableCell>ops@wemail.ai</TableCell><TableCell><Badge variant="success">启用</Badge></TableCell></TableRow>\n    </TableBody>\n  </Table>\n</TableContainer>`),
    createCodeSample("摘要组合", `<Avatar name="Ops Team" />\n<KVList items={[{ key: "环境", value: "Prod" }]} />\n<MetricCard title="活跃账号" value="128" />`)
  ],
  "design-tokens": [
    createCodeSample("消费主题变量", `<section style={{ background: "var(--surface-muted)", color: "var(--text)" }}>\n  <Button variant="primary">使用品牌主色</Button>\n</section>`),
    createCodeSample("表面层级", `<Card style={{ borderRadius: "var(--radius-card)", boxShadow: "var(--shadow-card)" }}>\n  统一 surface / radius / shadow token\n</Card>`)
  ],
  feedback: [
    createCodeSample("状态反馈组合", `<Alert title="请先核对旧页面视觉回归" variant="warning">\n  design token 已切到共享入口。\n</Alert>\n<Badge variant="success">启用</Badge>\n<Progress aria-label="同步进度" value={68} />`),
    createCodeSample("加载反馈", `<Spinner showLabel size="sm" label="同步中" />\n<Skeleton animated rounded width="100%" />`)
  ],
  "multi-select": [
    createCodeSample("标签筛选", `<MultiSelect\n  aria-label="标签筛选"\n  defaultValue={["exceptions"]}\n  options={[{ label: "异常账号", value: "exceptions" }]}\n/>`)
  ],
  navigation: [
    createCodeSample("路径与标签页", `<Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbLink href="/accounts">账号</BreadcrumbLink></BreadcrumbItem></BreadcrumbList></Breadcrumb>\n<Tabs defaultValue="overview"><TabsList><TabsTrigger value="overview">概览</TabsTrigger></TabsList></Tabs>`),
    createCodeSample("分页与步骤", `<Pagination page={2} pageSize={20} total={120} />\n<Steps currentStep={2}><StepsList><StepItem step={1} title="准备" /></StepsList></Steps>`)
  ],
  overlay: [
    createCodeSample("对话框", `<OverlayDialog title="确认操作" onClose={handleClose} closeOnBackdrop>\n  <Text size="md">请确认本次变更。</Text>\n</OverlayDialog>`),
    createCodeSample("抽屉", `<OverlayDrawer title="账号详情" width="lg" onClose={handleClose}>\n  <KVList items={items} />\n</OverlayDrawer>`)
  ],
  "page-layout": [
    createCodeSample("页面骨架", `<Page>\n  <PageHeader title="账号列表" description="统一页面头部与操作区节奏。" />\n  <PageToolbar>筛选和批量操作</PageToolbar>\n  <PageBody hasSidebar><PageMain>主内容</PageMain><PageSidebar>摘要</PageSidebar></PageBody>\n</Page>`)
  ],
  "search-input": [
    createCodeSample("搜索字段", `<FormField label="搜索账号" description="支持邮箱、域名或创建人">\n  <SearchInput aria-label="搜索账号" placeholder="搜索账号、域名或创建人" />\n</FormField>`)
  ],
  "selection-controls": [
    createCodeSample("选择控件组", `<Switch aria-label="通知开关" checked label="通知开关" />\n<Checkbox defaultChecked label="仅看异常" />\n<Radio defaultChecked label="按域名汇总" name="summary" />`)
  ],
  "tooltip-popover": [
    createCodeSample("提示与浮层", `<Tooltip><TooltipTrigger aria-label="显示提示">?</TooltipTrigger><TooltipContent>简短解释。</TooltipContent></Tooltip>\n<Popover><PopoverTrigger>打开快捷面板</PopoverTrigger><PopoverContent>轻量操作</PopoverContent></Popover>`)
  ],
  typography: [
    createCodeSample("排版层级", `<Heading as="h1" size="display-md">Design token preview</Heading>\n<Text size="lg">统一正文节奏。</Text>\n<Muted size="caption">辅助说明</Muted>`),
    createCodeSample("代码与快捷键", `<Code>--brand-500</Code>\n<Kbd keys={["Shift", "K"]} />`)
  ]
};

export const designSystemGroups: DesignSystemGroupDoc[] = baseDesignSystemGroups.map((group) => ({
  ...group,
  overviewDescription:
    group.id === "foundations"
      ? `${group.overviewDescription} 页面结构参考 HeroUI React Components 的组件索引与详情页顺序，先看组件、再看 API、最后看真实预览。`
      : group.overviewDescription,
  components: [...group.components, ...(heroUiInspiredComponentAdditions[group.id] ?? [])].map((component) => ({
    ...component,
    codeSamples: component.codeSamples?.length ? component.codeSamples : heroUiInspiredCodeSamplesById[component.id]
  }))
}));
