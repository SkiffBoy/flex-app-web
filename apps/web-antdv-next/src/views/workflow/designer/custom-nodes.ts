// 本地定义 customNodes 配置类型（对齐 @tinyflow-ai/ui@1.3.6 发布的 CustomNode/CustomNodeForm
// 结构，但避免直接依赖 @tinyflow-ai/ui —— 该包未作为可解析依赖暴露，仅作为
// @tinyflow-ai/vue 的传递依赖存在于 pnpm store）。Tinyflow 组件的 :custom-nodes prop
// 运行时按结构消费，类型本地保证字段正确。

export interface CustomNodeForm {
  type: 'chosen' | 'heading' | 'input' | 'select' | 'slider' | 'textarea';
  label: string;
  name: string;
  placeholder?: string;
  defaultValue?: boolean | number | string;
  options?: { label: string; value: number | string }[];
}

export interface CustomNode {
  title: string;
  description?: string;
  group?: 'base' | 'tools';
  parametersEnable?: boolean;
  parametersAddEnable?: boolean;
  outputDefsEnable?: boolean;
  outputDefsAddEnable?: boolean;
  parameters?: { name: string; dataType?: string }[];
  outputDefs?: { name: string; dataType?: string }[];
  forms?: CustomNodeForm[];
}

const HTTP_METHODS = ['DELETE', 'GET', 'PATCH', 'POST', 'PUT'].map((v) => ({
  label: v,
  value: v,
}));

/**
 * retry/loop 执行调优表单（spec §5.2：data 顶层字段，与后端 NodeRowMapper 对齐）。
 *
 * <p>反编译确认 tinyflow BaseNodeParser 直接读 data 顶层的 retryEnable/loopEnable 等字段，
 * 引擎确认消费（TriggerType.RETRY/LOOP 存在）。这些表单注入 data 顶层 → tinyflow 引擎生效。
 *
 * <p>字段名严格对齐后端 FlowNode/NodeRowMapper：retryEnable/retryIntervalMs/maxRetryCount/
 * resetRetryCountAfterNormal/loopEnable/loopIntervalMs/maxLoopCount/loopBreakCondition。
 */
const RETRY_LOOP_FORMS: CustomNodeForm[] = [
  { label: '重试开启', name: 'retryEnable', defaultValue: false, type: 'chosen' },
  {
    label: '重试间隔(ms)',
    defaultValue: 3000,
    name: 'retryIntervalMs',
    type: 'input',
  },
  { label: '最大重试次数', defaultValue: 3, name: 'maxRetryCount', type: 'input' },
  {
    label: '正常后重置重试计数',
    defaultValue: true,
    name: 'resetRetryCountAfterNormal',
    type: 'chosen',
  },
  { label: '循环开启', name: 'loopEnable', defaultValue: false, type: 'chosen' },
  {
    label: '循环间隔(ms)',
    defaultValue: 5000,
    name: 'loopIntervalMs',
    type: 'input',
  },
  { label: '最大循环次数', defaultValue: 10, name: 'maxLoopCount', type: 'input' },
  {
    label: '循环中断条件',
    name: 'loopBreakCondition',
    placeholder: '$.done == true',
    type: 'textarea',
  },
];

/**
 * tinyflow-ui 内置节点 customNodes 配置（key = tinyflow 内部类型名）。
 * 降级兼容：若 tinyflow 拒绝覆盖内置节点表单，配置 no-op 不报错，回退默认面板。
 *
 * <p>retry/loop 表单挂在可执行节点（code/http/llm），这些是真正需要执行调优的节点。
 * start/end/condition 等非执行节点不需要。
 */
export const CUSTOM_NODES: Record<string, CustomNode> = {
  codeNode: {
    forms: [
      { label: 'JS 代码', name: 'code', type: 'textarea' },
      ...RETRY_LOOP_FORMS,
    ],
    group: 'tools',
    title: '代码',
  },
  conditionNode: { group: 'base', title: '条件' },
  endNode: {
    group: 'base',
    outputDefsEnable: false,
    parametersEnable: false,
    title: '结束',
  },
  httpNode: {
    forms: [
      { label: 'URL', name: 'url', placeholder: 'https://...', type: 'input' },
      { label: '方法', name: 'method', options: HTTP_METHODS, type: 'select' },
      ...RETRY_LOOP_FORMS,
    ],
    group: 'tools',
    outputDefs: [
      { dataType: 'Number', name: 'status' },
      { dataType: 'Object', name: 'body' },
    ],
    parameters: [{ dataType: 'Object', name: 'headers' }],
    title: 'HTTP请求',
  },
  knowledgeNode: { group: 'tools', title: '知识库' },
  llmNode: {
    forms: [
      { label: '模型', name: 'model', type: 'input' },
      { label: '提示词', name: 'prompt', type: 'textarea' },
      ...RETRY_LOOP_FORMS,
    ],
    group: 'tools',
    outputDefs: [{ dataType: 'String', name: 'content' }],
    title: '大模型',
  },
  loopNode: { group: 'base', title: '循环' },
  startNode: {
    group: 'base',
    outputDefsEnable: false,
    parametersEnable: false,
    title: '开始',
  },
};
