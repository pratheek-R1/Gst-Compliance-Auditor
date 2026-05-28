import { motion } from "framer-motion";
import { FileUp, FileSpreadsheet, Trash2, UploadCloud } from "lucide-react";
import { useDropzone } from "react-dropzone";

export function UploadZone({ label, description, file, onChange, onClear, accent = "cyan", compact = false }) {
  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
    },
    maxFiles: 1,
    multiple: false,
    onDropAccepted: (files) => onChange(files[0]),
  });

  return (
    <motion.div
      layout
      className={`glass-panel p-4 ${compact ? "min-h-[180px]" : "min-h-[220px]"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-sm font-semibold text-white">{label}</p>
          <p className="mt-1 max-w-xs text-xs leading-5 text-zinc-500">{description}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-500">
          <FileUp className="h-4 w-4" />
        </div>
      </div>

      <div
        {...getRootProps()}
        className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 text-center transition-all duration-200 ${
          compact ? "h-[110px]" : "h-[130px]"
        } ${
          isDragReject
            ? "border-rose-500/50 bg-rose-500/5"
            : isDragActive
              ? "border-sky-500/50 bg-sky-500/5"
              : "border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900/50"
        }`}
      >
        <input {...getInputProps()} />
        <UploadCloud className="h-7 w-7 text-zinc-600" />
        <p className="mt-2.5 text-xs font-medium text-zinc-400">Drop file here or click to browse</p>
        <p className="mt-1 text-[11px] text-zinc-600">Excel or CSV</p>
      </div>

      {file ? (
        <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-zinc-800 p-2 text-sky-400">
                <FileSpreadsheet className="h-4 w-4" />
              </div>
              <div>
                <p className="max-w-[180px] truncate text-xs font-medium text-white">{file.name}</p>
                <p className="text-[11px] text-zinc-600">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onClear();
              }}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-white"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}
