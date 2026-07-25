"use client";

import { motion } from "framer-motion";
import { ArrowRight, Play, Sparkles } from "lucide-react";

export default function Home() {
  const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.15, duration: 0.8, ease: "easeOut" },
    }),
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-black dot-grid text-zinc-100">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-10 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute top-1/2 -right-20 h-96 w-96 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
      </div>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6"
      >
        <div className="flex items-center gap-2 text-xl font-semibold tracking-tight text-white">
          <Sparkles className="h-6 w-6 text-indigo-400" />
          <span>DotGrid</span>
        </div>
        <nav className="hidden items-center gap-8 text-sm text-zinc-300 md:flex">
          <a href="#features" className="transition-colors hover:text-white">Features</a>
          <a href="#pricing" className="transition-colors hover:text-white">Pricing</a>
          <a href="#contact" className="transition-colors hover:text-white">Contact</a>
          <button className="rounded-full border border-white/10 px-4 py-2 transition-colors hover:bg-white/10">
            Get Started
          </button>
        </nav>
      </motion.header>

      {/* Hero */}
      <section className="relative mx-auto flex max-w-6xl flex-col items-center px-6 py-24 text-center md:py-32">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={0}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-indigo-300 backdrop-blur"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
          </span>
          New: AI-powered connections
        </motion.div>

        <motion.h1
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={1}
          className="mt-8 max-w-4xl text-4xl font-semibold leading-[1.1] tracking-tight md:text-6xl"
        >
          Build on a{" "}
          <span className="text-gradient bg-gradient-to-r from-indigo-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
            dot-grid
          </span>{" "}
          canvas.
        </motion.h1>

        <motion.p
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={2}
          className="mt-6 max-w-2xl text-base text-zinc-400 md:text-lg"
        >
          Design, prototype, and ship experiences with an animated dot-grid background.
          Smooth motion, modern stack, and production-ready performance.
        </motion.p>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={3}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <button className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:scale-105 active:scale-95">
            Start Building
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          <button className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-white backdrop-blur transition hover:bg-white/10">
            <Play className="h-4 w-4" />
            Watch Demo
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
          className="relative mt-16 w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl"
        >
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
            <span className="h-3 w-3 rounded-full border border-white/20 bg-white/10" />
            <span className="h-3 w-3 rounded-full border border-white/20 bg-white/10" />
            <span className="h-3 w-3 rounded-full border border-white/20 bg-white/10" />
          </div>
          <div className="relative">
            <div className="dot-grid absolute inset-0 opacity-60" />
            <div className="relative grid grid-cols-3 gap-4 p-6 md:grid-cols-4">
              {Array.from({ length: 12 }).map((_, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.4 + index * 0.07, duration: 0.5 }}
                  className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur"
                >
                  <div className="h-24 rounded-lg bg-gradient-to-br from-indigo-500/40 to-purple-500/40" />
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/10 bg-black/60 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              <span>DotGrid</span>
              <span className="text-zinc-600">·</span>
              <span>Crafted with Next.js, Tailwind, and Framer Motion</span>
            </div>
            <div className="text-sm text-zinc-500">
              v1.0.0
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
