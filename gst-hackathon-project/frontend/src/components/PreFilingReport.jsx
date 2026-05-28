import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, XCircle, Printer, FileText } from "lucide-react";

function CheckItem({ status, label, detail }) {
  const icons = {
    pass: <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />,
    warn: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />,
    fail: <XCircle className="h-4 w-4 shrink-0 text-rose-400" />,
  };

  const borders = {
    pass: "border-emerald-500/10",
    warn: "border-amber-500/10",
    fail: "border-rose-500/10",
  };

  return (
    <div className={`flex items-start gap-3 rounded-xl border ${borders[status]} bg-zinc-950 p-3.5`}>
      {icons[status]}
      <div>
        <p className="text-xs font-medium text-white">{label}</p>
        {detail && <p className="mt-0.5 text-[11px] text-zinc-500">{detail}</p>}
      </div>
    </div>
  );
}

function formatINR(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function PreFilingReport({ results, notices }) {
  const recon = results.reconData;
  const itc = results.itcData;
  const vendor = results.vendorData;
  const invoice = results.invoiceData;

  const hasAnyData = recon || itc || vendor || invoice;

  if (!hasAnyData) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950 p-10 text-center">
        <FileText className="mx-auto h-8 w-8 text-zinc-700" />
        <p className="mt-3 text-sm font-medium text-zinc-500">No audit data available</p>
        <p className="mt-1 text-xs text-zinc-600">Run at least one workspace (Reconciliation, ITC, etc.) to generate the Pre-Filing Report.</p>
      </div>
    );
  }

  // --- Calculate ITC Breakdown ---
  const totalBookTax = (recon?.mismatches || []).reduce((sum, m) => sum + (Number(m.book_tax) || 0), 0);
  const matchedITC = Number(recon?.matched || 0);
  const totalInvoices = Number(recon?.total_invoices || 0);
  const matchRate = Number(recon?.compliance_score || 0);

  // Blocked credits from ITC module
  const blockedCreditFindings = (itc?.findings || []).filter(f =>
    f.title?.toLowerCase().includes("blocked") || f.title?.toLowerCase().includes("17(5)")
  );
  const blockedCreditCount = blockedCreditFindings.reduce((sum, f) => sum + (f.count || 0), 0);
  const blockedCreditAmount = (itc?.evidence || [])
    .filter(e => e.issue?.toLowerCase().includes("blocked"))
    .reduce((sum, e) => sum + (Number(e.impact) || 0), 0);

  // Missing in GSTR
  const missingInGSTR = (recon?.mismatches || []).filter(m =>
    m.issue?.toLowerCase().includes("missing")
  );
  const missingITCAmount = missingInGSTR.reduce((sum, m) => sum + (Number(m.book_tax) || 0), 0);

  // Invalid GSTINs
  const invalidGSTIN = (invoice?.findings || []).filter(f =>
    f.title?.toLowerCase().includes("gstin")
  );
  const invalidGSTINCount = invalidGSTIN.reduce((sum, f) => sum + (f.count || 0), 0);

  // Duplicates
  const duplicates = (recon?.mismatches || []).filter(m =>
    m.issue?.toLowerCase().includes("duplicate")
  );

  // Future-dated
  const futureDated = (invoice?.findings || []).filter(f =>
    f.title?.toLowerCase().includes("future")
  );
  const futureDatedCount = futureDated.reduce((sum, f) => sum + (f.count || 0), 0);

  // Total ITC at risk
  const totalITCAtRisk = blockedCreditAmount + missingITCAmount;

  // Vendor alerts
  const vendorAlerts = vendor?.findings?.length || 0;

  // Open notices
  const openNoticeCount = (notices || []).filter(n => n.status !== "Resolved").length;

  const handlePrint = () => {
    window.print();
  };

  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 print:space-y-3"
      id="pre-filing-report"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-500">Pre-Filing Summary</p>
          <h2 className="mt-1 font-display text-xl font-semibold text-white">GSTR-3B Filing Readiness Report</h2>
          <p className="mt-1 text-xs text-zinc-600">Generated on {today} · All amounts in INR</p>
        </div>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-white print:hidden"
        >
          <Printer className="h-3.5 w-3.5" />
          Print Report
        </button>
      </div>

      {/* ITC Breakdown Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden">
        <div className="border-b border-zinc-800 px-5 py-3">
          <p className="text-xs font-semibold text-white">ITC Impact Summary — GSTR-3B Table 4</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800/50">
              <th className="px-5 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-600">Description</th>
              <th className="px-5 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-zinc-600">Amount (₹)</th>
              <th className="px-5 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-zinc-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/30">
            <tr>
              <td className="px-5 py-3 text-xs text-zinc-300">Total ITC in Purchase Register</td>
              <td className="px-5 py-3 text-right text-xs font-medium text-white">{formatINR(totalBookTax)}</td>
              <td className="px-5 py-3 text-right"><span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-400">Gross</span></td>
            </tr>
            <tr>
              <td className="px-5 py-3 text-xs text-rose-400">(-) Blocked under Section 17(5)</td>
              <td className="px-5 py-3 text-right text-xs font-medium text-rose-400">-{formatINR(blockedCreditAmount)}</td>
              <td className="px-5 py-3 text-right"><span className="rounded-md bg-rose-500/10 px-2 py-0.5 text-[11px] text-rose-400">Do Not Claim</span></td>
            </tr>
            <tr>
              <td className="px-5 py-3 text-xs text-amber-400">(-) Missing in GSTR-2B (Risky)</td>
              <td className="px-5 py-3 text-right text-xs font-medium text-amber-400">-{formatINR(missingITCAmount)}</td>
              <td className="px-5 py-3 text-right"><span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-400">Follow Up</span></td>
            </tr>
            <tr className="bg-zinc-900/50">
              <td className="px-5 py-3 text-xs font-semibold text-white">= Safe to Claim (Table 4A)</td>
              <td className="px-5 py-3 text-right text-sm font-bold text-emerald-400">{formatINR(Math.max(0, totalBookTax - totalITCAtRisk))}</td>
              <td className="px-5 py-3 text-right"><span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-400">Eligible</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Checklist */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
        <p className="text-xs font-semibold text-white mb-3">Filing Readiness Checklist</p>
        <div className="grid gap-2 md:grid-cols-2">
          <CheckItem
            status={matchRate >= 80 ? "pass" : matchRate >= 50 ? "warn" : "fail"}
            label={`${matchedITC} of ${totalInvoices} invoices reconciled (${matchRate}%)`}
            detail={matchRate >= 80 ? "Reconciliation is healthy" : "Review mismatches before filing"}
          />
          <CheckItem
            status={missingInGSTR.length === 0 ? "pass" : "warn"}
            label={missingInGSTR.length === 0 ? "No invoices missing in GSTR-2B" : `${missingInGSTR.length} invoices missing in GSTR-2B`}
            detail={missingInGSTR.length > 0 ? `${formatINR(missingITCAmount)} ITC at risk — follow up with vendors` : null}
          />
          <CheckItem
            status={blockedCreditCount === 0 ? "pass" : "fail"}
            label={blockedCreditCount === 0 ? "No blocked credits detected" : `${blockedCreditCount} blocked credits under Sec 17(5)`}
            detail={blockedCreditCount > 0 ? `${formatINR(blockedCreditAmount)} must NOT be claimed` : null}
          />
          <CheckItem
            status={duplicates.length === 0 ? "pass" : "fail"}
            label={duplicates.length === 0 ? "No duplicate invoices" : `${duplicates.length} duplicate invoices found`}
            detail={duplicates.length > 0 ? "Remove duplicates before filing" : null}
          />
          <CheckItem
            status={invalidGSTINCount === 0 ? "pass" : "fail"}
            label={invalidGSTINCount === 0 ? "All GSTINs valid" : `${invalidGSTINCount} invalid GSTINs detected`}
            detail={invalidGSTINCount > 0 ? "Verify supplier registration status" : null}
          />
          <CheckItem
            status={futureDatedCount === 0 ? "pass" : "warn"}
            label={futureDatedCount === 0 ? "No future-dated invoices" : `${futureDatedCount} future-dated invoices`}
            detail={futureDatedCount > 0 ? "These cannot be claimed in the current period" : null}
          />
          <CheckItem
            status={vendorAlerts === 0 ? "pass" : "warn"}
            label={vendorAlerts === 0 ? "No vendor risk alerts" : `${vendorAlerts} vendor risk alerts`}
            detail={vendorAlerts > 0 ? "Review high-risk counterparties" : null}
          />
          <CheckItem
            status={openNoticeCount === 0 ? "pass" : "warn"}
            label={openNoticeCount === 0 ? "No open tax notices" : `${openNoticeCount} open notices pending`}
            detail={openNoticeCount > 0 ? "Resolve before filing deadline" : null}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
        <p className="text-[11px] text-zinc-600">
          This report is auto-generated from deterministic audit checks. All calculations are reproducible and based on uploaded ledger data. No data was sent to external servers.
        </p>
      </div>
    </motion.div>
  );
}
