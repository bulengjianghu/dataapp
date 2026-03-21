import ELK from "elkjs/lib/elk.bundled.js";
import type { RuleGraphEdge, RuleGraphNode } from "../../../store/slices/interactionRuleGraphSlice";

const elk = new ELK();

export async function layoutInteractionRuleGraph(params: {
  nodes: RuleGraphNode[];
  edges: RuleGraphEdge[];
}) {
  if (params.nodes.length === 0) {
    return params.nodes;
  }

  const graph = await elk.layout({
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.spacing.nodeNode": "48",
      "elk.layered.spacing.nodeNodeBetweenLayers": "96",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.layered.considerModelOrder": "NODES_AND_EDGES",
      "elk.layered.crossingMinimization.forceNodeModelOrder": "true",
    },
    children: params.nodes.map((node) => ({
      id: node.id,
      width: 260,
      height: 120,
    })),
    edges: params.edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  });

  return params.nodes.map((node) => {
    const layoutNode = graph.children?.find((item) => item.id === node.id);
    return {
      ...node,
      position: {
        x: layoutNode?.x ?? node.position.x,
        y: layoutNode?.y ?? node.position.y,
      },
    };
  });
}
