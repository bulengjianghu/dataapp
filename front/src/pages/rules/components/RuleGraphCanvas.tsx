import {
  Background,
  Controls,
  EdgeLabelRenderer,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  BaseEdge,
  getSmoothStepPath,
  type Connection,
  type Edge,
  type EdgeChange,
  type EdgeProps,
  type NodeTypes,
  type Node,
  type NodeChange,
  type EdgeTypes,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { DeleteOutlined } from "@ant-design/icons";
import { Button, Empty, Popconfirm, message } from "antd";
import { useMemo } from "react";
import type { AppDispatch } from "../../../store";
import {
  connectRuleNodes,
  moveRuleNode,
  removeRuleEdge,
  removeRuleNode,
  selectRuleEdge,
  selectRuleNode,
  type InteractionRuleGraphState,
  type RuleGraphEdge,
  type RuleGraphNode,
  type RuleNodeType,
} from "../../../store/slices/interactionRuleGraphSlice";
import { RuleNodeCard } from "./RuleNodeCard";

type RuleGraphCanvasProps = {
  graphState: InteractionRuleGraphState;
  dispatch: AppDispatch;
  onDropNode: (type: RuleNodeType, position: { x: number; y: number }) => void;
  onAutoLayout: () => void;
};

const nodeTypes: NodeTypes = {
  trigger: RuleNodeCard,
  condition: RuleNodeCard,
  query: RuleNodeCard,
  transform: RuleNodeCard,
  command: RuleNodeCard,
  context: RuleNodeCard,
  notice: RuleNodeCard,
};

function RuleEdgeCard({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  selected,
  data,
}: EdgeProps<Edge<{ branch?: string; onDelete?: () => void }>>) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      {selected && data?.onDelete ? (
        <EdgeLabelRenderer>
          <div
            className="rule-graph-edge__actions"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            <Popconfirm
              title="确认删除？"
              description="删除后不可恢复"
              okText="删除"
              cancelText="取消"
              onConfirm={() => data.onDelete?.()}
            >
              <Button danger size="small" shape="circle" icon={<DeleteOutlined />} />
            </Popconfirm>
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

const edgeTypes: EdgeTypes = {
  ruleEdge: RuleEdgeCard,
};

const NODE_TRANSFER_MIME_TYPES = [
  "application/dataapp-rule-node",
  "application/reactflow",
  "text/plain",
] as const;

function CanvasSurface({ graphState, dispatch, onDropNode }: RuleGraphCanvasProps) {
  const reactFlow = useReactFlow();
  const [messageApi, contextHolder] = message.useMessage();

  const nodes = useMemo<Node[]>(
    () =>
      graphState.graph.nodes.map((node) => {
        const nodeHasError = graphState.diagnostics.some(
          (item) => item.nodeId === node.id && item.level === "error"
        );
        const nodeHasWarning = graphState.diagnostics.some(
          (item) => item.nodeId === node.id && item.level === "warning"
        );
        return {
        id: node.id,
        type: node.type,
        position: node.position,
        data: {
          ...node.data,
          diagnosticLevel: nodeHasError ? "error" : nodeHasWarning ? "warning" : undefined,
          onDelete: () => dispatch(removeRuleNode(node.id)),
        },
        selected: node.id === graphState.selectedNodeId,
        };
      }),
    [dispatch, graphState.diagnostics, graphState.graph.nodes, graphState.selectedNodeId]
  );

  const edges = useMemo<Edge[]>(
    () =>
      graphState.graph.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.branch && edge.branch !== "success" ? edge.branch : undefined,
        type: "ruleEdge",
        data: {
          branch: edge.branch,
          onDelete: () => dispatch(removeRuleEdge(edge.id)),
        },
        animated: edge.branch === "failure",
        style: edge.branch === "failure" ? { stroke: "#ff4d4f" } : undefined,
        selected: edge.id === graphState.selectedEdgeId,
      })),
    [dispatch, graphState.graph.edges, graphState.selectedEdgeId]
  );

  const findNodeById = (nodeId: string) => graphState.graph.nodes.find((item) => item.id === nodeId) ?? null;

  const canConnect = (connection: Connection | Edge) => {
    if (!connection.source || !connection.target) {
      return false;
    }
    if (connection.source === connection.target) {
      return false;
    }
    const sourceNode = findNodeById(connection.source);
    const targetNode = findNodeById(connection.target);
    if (!sourceNode || !targetNode) {
      return false;
    }
    if (targetNode.type === "trigger") {
      return false;
    }
    return !graphState.graph.edges.some(
      (edge) => edge.source === connection.source && edge.target === connection.target
    );
  };

  const onNodesChange = (changes: NodeChange[]) => {
    changes.forEach((change) => {
      if (change.type === "remove") {
        dispatch(removeRuleNode(change.id));
      }
      if (change.type === "position" && change.position) {
        dispatch(moveRuleNode({ nodeId: change.id, position: change.position }));
      }
    });
  };

  const onEdgesChange = (changes: EdgeChange[]) => {
    changes.forEach((change) => {
      if (change.type === "remove") {
        dispatch(removeRuleEdge(change.id));
      }
    });
  };

  const onConnect = (connection: Connection) => {
    if (!connection.source || !connection.target || !canConnect(connection)) {
      messageApi.warning("当前连线不合法，请检查起点、终点和重复连线。");
      return;
    }
    dispatch(
      connectRuleNodes({
        id: `edge_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
        source: connection.source,
        target: connection.target,
        branch: "success",
      })
    );
  };

  const onDragOver: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
  };

  const resolveDraggedNodeType = (event: React.DragEvent<HTMLDivElement>) => {
    for (const mimeType of NODE_TRANSFER_MIME_TYPES) {
      const value = event.dataTransfer.getData(mimeType);
      if (
        value === "trigger" ||
        value === "condition" ||
        value === "query" ||
        value === "transform" ||
        value === "command" ||
        value === "context" ||
        value === "notice"
      ) {
        return value;
      }
    }
    return null;
  };

  const onDrop: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const type = resolveDraggedNodeType(event);
    if (!type) {
      return;
    }
    const position = reactFlow.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    onDropNode(type, position);
  };

  return (
    <div className="rule-graph-canvas__surface" onDragOver={onDragOver} onDrop={onDrop}>
      {contextHolder}
      {graphState.graph.nodes.length === 0 ? (
        <div className="rule-graph-canvas__empty">
          <Empty
            description="从左侧拖入触发器、条件或命令节点开始编排"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      ) : null}
      <ReactFlow
        fitView
        fitViewOptions={{ padding: 0.24, maxZoom: 0.82 }}
        defaultViewport={{ x: 0, y: 0, zoom: 0.82 }}
        minZoom={0.4}
        maxZoom={1.5}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={canConnect}
        onNodeClick={(_, node) => {
          dispatch(selectRuleEdge(null));
          dispatch(selectRuleNode(node.id));
        }}
        onEdgeClick={(_, edge) => {
          dispatch(selectRuleNode(null));
          dispatch(selectRuleEdge(edge.id));
        }}
        onPaneClick={() => {
          dispatch(selectRuleNode(null));
          dispatch(selectRuleEdge(null));
        }}
        multiSelectionKeyCode={null}
        onDragOver={onDragOver}
        onDrop={onDrop}
        deleteKeyCode={["Backspace", "Delete"]}
        defaultEdgeOptions={{ type: "smoothstep" }}
      >
        <MiniMap pannable zoomable />
        <Controls />
        <Background gap={18} size={1} color="#d9e1ec" />
      </ReactFlow>
    </div>
  );
}

export function RuleGraphCanvas(props: RuleGraphCanvasProps) {
  return (
    <div className="rule-graph-canvas">
      <ReactFlowProvider>
        <CanvasSurface {...props} />
      </ReactFlowProvider>
    </div>
  );
}
