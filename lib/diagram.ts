export type Shape = "rect" | "rounded" | "ellipse" | "diamond" | "text";
export type Port = "top" | "right" | "bottom" | "left";
export type DiagramNode = {
  id: string;
  shape: Shape;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontFamily?: string;
  fontSize?: number;
};
export type DiagramEdge = {
  id: string;
  from: string;
  to: string;
  fromPort: Port;
  toPort: Port;
  label: string;
  routing?: "straight" | "orthogonal";
  start?: Point;
  end?: Point;
  arrows?: "end" | "both" | "none";
};
export type Point = { x: number; y: number };
export const DIAGRAM_FONTS = ["sans-serif", "serif", "monospace"] as const;
export type DiagramData = {
  version: 1;
  title: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
};
export const CANVAS = { width: 1600, height: 1000 };
export function emptyDiagram(): DiagramData {
  return { version: 1, title: "블록 다이어그램", nodes: [], edges: [] };
}
const ports = ["top", "right", "bottom", "left"];
const finite = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const string = (v: unknown, max: number) =>
  typeof v === "string" && v.length <= max;
export function parseDiagram(value: unknown): DiagramData {
  const d = value as DiagramData;
  const fail = () => {
    throw new Error(
      "다이어그램 형식이 올바르지 않아요. 버전 1의 원본 JSON을 선택해주세요.",
    );
  };
  if (
    !d ||
    d.version !== 1 ||
    !string(d.title, 120) ||
    !Array.isArray(d.nodes) ||
    !Array.isArray(d.edges) ||
    d.nodes.length > 100 ||
    d.edges.length > 200
  )
    return fail();
  const ids = new Set<string>();
  for (const n of d.nodes) {
    if (
      !n ||
      !string(n.id, 80) ||
      !n.id ||
      ids.has(n.id) ||
      !["rect", "rounded", "ellipse", "diamond", "text"].includes(n.shape) ||
      !string(n.label, 200) ||
      !finite(n.width, 60, 600) ||
      !finite(n.height, 40, 400) ||
      !finite(n.x, 0, CANVAS.width - n.width) ||
      !finite(n.y, 0, CANVAS.height - n.height)
    )
      return fail();
    if (
      (n.fontSize !== undefined && !finite(n.fontSize, 10, 72)) ||
      (n.fontFamily !== undefined &&
        !DIAGRAM_FONTS.includes(n.fontFamily as (typeof DIAGRAM_FONTS)[number]))
    )
      return fail();
    ids.add(n.id);
  }
  const edgeIds = new Set<string>();
  for (const e of d.edges) {
    if (
      !e ||
      !string(e.id, 80) ||
      !e.id ||
      edgeIds.has(e.id) ||
      ids.has(e.id) ||
      !(ids.has(e.from) || (e.from === "" && validPoint(e.start))) ||
      !(ids.has(e.to) || (e.to === "" && validPoint(e.end))) ||
      (e.from !== "" && e.from === e.to) ||
      !ports.includes(e.fromPort) ||
      !ports.includes(e.toPort) ||
      !string(e.label, 120) ||
      (e.routing !== undefined &&
        !["straight", "orthogonal"].includes(e.routing))
    )
      return fail();
    if (
      (e.arrows !== undefined && !["end", "both", "none"].includes(e.arrows)) ||
      (e.start !== undefined && !validPoint(e.start)) ||
      (e.end !== undefined && !validPoint(e.end))
    )
      return fail();
    edgeIds.add(e.id);
  }
  // Copy only schema fields, never imported markup or arbitrary attributes.
  return {
    version: 1,
    title: d.title,
    nodes: d.nodes.map((n) => ({
      id: n.id,
      shape: n.shape,
      label: n.label,
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height,
      ...(n.fontFamily ? { fontFamily: n.fontFamily } : {}),
      ...(n.fontSize ? { fontSize: n.fontSize } : {}),
    })),
    edges: d.edges.map((e) => ({
      id: e.id,
      from: e.from,
      to: e.to,
      fromPort: e.fromPort,
      toPort: e.toPort,
      label: e.label,
      routing: e.routing,
      ...(e.start ? { start: { x: e.start.x, y: e.start.y } } : {}),
      ...(e.end ? { end: { x: e.end.x, y: e.end.y } } : {}),
      ...(e.arrows ? { arrows: e.arrows } : {}),
    })),
  };
}
export function portPoint(n: DiagramNode, p: Port) {
  return {
    x: n.x + (p === "left" ? 0 : p === "right" ? n.width : n.width / 2),
    y: n.y + (p === "top" ? 0 : p === "bottom" ? n.height : n.height / 2),
  };
}
export function removeNode(d: DiagramData, id: string): DiagramData {
  return {
    ...d,
    nodes: d.nodes.filter((n) => n.id !== id),
    edges: d.edges.filter((e) => e.from !== id && e.to !== id),
  };
}
export function moveNode(n: DiagramNode, x: number, y: number): DiagramNode {
  return {
    ...n,
    x: Math.min(CANVAS.width - n.width, Math.max(0, Math.round(x / 10) * 10)),
    y: Math.min(CANVAS.height - n.height, Math.max(0, Math.round(y / 10) * 10)),
  };
}
export function validateDiagrams(content: unknown) {
  if (!content || typeof content !== "object") return;
  const n = content as {
    type?: string;
    attrs?: { data?: unknown };
    content?: unknown[];
  };
  if (n.type === "blockDiagram") parseDiagram(n.attrs?.data);
  if (Array.isArray(n.content)) n.content.forEach(validateDiagrams);
}

export function edgePath(
  a: { x: number; y: number },
  b: { x: number; y: number },
  port: Port,
  routing?: "straight" | "orthogonal",
) {
  if (routing !== "orthogonal") return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
  return port === "left" || port === "right"
    ? `M ${a.x} ${a.y} H ${(a.x + b.x) / 2} V ${b.y} H ${b.x}`
    : `M ${a.x} ${a.y} V ${(a.y + b.y) / 2} H ${b.x} V ${b.y}`;
}

function validPoint(p: unknown): p is Point {
  const v = p as Point;
  return !!v && finite(v.x, 0, CANVAS.width) && finite(v.y, 0, CANVAS.height);
}
export function snapPoint(p: Point): Point {
  return {
    x: Math.max(0, Math.min(CANVAS.width, Math.round(p.x / 10) * 10)),
    y: Math.max(0, Math.min(CANVAS.height, Math.round(p.y / 10) * 10)),
  };
}
export function snapEndpoint(nodes: DiagramNode[], p: Point, tolerance = 24) {
  let result: { id: string; port: Port; point: Point } = {
      id: "",
      port: "right",
      point: snapPoint(p),
    },
    best = tolerance;
  for (const n of nodes)
    for (const port of ports as Port[]) {
      const point = portPoint(n, port),
        distance = Math.hypot(point.x - p.x, point.y - p.y);
      if (distance <= best) {
        best = distance;
        result = { id: n.id, port, point };
      }
    }
  return result;
}
export function edgeEndpoints(d: DiagramData, e: DiagramEdge) {
  return {
    a: e.from
      ? portPoint(d.nodes.find((n) => n.id === e.from)!, e.fromPort)
      : e.start!,
    b: e.to ? portPoint(d.nodes.find((n) => n.id === e.to)!, e.toPort) : e.end!,
  };
}
export function roundedEdgePath(
  a: Point,
  b: Point,
  port: Port,
  routing?: "straight" | "orthogonal",
) {
  if (routing !== "orthogonal") return edgePath(a, b, port, routing);
  const horizontal = port === "left" || port === "right";
  const points = horizontal
    ? [a, { x: (a.x + b.x) / 2, y: a.y }, { x: (a.x + b.x) / 2, y: b.y }, b]
    : [a, { x: a.x, y: (a.y + b.y) / 2 }, { x: b.x, y: (a.y + b.y) / 2 }, b];
  const clean = points.filter(
    (p, i) => i === 0 || p.x !== points[i - 1].x || p.y !== points[i - 1].y,
  );
  let path = `M ${a.x} ${a.y}`;
  for (let i = 1; i < clean.length - 1; i++) {
    const prev = clean[i - 1],
      p = clean[i],
      next = clean[i + 1],
      l1 = Math.hypot(p.x - prev.x, p.y - prev.y),
      l2 = Math.hypot(next.x - p.x, next.y - p.y),
      r = Math.min(10, l1 / 2, l2 / 2);
    path += ` L ${p.x - ((p.x - prev.x) * r) / l1} ${p.y - ((p.y - prev.y) * r) / l1} Q ${p.x} ${p.y} ${p.x + ((next.x - p.x) * r) / l2} ${p.y + ((next.y - p.y) * r) / l2}`;
  }
  return path + ` L ${b.x} ${b.y}`;
}
export function resizeNode(
  n: DiagramNode,
  handle: string,
  dx: number,
  dy: number,
): DiagramNode {
  let left = n.x,
    right = n.x + n.width,
    top = n.y,
    bottom = n.y + n.height;
  if (handle.includes("w"))
    left = Math.max(
      0,
      Math.min(
        right - 60,
        Math.max(right - 600, Math.round((left + dx) / 10) * 10),
      ),
    );
  if (handle.includes("e"))
    right = Math.min(
      CANVAS.width,
      Math.max(
        left + 60,
        Math.min(left + 600, Math.round((right + dx) / 10) * 10),
      ),
    );
  if (handle.includes("n"))
    top = Math.max(
      0,
      Math.min(
        bottom - 40,
        Math.max(bottom - 400, Math.round((top + dy) / 10) * 10),
      ),
    );
  if (handle.includes("s"))
    bottom = Math.min(
      CANVAS.height,
      Math.max(
        top + 40,
        Math.min(top + 400, Math.round((bottom + dy) / 10) * 10),
      ),
    );
  return { ...n, x: left, y: top, width: right - left, height: bottom - top };
}
