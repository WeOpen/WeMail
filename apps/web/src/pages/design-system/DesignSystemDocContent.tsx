import type { DesignSystemApiField, DesignSystemCodeSample, DesignSystemComponentDoc, DesignSystemDocSection } from "./designSystemContent";
import { designSystemDocStyles, designSystemSharedStyles } from "./designSystemStyles";

interface DesignSystemDocContentProps {
  componentDoc: DesignSystemComponentDoc;
  groupTitle: string;
  sectionTitles: string[];
}

const COMPONENT_SECTION_ORDER = ["Import", "Usage", "Variants", "Anatomy", "Accessibility", "API Reference", "Examples"] as const;

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
    "data-display": [
      'import { Avatar } from "../shared/avatar";',
      'import { KVList } from "../shared/kv-list";',
      'import { MetricCard } from "../shared/metric-card";',
      'import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeaderCell, TableRow } from "../shared/table";'
    ],
    "design-tokens": ['import "../shared/styles/index.css";'],
    "form-field": ['import { FormField } from "../shared/form";'],
    feedback: [
      'import { Alert } from "../shared/alert";',
      'import { Badge } from "../shared/badge";',
      'import { Progress } from "../shared/progress";',
      'import { Skeleton } from "../shared/skeleton";',
      'import { Spinner } from "../shared/spinner";',
      'import { Tag } from "../shared/tag";'
    ],
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
        HeroUI 的组件文档通常先给出 import，再进入 usage、variants、anatomy、accessibility 与 API。WeMail 这页沿用同样阅读顺序，但导入来源指向本项目 shared primitives。
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

function getComponentSections(componentDoc: DesignSystemComponentDoc, sectionTitles: string[]): Array<{ title: ComponentSectionTitle; body: string[] }> {
  const sectionBodyMap = getSectionBodyMap(componentDoc.docSections);
  const usageBody = [componentDoc.summary, ...(sectionBodyMap.get("适用场景") ?? [])];
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
    ],
    Examples: componentDoc.codeSamples?.length
      ? ["以下示例优先展示最常用调用方式，后续真实预览会在下方 live preview 分区校验。"]
      : ["该组件目前依赖下方 live preview 展示真实组合；新增复杂用法时应同步补充代码示例。"]
  };

  return COMPONENT_SECTION_ORDER.map((title) => ({
    title,
    body: fallbackByTitle[title]
  }));
}

export function DesignSystemDocContent({ componentDoc, groupTitle, sectionTitles }: DesignSystemDocContentProps) {
  const sections = getComponentSections(componentDoc, sectionTitles);

  return (
    <section className="panel workspace-card page-panel design-system-panel" style={{ ...designSystemDocStyles.shell, ...designSystemSharedStyles.stack }}>
      <header style={designSystemDocStyles.header}>
        <p className="panel-kicker">{groupTitle} / Component</p>
        <h1 style={{ margin: 0 }}>{componentDoc.title}</h1>
        <strong style={{ color: "var(--text, #111827)" }}>{componentDoc.chineseTitle}</strong>
        <div style={designSystemSharedStyles.chipRow}>
          {sectionTitles.map((sectionTitle) => (
            <span key={sectionTitle} style={designSystemSharedStyles.chip}>
              {sectionTitle}
            </span>
          ))}
        </div>
      </header>
      <div style={designSystemDocStyles.sectionList}>
        {sections.map((section) => {
          const isExampleSection = section.title === "Examples";
          const isGuidanceSection = section.title === "API Reference" || section.title === "Accessibility";

          return (
            <section
              aria-label={`文档章节：${section.title}`}
              key={section.title}
              style={{
                ...designSystemDocStyles.section,
                ...(isExampleSection ? designSystemDocStyles.exampleNote : null),
                ...(isGuidanceSection ? designSystemDocStyles.guidanceNote : null)
              }}
            >
              <h2 style={designSystemDocStyles.sectionHeading}>{section.title}</h2>
              {section.title === "Import" ? renderImportSample(componentDoc) : null}
              {section.title === "API Reference" && componentDoc.api?.length ? renderApiTable(componentDoc.api) : null}
              {section.title === "Examples" && componentDoc.codeSamples?.length ? (
                <div aria-label={`代码示例：${componentDoc.title}`} role="region">
                  {renderCodeSamples(componentDoc.codeSamples)}
                </div>
              ) : null}
              {section.title !== "Import" && section.title !== "API Reference" && !(section.title === "Examples" && componentDoc.codeSamples?.length)
                ? renderParagraphs(section.body)
                : null}
            </section>
          );
        })}
      </div>
    </section>
  );
}
