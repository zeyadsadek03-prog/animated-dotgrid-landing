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
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col items-center"
      >
        <button
          type="button"
          onClick={onReveal}
          className="relative flex items-center justify-center w-24 h-24 rounded-full border-2 border-dashed border-blue-500 bg-white cursor-pointer"
          aria-label={`${data.name}${isRoot && hasChildren && !revealed ? ', click to expand' : ''}`}
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
            exit={{ opacity: 0 }}
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
                      transition={{ duration: 0.35, delay: 0.7, ease: 'easeInOut' }}
                    />
                  </svg>
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
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

export default function Home() {
  const [revealed, setRevealed] = React.useState(false);

  return (
    <main className="relative min-h-screen dot-grid">
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="text-center text-3xl font-bold tracking-tight text-zinc-900">
          Organization
        </h1>
        <div className="mt-12 flex justify-center">
          <OrgNode data={TREE[0]} revealed={revealed} onReveal={() => setRevealed(true)} />
        </div>
      </section>
    </main>
  );
}
