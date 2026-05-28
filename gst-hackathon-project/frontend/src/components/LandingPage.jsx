import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Zap, FileCheck, Lock, Bot, BarChart3 } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "2-Second Reconciliation",
    description: "Upload two Excel files. Get complete fuzzy-matched reconciliation in seconds, not hours.",
  },
  {
    icon: ShieldCheck,
    title: "Section 17(5) Legal Check",
    description: "Deterministic code catches blocked credits — restaurant bills, motor vehicles, club fees — before you file.",
  },
  {
    icon: FileCheck,
    title: "Pre-Filing Report",
    description: "One printable page. ITC breakdown, filing checklist, audit trail. The deliverable your CA actually needs.",
  },
  {
    icon: Bot,
    title: "AI Copilot",
    description: "Context-aware explanations and auto-drafted vendor follow-ups powered by Gemini 2.5 Flash.",
  },
  {
    icon: BarChart3,
    title: "Vendor Risk Profiling",
    description: "Identifies habitual defaulters costing you ITC. Profiles suppliers, not just invoices.",
  },
  {
    icon: Lock,
    title: "100% On-Premise",
    description: "Zero client data leaves your machine. No cloud uploads. No privacy risk. Fully local.",
  },
];

const stats = [
  { value: "2s", label: "Reconciliation time" },
  { value: "20+", label: "Regulatory checks" },
  { value: "0", label: "Data sent externally" },
  { value: "100%", label: "Deterministic accuracy" },
];

export function LandingPage({ onGetStarted }) {
  return (
    <div className="relative min-h-screen bg-[#09090b] overflow-hidden">
      {/* Subtle grid */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundSize: "60px 60px",
        backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
      }} />

      {/* Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-sky-500/[0.07] rounded-full blur-[120px]" />

      <div className="relative">
        {/* Nav */}
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-zinc-950">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-semibold text-white">GST Audit Assistant</span>
          </div>
          <button
            onClick={onGetStarted}
            className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-700 hover:text-white"
          >
            Open Workspace
          </button>
        </nav>

        {/* Hero */}
        <section className="mx-auto max-w-4xl px-6 pt-20 pb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Built for Indian CAs, Auditors & Commerce Teams
            </div>

            <h1 className="mt-6 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
              Catch GST errors in 2 seconds.
              <br />
              <span className="text-zinc-500">Before the government catches you.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-zinc-500">
              Upload your Purchase Register and GSTR-2B. Get instant fuzzy-matched reconciliation,
              blocked credit detection, and a printable pre-filing report.
              Deterministic. Auditable. 100% local.
            </p>

            <div className="mt-8 flex items-center justify-center gap-4">
              <motion.button
                onClick={onGetStarted}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2.5 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-zinc-950 shadow-lg shadow-white/10 transition hover:bg-zinc-100"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </motion.button>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-6 py-3 text-sm font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
              >
                View Source
              </a>
            </div>
          </motion.div>
        </section>

        {/* Stats */}
        <section className="mx-auto max-w-4xl px-6 pb-16">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-center"
              >
                <p className="font-display text-2xl font-bold text-white">{stat.value}</p>
                <p className="mt-1 text-xs text-zinc-600">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* The Problem */}
        <section className="mx-auto max-w-4xl px-6 pb-20">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 md:p-10">
            <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-600">The Problem</p>
            <h2 className="mt-3 font-display text-2xl font-semibold text-white">
              The GST system is designed to automatically punish filing mistakes.
            </h2>
            <p className="mt-4 text-sm leading-7 text-zinc-500">
              Every month, the GSTN portal auto-generates millions of mismatch notices. A single missed invoice
              costs your client 18% interest plus penalties. Right now, CAs discover these errors 2 years later
              when a DRC-01 demand notice arrives. We built this tool so you catch them in 2 seconds — before you file.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <p className="font-display text-xl font-bold text-rose-400">2-5%</p>
                <p className="mt-1 text-xs text-zinc-600">ITC silently lost by avg MSME annually</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <p className="font-display text-xl font-bold text-amber-400">18%</p>
                <p className="mt-1 text-xs text-zinc-600">Interest on wrongly claimed ITC</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <p className="font-display text-xl font-bold text-emerald-400">6-8 hrs</p>
                <p className="mt-1 text-xs text-zinc-600">Manual VLOOKUP time per client</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-5xl px-6 pb-20">
          <div className="text-center">
            <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-600">What It Does</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-white">Nine modules. One workflow.</h2>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 transition hover:border-zinc-700"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-sm font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-xs leading-5 text-zinc-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Why Not ChatGPT */}
        <section className="mx-auto max-w-4xl px-6 pb-20">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 md:p-10">
            <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-600">Why Not Just Use ChatGPT?</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <p className="text-xs font-semibold text-white">Can't upload 50K rows</p>
                <p className="mt-1 text-[11px] text-zinc-600">Token limits kill large datasets. Our Pandas engine has no limit.</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <p className="text-xs font-semibold text-white">Hallucinates legal advice</p>
                <p className="mt-1 text-[11px] text-zinc-600">Our checks are deterministic code. Same answer, every time.</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <p className="text-xs font-semibold text-white">No audit trail</p>
                <p className="mt-1 text-[11px] text-zinc-600">"ChatGPT told me" isn't a legal defense. Our reports are printable proof.</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <p className="text-xs font-semibold text-white">Data privacy risk</p>
                <p className="mt-1 text-[11px] text-zinc-600">Client GSTINs on OpenAI servers = confidentiality breach. We run 100% local.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-4xl px-6 pb-20 text-center">
          <h2 className="font-display text-2xl font-semibold text-white">Ready to stop filing blind?</h2>
          <p className="mt-2 text-sm text-zinc-500">Upload your ledgers. Run the check. Print the report. File with confidence.</p>
          <motion.button
            onClick={onGetStarted}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="mt-6 inline-flex items-center gap-2.5 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-zinc-950 shadow-lg shadow-white/10 transition hover:bg-zinc-100"
          >
            Open Audit Workspace
            <ArrowRight className="h-4 w-4" />
          </motion.button>
        </section>

        {/* Footer */}
        <footer className="border-t border-zinc-800 py-8 text-center">
          <p className="text-xs text-zinc-700">
            Built with FastAPI, Pandas, React, and Gemini 2.5 Flash. Runs entirely on-premise.
          </p>
        </footer>
      </div>
    </div>
  );
}
