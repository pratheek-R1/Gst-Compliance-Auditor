import { AnimatePresence, motion } from "framer-motion";

export function ProgressOverlay({ visible, label, progress }) {
  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-[380px] rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center"
          >
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />
            <p className="mt-5 font-display text-base font-semibold text-white">{label || "Processing..."}</p>
            <p className="mt-1.5 text-xs text-zinc-500">This may take a moment</p>
            {progress > 0 && (
              <div className="mt-5">
                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <motion.div
                    className="h-full rounded-full bg-white"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-zinc-600">{progress}%</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
