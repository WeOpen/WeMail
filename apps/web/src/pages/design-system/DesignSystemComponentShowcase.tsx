import {
  CircleAlert,
  Copy,
  Inbox,
  Mail,
  Save,
  Search,
  ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";

import { Alert } from "../../shared/alert";
import { Avatar } from "../../shared/avatar";
import { Badge } from "../../shared/badge";
import { Breadcrumb, BreadcrumbCurrent, BreadcrumbItem, BreadcrumbLink, BreadcrumbList } from "../../shared/breadcrumb";
import { Button } from "../../shared/button";
import { Card, CardBody, CardFooter, CardHeader } from "../../shared/card";
import { CopyButton } from "../../shared/copy-button";
import { Divider } from "../../shared/divider";
import { EmptyState } from "../../shared/empty-state";
import { Checkbox, FormField, MultiSelect, Radio, SearchInput, SelectInput, TextareaInput } from "../../shared/form";
import { Icon } from "../../shared/icon";
import { KVList } from "../../shared/kv-list";
import { MetricCard } from "../../shared/metric-card";
import { Page, PageBody, PageHeader, PageMain, PageSidebar, PageToolbar } from "../../shared/page-layout";
import { Pagination } from "../../shared/pagination";
import { Popover, PopoverContent, PopoverTrigger } from "../../shared/popover";
import { Progress } from "../../shared/progress";
import { ScrollArea, ScrollAreaScrollbar, ScrollAreaThumb, ScrollAreaViewport } from "../../shared/scroll-area";
import { Skeleton } from "../../shared/skeleton";
import { Spinner } from "../../shared/spinner";
import { StepItem, Steps, StepsList } from "../../shared/steps";
import { Switch } from "../../shared/switch";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeaderCell, TableRow } from "../../shared/table";
import { Tabs, TabsList, TabsPanel, TabsTrigger } from "../../shared/tabs";
import { Tag } from "../../shared/tag";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../shared/tooltip";
import { Code, Heading, Kbd, Muted, Text } from "../../shared/typography";
import { FilterBar, FilterBarActions, FilterBarSummary } from "../../shared/filter-bar";
import { Swatch, TokenRow } from "./designSystemPreviewParts";
import { designSystemExampleStyles, designSystemSharedStyles } from "./designSystemStyles";

type DesignSystemComponentShowcaseProps = {
  componentId: string;
};

const demoMultiSelectOptions = [
  { label: "异常账号", value: "exceptions" },
  { label: "近 7 天活跃", value: "7d" },
  { label: "管理员创建", value: "admin" }
];

function ShowcaseFrame({ children }: { children: ReactNode }) {
  return (
    <div aria-label="组件展示" role="region" style={designSystemExampleStyles.previewPane}>
      {children}
    </div>
  );
}

function PreviewCard({ children }: { children: ReactNode }) {
  return <div style={designSystemSharedStyles.previewCard}>{children}</div>;
}

function MiniChart() {
  return (
    <PreviewCard>
      <div style={{ alignItems: "end", display: "grid", gap: "8px", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", minHeight: "132px" }}>
        {[42, 78, 56, 92, 64, 84].map((height, index) => (
          <span
            aria-hidden="true"
            key={height}
            style={{
              background: index === 3 ? "var(--brand-500, #ff7a00)" : "var(--brand-soft-300, rgba(255, 122, 0, 0.28))",
              borderRadius: "8px 8px 4px 4px",
              height: `${height}px`
            }}
          />
        ))}
      </div>
      <Text size="caption" tone="muted">Nivo 主题色板、tooltip 和轴线密度统一由 shared chart theme 控制。</Text>
    </PreviewCard>
  );
}

export function DesignSystemComponentShowcase({ componentId }: DesignSystemComponentShowcaseProps) {
  const showcaseById: Record<string, ReactNode> = {
    alert: (
      <Alert actions={<Button size="xs" variant="secondary">查看任务</Button>} title="域名即将过期" variant="warning">
        请在 3 天内完成续费，避免生产路由中断。
      </Alert>
    ),
    avatar: (
      <div style={designSystemSharedStyles.chipRow}>
        <Avatar name="Will Xue" size="xl" />
        <Avatar fallback="QA" shape="square" size="lg" />
        <Avatar name="Ops Team" size="md" />
        <Avatar name="Bot" size="sm" />
      </div>
    ),
    badge: (
      <div style={designSystemSharedStyles.chipRow}>
        <Badge size="md" variant="success">启用</Badge>
        <Badge size="md" variant="warning">待处理</Badge>
        <Badge appearance="solid" size="md" variant="brand">12</Badge>
        <Badge size="md" variant="danger">阻塞</Badge>
      </div>
    ),
    button: (
      <div style={designSystemSharedStyles.chipRow}>
        <Button leadingIcon={<Save aria-hidden="true" size={16} />} variant="primary">保存变更</Button>
        <Button variant="secondary">查看历史</Button>
        <Button variant="ghost">取消</Button>
        <Button variant="danger">停用账号</Button>
        <Button aria-label="搜索" iconOnly variant="icon"><Search aria-hidden="true" size={18} /></Button>
      </div>
    ),
    card: (
      <div style={designSystemExampleStyles.twoColumnGrid}>
        <Card>
          <CardHeader><strong>域名配额</strong></CardHeader>
          <CardBody><Text size="md">本月还可创建 18 个临时邮箱。</Text></CardBody>
          <CardFooter><Button size="sm" variant="secondary">查看详情</Button></CardFooter>
        </Card>
        <Card tone="warning" variant="status">
          <CardBody>3 个账号需要复核。</CardBody>
        </Card>
      </div>
    ),
    chart: <MiniChart />,
    "copy-utility": (
      <div style={designSystemSharedStyles.chipRow}>
        <CopyButton value="pnpm test:web">复制测试命令</CopyButton>
        <CopyButton copiedLabel="链接已复制" value="https://wemail.example/docs">复制文档链接</CopyButton>
      </div>
    ),
    "data-display": (
      <div style={designSystemExampleStyles.twoColumnGrid}>
        <MetricCard kicker="KPI" title="活跃账号" value="128" caption="+8.4%" tone="hero" />
        <KVList items={[{ key: "环境", value: "Prod" }, { key: "区域", value: "APAC" }, { key: "健康度", value: "98.6%" }]} />
      </div>
    ),
    "design-tokens": (
      <div style={designSystemExampleStyles.previewGrid}>
        <div style={designSystemExampleStyles.twoColumnGrid}>
          <Swatch name="Brand / 500" hex="#ff7a00" varName="--brand-500" />
          <Swatch name="Success" hex="#22c55e" varName="--success-500" />
        </div>
        <TokenRow hint="页面和组件示例背景" label="Surface muted" value={<code>--surface-muted</code>} />
      </div>
    ),
    divider: (
      <PreviewCard>
        <Text size="md">通知设置</Text>
        <Divider />
        <Text size="md">Webhook 路由</Text>
        <Divider dashed />
        <Text size="md">Telegram 绑定</Text>
      </PreviewCard>
    ),
    "empty-state": (
      <EmptyState
        actions={<Button variant="primary">新建筛选</Button>}
        description="调整状态、创建人或时间范围后会在这里刷新。"
        icon={<Icon decorative icon={Inbox} size="lg" />}
        title="暂无账号结果"
      />
    ),
    feedback: (
      <div style={designSystemExampleStyles.previewGrid}>
        <Alert title="同步完成" variant="info">新策略已经应用到 18 个账号。</Alert>
        <div style={designSystemSharedStyles.chipRow}>
          <Badge size="md" variant="success">启用</Badge>
          <Tag dot size="md" variant="brand">新版</Tag>
          <Spinner showLabel size="sm" label="同步中" />
        </div>
      </div>
    ),
    "filter-bar": (
      <PreviewCard>
        <FilterBar columns={3}>
          <FormField label={<span className="sr-only">搜索账号</span>}>
            <SearchInput aria-label="搜索账号" placeholder="搜索账号或创建人" />
          </FormField>
          <FormField label={<span className="sr-only">状态</span>}>
            <SelectInput aria-label="状态" defaultValue="all"><option value="all">全部状态</option></SelectInput>
          </FormField>
          <FormField label={<span className="sr-only">标签</span>}>
            <MultiSelect aria-label="标签" options={demoMultiSelectOptions} defaultValue={["exceptions"]} />
          </FormField>
        </FilterBar>
        <FilterBarSummary>共 128 条结果</FilterBarSummary>
        <FilterBarActions><Button size="sm" variant="secondary">重置</Button></FilterBarActions>
      </PreviewCard>
    ),
    "form-field": (
      <FormField description="支持邮箱、域名或创建人" label="搜索账号" message="当前筛选会实时刷新列表">
        <SearchInput aria-label="搜索账号" placeholder="搜索账号" />
      </FormField>
    ),
    icon: (
      <div style={designSystemSharedStyles.chipRow}>
        <Icon decorative icon={Mail} size="lg" tone="accent" />
        <Icon decorative icon={ShieldCheck} size="lg" tone="success" />
        <Icon decorative icon={CircleAlert} size="lg" tone="warning" />
        <Button aria-label="复制" iconOnly variant="icon"><Icon decorative icon={Copy} /></Button>
      </div>
    ),
    "kv-list": (
      <KVList items={[
        { key: "环境", value: "Production" },
        { key: "API 前缀", value: "wm_live", action: <CopyButton value="wm_live">复制</CopyButton> },
        { key: "区域", value: "APAC", hint: "默认" }
      ]} />
    ),
    "metric-card": (
      <div style={designSystemExampleStyles.twoColumnGrid}>
        <MetricCard kicker="KPI" title="今日 API 调用" value="12,480" detail="20,000 daily limit" caption="剩余 37.6%" tone="hero" />
        <MetricCard title="活跃账号" value="128" caption="+8.4%" valueSize="lg" />
      </div>
    ),
    "multi-select": (
      <FormField label="标签筛选">
        <MultiSelect aria-label="标签筛选" defaultValue={["exceptions", "7d"]} options={demoMultiSelectOptions} />
      </FormField>
    ),
    navigation: (
      <div style={designSystemExampleStyles.previewGrid}>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink href="/accounts">账号</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbItem><BreadcrumbCurrent>详情</BreadcrumbCurrent></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Tabs defaultValue="overview"><TabsList><TabsTrigger value="overview">概览</TabsTrigger><TabsTrigger value="activity">活动</TabsTrigger></TabsList><TabsPanel value="overview">概览内容</TabsPanel></Tabs>
      </div>
    ),
    overlay: (
      <PreviewCard>
        <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "16px", display: "grid", gap: "12px", padding: "16px" }}>
          <strong>确认操作</strong>
          <Text size="md">弹层统一承接标题、正文、关闭入口和底部操作。</Text>
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <Button size="sm" variant="secondary">取消</Button>
            <Button size="sm" variant="primary">确认</Button>
          </div>
        </div>
      </PreviewCard>
    ),
    "page-layout": (
      <Page as="div">
        <PageHeader actions={<Button size="sm" variant="secondary">导出</Button>} description="统一页面头部与操作区节奏。" kicker="账号中心" title="账号列表" />
        <PageToolbar><Button size="sm" variant="ghost">仅看异常</Button></PageToolbar>
        <PageBody hasSidebar>
          <PageMain><Card padding="sm"><Text>主内容区</Text></Card></PageMain>
          <PageSidebar><Card padding="sm"><Text>侧栏摘要</Text></Card></PageSidebar>
        </PageBody>
      </Page>
    ),
    pagination: <Pagination page={3} pageSize={20} total={128} />,
    popover: (
      <Popover>
        <PopoverTrigger>打开快捷面板</PopoverTrigger>
        <PopoverContent><KVList items={[{ key: "创建人", value: "Will" }, { key: "角色", value: "Admin" }]} /></PopoverContent>
      </Popover>
    ),
    progress: <Progress aria-label="API 配额使用量" max={20000} showValueLabel value={12480} />,
    "scroll-area": (
      <ScrollArea aria-label="投递日志">
        <ScrollAreaViewport style={{ maxHeight: 180, overflow: "auto" }}>
          {Array.from({ length: 8 }, (_, index) => (
            <Text key={index} size="caption">{`2026-06-16 21:${index}0 webhook delivery ${index + 1}`}</Text>
          ))}
        </ScrollAreaViewport>
        <ScrollAreaScrollbar><ScrollAreaThumb /></ScrollAreaScrollbar>
      </ScrollArea>
    ),
    "search-input": <SearchInput aria-label="搜索邮件" placeholder="搜索发件人、主题或验证码" defaultValue="verification" />,
    "select-input": (
      <FormField label="邮箱域名">
        <SelectInput aria-label="邮箱域名" defaultValue="wemail.dev"><option value="wemail.dev">wemail.dev</option><option value="example.com">example.com</option></SelectInput>
      </FormField>
    ),
    "selection-controls": (
      <div style={designSystemExampleStyles.previewGrid}>
        <Switch checked label="Telegram 通知" aria-label="Telegram 通知" />
        <Checkbox defaultChecked label="仅看异常" />
        <Radio defaultChecked label="按域名汇总" name="summary" />
      </div>
    ),
    skeleton: (
      <PreviewCard>
        <Skeleton shape="circle" width={40} height={40} animated />
        <Skeleton shape="text" width="62%" animated />
        <Skeleton shape="text" width="84%" animated />
      </PreviewCard>
    ),
    spinner: <Spinner showLabel size="md" label="同步中" />,
    steps: (
      <Steps currentStep={2}>
        <StepsList>
          <StepItem step={1} title="准备" description="版本和迁移已确认" />
          <StepItem step={2} title="验证" description="测试和构建完成" />
          <StepItem step={3} title="发布" description="等待上线窗口" />
        </StepsList>
      </Steps>
    ),
    switch: <Switch checked label="生产环境通知" aria-label="生产环境通知" />,
    table: (
      <TableContainer density="compact">
        <Table>
          <TableHead><TableRow><TableHeaderCell>地址</TableHeaderCell><TableHeaderCell>状态</TableHeaderCell></TableRow></TableHead>
          <TableBody>
            <TableRow isInteractive><TableCell>ops@wemail.ai</TableCell><TableCell><Badge variant="success">启用</Badge></TableCell></TableRow>
            <TableRow><TableCell>qa@wemail.ai</TableCell><TableCell><Badge variant="warning">待复核</Badge></TableCell></TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    ),
    tabs: (
      <Tabs defaultValue="overview">
        <TabsList><TabsTrigger value="overview">概览</TabsTrigger><TabsTrigger value="activity">活动</TabsTrigger></TabsList>
        <TabsPanel value="overview">概览内容</TabsPanel>
        <TabsPanel value="activity">活动内容</TabsPanel>
      </Tabs>
    ),
    tag: (
      <div style={designSystemSharedStyles.chipRow}>
        <Tag dot size="md" variant="brand">新版</Tag>
        <Tag size="md" variant="info">合规</Tag>
        <Tag shape="rounded" size="md" variant="warning">异常账号</Tag>
      </div>
    ),
    "textarea-input": (
      <FormField description="仅管理员可见" label="内部备注">
        <TextareaInput defaultValue="这个账号主要给 QA 使用。" />
      </FormField>
    ),
    toast: (
      <PreviewCard>
        <div style={{ alignItems: "start", display: "grid", gap: "6px" }}>
          <Badge variant="success">Toast</Badge>
          <strong>设置已保存</strong>
          <Text size="caption" tone="muted">新的邮件策略已经生效。</Text>
        </div>
      </PreviewCard>
    ),
    tooltip: (
      <Tooltip>
        <TooltipTrigger aria-label="显示说明">?</TooltipTrigger>
        <TooltipContent>用于解释当前字段。</TooltipContent>
      </Tooltip>
    ),
    "tooltip-popover": (
      <div style={designSystemSharedStyles.chipRow}>
        <Tooltip><TooltipTrigger aria-label="显示提示">?</TooltipTrigger><TooltipContent>短说明</TooltipContent></Tooltip>
        <Popover><PopoverTrigger>更多操作</PopoverTrigger><PopoverContent>上下文操作</PopoverContent></Popover>
      </div>
    ),
    typography: (
      <div style={designSystemExampleStyles.previewGrid}>
        <Heading as="h2" size="display-md">Design token preview</Heading>
        <Text size="lg">统一正文节奏。</Text>
        <Muted size="caption">辅助说明</Muted>
        <div style={designSystemSharedStyles.chipRow}><Code>--brand-500</Code><Kbd keys={["Shift", "K"]} /></div>
      </div>
    )
  };

  return <ShowcaseFrame>{showcaseById[componentId] ?? <Text size="md">当前组件展示待补充。</Text>}</ShowcaseFrame>;
}
