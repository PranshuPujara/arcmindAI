import { DiagramNode, NodeRelation, SystemGraph } from "@/types/diagram";

/**
 * Analyze the SystemGraph diagram structure to extract nodes' relations.
 */
export function analyzeDiagramRelations(
  systemGraph: SystemGraph,
): Record<string, NodeRelation> {
  const res: Record<string, NodeRelation> = {};
  const nodes = systemGraph.nodes;
  const edges = systemGraph.links;
  const nodeId2Node: Record<string, DiagramNode> = {};
  const graph: Record<string, NodeRelation> = {};
  for (const node of nodes) {
    graph[node.id] = {
      ancestors: [],
      descendants: [],
    };
    nodeId2Node[node.id] = node;
  }
  for (const edge of edges) {
    const srcId =
      typeof edge.source === "string" ? edge.source : edge.source.id;
    const tgtId =
      typeof edge.target === "string" ? edge.target : edge.target.id;
    graph[srcId].descendants.push(nodeId2Node[tgtId]);
    graph[tgtId].ancestors.push(nodeId2Node[srcId]);
  }

  for (const node of nodes) {
    res[node.id] = {
      ancestors: dfs(node.id, graph, new Set<string>(), "ancestors"),
      descendants: dfs(node.id, graph, new Set<string>(), "descendants"),
    };
  }
  return res;
}

function dfs(
  id: string,
  graph: Record<string, NodeRelation>,
  visited: Set<string>,
  dir: keyof NodeRelation,
): DiagramNode[] {
  const nodes: DiagramNode[] = [];
  for (const node of graph[id][dir]) {
    if (!visited.has(node.id)) {
      visited.add(node.id);
      nodes.push(node);
      nodes.push(...dfs(node.id, graph, visited, dir));
    }
  }
  return nodes;
}
