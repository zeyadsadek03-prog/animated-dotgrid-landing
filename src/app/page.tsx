'use client';

import React from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useMotionTemplate,
  animate,
} from 'framer-motion';
import { ORG_TREE, type OrgNode } from './orgData';

// Zoom bounds + pan clamp so the chart can be explored but never lost.
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2.5;
const PAN_BOUND_X = 480;
const PAN_BOUND_Y = 360;
const FIT_MARGIN = 24; // px breathing room around the tree when auto-fitting

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

/**
 * Recursive top-down tidy tree node.
 * Connector grammar: vertical drop from parent -> horizontal distributed bar
 * across the children row -> short vertical drop into EACH child.
 * The horizontal bar is built from per-child half segments (first child gets
 * the right half, last child the left half, middle children the full width),
 * which scales to any number of children at any depth.
 */
function OrgTreeNode({
  data,
  expanded,
  onToggle,
}: {
  data: OrgNode;
  expanded: Set<string>;
  onToggle: (id: string) => void;
}) {
  const hasChildren = data.children.length > 0;
  const isOpen = expanded.has(data.id);

  return (
    <div className="flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35 }}
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

      <AnimatePresence>
        {hasChildren && isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="mt-8 flex flex-col items-center"
          >
            {/* 1. vertical drop descending from the parent node */}
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
                transition={{ duration: 0.4, ease: 'easeInOut' }}
              />
            </svg>

            {/* children row: NEVER wraps (flex-nowrap + w-max) so 3-across
                stays 3-across on mobile — no 2+1 wrap. */}
            <div className="flex flex-nowrap items-start justify-center w-max min-w-max">
              {data.children.map((child, i) => {
                const isFirst = i === 0;
                const isLast = i === data.children.length - 1;
                const single = data.children.length === 1;
                return (
                  <div
                    key={child.id}
                    className="relative flex min-w-[140px] flex-col items-center px-5"
                  >
                    {/* 2. horizontal bar segment (skipped for a single child) */}
                    {!single && (
                      <motion.div
                        aria-hidden="true"
                        className={`absolute top-0 h-[2px] rounded-full bg-blue-600 ${
                          isFirst
                            ? 'left-1/2 right-0 origin-left'
                            : isLast
                              ? 'left-0 right-1/2 origin-right'
                              : 'inset-x-0 origin-center'
                        }`}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.35, delay: 0.4, ease: 'easeInOut' }}
                      />
                    )}

                    {/* 3. short vertical drop from the bar into EACH child */}
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
                        transition={{ duration: 0.35, delay: 0.7, ease: 'easeInOut' }}
                      />
                    </svg>

                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, delay: 1.0 + i * 0.08 }}
                    >
                      <OrgTreeNode data={child} expanded={expanded} onToggle={onToggle} />
                    </motion.div>
                  </div>
                );
              })}
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

  const toggle = React.useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Shared pan offset: drives BOTH the chart translate and the dot-grid
  // background-position, so dots shift with the drag but never change size.
  const panX = useMotionValue(0);
  const panY = useMotionValue(0);
  const scale = useMotionValue(1);
  const dotPosition = useMotionTemplate`${panX}px ${panY}px`;

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

  // --- Auto-fit / reset on root reveal-collapse ------------------------------
  const rootOpen = expanded.has(ORG_TREE.id);
  const expandedKey = Array.from(expanded).sort().join(',');

  React.useEffect(() => {
    const fitOptions = { duration: 0.55, ease: 'easeInOut' as const };

    if (!rootOpen) {
      // Collapsed: smoothly reset to the default view.
      animate(scale, 1, fitOptions);
      animate(panX, 0, fitOptions);
      animate(panY, 0, fitOptions);
      return;
    }

    // Root revealed/expanded: measure the (untransformed) tree and, if it
    // overflows the viewport, smoothly zoom out so the whole tree fits.
    const raf = requestAnimationFrame(() => {
      const el = chartRef.current;
      if (!el) return;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const vw = window.innerWidth - FIT_MARGIN * 2;
      const vh = window.innerHeight - FIT_MARGIN * 2;
      if (w <= 0 || h <= 0) return;
      const fit = Math.min(vw / w, vh / h, 1);
      const target = clampValue(fit, MIN_ZOOM, MAX_ZOOM);
      animate(scale, target, fitOptions);
      animate(panX, 0, fitOptions);
      animate(panY, 0, fitOptions);
    });
    return () => cancelAnimationFrame(raf);
    // Re-run whenever the set of expanded nodes changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootOpen, expandedKey]);

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
        className="relative px-6 py-16"
        style={{ x: panX, y: panY, scale, transformOrigin: 'top center' }}
      >
        <h1 className="text-center text-3xl font-bold tracking-tight text-zinc-900">
          Organization
        </h1>
        <div className="mt-12 flex justify-center">
          <div ref={chartRef} className="w-max min-w-max">
            <OrgTreeNode data={ORG_TREE} expanded={expanded} onToggle={toggle} />
          </div>
        </div>
      </motion.section>
    </motion.main>
  );
}
