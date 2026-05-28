import { motion } from "framer-motion";

export function StatCard({ icon: Icon, label, value, hint, accent = "cyan", delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className={`glass-panel p-5 accent-${accent}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">{label}</p>
        <Icon className="h-4 w-4 text-zinc-600" />
      </div>
      <p className="mt-3 font-display text-2xl font-semibold text-white">{value}</p>
      {hint && <p className="mt-1.5 text-xs text-zinc-600">{hint}</p>}
    </motion.div>
  );
}
