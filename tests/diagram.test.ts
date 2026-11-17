import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyDiagram,
  parseDiagram,
  moveNode,
  removeNode,
  portPoint,
  validateDiagrams,
  type DiagramData,
} from "../lib/diagram.ts";
const diagram: DiagramData = {
  ...emptyDiagram(),
  title: "CPU 데이터 흐름",
  nodes: [
    {
      id: "a",
      shape: "rect",
      label: "입력",
      x: 10,
      y: 20,
      width: 180,
      height: 100,
    },
    {
      id: "b",
      shape: "rounded",
      label: "연산\n결과",
      x: 400,
      y: 20,
      width: 180,
      height: 100,
    },
  ],
  edges: [
    {
      id: "e",
      from: "a",
      to: "b",
      fromPort: "right",
      toPort: "left",
      label: "32 bit",
    },
  ],
};
test("removing a node removes its edges and moving clamps to canvas on grid", () => {
  const next = removeNode(diagram, "a");
  assert.equal(next.nodes.length, 1);
  assert.equal(next.edges.length, 0);
  assert.equal(diagram.edges.length, 1);
  assert.deepEqual(portPoint(diagram.nodes[0], "right"), { x: 190, y: 70 });
  const moved = moveNode(diagram.nodes[0], 9999, -9);
  assert.equal(moved.x, 1420);
  assert.equal(moved.y, 0);
  assert.equal(moveNode(diagram.nodes[0], 24, 26).x, 20);
});
test("malformed graphs and unsupported versions are rejected without modifying source", () => {
  for (const bad of [
    { ...diagram, version: 2 },
    { ...diagram, nodes: [...diagram.nodes, diagram.nodes[0]] },
    { ...diagram, edges: [{ ...diagram.edges[0], to: "missing" }] },
    { ...diagram, edges: [{ ...diagram.edges[0], fromPort: "center" }] },
    { ...diagram, nodes: [{ ...diagram.nodes[0], x: Infinity }] },
    { ...diagram, nodes: [{ ...diagram.nodes[0], width: 10000 }] },
    { ...diagram, nodes: Array(101).fill(diagram.nodes[0]) },
  ])
    assert.throws(() => parseDiagram(bad));
  assert.throws(() =>
    validateDiagrams({
      type: "doc",
      content: [{ type: "blockDiagram", attrs: { data: {} } }],
    }),
  );
  const original = { ...diagram, html: "<script>bad()</script>" };
  assert.equal("html" in parseDiagram(original), false);
});

import { edgePath } from "../lib/diagram.ts";
import { diagramTemplate } from "./fixtures/diagram.ts";
test("diagram fixtures validate and legacy orthogonal routes remain supported", () => {
  for (const kind of ["flow", "cpu", "feedback"] as const)
    assert.doesNotThrow(() => parseDiagram(diagramTemplate(kind)));
  const d = diagramTemplate("cpu");
  assert.equal(
    edgePath({ x: 0, y: 0 }, { x: 100, y: 100 }, "right", "orthogonal"),
    "M 0 0 H 50 V 100 H 100",
  );
  assert.throws(() =>
    parseDiagram({ ...d, edges: [{ ...d.edges[0], routing: "arbitrary" }] }),
  );
});

import {
  snapEndpoint,
  roundedEdgePath,
  resizeNode,
} from "../lib/diagram.ts";
test("endpoint snapping distinguishes nearby ports from free canvas; rounded routes stay finite", () => {
  assert.equal(snapEndpoint(diagram.nodes, { x: 192, y: 72 }).id, "a");
  assert.equal(snapEndpoint(diagram.nodes, { x: 192, y: 72 }).port, "right");
  assert.deepEqual(snapEndpoint(diagram.nodes, { x: 303, y: 307 }).point, {
    x: 300,
    y: 310,
  });
  assert.equal(snapEndpoint(diagram.nodes, { x: 303, y: 307 }).id, "");
  assert.match(
    roundedEdgePath({ x: 0, y: 0 }, { x: 100, y: 100 }, "right", "orthogonal"),
    / Q /,
  );
  for (const b of [
    { x: 0, y: 0 },
    { x: 0, y: 100 },
    { x: 100, y: 0 },
    { x: 10, y: 20 },
  ])
    assert.doesNotMatch(
      roundedEdgePath({ x: 0, y: 0 }, b, "right", "orthogonal"),
      /NaN|Infinity/,
    );
});
test("eight resize handles preserve opposite edges and clamp to canvas and minimum sizes", () => {
  const n = diagram.nodes[0];
  const west = resizeNode(n, "w", 40, 0);
  assert.equal(west.x + west.width, n.x + n.width);
  assert.equal(west.x, 50);
  for (const h of ["nw", "n", "ne", "e", "se", "s", "sw", "w"])
    for (const d of [-9999, 9999]) {
      const r = resizeNode(n, h, d, d);
      assert.ok(r.width >= 60 && r.width <= 600);
      assert.ok(r.height >= 40 && r.height <= 400);
      assert.ok(
        r.x >= 0 && r.y >= 0 && r.x + r.width <= 1600 && r.y + r.height <= 1000,
      );
    }
});
