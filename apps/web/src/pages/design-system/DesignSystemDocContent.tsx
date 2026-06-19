import type { DesignSystemApiField, DesignSystemCodeSample, DesignSystemComponentDoc, DesignSystemDocSection } from "./designSystemContent";
import { DesignSystemComponentShowcase } from "./DesignSystemComponentShowcase";
import { designSystemDocStyles, designSystemSharedStyles } from "./designSystemStyles";

interface DesignSystemDocContentProps {
  componentDoc: DesignSystemComponentDoc;
  groupTitle: string;
  sectionTitles: string[];
}

const COMPONENT_SECTION_ORDER = ["Import", "Usage", "Variants", "Anatomy", "Accessibility", "API Reference"] as const;

type ComponentSectionTitle = (typeof COMPONENT_SECTION_ORDER)[number];

function renderParagraphs(paragraphs: string[]) {
  return (
    <div style={designSystemDocStyles.paragraphGroup}>
      {paragraphs.map((paragraph) => (
        <p className="section-copy" key={paragraph} style={{ margin: 0 }}>
          {paragraph}
        </p>
      ))}
    </div>
  );
}

function getSectionBodyMap(docSections?: DesignSystemDocSection[]): Map<string, string[]> {
  return new Map((docSections ?? []).map((section) => [section.title, section.body]));
}

function normalizeImportName(componentTitle: string) {
  return componentTitle
    .replace(/&/g, " ")
    .replace(/utility/gi, "")
    .split(/\s+/)
    .map((part) => part.replace(/[^a-zA-Z0-9]/g, ""))
    .filter(Boolean)
    .join(", ");
}

function resolveImportLines(componentDoc: DesignSystemComponentDoc) {
  const linesById: Record<string, string[]> = {
    "copy-utility": ['import { CopyButton } from "../shared/copy-button";'],
    chart: ['import { createNivoTheme } from "../shared/chart";'],
    "data-display": [
      'import { Avatar } from "../shared/avatar";',
      'import { KVList } from "../shared/kv-list";',
      'import { MetricCard } from "../shared/metric-card";',
      'import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeaderCell, TableRow } from "../shared/table";'
    ],
    "design-tokens": ['import "../shared/styles/index.css";'],
    divider: ['import { Divider } from "../shared/divider";'],
    "filter-bar": ['import { FilterBar } from "../shared/filter-bar";'],
    "form-field": ['import { FormField } from "../shared/form";'],
    feedback: [
      'import { Alert } from "../shared/alert";',
      'import { Badge } from "../shared/badge";',
      'import { Progress } from "../shared/progress";',
      'import { Skeleton } from "../shared/skeleton";',
      'import { Spinner } from "../shared/spinner";',
      'import { Tag } from "../shared/tag";'
    ],
    icon: ['import { Icon } from "../shared/icon";'],
    "kv-list": ['import { KVList } from "../shared/kv-list";'],
    "metric-card": ['import { MetricCard } from "../shared/metric-card";'],
    "multi-select": ['import { MultiSelect } from "../shared/form";'],
    navigation: [
      'import { Breadcrumb, BreadcrumbCurrent, BreadcrumbItem, BreadcrumbLink, BreadcrumbList } from "../shared/breadcrumb";',
      'import { Pagination } from "../shared/pagination";',
      'import { StepItem, Steps, StepsList } from "../shared/steps";',
      'import { Tabs, TabsList, TabsPanel, TabsTrigger } from "../shared/tabs";'
    ],
    overlay: ['import { OverlayDialog, OverlayDrawer } from "../shared/overlay";'],
    "page-layout": ['import { Page, PageBody, PageHeader, PageMain, PageSidebar, PageToolbar } from "../shared/page-layout";'],
    "scroll-area": ['import { ScrollArea, ScrollAreaScrollbar, ScrollAreaThumb, ScrollAreaViewport } from "../shared/scroll-area";'],
    "search-input": ['import { SearchInput } from "../shared/form";'],
    "select-input": ['import { SelectInput } from "../shared/form";'],
    "selection-controls": [
      'import { Checkbox, Radio } from "../shared/form";',
      'import { Switch } from "../shared/switch";'
    ],
    "textarea-input": ['import { TextareaInput } from "../shared/form";'],
    toast: ['import { toast } from "../shared/toast";', 'import { WemailToastViewport } from "../shared/WemailToastViewport";'],
    "tooltip-popover": [
      'import { Popover, PopoverContent, PopoverTrigger } from "../shared/popover";',
      'import { Tooltip, TooltipContent, TooltipTrigger } from "../shared/tooltip";'
    ],
    typography: ['import { Code, Heading, Kbd, Label, Muted, Text } from "../shared/typography";']
  };

  if (linesById[componentDoc.id]) return linesById[componentDoc.id];

  const importName = normalizeImportName(componentDoc.title) || componentDoc.title;
  const importSource = componentDoc.id;

  return [`import { ${importName} } from "../shared/${importSource}";`];
}

function renderImportSample(componentDoc: DesignSystemComponentDoc) {
  const importLines = resolveImportLines(componentDoc);

  return (
    <article style={designSystemDocStyles.codeSampleCard}>
      <p className="section-copy" style={{ margin: 0 }}>
        当前组件示例已放在页面顶部；Import 区只说明业务代码应该从哪个 shared primitive 入口导入，避免页面局部复制实现。
      </p>
      <pre style={designSystemDocStyles.codeSamplePre}>
        <code>{importLines.join("\n")}</code>
      </pre>
    </article>
  );
}

function renderCodeSamples(codeSamples: DesignSystemCodeSample[]) {
  return (
    <div style={designSystemDocStyles.codeSampleList}>
      {codeSamples.map((sample) => (
        <article key={sample.title} style={designSystemDocStyles.codeSampleCard}>
          <h3 style={designSystemDocStyles.codeSampleHeading}>{sample.title}</h3>
          <pre style={designSystemDocStyles.codeSamplePre}>
            <code>{sample.code}</code>
          </pre>
        </article>
      ))}
    </div>
  );
}

function renderApiTable(apiFields: DesignSystemApiField[]) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left" scope="col">prop</th>
            <th align="left" scope="col">type</th>
            <th align="left" scope="col">default</th>
            <th align="left" scope="col">description</th>
          </tr>
        </thead>
        <tbody>
          {apiFields.map((field) => (
            <tr key={field.prop}>
              <td>{field.prop}</td>
              <td>
                <code>{field.type}</code>
              </td>
              <td>
                <code>{field.defaultValue}</code>
              </td>
              <td>{field.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderExampleShowcase(componentDoc: DesignSystemComponentDoc) {
  const body = componentDoc.codeSamples?.length
    ? ["下方代码只作为调用参考；组件展示区域只渲染当前组件自己的真实 UI，不混入同一分区的其它组件预览。"]
    : ["当前组件还没有代码示例；新增组件能力前需要先补齐示例。"];

  return (
    <section
      aria-label="文档章节：Examples"
      style={{
        ...designSystemDocStyles.section,
        ...designSystemDocStyles.exampleNote
      }}
    >
      <h2 style={designSystemDocStyles.sectionHeading}>Examples</h2>
      <DesignSystemComponentShowcase componentId={componentDoc.id} />
      {renderParagraphs(body)}
      {componentDoc.codeSamples?.length ? (
        <div aria-label={`代码示例：${componentDoc.title}`} role="region">
          {renderCodeSamples(componentDoc.codeSamples)}
        </div>
      ) : null}
    </section>
  );
}

function getComponentSections(componentDoc: DesignSystemComponentDoc, sectionTitles: string[]): Array<{ title: ComponentSectionTitle; body: string[] }> {
  const sectionBodyMap = getSectionBodyMap(componentDoc.docSections);
  const usageBody = sectionBodyMap.get("适用场景") ?? [];
  const variantBody = [
    ...(sectionBodyMap.get("状态与变体") ?? []),
    ...(sectionTitles.length ? [`关联预览分区：${sectionTitles.join("、")}。`] : [])
  ];
  const anatomyBody = [
    ...(sectionBodyMap.get("交互示例") ?? []),
    "Anatomy 说明组件应如何由 root、trigger、content、header、body、footer 或 status slot 组合，接近 HeroUI compound component 的阅读方式。",
    "如果该组件当前不是 compound API，也要在这里说明它与相邻 primitives 的组合边界，避免业务页面重复创造壳层。"
  ];
  const accessibilityBody = [
    ...(sectionBodyMap.get("设计规范") ?? []),
    "交互控件必须提供可感知名称、键盘焦点与禁用/加载语义；纯展示组件应避免抢占不必要的 aria role。",
    "状态色只作为辅助线索，关键反馈需要保留文本、role 或 aria-live，让 light / dark 主题和辅助技术都能理解。"
  ];

  const fallbackByTitle: Record<ComponentSectionTitle, string[]> = {
    Import: ["使用 shared primitive 导入组件，不从业务页面复制样式或临时实现。"],
    Usage: usageBody.length ? usageBody : ["先从最小可运行用法开始，再组合业务数据、状态和操作。"],
    Variants: variantBody.length ? variantBody : ["变体应表达语义、尺寸、状态或密度，而不是只描述颜色。"],
    Anatomy: anatomyBody,
    Accessibility: accessibilityBody,
    "API Reference": [
      componentDoc.api?.length ? "下表记录当前设计系统暴露给业务页面的稳定 props。" : "当前组件还没有结构化 API，新增用法前需要先补齐 props 表。",
      ...(sectionBodyMap.get("不适用场景") ?? [])
    ]
  };

  return COMPONENT_SECTION_ORDER.map((title) => ({
    title,
    body: fallbackByTitle[title]
  }));
}

export function DesignSystemDocContent({ componentDoc, groupTitle, sectionTitles }: DesignSystemDocContentProps) {
  const sections = getComponentSections(componentDoc, sectionTitles);
  const sectionScope = sectionTitles.length ? sectionTitles.join("、") : "当前组件分区";
  const introCards = [
    {
      title: "什么时候用",
      body: `${componentDoc.chineseTitle}用于${sectionScope}中的标准化场景，优先复用 shared primitive，减少业务页面自行拼装。`
    },
    {
      title: "什么时候不用",
      body: "当需求只是一次性视觉修饰，或组件职责无法清楚对应到语义、状态、导航、输入、反馈之一时，先不要扩展它。"
    },
    {
      title: "维护重点",
      body: "新增变体、API 或组合模式时，需要同步更新顶部 Examples、Import 和 API Reference。"
    }
  ];

  return (
    <section className="panel workspace-card page-panel design-system-panel" style={{ ...designSystemDocStyles.shell, ...designSystemSharedStyles.stack }}>
      <header style={designSystemDocStyles.header}>
        <p className="panel-kicker">{groupTitle} / Component</p>
        <h1 style={{ margin: 0 }}>{componentDoc.title}</h1>
        <strong style={{ color: "var(--text, #111827)" }}>{componentDoc.chineseTitle}</strong>
        <p className="section-copy" style={{ margin: 0, maxWidth: "760px" }}>
          {componentDoc.summary}
        </p>
        <div style={designSystemSharedStyles.chipRow}>
          {sectionTitles.map((sectionTitle) => (
            <span key={sectionTitle} style={designSystemSharedStyles.chip}>
              {sectionTitle}
            </span>
          ))}
        </div>
      </header>
      {renderExampleShowcase(componentDoc)}
      <div style={designSystemDocStyles.introGrid}>
        {introCards.map((card) => (
          <article key={card.title} style={designSystemDocStyles.introCard}>
            <h2 style={designSystemDocStyles.introHeading}>{card.title}</h2>
            <p className="section-copy" style={{ margin: 0 }}>
              {card.body}
            </p>
          </article>
        ))}
      </div>
      <div style={designSystemDocStyles.sectionList}>
        {sections.map((section) => {
          const isGuidanceSection = section.title === "API Reference" || section.title === "Accessibility";

          return (
            <section
              aria-label={`文档章节：${section.title}`}
              key={section.title}
              style={{
                ...designSystemDocStyles.section,
                ...(isGuidanceSection ? designSystemDocStyles.guidanceNote : null)
              }}
            >
              <h2 style={designSystemDocStyles.sectionHeading}>{section.title}</h2>
              {section.title === "Import" ? renderImportSample(componentDoc) : null}
              {section.title === "API Reference" && componentDoc.api?.length ? renderApiTable(componentDoc.api) : null}
              {section.title !== "Import" && section.title !== "API Reference" ? renderParagraphs(section.body) : null}
            </section>
          );
        })}
      </div>
    </section>
  );
}
