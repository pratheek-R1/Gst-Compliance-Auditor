import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, ShieldAlert, Download, Mail } from "lucide-react";

function getTone(status) {
  if (status === "Pass") {
    return {
      badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
      icon: CheckCircle2,
    };
  }

  if (status === "Warning") {
    return {
      badge: "border-amber-500/20 bg-amber-500/10 text-amber-400",
      icon: AlertTriangle,
    };
  }

  return {
    badge: "border-rose-500/20 bg-rose-500/10 text-rose-400",
    icon: ShieldAlert,
  };
}

function DataTable({ title, columns, rows }) {
  if (!rows?.length) {
    return null;
  }

  const downloadCSV = () => {
    const headers = columns.map((c) => c.label).join(",");
    const csvRows = rows.map((row) =>
      columns.map((c) => `"${(row[c.key] || "").toString().replace(/"/g, '""')}"`).join(",")
    );
    const csvData = [headers, ...csvRows].join("\n");
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `${title.replace(/\s+/g, "_").toLowerCase()}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="font-display text-sm font-semibold text-white">{title}</p>
        <div className="flex items-center gap-2">
          <span className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-500">{rows.length} rows</span>
          <button
            onClick={downloadCSV}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          >
            <Download className="h-3 w-3" />
            CSV
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              {columns.map((column) => (
                <th key={column.key} className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-zinc-600">
                  {column.label}
                </th>
              ))}
              {title === "Mismatch Intelligence" && (
                <th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wider text-zinc-600">
                  Action
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {rows.map((row, index) => (
              <tr key={`${title}-${index}`} className="group transition hover:bg-zinc-900/50">
                {columns.map((column) => (
                  <td key={column.key} className="px-3 py-2.5 align-top">
                    <div className="max-w-[300px] whitespace-normal break-words text-xs leading-5 text-zinc-400">
                      {row[column.key] ?? "-"}
                    </div>
                  </td>
                ))}
                {title === "Mismatch Intelligence" && (
                  <td className="px-3 py-2.5 align-top text-right">
                    <div className="flex items-center justify-end gap-1.5 opacity-0 transition duration-200 group-hover:opacity-100">
                      <a
                        href={`mailto:?subject=${encodeURIComponent(`GST Alert: Invoice ${row.invoice_no}`)}&body=${encodeURIComponent(`Dear ${row.supplier || "Supplier"},\n\nInvoice No. ${row.invoice_no || "N/A"} has a mismatch in our GSTR-2B.\n\nReason: ${row.issue || "Discrepancy"}\n\nPlease rectify in your next GSTR-1 filing.\n\nRegards,\nAudit Team`)}`}
                        className="inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-500 transition hover:text-white"
                      >
                        <Mail className="h-3 w-3" />
                        Email
                      </a>
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(`*GST Alert*\nDear ${row.supplier || "Supplier"},\nInvoice *${row.invoice_no || "N/A"}* is mismatched in GSTR-2B.\nReason: ${row.issue || "Discrepancy"}\nPlease rectify ASAP.\n- Audit Team`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-2 py-1 text-[11px] text-emerald-500 transition hover:bg-emerald-500/10"
                      >
                        <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                        </svg>
                        WA
                      </a>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ResultPanel({ title, data }) {
  if (!data) {
    return (
      <div className="glass-panel border-dashed p-8 text-center text-xs text-zinc-600">
        Run this workspace to populate audit findings.
      </div>
    );
  }

  const tone = getTone(data.status);
  const ToneIcon = tone.icon;

  const evidenceRows = (data.evidence || []).slice(0, 10);
  const mismatchRows = (data.mismatches || []).slice(0, 10);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="glass-panel p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-display text-lg font-semibold text-white">{title}</p>
            <p className="mt-2 max-w-2xl text-xs leading-6 text-zinc-500">{data.explanation || "No explanation available."}</p>
          </div>
          <div className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium ${tone.badge}`}>
            <ToneIcon className="h-3.5 w-3.5" />
            {data.status} · {data.severity}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3.5">
            <p className="text-[11px] uppercase tracking-wider text-zinc-600">Compliance</p>
            <p className="mt-1.5 font-display text-2xl text-white">{data.compliance_score ?? "-"}{data.compliance_score !== undefined ? "%" : ""}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3.5">
            <p className="text-[11px] uppercase tracking-wider text-zinc-600">Risk Score</p>
            <p className="mt-1.5 font-display text-2xl text-white">{data.risk_score ?? "-"}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3.5">
            <p className="text-[11px] uppercase tracking-wider text-zinc-600">Action</p>
            <p className="mt-1.5 text-xs leading-5 text-zinc-400">{data.recommended_action || "No action recommended."}</p>
          </div>
        </div>
      </div>

      {data.findings?.length ? (
        <div className="grid gap-3 xl:grid-cols-3">
          {data.findings.map((finding, index) => (
            <motion.div
              key={`${finding.title}-${index}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.03 * index }}
              className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4"
            >
              <p className="text-[11px] uppercase tracking-wider text-zinc-600">Finding {String(index + 1).padStart(2, "0")}</p>
              <p className="mt-2 font-display text-base font-semibold text-white">{finding.title}</p>
              <p className="mt-1.5 text-xs leading-5 text-zinc-500">{finding.description}</p>
              <div className="mt-3 inline-flex rounded-md border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-500">
                Count: {finding.count}
              </div>
            </motion.div>
          ))}
        </div>
      ) : null}

      <DataTable
        title="Evidence Log"
        columns={[
          { key: "record_id", label: "Record" },
          { key: "issue", label: "Issue" },
          { key: "impact", label: "Impact" },
        ]}
        rows={evidenceRows}
      />

      <DataTable
        title="Mismatch Intelligence"
        columns={[
          { key: "invoice_no", label: "Invoice" },
          { key: "supplier", label: "Supplier" },
          { key: "issue", label: "Issue" },
          { key: "book_tax", label: "Book Tax" },
          { key: "gstr_tax", label: "GSTR Tax" },
          { key: "ai_explanation", label: "AI Guidance" },
        ]}
        rows={mismatchRows}
      />
    </motion.div>
  );
}
