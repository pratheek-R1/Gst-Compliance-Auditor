import { motion } from "framer-motion";
import { ShieldCheck, Wifi } from "lucide-react";

function HealthPill({ apiHealth }) {
  const isOnline = apiHealth === "online";

  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400">
      <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-400" : "bg-rose-400"}`} />
      <Wifi className="h-3 w-3" />
      API {isOnline ? "Online" : apiHealth === "checking" ? "..." : "Offline"}
    </div>
  );
}

export function Sidebar({ sections, activeSection, onSelect, apiHealth }) {
  return (
    <aside className="glass-panel relative md:sticky md:top-4 md:h-[calc(100vh-2rem)] md:w-[280px] md:min-w-[280px]">
      <div className="flex h-full flex-col p-4 md:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-zinc-950">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-base font-semibold text-white">GST Audit</p>
            <p className="text-xs text-zinc-500">Workstation</p>
          </div>
        </div>

        <div className="mt-4">
          <HealthPill apiHealth={apiHealth} />
        </div>

        <nav className="mt-5 flex gap-2 overflow-x-auto pb-2 md:flex-1 md:flex-col md:overflow-y-auto">
          {sections.map((section, index) => {
            const Icon = section.icon;
            const active = activeSection === section.key;

            return (
              <motion.button
                key={section.key}
                type="button"
                onClick={() => onSelect(section.key)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 * index }}
                className={`group min-w-[200px] rounded-xl px-3 py-2.5 text-left transition-all duration-150 md:min-w-0 ${
                  active
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 shrink-0 ${active ? "text-white" : "text-zinc-600"}`} />
                  <div>
                    <p className={`text-sm font-medium ${active ? "text-white" : ""}`}>{section.label}</p>
                    <p className="text-[11px] text-zinc-600">{section.description}</p>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </nav>

        <div className="mt-auto pt-4 border-t border-zinc-800">
          <p className="text-[11px] text-zinc-600 leading-5">
            Built with FastAPI, Pandas, and Gemini 2.5 Flash. Runs entirely on-premise.
          </p>
        </div>
      </div>
    </aside>
  );
}
