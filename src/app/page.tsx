'use client';

import React from 'react';
import {
  motion,
  AnimatePresence,
  animate,
  useMotionValue,
  useMotionTemplate,
} from 'framer-motion';

interface OrgNodeData {
  id: string;
  name: string;
  children: OrgNodeData[];
}

const TREE: OrgNodeData[] = [
  {
    id: 'root',
    name: 'Idris',
    children: [
      { id: 'c1', name: 'Osama', children: [] },
      { id: 'c2', name: 'Nessrin', children: [] },
      { id: 'c3', name: 'Mohamed', children: [] },
    ],
  },
];

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

function OrgNode({
  data,
  revealed,
  onReveal,
}: {
  data: OrgNodeData;
  revealed: boolean;
  onReveal: () => void;
}) {
  const hasChildren = data.children.length > 0;
  const isRoot = data.id === 'root';

  return (
    <div className="flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col items-center"
      >
        <button
          type="button"
          onClick={onReveal}
          className="relative flex items-center justify-center w-24 h-24 rounded-full border-2 border-dashed border-blue-500 bg-white cursor-pointer"
          aria-label={`${data.name}${isRoot && hasChildren ? (revealed ? ', click to collapse' : ', click to expand') : ''}`}
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

      <AnimatePresence>
        {hasChildren && revealed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2, delay: 1.15 } }}
            transition={{ duration: 0.35 }}
            className="mt-8 flex flex-col items-center w-full"
          >
            {/* 1. vertical drop descending from the root node */}
            <svg
              aria-hidden="true"
              className="block overflow-visible"
              width="2"
              height="32"
              viewBox="0 0 2 32"
            >
              <motion.line
                x1="1"
                y1="0"
                x2="1"
                y2="32"
                stroke="#2563eb"
                strokeWidth="2"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                exit={{ pathLength: 0, transition: { duration: 0.4, delay: 0.85, ease: 'easeInOut' } }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
              />
            </svg>

            {/* children row + connector hierarchy */}
            <div className="relative flex flex-wrap items-start justify-center gap-x-10 gap-y-14 w-fit mx-auto">
              {/* 2. horizontal bar spanning the full width of the three children */}
              <motion.div
                aria-hidden="true"
                className="absolute top-0 left-[14%] right-[14%] h-[2px] rounded-full bg-blue-600 origin-center"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                exit={{ scaleX: 0, transition: { duration: 0.35, delay: 0.55, ease: 'easeInOut' } }}
                transition={{ duration: 0.35, delay: 0.4, ease: 'easeInOut' }}
              />

              {data.children.map((child, i) => (
                <div key={child.id} className="flex w-[140px] flex-col items-center">
                  {/* 3. short vertical drop connecting the bar down to EACH child */}
                  <svg
                    aria-hidden="true"
                    className="block overflow-visible"
                    width="2"
                    height="28"
                    viewBox="0 0 2 28"
                  >
                    <motion.line
                      x1="1"
                      y1="0"
                      x2="1"
                      y2="28"
                      stroke="#2563eb"
                      strokeWidth="2"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      exit={{ pathLength: 0, transition: { duration: 0.35, delay: 0.25, ease: 'easeInOut' } }}
                      transition={{ duration: 0.35, delay: 0.7, ease: 'easeInOut' }}
                    />
                  </svg>
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12, transition: { duration: 0.3, delay: i * 0.05 } }}
                    transition={{ duration: 0.45, delay: 1.0 + i * 0.08 }}
                  >
                    <OrgNode data={child} revealed={true} onReveal={() => {}} />
                  </motion.div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2.5;
const DRAG_THRESHOLD = 4; // px before a pointer-down becomes a pan
const FIT_PADDING = 0.88; // leave a small margin around the fitted tree
const MIN_VISIBLE = 80; // keep at least this many px of content on screen when panning

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

export default function Home() {
  const [revealed, setRevealed] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);

  const viewportRef = React.useRef<HTMLElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  // Zoom/pan state lives in motion values so content + dot-grid update together,
  // frame-by-frame, including during the smooth auto-fit animation.
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const zoom = useMotionValue(1);

  // Content transform (scales + translates) — applied to the chart only.
  const contentTransform = useMotionTemplate`translate(${x}px, ${y}px) scale(${zoom})`;
  // Dot-grid background-position (translates with pan, NEVER scales with zoom).
  const gridPosition = useMotionTemplate`${x}px ${y}px`;

  // Natural (unscaled) layout size of the chart, used for fit + clamp math.
  const getContentSize = React.useCallback(() => {
    const el = contentRef.current;
    if (!el) return { w: 0, h: 0 };
    return { w: el.offsetWidth, h: el.offsetHeight };
  }, []);

  // Clamp pan so the content can never be dragged fully off-screen.
  const clampPan = React.useCallback(
    (nx: number, ny: number, z: number) => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const { w, h } = getContentSize();
      const dispW = w * z;
      const dispH = h * z;
      const limX = Math.max(0, dispW / 2 + vw / 2 - MIN_VISIBLE);
      const limY = Math.max(0, dispH / 2 + vh / 2 - MIN_VISIBLE);
      return { x: clamp(nx, -limX, limX), y: clamp(ny, -limY, limY) };
    },
    [getContentSize]
  );

  const setZoom = React.useCallback(
    (z: number) => {
      const nz = clamp(z, MIN_ZOOM, MAX_ZOOM);
      zoom.set(nz);
      const p = clampPan(x.get(), y.get(), nz);
      x.set(p.x);
      y.set(p.y);
    },
    [zoom, x, y, clampPan]
  );

  // ---- Desktop wheel zoom (non-passive so the page doesn't scroll) ----
  React.useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(zoom.get() * Math.exp(-e.deltaY * 0.0015));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [setZoom, zoom]);

  // ---- Pointer-based pan (mouse + 1-finger) and pinch (2-finger) zoom ----
  const pointers = React.useRef<Map<number, { x: number; y: number }>>(new Map());
  const panStart = React.useRef({ px: 0, py: 0, x: 0, y: 0 });
  const pinchStart = React.useRef({ dist: 0, zoom: 1 });
  const movedRef = React.useRef(false);

  const onPointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      movedRef.current = false;

      if (pointers.current.size === 1) {
        panStart.current = {
          px: e.clientX,
          py: e.clientY,
          x: x.get(),
          y: y.get(),
        };
      } else if (pointers.current.size === 2) {
        const pts = Array.from(pointers.current.values());
        pinchStart.current = {
          dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
          zoom: zoom.get(),
        };
      }
    },
    [x, y, zoom]
  );

  const onPointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.current.size >= 2) {
        // Pinch zoom
        const pts = Array.from(pointers.current.values());
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (pinchStart.current.dist > 0) {
          setZoom(pinchStart.current.zoom * (dist / pinchStart.current.dist));
        }
        movedRef.current = true;
        setDragging(true);
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        return;
      }

      // Single-pointer pan
      const dx = e.clientX - panStart.current.px;
      const dy = e.clientY - panStart.current.py;
      if (!movedRef.current && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      if (!movedRef.current) {
        movedRef.current = true;
        setDragging(true);
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      }
      const p = clampPan(
        panStart.current.x + dx,
        panStart.current.y + dy,
        zoom.get()
      );
      x.set(p.x);
      y.set(p.y);
    },
    [clampPan, setZoom, x, y, zoom]
  );

  const endPointer = React.useCallback((e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) {
      setDragging(false);
    } else if (pointers.current.size === 1) {
      // Transition from pinch back to pan: re-anchor the surviving pointer.
      const [only] = Array.from(pointers.current.values());
      panStart.current = { px: only.x, py: only.y, x: x.get(), y: y.get() };
    }
  }, [x, y]);

  // Swallow the click that ends a drag so it can't accidentally toggle reveal.
  const onClickCapture = React.useCallback((e: React.MouseEvent) => {
    if (movedRef.current) {
      e.stopPropagation();
      e.preventDefault();
      movedRef.current = false;
    }
  }, []);

  // ---- Auto-fit on reveal / reset on collapse (smooth animation) ----
  React.useEffect(() => {
    let raf1 = 0;
    let raf2 = 0;
    const opts = { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const };

    if (revealed) {
      // Wait two frames so the revealed children are laid out before measuring.
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          const { w, h } = getContentSize();
          if (!w || !h) return;
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const fit = Math.min((vw * FIT_PADDING) / w, (vh * FIT_PADDING) / h, 1);
          const target = clamp(fit, MIN_ZOOM, MAX_ZOOM);
          animate(zoom, target, opts);
          animate(x, 0, opts);
          animate(y, 0, opts);
        });
      });
    } else {
      // Reset to default view.
      animate(zoom, 1, opts);
      animate(x, 0, opts);
      animate(y, 0, opts);
    }

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [revealed, getContentSize, x, y, zoom]);

  return (
    <main
      ref={viewportRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onClickCapture={onClickCapture}
      className={`relative h-screen w-screen overflow-hidden select-none ${
        dragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      style={{ touchAction: 'none' }}
    >
      {/* Fixed-size dot-grid background: translates with pan, never scales with zoom */}
      <motion.div
        aria-hidden="true"
        className="dot-grid absolute inset-0 pointer-events-none"
        style={{ backgroundPosition: gridPosition, willChange: 'background-position' }}
      />

      {/* Zoom/pan content wrapper — transform applies here, not to the background */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          transform: contentTransform,
          transformOrigin: '50% 50%',
          willChange: 'transform',
        }}
      >
        <div ref={contentRef} className="flex flex-col items-center px-6">
          <h1 className="mb-12 text-center text-3xl font-bold tracking-tight text-zinc-900">
            Organization
          </h1>
          <OrgNode
            data={TREE[0]}
            revealed={revealed}
            onReveal={() => setRevealed((r) => !r)}
          />
        </div>
      </motion.div>
    </main>
  );
}
