'use client';

import { motion } from "framer-motion";

interface OrgNodeData {
  id: string;
  name: string;
  title: string;
  children: OrgNodeData[];
}

const TREE: OrgNodeData[] = [
  {
    id: "root",
    name: "Grand-Grand-Grand-Grandfather",
    title: "chief patriarch",
    children: [
      { id: "c1", name: "Uncle Alpha", title: "operations", children: [] },
      { id: "c2", name: "Aunt Beta", title: "strategy", children: [] },
      { id: "c3", name: "Cousin Gamma", title: "finance", children: [] },
      { id: "c4", name: "Cousin Delta", title: "people", children: [] },
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
}: {
  data: OrgNodeData;
}) {
  const hasChildren = data.children.length > 0;

  return (
    <div className="flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col items-center"
      >
        <div className="relative flex items-center justify-center w-24 h-24 rounded-full border-2 border-dashed border-blue-500 bg-white">
          <div className="text-blue-600">
            <UserIcon className="w-12 h-12" />
          </div>
        </div>

        <div className="mt-3 max-w-[220px] rounded-full bg-blue-600 px-5 py-2 text-center">
          <p className="text-sm font-extrabold uppercase tracking-wide text-white">
            {data.name}
          </p>
          <p className="text-xs font-medium lowercase text-white/80">
            {data.title}
          </p>
        </div>
      </motion.div>

      {hasChildren && (
        <div className="mt-8 flex flex-col items-center w-full">
          <svg
            aria-hidden="true"
            className="block overflow-visible"
            width="2"
            height="40"
            viewBox={`0 0 2 40`}
          >
            <motion.line
              x1="1"
              y1="0"
              x2="1"
              y2="40"
              stroke="#2563eb"
              strokeWidth="2"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            />
          </svg>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.08 } },
            }}
            className="flex flex-wrap items-start justify-center gap-x-10 gap-y-14 w-full max-w-4xl"
          >
            {data.children.map((child) => (
              <motion.div
                key={child.id}
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: { opacity: 1, y: 0 },
                }}
                transition={{ duration: 0.45 }}
              >
                <OrgNode data={child} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <main className="relative min-h-screen dot-grid">
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="text-center text-3xl font-bold tracking-tight text-zinc-900">
          Organization
        </h1>
        <div className="mt-12 flex justify-center">
          <OrgNode data={TREE[0]} />
        </div>
      </section>
    </main>
  );
}
