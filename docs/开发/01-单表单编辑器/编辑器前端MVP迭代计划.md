# 编辑器前端MVP迭代计划

## 1. 目标与范围（二维表）
| 项 | 内容 | 说明 |
|---|---|---|
| 目标 | 完成单表单编辑器前端 MVP | 支持组件拖拽、容器分组、属性配置、预览、保存、发布 |
| 范围 | 仅覆盖表单编辑器前端 | 不含填报、审批、报表、打印 |
| 技术栈 | React + TypeScript + Ant Design + dnd-kit + Redux Toolkit | 与设计文档保持一致 |
| 数据模型 | 节点树 + `nodesById` 单一数据源 | 顶层通过 `PAGE_NODE_ID` 管理 |
| 场景 | 编辑态、预览态 | 运行态渲染器复用到预览页 |

## 2. 输入文档（二维表）
| 文档 | 用途 |
|---|---|
| [表单编辑器需求拆解.md](/Users/jia/Documents/develop/ai/dataapp/需求/01-单表单编辑器/表单编辑器需求拆解.md) | 确认功能范围与验收边界 |
| [表单编辑器前端设计.md](/Users/jia/Documents/develop/ai/dataapp/设计/01-单表单编辑器/表单编辑器前端设计.md) | 作为前端主设计依据 |
| [组件树设计.md](/Users/jia/Documents/develop/ai/dataapp/设计/01-单表单编辑器/前端方案设计/组件树设计.md) | 统一节点树、store、删除策略 |
| [组件配置项解藕.md](/Users/jia/Documents/develop/ai/dataapp/设计/01-单表单编辑器/前端方案设计/组件配置项解藕.md) | 属性面板动态渲染依据 |
| [栅格与水平布局实现方案.md](/Users/jia/Documents/develop/ai/dataapp/设计/01-单表单编辑器/前端方案设计/栅格与水平布局实现方案.md) | 画布布局与容器布局实现依据 |
| [拖拽落点判定.md](/Users/jia/Documents/develop/ai/dataapp/设计/01-单表单编辑器/前端方案设计/拖拽落点判定.md) | 拖拽判定与落点写入依据 |
| [编辑态运行态组件设计.md](/Users/jia/Documents/develop/ai/dataapp/设计/01-单表单编辑器/前端方案设计/编辑态运行态组件设计.md) | 编辑态/预览态组件分层依据 |

## 3. MVP交付清单（二维表）
| 模块 | 交付内容 | 优先级 |
|---|---|---|
| 页面骨架 | 编辑页、预览页、顶部工具栏、左右布局 | P0 |
| 状态管理 | `formSchemaSlice`、`editorHistorySlice`、selector | P0 |
| 组件面板 | 基础字段、选项字段、附件、容器组件入口 | P0 |
| 画布渲染 | 节点树递归渲染、顶层/容器 `childrenIds` 排序 | P0 |
| 拖拽能力 | 拖入顶层、拖入容器、容器内排序、顶层排序 | P0 |
| 属性面板 | 基于注册表动态渲染配置项 | P0 |
| 删除能力 | 选中高亮、非模态删除确认、级联删除 | P0 |
| 保存与发布 | 草稿保存、发布前校验、预览切换 | P0 |
| 历史能力 | undo/redo | P1 |
| 自动保存与离开提醒 | 自动保存、页面离开二次确认 | P1 |

## 4. 迭代拆分（二维表）
| 迭代 | 目标 | 范围 | 交付物 | 验收标准 |
|---|---|---|---|---|
| Sprint 1 | 搭建编辑器基础骨架与节点树状态 | 页面框架、Redux store、节点模型、基础组件面板、静态画布 | 可运行的编辑器骨架 | 页面可打开，节点可初始化，基础组件可显示 |
| Sprint 2 | 完成节点渲染与拖拽编排 | `FormEditorRenderer`、容器节点、拖拽新增、拖入容器、排序 | 可交互画布 | 组件可拖入顶层和容器，顺序正确持久化到节点树 |
| Sprint 3 | 完成属性面板与节点编辑 | 配置注册表、PropertyPanel、属性写回、栅格配置、容器属性 | 可编辑组件配置 | 选中不同节点可展示不同配置项，修改后画布即时更新 |
| Sprint 4 | 完成预览、删除、保存发布闭环 | 预览页、删除浮层、保存、发布、基础校验 | MVP 可演示版本 | 形成“拖拽-配置-预览-保存-发布”完整闭环 |
| Sprint 5 | 稳定性与体验增强 | undo/redo、自动保存、离开提醒、性能优化 | 可试点版本 | 关键体验达标，满足试点使用 |

## 5. Sprint 1 详细任务（二维表）
| 类别 | 任务 | 输出 |
|---|---|---|
| 工程初始化 | 建立编辑器页面路由与基础布局 | `FormEditorPage`、`EditorShell` |
| 状态模型 | 实现 `formSchemaSlice` 与 `editorHistorySlice` 框架 | store与基础action |
| 节点协议 | 定义 `Node`、`NodeType`、`PAGE_NODE_ID` | 类型文件与初始化常量 |
| 组件面板 | 输出基础字段、选项字段、附件、容器入口列表 | `ComponentPalette` |
| 画布骨架 | 输出 `FormEditorRenderer` 与空画布 | 基础画布可见 |

## 6. Sprint 2 详细任务（二维表）
| 类别 | 任务 | 输出 |
|---|---|---|
| 拖拽系统 | 接入 `dnd-kit`，实现顶层与容器 droppable | `EditorDndContext` |
| 新增节点 | 从组件面板拖拽新增节点 | `addNode`、`moveNodeToContainer` |
| 节点排序 | 顶层排序、容器内排序、跨容器移动 | `moveNode` |
| 容器渲染 | 实现 `ContainerEditorWrapper` 与 `ContainerFields` | 容器交互完整 |

## 7. Sprint 3 详细任务（二维表）
| 类别 | 任务 | 输出 |
|---|---|---|
| 注册表 | 实现 `componentConfigRegistry` | 组件到配置项映射 |
| 动态属性面板 | `PropertySchemaResolver`、`PropertyControlFactory`、`PropertyGroupRenderer` | 动态配置面板 |
| 属性写回 | `updateNodeProps` 与局部刷新 | 节点属性修改即时生效 |
| 布局配置 | `span/order` 修改后即时重排 | 栅格布局生效 |

## 8. Sprint 4 详细任务（二维表）
| 类别 | 任务 | 输出 |
|---|---|---|
| 预览渲染 | `FormPreviewPage`、`FormPreviewRenderer`、`RuntimeNodeRenderer` | 预览态页面 |
| 删除能力 | `SelectionOutline`、`DeleteConfirmPopover`、`deleteSelectedNode` | 非模态删除闭环 |
| 保存能力 | `saveDraft` 接口对接、草稿回写 `serverId` | 草稿保存闭环 |
| 发布能力 | `publishForm`、发布前校验 | 发布闭环 |

## 9. Sprint 5 详细任务（二维表）
| 类别 | 任务 | 输出 |
|---|---|---|
| 历史回放 | `undo/redo` 快照机制 | 编辑回放能力 |
| 自动保存 | 定时或关键操作触发 `saveDraft` | 草稿保护能力 |
| 离开提醒 | `dirty` 状态下离开确认 | 防止误丢数据 |
| 性能优化 | 大表单局部渲染与慢路径优化 | 达到性能指标 |

## 10. 验收标准（二维表）
| 类别 | 标准 |
|---|---|
| 编辑能力 | 可从组件面板拖入基础组件与容器，支持顶层和容器内排序 |
| 属性配置 | 选中不同节点可展示对应配置项，修改后实时反映在画布与预览 |
| 删除能力 | 删除浮层为非模态，删除容器可级联删除子节点 |
| 保存发布 | 草稿保存成功，服务端 `serverId` 可回填；发布前校验可阻断非法配置 |
| 预览一致性 | 编辑预览与运行态渲染结果一致 |
| 性能 | 常规 30 字段表单打开 < 2s，属性面板切换 < 300ms |

## 11. 风险与应对（二维表）
| 风险 | 影响 | 应对 |
|---|---|---|
| 拖拽与节点树同步复杂 | 节点顺序异常 | 先固化 `PAGE_NODE_ID + childrenIds` 规则，再写拖拽 |
| 属性面板动态渲染不稳定 | 配置项显示错乱 | 先完成注册表 schema 约束与单测 |
| 本地 `id` 与服务端 `serverId` 回填错配 | 节点映射错误 | 接口使用 `clientId + serverId` 双标识回填 |
| undo/redo 快照过大 | 性能下降 | MVP阶段只记录结构变更快照，后续再细化 |

## 12. 研发协作约束（二维表）
| 约束 | 说明 |
|---|---|
| 状态边界 | 核心节点数据进 Redux，删除浮层等局部状态放组件内部 |
| 组件边界 | 运行态组件不混入拖拽/删除逻辑，编辑态通过 wrapper 增强 |
| 节点模型 | `nodesById` 为唯一实体数据源，`childrenIds` 仅表达关系和顺序 |
| 服务端映射 | 只回填 `serverId`，不替换本地 `id` |
