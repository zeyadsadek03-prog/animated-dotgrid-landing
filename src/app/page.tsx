'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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

const GRID = 24; // must match .dot-grid background-size
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.5;
const DRAG_THRESHOLD = 4; // px before a pointer-down becomes a pan

export default function Home() {
  const [revealed, setRevealed] = React.useState(false);
  const [view, setView] = React.useState({ x: 0, y: 0, zoom: 1 });
  const [dragging, setDragging] = React.useState(false);

  const viewportRef = React.useRef<HTMLElement | null>(null);
  const viewRef = React.useRef(view);
  viewRef.current = view;

  // Wheel zoom (non-passive so we can prevent page scroll)
  React.useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setView((v) => {
        const next = Math.min(
          MAX_ZOOM,
          Math.max(MIN_ZOOM, v.zoom * Math.exp(-e.deltaY * 0.0015))
        );
        return { ...v, zoom: next };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Click-drag panning (window listeners so the root button click still works)
  const onPointerDown = React.useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const origin = { x: viewRef.current.x, y: viewRef.current.y };
    let started = false;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!started && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      if (!started) {
        started = true;
        setDragging(true);
      }
      setView((v) => ({ ...v, x: origin.x + dx, y: origin.y + dy }));
    };
    const onUp = () => {
      setDragging(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, []);

  // Dot grid slides with pan (modulo one grid period) but NEVER scales with zoom
  const bgX = ((view.x % GRID) + GRID) % GRID;
  const bgY = ((view.y % GRID) + GRID) % GRID;

  return (
    <main
      ref={viewportRef}
      onPointerDown={onPointerDown}
      className={`relative h-screen w-screen overflow-hidden select-none ${
        dragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      style={{ touchAction: 'none' }}
    >
      {/* Fixed-size dot-grid background: translates with pan, never scales */}
      <div
        aria-hidden="true"
        className="dot-grid absolute -inset-8 pointer-events-none"
        style={{
          transform: `translate3d(${bgX}px, ${bgY}px, 0)`,
          willChange: 'transform',
        }}
      />

      {/* Zoom/pan content wrapper — transforms apply here, not to the background */}
      <div
        className="relative h-full w-full"
        style={{
          transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.zoom})`,
          transformOrigin: '50% 50%',
          willChange: 'transform',
        }}
      >
        <section className="mx-auto max-w-6xl px-6 py-16">
          <h1 className="text-center text-3xl font-bold tracking-tight text-zinc-900">
            Organization
          </h1>
          <div className="mt-12 flex justify-center">
            <OrgNode data={TREE[0]} revealed={revealed} onReveal={() => setRevealed((r) => !r)} />
          </div>
        </section>
      </div>
    </main>
  );
}
