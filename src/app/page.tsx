'use client';

import React from 'react';
import {
  motion,
  AnimatePresence,
  LayoutGroup,
  useMotionValue,
  useMotionTemplate,
  animate,
  type MotionValue,
} from 'framer-motion';
import { ORG_TREE, type OrgNode } from './orgData';

// Zoom bounds + pan clamp so the chart can be explored but never lost.
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2.5;
const PAN_BOUND_X = 480;
const PAN_BOUND_Y = 360;
const FIT_MARGIN = 24; // px breathing room around the framed subtree
const CAM_TOP_MARGIN = 80; // comfortable top margin when framing a subtree

// COLLAPSE SEQUENCING: the children/connector exit fade (0.35s, opacity-only)
// must fully finish IN PLACE before the drill-down camera reverses. Starting
// the camera pan/zoom while children are mid-fade makes the camera motion
// carry them (~59px slide = clunky). A setTimeout gate is fragile (the timer
// and the fade drift out of phase), so instead the camera reverse is anchored
// to the ACTUAL fade completion via AnimatePresence's onExitComplete callback.

// Parent lookup for the drill-down camera: collapsing a node pulls the view
// back up to frame its PARENT's subtree.
const PARENT_OF = new Map<string, string>();
(function indexParents(node: OrgNode) {
  node.children.forEach((child) => {
    PARENT_OF.set(child.id, node.id);
    indexParents(child);
  });
})(ORG_TREE);

function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      aria-hidden="true"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

// Connector geometry (px, in the row's local/untransformed coordinate space).
const DROP_TOP = 32; // vertical drop from the parent down to the bar
const DROP_CHILD = 28; // short vertical drop from the bar into each child
const CONNECTOR_H = DROP_TOP + DROP_CHILD;

/**
 * Recursive top-down tidy tree node.
 * Connector grammar: vertical drop from parent -> horizontal distributed bar
 * across the children row -> short vertical drop into EACH child.
 * The whole connector for a children row is ONE measured SVG path (parent
 * drop + bar + every child drop) drawn with a single pathLength animation,
 * so it renders as one coherent stroke. Child x-centers are measured from
 * layout (offsetLeft/offsetWidth — immune to the zoom transform) and kept
 * fresh with a ResizeObserver, so drops always land exactly on each child.
 *
 * The outermost div of every node is registered by id: its layout size
 * (offsetWidth/offsetHeight) equals the node PLUS all currently-open
 * descendants, which is exactly what the drill-down camera needs to frame.
 */
function OrgTreeNode({
  data,
  expanded,
  onToggle,
  registerNode,
  onCollapseComplete,
  cameraScale,
}: {
  data: OrgNode;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  registerNode: (id: string, el: HTMLElement | null) => void;
  onCollapseComplete: (id: string) => void;
  cameraScale: MotionValue<number>;
}) {
  const hasChildren = data.children.length > 0;
  const isOpen = expanded.has(data.id);

  const rowRef = React.useRef<HTMLDivElement>(null);
  const cellRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const [geo, setGeo] = React.useState<{
    width: number;
    centers: number[];
  } | null>(null);

  // Measure the children row + each child cell.
  //
  // Centers are read from getBoundingClientRect (which DOES reflect Framer
  // Motion's layout transforms) and normalized by the row's live scale factor
  // (k = layoutWidth / rectWidth) so they are exact ROW-local coordinates even
  // while the zoom/pan camera is scaled. Crucially, when a descendant expands
  // and this row REFLOWS, the sibling cells glide via `layout` transforms —
  // offsetLeft/offsetWidth would jump straight to the final value, so instead
  // we run a short requestAnimationFrame loop (kicked off by the ResizeObserver
  // that fires the instant layout changes) that re-measures every frame for the
  // animation window. This keeps the unified connector path IN SYNC with the
  // gliding nodes: the bar extends/retracts and the drops track each child
  // smoothly, never snapping to the final geometry mid-animation.
  React.useLayoutEffect(() => {
    if (!isOpen || !hasChildren) return;

    let rafId = 0;
    let trackUntil = 0;

    const apply = () => {
      const row = rowRef.current;
      if (!row) return;
      const rowRect = row.getBoundingClientRect();
      const layoutWidth = row.offsetWidth;
      // The chart row is only scaled by the camera, so the exact layout->screen
      // factor is 1/cameraScale. Using row.offsetWidth/rowRect.width here would
      // spike for one frame during reflow (offsetWidth snaps to final while the
      // screen rect glides), jumping the connector endpoint. 1/scale animates
      // smoothly with the camera. offsetWidth is still used for the SVG canvas.
      const cs = cameraScale.get();
      const k = cs > 0 ? 1 / cs : 1;
      const centers = cellRefs.current
        .slice(0, data.children.length)
        .map((cell) => {
          if (!cell) return 0;
          const r = cell.getBoundingClientRect();
          return (r.left - rowRect.left + r.width / 2) * k;
        });
      setGeo((prev) => {
        const next = { width: layoutWidth, centers };
        if (
          prev &&
          prev.width === next.width &&
          prev.centers.length === next.centers.length &&
          prev.centers.every((c, i) => Math.abs(c - next.centers[i]) < 0.01)
        ) {
          stableFrames.current += 1;
          if (stableFrames.current >= 6 && !drawn) setDrawn(true);
          return prev;
        }
        stableFrames.current = 0;
        return next;
      });
    };

    const tick = () => {
      apply();
      if (performance.now() < trackUntil) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = 0;
      }
    };

    // A layout change (row/cell size shift) fires the ResizeObserver at the
    // START of the reflow; we then track for the animation window so the
    // connector follows the gliding cells frame-by-frame instead of snapping.
    const startTracking = () => {
      trackUntil = performance.now() + 550;
      if (!rafId) rafId = requestAnimationFrame(tick);
    };

    apply();
    const observer = new ResizeObserver(startTracking);
    if (rowRef.current) observer.observe(rowRef.current);
    cellRefs.current.slice(0, data.children.length).forEach((cell) => {
      if (cell) observer.observe(cell);
    });
    return () => {
      observer.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isOpen, hasChildren, data.children.length]);

  // Connector draw-on SEQUENCING flag. On expand the node layout reflow
  // (0.4s) + drill-down camera pan (0.55s) move the whole subtree; if the
  // pathLength draw ran during that window the line would "draw in" over
  // sliding geometry (slippery, worst on a nested/middle parent). So we keep
  // the connector invisible (pathLength 0) until the reflow/camera window has
  // essentially settled, THEN draw it cleanly onto the now-placed avatars.
  // The per-row rAF geo tracking still runs the whole time, so the path `d`
  // is already final by the time we draw. Reset to false whenever the row
  // closes so the next open re-sequences from scratch.
  const [drawn, setDrawn] = React.useState(false);
  const stableFrames = React.useRef(0);
  const prevGeo = React.useRef<typeof geo>(null);
  const drawnGeo = React.useRef<typeof geo>(null);
  React.useLayoutEffect(() => {
    if (!isOpen || !hasChildren) {
      setDrawn(false);
      stableFrames.current = 0;
      prevGeo.current = null;
      drawnGeo.current = null;
      return;
    }
    if (!geo) return;
    if (!prevGeo.current || prevGeo.current.width !== geo.width || prevGeo.current.centers.length !== geo.centers.length || prevGeo.current.centers.some((c, i) => Math.abs(c - geo.centers[i]) >= 0.01)) {
      stableFrames.current = 0;
    } else {
      stableFrames.current += 1;
      if (stableFrames.current >= 6 && !drawn) {
        setDrawn(true);
        drawnGeo.current = geo;
      }
    }
    prevGeo.current = geo;
  }, [geo, isOpen, hasChildren, drawn]);

  // Single unified connector path: parent drop, then the horizontal bar
  // (first child center -> last child center), then a drop into EACH child.
  const connectorPath = React.useMemo(() => {
    if (!geo || geo.centers.length === 0) return '';
    const cx = geo.width / 2;
    if (geo.centers.length === 1) {
      const c = geo.centers[0];
      return `M ${cx} 0 V ${DROP_TOP} M ${c} ${DROP_TOP} V ${CONNECTOR_H}`;
    }
    const first = geo.centers[0];
    const last = geo.centers[geo.centers.length - 1];
    const drops = geo.centers
      .map((c) => `M ${c} ${DROP_TOP} V ${CONNECTOR_H}`)
      .join(' ');
    return `M ${cx} 0 V ${DROP_TOP} M ${first} ${DROP_TOP} H ${last} ${drops}`;
  }, [geo]);

  return (
    <div
      ref={(el) => {
        registerNode(data.id, el);
      }}
      className="flex flex-col items-center"
    >
      <motion.div
        layout="position"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          opacity: { duration: 0.35 },
          layout: { duration: 0.4, ease: 'easeInOut' },
        }}
        className="flex flex-col items-center"
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(data.id);
          }}
          className="relative flex items-center justify-center w-24 h-24 rounded-full border-2 border-dashed border-blue-500 bg-white cursor-pointer"
          aria-label={`${data.name}${
            hasChildren ? (isOpen ? ', click to collapse' : ', click to expand') : ''
          }`}
        >
          <div className="text-blue-600">
            <UserIcon className="w-12 h-12" />
          </div>
        </button>

        <div className="mt-3 max-w-[220px] rounded-full bg-blue-600 px-5 py-2 text-center">
          <p className="text-sm font-extrabold uppercase tracking-wide text-white">
            {data.name}
          </p>
        </div>
      </motion.div>

      <AnimatePresence
        onExitComplete={() => onCollapseComplete(data.id)}
      >
        {hasChildren && isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="mt-8 flex flex-col items-center"
          >
            {/* Connector canvas: the parent drop + horizontal bar + every
                child drop live in ONE <path>, drawn with a single pathLength
                animation so the whole connector appears as one coherent
                stroke — no fragmented segments, no arrowheads. */}
            <div
              aria-hidden="true"
              className="relative w-full"
              style={{ height: CONNECTOR_H }}
            >
              {geo && connectorPath && (
                <svg
                  className="absolute left-0 top-0 overflow-visible"
                  width={geo.width}
                  height={CONNECTOR_H}
                  viewBox={`0 0 ${geo.width} ${CONNECTOR_H}`}
                >
                  <motion.path
                    d={connectorPath}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: drawn ? 1 : 0 }}
                    exit={{ pathLength: 0 }}
                    transition={{ duration: 0.35, ease: 'easeInOut' }}
                  />
                </svg>
              )}
            </div>

            {/* children row: NEVER wraps (grid-flow-col + w-max/min-w-max).
                auto-cols-fr forces EQUAL cell widths, so the row center is
                exactly the middle child's center — the parent drop, bar and
                child drops all line up. */}
            <div
              ref={rowRef}
              className="grid grid-flow-col auto-cols-fr items-start justify-center w-max min-w-max"
            >
              {data.children.map((child, i) => (
                <motion.div
                  layout
                  transition={{ layout: { duration: 0.4, ease: 'easeInOut' } }}
                  key={child.id}
                  ref={(el) => {
                    cellRefs.current[i] = el;
                  }}
                  className="relative flex min-w-[140px] flex-col items-center px-5"
                >
                  {/* Fade in PLACE: opacity only, no translate/y motion. */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.45, delay: 0.55 + i * 0.08 }}
                  >
                    <OrgTreeNode
                      data={child}
                      expanded={expanded}
                      onToggle={onToggle}
                      registerNode={registerNode}
                      onCollapseComplete={onCollapseComplete}
                      cameraScale={cameraScale}
                    />
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const clampValue = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export default function Home() {
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  // Last toggle action drives the drill-down camera: expanding frames the
  // toggled node's subtree, collapsing pulls back to its parent's subtree.
  const lastAction = React.useRef<{
    id: string;
    type: 'expand' | 'collapse';
  } | null>(null);

  const toggle = React.useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        lastAction.current = { id, type: 'collapse' };
      } else {
        next.add(id);
        lastAction.current = { id, type: 'expand' };
      }
      return next;
    });
  }, []);

  // Pending camera reverse, anchored to the ACTUAL children exit fade
  // completing (AnimatePresence onExitComplete) rather than a fragile timer.
  // onCollapseComplete stashes the collapsed node id and bumps a tick that a
  // useEffect below watches — guaranteeing the camera cannot start reversing
  // until the fade is truly done.
  const pendingCamTarget = React.useRef<string | null>(null);
  const [camReverseTick, setCamReverseTick] = React.useState(0);

  const onCollapseComplete = React.useCallback((id: string) => {
    const action = lastAction.current;
    if (!action || action.type !== 'collapse' || action.id !== id) return;
    pendingCamTarget.current = id;
    setCamReverseTick((t) => t + 1);
  }, []);

  // Per-node subtree elements (outermost div of each OrgTreeNode), keyed by
  // id. offsetWidth/offsetHeight of these give UNSCALED layout size of the
  // node + all open descendants — the measurement space for the camera.
  const nodeEls = React.useRef<Map<string, HTMLElement>>(new Map());
  const registerNode = React.useCallback(
    (id: string, el: HTMLElement | null) => {
      if (el) nodeEls.current.set(id, el);
      else nodeEls.current.delete(id);
    },
    [],
  );

  // Shared pan offset: drives BOTH the chart translate and the dot-grid
  // background-position, so dots shift with the drag but never change size.
  const panX = useMotionValue(0);
  const panY = useMotionValue(0);
  const scale = useMotionValue(1);
  const dotPosition = useMotionTemplate`${panX}px ${panY}px`;

  const stageRef = React.useRef<HTMLElement>(null);
  const chartRef = React.useRef<HTMLDivElement>(null);
  const pinchDist = React.useRef<number | null>(null);

  const clampPan = (value: number, bound: number) =>
    clampValue(value, -bound, bound);

  // --- Wheel zoom (desktop) -------------------------------------------------
  const onWheel = (e: React.WheelEvent) => {
    const next = clampValue(
      scale.get() * Math.exp(-e.deltaY * 0.0015),
      MIN_ZOOM,
      MAX_ZOOM,
    );
    scale.set(next);
  };

  // --- Pinch zoom (mobile) --------------------------------------------------
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchDist.current = Math.hypot(dx, dy);
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchDist.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (dist > 0 && pinchDist.current > 0) {
        const next = clampValue(
          scale.get() * (dist / pinchDist.current),
          MIN_ZOOM,
          MAX_ZOOM,
        );
        scale.set(next);
      }
      pinchDist.current = dist;
    }
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchDist.current = null;
  };

  // --- Scoped drill-down camera ----------------------------------------------
  // On EXPAND: frame the toggled node's subtree (node + all open descendants).
  // On COLLAPSE: frame the toggled node's PARENT subtree (pull back one level);
  // collapsing the root resets to the default view. All fit math happens in
  // UNSCALED layout space (offsetWidth/offsetHeight + offsetParent chain up to
  // the zoom stage), then scale/panX/panY are animated. transformOrigin is
  // 'top center', so for a target scale s a layout point q maps to screen
  // O + pan + s*(q - O) with O = (stageWidth/2, 0).
  const expandedKey = Array.from(expanded).sort().join(',');

  const camOptions = React.useMemo(
    () => ({ duration: 0.4, ease: 'easeInOut' as const }),
    [],
  );

  // Frame a subtree by id (fit node + open descendants into the viewport).
  const frameSubtree = React.useCallback(
    (targetId: string) => {
      const el = nodeEls.current.get(targetId);
      const stage = stageRef.current;
      if (!el || !stage) return;

      // Layout-space position of the subtree relative to the zoom stage
      // (sum offsetLeft/offsetTop up the offsetParent chain — unaffected by
      // the stage's scale transform).
      let ex = 0;
      let ey = 0;
      let cur: HTMLElement | null = el;
      while (cur && cur !== stage) {
        ex += cur.offsetLeft;
        ey += cur.offsetTop;
        cur = cur.offsetParent as HTMLElement | null;
      }

      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (w <= 0 || h <= 0) return;

      const vw = document.documentElement.clientWidth;
      const vh = document.documentElement.clientHeight;

      // Fit the subtree into the viewport; never below MIN_ZOOM so names
      // stay readable, never above 1 on a plain fit.
      const s = clampValue(
        Math.min(
          (vw - FIT_MARGIN * 2) / w,
          (vh - CAM_TOP_MARGIN - FIT_MARGIN) / h,
          1,
        ),
        MIN_ZOOM,
        MAX_ZOOM,
      );

      // Center horizontally, put the subtree top at CAM_TOP_MARGIN.
      const stageW = stage.offsetWidth;
      const tx = clampPan(
        vw / 2 - stageW / 2 - s * (ex + w / 2 - stageW / 2),
        PAN_BOUND_X,
      );
      const ty = clampPan(CAM_TOP_MARGIN - s * ey, PAN_BOUND_Y);

      animate(scale, s, camOptions);
      animate(panX, tx, camOptions);
      animate(panY, ty, camOptions);
    },
    [camOptions, panX, panY, scale],
  );

  // EXPAND camera: frame the toggled node's subtree on the next frame (children
  // mount synchronously). Runs immediately — expand is unchanged.
  React.useEffect(() => {
    const action = lastAction.current;
    if (!action || action.type !== 'expand') return;
    const raf = requestAnimationFrame(() => frameSubtree(action.id));
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedKey]);

  // COLLAPSE camera reverse: ANCHORED to the children exit fade completing
  // (onCollapseComplete -> camReverseTick), never a timer. Because this only
  // fires AFTER AnimatePresence reports the 0.35s opacity exit finished, the
  // camera motion values (scale/panX/panY) stay perfectly constant while the
  // children fade — no slide — then reverse one level: to the collapsed node's
  // PARENT subtree, or the default view when the root collapsed.
  React.useEffect(() => {
    if (camReverseTick === 0) return;
    const collapsedId = pendingCamTarget.current;
    if (collapsedId === null) return;
    pendingCamTarget.current = null;

    const parentId = PARENT_OF.get(collapsedId) ?? null;
    if (parentId === null) {
      // Root collapsed: reset to the default view.
      animate(scale, 1, camOptions);
      animate(panX, 0, camOptions);
      animate(panY, 0, camOptions);
      return;
    }
    // Nested: fit the collapsed node's parent subtree. Departing children are
    // already unmounted, so the parent-subtree measurement is accurate.
    frameSubtree(parentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camReverseTick]);

  // ONE tree everywhere: the same recursive zoom/pan tree renders on every
  // viewport. On mobile the pinch-zoom + drag-pan handlers above apply.
  return (
    <motion.main
      className="relative min-h-screen overflow-hidden touch-none cursor-grab active:cursor-grabbing"
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onPan={(_event, info) => {
        // Skip panning mid-pinch so the two gestures don't fight.
        if (pinchDist.current !== null) return;
        panX.set(clampPan(panX.get() + info.delta.x, PAN_BOUND_X));
        panY.set(clampPan(panY.get() + info.delta.y, PAN_BOUND_Y));
      }}
    >
      {/* Fixed dot-grid layer: constant dot size/spacing (24px). Only the
          background-position translates with the pan offset — zoom scaling
          NEVER touches this layer, so dots never resize. */}
      <motion.div
        aria-hidden="true"
        className="dot-grid pointer-events-none fixed inset-0"
        style={{ backgroundPosition: dotPosition }}
      />

      {/* Zoom/pan stage: scales with zoom, translates with pan. */}
      <motion.section
        ref={stageRef}
        className="relative px-6 py-16"
        style={{ x: panX, y: panY, scale, transformOrigin: 'top center' }}
      >
        <h1 className="text-center text-3xl font-bold tracking-tight text-zinc-900">
          Organization
        </h1>
        <div className="mt-12 flex justify-center">
          <div ref={chartRef} className="w-max min-w-max">
              {/* LayoutGroup gives the WHOLE recursive tree (every node, every
                  children-row and its connector) a single shared layout-animation
                  context. Without it, collapsing a subtree removes nested nodes
                  whose size change never propagates up to the parent row's
                  reflow, so sibling cells + the connector snap in one frame on
                  collapse. With it, the parent row's `layout` cells and the
                  rAF-tracked connector interpolate the collapse gradually — same
                  as expand. Camera (scale/panX/panY) is untouched. */}
              <LayoutGroup>
                <OrgTreeNode
                  data={ORG_TREE}
                  expanded={expanded}
                  onToggle={toggle}
                  registerNode={registerNode}
                  onCollapseComplete={onCollapseComplete}
                  cameraScale={scale}
                />
              </LayoutGroup>
            </div>
        </div>
      </motion.section>
    </motion.main>
  );
}
