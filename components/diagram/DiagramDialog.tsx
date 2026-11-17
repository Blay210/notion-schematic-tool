"use client";
import Select from "@/components/Select";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import {
  Square,
  RectangleHorizontal,
  Circle,
  Diamond,
  MousePointer2,
  Undo2,
  Redo2,
  Workflow,
  SlidersHorizontal,
  ArrowRight,
  ArrowLeftRight,
  Minus,
  X,
} from "lucide-react";
import {
  CANVAS,
  moveNode,
  resizeNode,
  snapEndpoint,
  parseDiagram,
  removeNode,
  type DiagramData,
  type DiagramNode,
  type Shape,
  type Point,
} from "../../lib/diagram";
import { DiagramCanvas } from "./DiagramCanvas";
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function DiagramDialog({
  initial,
  editable,
  onApply,
  onClose,
  mode = "post",
}: {
  mode?: "post" | "project" | "demo";
  initial: DiagramData;
  editable: boolean;
  onApply: (d: DiagramData) => void | Promise<void>;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [inspector, setInspector] = useState(false);
  const [data, setData] = useState(initial);
  const [past, setPast] = useState<DiagramData[]>([]),
    [future, setFuture] = useState<DiagramData[]>([]);
  const [selected, setSelected] = useState(""),
    [zoom, setZoom] = useState(0.65),
    [error, setError] = useState("");
  const [tool, setTool] = useState<"select" | "end" | "both" | "none">(
    "select",
  );
  type Anchor = ReturnType<typeof snapEndpoint>;
  const [wireStart, setWireStart] = useState<Anchor | null>(null),
    [hover, setHover] = useState<Anchor | null>(null);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(
    null,
  );
  const editRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (editing) {
      editRef.current?.focus();
      editRef.current?.setSelectionRange(
        editing.text.length,
        editing.text.length,
      );
    }
  }, [editing?.id]);
  function commitText() {
    if (!editing) return;
    change({
      ...data,
      nodes: data.nodes.map((n) =>
        n.id === editing.id ? { ...n, label: editing.text } : n,
      ),
    });
    setEditing(null);
  }
  function beginEdit(n: DiagramNode, text = n.label) {
    setSelected(n.id);
    setEditing({ id: n.id, text });
  }
  function point(e: { clientX: number; clientY: number }): Point {
    const box = svg.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - box.left) * CANVAS.width) / box.width,
      y: ((e.clientY - box.top) * CANVAS.height) / box.height,
    };
  }
  function draw(e: PointerEvent) {
    if (
      tool === "select" ||
      !editable ||
      e.button !== 0 ||
      !svg.current ||
      !(e.target instanceof Element) ||
      !e.target.closest("svg")
    )
      return;
    e.preventDefault();
    const anchor = snapEndpoint(data.nodes, point(e), 24 / zoom);
    if (!wireStart) {
      setWireStart(anchor);
      setHover(anchor);
      return;
    }
    if (
      (wireStart.id && wireStart.id === anchor.id) ||
      Math.hypot(
        wireStart.point.x - anchor.point.x,
        wireStart.point.y - anchor.point.y,
      ) < 1
    )
      return;
    if (data.edges.length >= 200) {
      setError("연결선은 최대 200개예요.");
      return;
    }
    const id = crypto.randomUUID();
    change({
      ...data,
      edges: [
        ...data.edges,
        {
          id,
          from: wireStart.id,
          to: anchor.id,
          fromPort: wireStart.port,
          toPort: anchor.port,
          start: wireStart.point,
          end: anchor.point,
          label: "",
          routing: "orthogonal",
          arrows: tool,
        },
      ],
    });
    setSelected(id);
    setWireStart(null);
  }
  function replaceDrawing(next: DiagramData) {
    if (
      data.nodes.length &&
      !window.confirm(
        "현재 그림을 선택한 원본으로 바꿀까요? 실행 취소로 되돌릴 수 있어요.",
      )
    )
      return;
    change(next);
    setSelected("");
    setWireStart(null);
  }
  function undo() {
    if (!past.length) return;
    setFuture((f) => [data, ...f]);
    setData(past[past.length - 1]);
    setPast((p) => p.slice(0, -1));
  }
  function redo() {
    if (!future.length) return;
    setPast((p) => [...p.slice(-49), data]);
    setData(future[0]);
    setFuture((f) => f.slice(1));
  }
  const dialog = useRef<HTMLDialogElement>(null),
    svg = useRef<SVGSVGElement>(null),
    importFile = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(initial) !== JSON.stringify(data);
  const node = data.nodes.find((n) => n.id === selected),
    edge = data.edges.find((e) => e.id === selected);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const before = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [dirty]);
  function change(next: DiagramData) {
    try {
      const checked = parseDiagram(next);
      setPast((p) => [...p.slice(-49), data]);
      setFuture([]);
      setData(checked);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "변경하지 못했어요.");
    }
  }
  function close() {
    if (saving) return;
    if (!dirty || window.confirm("아직 반영하지 않은 변경을 버리고 닫을까요?"))
      onClose();
  }
  function add(shape: Shape) {
    if (data.nodes.length >= 100) {
      setError("다이어그램 하나에 도형은 최대 100개예요.");
      return;
    }
    const n: DiagramNode = {
      id: crypto.randomUUID(),
      shape,
      label: shape === "text" ? "설명" : "새 블록",
      x: 100 + (data.nodes.length % 8) * 30,
      y: 100 + (data.nodes.length % 8) * 30,
      width: 180,
      height: shape === "ellipse" ? 180 : 100,
    };
    change({ ...data, nodes: [...data.nodes, n] });
    setSelected(n.id);
  }
  function updateNode(patch: Partial<DiagramNode>) {
    if (!node) return;
    let next = { ...node, ...patch };
    next = moveNode(next, next.x, next.y);
    change({
      ...data,
      nodes: data.nodes.map((n) => (n.id === node.id ? next : n)),
    });
  }
  const drag = useRef<{
    id: string;
    x: number;
    y: number;
    node: DiagramNode;
    before: DiagramData;
    handle?: string;
  } | null>(null);
  function startDrag(
    e: PointerEvent<SVGGElement | SVGRectElement>,
    n: DiagramNode,
    handle?: string,
  ) {
    if (!editable || e.button !== 0 || editing) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.closest<HTMLElement>(".diagram-viewport")?.focus();
    setSelected(n.id);
    drag.current = {
      id: n.id,
      x: e.clientX,
      y: e.clientY,
      node: n,
      before: data,
      handle,
    };
  }
  function dragMove(e: PointerEvent) {
    const d = drag.current;
    if (!d || !svg.current) return;
    const box = svg.current.getBoundingClientRect();
    const dx = ((e.clientX - d.x) * CANVAS.width) / box.width,
      dy = ((e.clientY - d.y) * CANVAS.height) / box.height;
    const n = d.handle
      ? resizeNode(d.node, d.handle, dx, dy)
      : moveNode(d.node, d.node.x + dx, d.node.y + dy);
    setData({
      ...d.before,
      nodes: d.before.nodes.map((item) => (item.id === d.id ? n : item)),
    });
  }
  function endDrag(cancel = false) {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    if (cancel) {
      setData(d.before);
      return;
    }
    if (JSON.stringify(data) !== JSON.stringify(d.before)) {
      setPast((p) => [...p.slice(-49), d.before]);
      setFuture([]);
    }
  }
  async function exportImage(png: boolean) {
    try {
      if (!svg.current) return;
      const clone = svg.current.cloneNode(true) as SVGSVGElement;
      clone.querySelectorAll("[data-editor-only]").forEach((el) => el.remove());
      clone.setAttribute("width", String(CANVAS.width));
      clone.setAttribute("height", String(CANVAS.height));
      clone.style.width = `${CANVAS.width}px`;
      clone.style.height = `${CANVAS.height}px`;
      const background = clone.querySelector("rect");
      background?.setAttribute("fill", "#fff");
      const source = new Blob([new XMLSerializer().serializeToString(clone)], {
        type: "image/svg+xml;charset=utf-8",
      });
      if (!png) {
        download(source, "moon-diagram.svg");
        return;
      }
      const url = URL.createObjectURL(source);
      try {
        const image = new Image();
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () =>
            reject(
              new Error(
                "이미지를 만들지 못했어요. SVG 내보내기를 이용해주세요.",
              ),
            );
          image.src = url;
        });
        const canvas = document.createElement("canvas");
        canvas.width = CANVAS.width;
        canvas.height = CANVAS.height;
        const context = canvas.getContext("2d");
        if (!context)
          throw new Error("PNG 내보내기를 지원하지 않는 브라우저예요.");
        context.drawImage(image, 0, 0);
        const blob = await new Promise<Blob | null>((r) =>
          canvas.toBlob(r, "image/png"),
        );
        if (!blob) throw new Error("PNG 변환에 실패했어요.");
        download(blob, "moon-diagram.png");
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "내보내기에 실패했어요.");
    }
  }
  return createPortal(
    <dialog
      ref={dialog}
      className="diagram-dialog block-workspace"
      aria-label="블록 다이어그램"
      onCancel={(e) => {
        e.preventDefault();
        if (editing) {
          setEditing(null);
          return;
        }
        if (wireStart || tool !== "select") {
          setWireStart(null);
          setTool("select");
          return;
        }
        close();
      }}
    >
      <header>
        <div className="block-document-title">
          <Workflow size={21} />
          {editable ? (
            <input
              aria-label="그림 제목"
              maxLength={120}
              value={data.title}
              disabled={saving}
              onChange={(e) => change({ ...data, title: e.target.value })}
            />
          ) : (
            <strong>{data.title}</strong>
          )}
        </div>
        <div>
          {editable && mode !== "demo" && (
            <button
              className="diagram-primary"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await onApply(parseDiagram(data));
                  onClose();
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "저장하지 못했어요.",
                  );
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "저장 중…" : mode === "project" ? "저장" : "글에 적용"}
            </button>
          )}
          <button aria-label="닫기" onClick={close}>
            <X size={19} />
          </button>
        </div>
      </header>
      <div className="diagram-tools" inert={saving}>
        {editable && (
          <>
            <button
              aria-label="실행 취소"
              title="실행 취소"
              disabled={!past.length}
              onClick={undo}
            >
              <Undo2 size={19} />
            </button>
            <button
              aria-label="다시 실행"
              title="다시 실행"
              disabled={!future.length}
              onClick={redo}
            >
              <Redo2 size={19} />
            </button>
          </>
        )}
        <label>
          확대
          <Select
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          >
            {[0.35, 0.5, 0.65, 0.8, 1, 1.25, 1.5].map((z) => (
              <option key={z} value={z}>
                {Math.round(z * 100)}%
              </option>
            ))}
          </Select>
        </label>
        {mode !== "demo" && (
          <>
            <button onClick={() => exportImage(false)}>SVG</button>
            <button onClick={() => exportImage(true)}>PNG</button>
            <button
              onClick={() =>
                download(
                  new Blob([JSON.stringify(data, null, 2)], {
                    type: "application/json",
                  }),
                  "moon-diagram.json",
                )
              }
            >
              원본 JSON
            </button>
          </>
        )}
        {editable && (
          <>
            <button onClick={() => importFile.current?.click()}>
              원본 불러오기
            </button>
            <input
              ref={importFile}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                try {
                  if (f.size > 1024 * 1024)
                    throw new Error("1MB 이하의 JSON을 선택해주세요.");
                  replaceDrawing(parseDiagram(JSON.parse(await f.text())));
                } catch (err) {
                  setError(
                    err instanceof Error
                      ? err.message
                      : "원본을 읽지 못했어요.",
                  );
                }
              }}
            />
            <button
              className="block-properties-toggle"
              aria-pressed={inspector}
              onClick={() => setInspector(!inspector)}
            >
              <SlidersHorizontal size={16} />
              속성
            </button>
          </>
        )}
      </div>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      <div
        inert={saving}
        className={`diagram-layout ${editable ? "" : "view-only"} ${!inspector ? "inspector-hidden" : ""}`}
      >
        {editable && (
          <nav className="block-shape-rail" aria-label="다이어그램 도구">
            <button
              title="선택 (Esc)"
              aria-label="선택"
              aria-pressed={tool === "select"}
              onClick={() => {
                setTool("select");
                setWireStart(null);
              }}
            >
              <MousePointer2 size={23} />
            </button>
            {(
              [
                { shape: "rect", name: "직사각형", Icon: Square },
                {
                  shape: "rounded",
                  name: "둥근 사각형",
                  Icon: RectangleHorizontal,
                },
                { shape: "ellipse", name: "원", Icon: Circle },
                { shape: "diamond", name: "마름모", Icon: Diamond },
              ] as const
            ).map(({ shape, name, Icon }) => (
              <button
                key={shape}
                title={name}
                aria-label={`${name} 추가`}
                onClick={() => {
                  setTool("select");
                  setWireStart(null);
                  add(shape);
                }}
              >
                {shape === "rect" ? (
                  <svg
                    width="23"
                    height="23"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="5" width="18" height="14" />
                  </svg>
                ) : (
                  <Icon size={23} />
                )}
              </button>
            ))}
            <span className="block-rail-divider" />
            {(
              [
                { value: "end", name: "일방향 연결선 (W)", Icon: ArrowRight },
                { value: "both", name: "양방향 연결선", Icon: ArrowLeftRight },
                { value: "none", name: "연결선", Icon: Minus },
              ] as const
            ).map(({ value, name, Icon }) => (
              <button
                key={value}
                title={name}
                aria-label={name}
                aria-pressed={tool === value}
                onClick={() => {
                  setTool(value);
                  setWireStart(null);
                  setEditing(null);
                }}
              >
                <Icon size={23} />
              </button>
            ))}
          </nav>
        )}
        <div
          className="diagram-viewport"
          tabIndex={0}
          style={{ cursor: tool === "select" ? undefined : "crosshair" }}
          onKeyDown={(e) => {
            if (!editable || e.target !== e.currentTarget) return;
            const key = e.key.toLowerCase();
            if (key === "escape") {
              e.preventDefault();
              setWireStart(null);
              setTool("select");
              return;
            }
            if ((e.ctrlKey || e.metaKey) && key === "z") {
              e.preventDefault();
              e.shiftKey ? redo() : undo();
              return;
            }
            if (key === "delete" || key === "backspace") {
              e.preventDefault();
              if (node) change(removeNode(data, node.id));
              else if (edge)
                change({
                  ...data,
                  edges: data.edges.filter((item) => item.id !== edge.id),
                });
              setSelected("");
              return;
            }
            if (
              node &&
              !e.ctrlKey &&
              !e.metaKey &&
              !e.altKey &&
              (e.key.length === 1 || e.key === "Enter" || e.key === "Process")
            ) {
              if (e.key !== "Process") e.preventDefault();
              beginEdit(
                node,
                e.key === "Enter" || e.key === "Process" ? node.label : e.key,
              );
              return;
            }
            if (key === "w") {
              e.preventDefault();
              setTool("end");
              setWireStart(null);
              return;
            }
            if (
              node &&
              ["arrowleft", "arrowright", "arrowup", "arrowdown"].includes(key)
            ) {
              e.preventDefault();
              const step = e.shiftKey ? 50 : 10;
              updateNode({
                x:
                  node.x +
                  (key === "arrowright"
                    ? step
                    : key === "arrowleft"
                      ? -step
                      : 0),
                y:
                  node.y +
                  (key === "arrowdown" ? step : key === "arrowup" ? -step : 0),
              });
            }
          }}
          aria-label="다이어그램 캔버스"
          onPointerDown={(e) => {
            if (e.target instanceof Element && e.target.closest("textarea"))
              return;
            e.currentTarget.focus();
            draw(e);
          }}
          onPointerMove={(e) => {
            dragMove(e);
            if (tool !== "select" && svg.current)
              setHover(snapEndpoint(data.nodes, point(e), 24 / zoom));
          }}
          onPointerUp={() => endDrag()}
          onPointerCancel={() => endDrag(true)}
        >
          <div style={{ width: CANVAS.width * zoom, position: "relative" }}>
            <DiagramCanvas
              data={data}
              svgRef={svg}
              selected={selected}
              onSelect={editable ? setSelected : undefined}
              onNodePointerDown={editable ? startDrag : undefined}
              onResize={editable ? startDrag : undefined}
              onEdit={editable ? beginEdit : undefined}
              grid={editable}
              wire={tool !== "select"}
              editing={editing?.id}
              preview={
                wireStart && hover && tool !== "select"
                  ? {
                      a: wireStart.point,
                      b: hover.point,
                      port: wireStart.port,
                      arrows: tool,
                    }
                  : undefined
              }
              snap={tool !== "select" && hover?.id ? hover.point : undefined}
            />
            {editing &&
              (() => {
                const n = data.nodes.find((n) => n.id === editing.id);
                return n ? (
                  <textarea
                    ref={editRef}
                    className="block-inline-text"
                    aria-label="도형 글자"
                    maxLength={200}
                    value={editing.text}
                    style={{
                      left: n.x * zoom,
                      top: n.y * zoom,
                      width: n.width * zoom,
                      height: n.height * zoom,
                      fontFamily: n.fontFamily || "sans-serif",
                      fontSize: (n.fontSize || 18) * zoom,
                    }}
                    onChange={(e) =>
                      setEditing({ ...editing, text: e.target.value })
                    }
                    onBlur={commitText}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Escape") {
                        e.preventDefault();
                        setEditing(null);
                      } else if (
                        e.key === "Enter" &&
                        (e.ctrlKey || e.metaKey)
                      ) {
                        e.preventDefault();
                        commitText();
                      }
                    }}
                  />
                ) : null;
              })()}
          </div>
        </div>
        {editable && inspector && (
          <aside className="diagram-inspector">
            <h2>속성</h2>
            {node && (
              <>
                <label>
                  글꼴
                  <Select
                    value={node.fontFamily || "sans-serif"}
                    onChange={(e) => updateNode({ fontFamily: e.target.value })}
                  >
                    <option value="sans-serif">고딕</option>
                    <option value="serif">명조</option>
                    <option value="monospace">고정폭</option>
                  </Select>
                </label>
                <label>
                  글자 크기
                  <input
                    type="number"
                    min={10}
                    max={72}
                    value={node.fontSize || 18}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      if (value >= 10 && value <= 72)
                        updateNode({ fontSize: value });
                    }}
                  />
                </label>
                <button onClick={() => beginEdit(node)}>글자 편집</button>
                <button
                  disabled={data.nodes.length >= 100}
                  onClick={() => {
                    const copy = moveNode(
                      { ...node, id: crypto.randomUUID() },
                      node.x + 30,
                      node.y + 30,
                    );
                    change({ ...data, nodes: [...data.nodes, copy] });
                    setSelected(copy.id);
                  }}
                >
                  복제
                </button>
                <button
                  onClick={() => {
                    change(removeNode(data, node.id));
                    setSelected("");
                  }}
                >
                  삭제
                </button>
              </>
            )}
            {edge && (
              <>
                <label>
                  연결선 종류
                  <Select
                    value={edge.arrows || "end"}
                    onChange={(e) =>
                      change({
                        ...data,
                        edges: data.edges.map((item) =>
                          item.id === edge.id
                            ? {
                                ...item,
                                arrows: e.target.value as
                                  | "end"
                                  | "both"
                                  | "none",
                              }
                            : item,
                        ),
                      })
                    }
                  >
                    <option value="end">일방향</option>
                    <option value="both">양방향</option>
                    <option value="none">화살표 없음</option>
                  </Select>
                </label>
                <button
                  onClick={() => {
                    change({
                      ...data,
                      edges: data.edges.filter((item) => item.id !== edge.id),
                    });
                    setSelected("");
                  }}
                >
                  삭제
                </button>
              </>
            )}
          </aside>
        )}
      </div>
    </dialog>,
    document.body,
  );
}
