import {
  parseDiagram,
  type DiagramData,
  type DiagramNode,
  type DiagramEdge,
} from "../../lib/diagram.ts";
export function diagramTemplate(
  kind: "flow" | "cpu" | "feedback",
): DiagramData {
  const labels =
    kind === "cpu"
      ? ["명령어 인출", "디코드", "실행", "메모리", "쓰기 되돌림"]
      : kind === "feedback"
        ? ["기준 입력", "제어기", "시스템", "측정 / 피드백"]
        : ["입력", "처리", "출력"];
  const nodes: DiagramNode[] = labels.map((label, i) => ({
    id: `n${i}`,
    shape: "rounded",
    label,
    x: 60 + i * 290,
    y: kind === "feedback" && i === 3 ? 440 : 160,
    width: 220,
    height: 110,
  }));
  if (kind === "feedback") nodes[3].x = 350;
  const edges: DiagramEdge[] = nodes
    .slice(1)
    .map((n, i) => ({
      id: `e${i}`,
      from: nodes[i].id,
      to: n.id,
      fromPort: "right",
      toPort: "left",
      label: "",
      routing: "orthogonal",
    }));
  if (kind === "feedback")
    edges.push({
      id: "feedback",
      from: "n3",
      to: "n1",
      fromPort: "top",
      toPort: "bottom",
      label: "피드백",
      routing: "orthogonal",
    });
  return parseDiagram({
    version: 1,
    title:
      kind === "cpu"
        ? "프로세서 파이프라인"
        : kind === "feedback"
          ? "피드백 제어 구조"
          : "입력과 처리 흐름",
    nodes,
    edges,
  });
}
