import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  Bot,
  BrainCircuit,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileCheck,
  FolderKanban,
  Gauge,
  LayoutDashboard,
  Play,
  ReceiptText,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Upload,
  WalletCards,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ProgressOverlay } from "./components/ProgressOverlay";
import { ResultPanel } from "./components/ResultPanel";
import { Sidebar } from "./components/Sidebar";
import { StatCard } from "./components/StatCard";
import { UploadZone } from "./components/UploadZone";
import { PreFilingReport } from "./components/PreFilingReport";
import { LandingPage } from "./components/LandingPage";
import {
  askCopilot,
  getHealth,
  reconcile,
  runInvoiceCompliance,
  runItcEligibility,
  runVendorRisk,
} from "./lib/api";

const sections = [
  {
    key: "overview",
    label: "Overview",
    description: "Portfolio command center",
    icon: LayoutDashboard,
  },
  {
    key: "reconciliation",
    label: "Ledger Reconciliation",
    description: "Purchase vs GSTR matching",
    icon: FolderKanban,
  },
  {
    key: "itc",
    label: "ITC Eligibility",
    description: "Section 16 and 17 checks",
    icon: WalletCards,
  },
  {
    key: "vendor",
    label: "Vendor Risk",
    description: "Counterparty risk profiling",
    icon: Building2,
  },
  {
    key: "invoice",
    label: "Invoice Compliance",
    description: "Document format validation",
    icon: ReceiptText,
  },
  {
    key: "health",
    label: "Compliance Health",
    description: "Weighted scoring dashboard",
    icon: Gauge,
  },
  {
    key: "report",
    label: "Pre-Filing Report",
    description: "Printable filing summary",
    icon: FileCheck,
  },
  {
    key: "copilot",
    label: "AI Copilot",
    description: "Explain and remediate",
    icon: Bot,
  },
  {
    key: "notices",
    label: "Notice Tracker",
    description: "Internal action log",
    icon: ClipboardList,
  },
];

const defaultReconConfig = {
  ignore_below_amount: 1000,
  strict_date_matching: true,
  detect_duplicates: true,
  enable_fuzzy_matching: true,
  date_tolerance_days: 0,
  amount_variance_tolerance: 0,
  exclude_vendors: "",
  hsn_sac_mismatch_level: "warn",
  ignore_pending_invoices: false,
};

const defaultItcConfig = {
  detect_blocked_credits: true,
  ignore_itc_variance_below: 0,
  strict_itc_validation: true,
  allowed_itc_categories: ["Goods", "Services", "Both"],
  apply_reverse_charge: false,
  itc_cap_percentage: 100,
  itc_lookback_months: 12,
  reject_incomplete_gstr2a: false,
};

const defaultVendorConfig = {
  vendor_mismatch_threshold: 50,
  enable_anomaly_detection: true,
  risk_sensitivity: "Medium",
  min_transaction_count: 5,
  anomaly_window_days: 30,
  blocked_vendor_gstins: "",
  max_concentration_percentage: 25,
  payment_delay_threshold_days: 30,
  turnover_ratio_threshold: 2,
};

const defaultInvoiceConfig = {
  validate_gstin_format: true,
  detect_duplicate_invoices: true,
  require_hsn_sac: true,
  reject_future_invoices: true,
  detect_qty_mismatches: false,
  min_invoice_amount: 0,
  validate_einvoice_format: false,
  validate_cin_pan: false,
  reject_special_chars: false,
  check_invoice_sequence: false,
};

const defaultHealthConfig = {
  risk_sensitivity: "Medium",
  returns_weight: 25,
  itc_weight: 25,
  vendor_weight: 25,
  invoice_weight: 25,
  low_sev_weight: 1,
  med_sev_weight: 5,
  high_sev_weight: 10,
};

function cn(...values) {
  return values.filter(Boolean).join(" ");
}

function formatCurrency(value) {
  const number = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(number);
}

function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-500">{eyebrow}</p>
        <h1 className="section-title mt-2">{title}</h1>
        <p className="mt-3 max-w-2xl text-xs leading-6 text-zinc-500 md:text-sm">{description}</p>
      </div>
      {action}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="space-y-1.5">
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs font-medium text-zinc-300">{label}</span>
        {hint ? <span className="text-[11px] text-zinc-600">{hint}</span> : null}
      </div>
      {children}
    </label>
  );
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "flex items-center justify-between gap-4 rounded-xl border p-3.5 text-left transition-all duration-150",
        checked ? "border-sky-500/30 bg-sky-500/5" : "border-zinc-800 bg-zinc-950 hover:bg-zinc-900"
      )}
    >
      <div>
        <p className="text-xs font-medium text-white">{label}</p>
        <p className="mt-0.5 text-[11px] leading-4 text-zinc-600">{description}</p>
      </div>
      <span
        className={cn(
          "relative h-6 w-10 shrink-0 rounded-full transition",
          checked ? "bg-sky-500" : "bg-zinc-800"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white transition shadow-sm",
            checked ? "left-[18px]" : "left-0.5"
          )}
        />
      </span>
    </button>
  );
}

function FileBadge({ file, label }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5">
      <p className="text-[11px] uppercase tracking-wider text-zinc-600">{label}</p>
      <p className="mt-0.5 max-w-[200px] truncate text-xs font-medium text-white">{file?.name || "Not attached"}</p>
    </div>
  );
}

function BarList({ data, formatter = (value) => value }) {
  if (!data?.length) {
    return <div className="glass-panel border-dashed p-5 text-xs text-zinc-600">Run audits to unlock analytics.</div>;
  }

  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="glass-panel p-5">
      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.label}>
            <div className="mb-1.5 flex items-center justify-between gap-4 text-xs text-zinc-400">
              <span>{item.label}</span>
              <span className="font-medium text-white">{formatter(item.value)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-900">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(item.value / maxValue) * 100}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="h-full rounded-full bg-white"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [activeSection, setActiveSection] = useState("overview");
  const [apiHealth, setApiHealth] = useState("checking");
  const [purchaseFile, setPurchaseFile] = useState(null);
  const [gstrFile, setGstrFile] = useState(null);
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [results, setResults] = useState({
    reconData: null,
    itcData: null,
    vendorData: null,
    invoiceData: null,
    healthData: null,
  });
  const [progress, setProgress] = useState({ visible: false, label: "", value: 0 });
  const [reconConfig, setReconConfig] = useState(defaultReconConfig);
  const [itcConfig, setItcConfig] = useState(defaultItcConfig);
  const [vendorConfig, setVendorConfig] = useState(defaultVendorConfig);
  const [invoiceConfig, setInvoiceConfig] = useState(defaultInvoiceConfig);
  const [healthConfig, setHealthConfig] = useState(defaultHealthConfig);
  const [copilotQuestion, setCopilotQuestion] = useState("");
  const [copilotMessages, setCopilotMessages] = useState([]);
  const [noticeDraft, setNoticeDraft] = useState({ noticeId: "", deadline: "", status: "Open", notes: "" });
  const [notices, setNotices] = useState(() => {
    const stored = window.localStorage.getItem("gst-audit-notices");
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    window.localStorage.setItem("gst-audit-notices", JSON.stringify(notices));
  }, [notices]);

  useEffect(() => {
    let cancelled = false;

    async function ping() {
      try {
        await getHealth();
        if (!cancelled) {
          setApiHealth("online");
        }
      } catch (error) {
        if (!cancelled) {
          setApiHealth("offline");
        }
      }
    }

    ping();
    const timer = window.setInterval(ping, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  function resetSharedResults() {
    setResults((current) => ({
      ...current,
      reconData: null,
      itcData: null,
      vendorData: null,
      healthData: null,
    }));
  }

  function handlePurchaseChange(file) {
    const shouldSyncInvoice = !invoiceFile || invoiceFile === purchaseFile;
    setPurchaseFile(file);
    if (shouldSyncInvoice) {
      setInvoiceFile(file);
    }
    resetSharedResults();
  }

  function handleGstrChange(file) {
    setGstrFile(file);
    resetSharedResults();
  }

  function handleInvoiceChange(file) {
    setInvoiceFile(file);
    setResults((current) => ({ ...current, invoiceData: null, healthData: null }));
  }

  async function withProgress(label, action, options = {}) {
    setProgress({ visible: true, label, value: options.upload ? 12 : 18 });

    const interval = options.upload
      ? null
      : window.setInterval(() => {
          setProgress((current) => {
            if (!current.visible) {
              return current;
            }
            return {
              ...current,
              value: Math.min(88, current.value + Math.round(Math.random() * 7) + 1),
            };
          });
        }, 240);

    try {
      const data = await action((value) => {
        setProgress((current) => ({
          ...current,
          value: Math.max(current.value, Math.min(92, value)),
        }));
      });

      setProgress((current) => ({ ...current, value: 100 }));
      await new Promise((resolve) => window.setTimeout(resolve, 220));
      return data;
    } finally {
      if (interval) {
        window.clearInterval(interval);
      }
      window.setTimeout(() => setProgress({ visible: false, label: "", value: 0 }), 120);
    }
  }

  async function ensureReconciliation(force = false) {
    if (!force && results.reconData) {
      return results.reconData;
    }

    if (!purchaseFile || !gstrFile) {
      throw new Error("Upload both Purchase Register and GSTR-2B files first.");
    }

    const data = await withProgress(
      "Reconciling uploaded ledgers",
      (onProgress) =>
        reconcile({
          purchaseFile,
          gstrFile,
          params: reconConfig,
          onProgress,
        }),
      { upload: true }
    );

    setResults((current) => ({
      ...current,
      reconData: data,
      itcData: null,
      vendorData: null,
      healthData: null,
    }));
    return data;
  }

  async function handleRunReconciliation() {
    try {
      const data = await ensureReconciliation(true);
      toast.success(`Reconciliation completed with ${data.matched ?? 0} matched invoices.`);
      setActiveSection("reconciliation");
    } catch (error) {
      toast.error(error.response?.data?.detail || error.message || "Failed to run reconciliation.");
    }
  }

  async function handleRunItc() {
    try {
      const reconciliationData = await ensureReconciliation();
      const data = await withProgress("Evaluating ITC rules", () => runItcEligibility({ ...reconciliationData, ...itcConfig }));
      setResults((current) => ({ ...current, itcData: data, healthData: null }));
      toast.success("ITC eligibility audit completed.");
    } catch (error) {
      toast.error(error.response?.data?.detail || error.message || "Failed to evaluate ITC eligibility.");
    }
  }

  async function handleRunVendorRisk() {
    try {
      const reconciliationData = await ensureReconciliation();
      const payload = {
        ...reconciliationData,
        ...vendorConfig,
        blocked_vendor_gstins: vendorConfig.blocked_vendor_gstins
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      };
      const data = await withProgress("Profiling vendor risk", () => runVendorRisk(payload));
      setResults((current) => ({ ...current, vendorData: data, healthData: null }));
      toast.success("Vendor risk profile generated.");
    } catch (error) {
      toast.error(error.response?.data?.detail || error.message || "Failed to profile vendors.");
    }
  }

  async function handleRunInvoiceCompliance() {
    try {
      const selectedInvoiceFile = invoiceFile || purchaseFile;

      if (!selectedInvoiceFile) {
        throw new Error("Upload an invoice register or purchase book first.");
      }

      const data = await withProgress(
        "Validating invoice documentation",
        (onProgress) =>
          runInvoiceCompliance({
            purchaseFile: selectedInvoiceFile,
            params: invoiceConfig,
            onProgress,
          }),
        { upload: true }
      );

      setResults((current) => ({ ...current, invoiceData: data, healthData: null }));
      toast.success("Invoice compliance audit completed.");
    } catch (error) {
      toast.error(error.response?.data?.detail || error.message || "Failed to validate invoice compliance.");
    }
  }

  function handleGenerateHealthScore() {
    const severityWeight = healthConfig.risk_sensitivity === "High"
      ? healthConfig.high_sev_weight
      : healthConfig.risk_sensitivity === "Low"
        ? healthConfig.low_sev_weight
        : healthConfig.med_sev_weight;

    const moduleData = [
      {
        label: "Returns Reconciliation",
        findings: results.reconData?.mismatches?.length || 0,
        weight: healthConfig.returns_weight,
      },
      {
        label: "ITC Eligibility",
        findings: results.itcData?.findings?.length || 0,
        weight: healthConfig.itc_weight,
      },
      {
        label: "Vendor Risk",
        findings: results.vendorData?.findings?.length || 0,
        weight: healthConfig.vendor_weight,
      },
      {
        label: "Invoice Compliance",
        findings: results.invoiceData?.findings?.length || 0,
        weight: healthConfig.invoice_weight,
      },
    ];

    const contributions = moduleData.map((module) => ({
      label: module.label,
      value: Number((module.findings * severityWeight * (module.weight / 100)).toFixed(2)),
    }));

    const totalDeduction = contributions.reduce((sum, item) => sum + item.value, 0);
    const complianceScore = Math.max(0, Math.round(100 - totalDeduction));
    const riskScore = 100 - complianceScore;
    const itcAtRisk = (results.itcData?.evidence || []).reduce((sum, item) => {
      const value = Number(item.impact);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);
    const totalFlags = moduleData.reduce((sum, module) => sum + module.findings, 0);

    const healthData = {
      status: complianceScore > 80 ? "Pass" : complianceScore > 50 ? "Warning" : "Fail",
      severity: complianceScore > 80 ? "Low" : complianceScore > 50 ? "Medium" : "High",
      compliance_score: complianceScore,
      risk_score: riskScore,
      findings: contributions
        .filter((item) => item.value > 0)
        .map((item) => ({
          title: item.label,
          description: `${item.label} contributes ${item.value.toFixed(2)} risk points to the overall score.`,
          count: moduleData.find((module) => module.label === item.label)?.findings || 0,
        })),
      evidence: contributions
        .filter((item) => item.value > 0)
        .map((item) => ({
          record_id: item.label,
          issue: "Risk Contribution",
          impact: item.value.toFixed(2),
        })),
      explanation: `Portfolio-wide score built from ${totalFlags} surfaced exceptions across reconciliation, ITC, vendor, and invoice controls.`,
      recommended_action:
        itcAtRisk > 0
          ? `Resolve high-risk mismatches first. ${formatCurrency(itcAtRisk)} of ITC is currently exposed.`
          : "Resolve the highest-contributing module before the next filing cycle.",
      chartData: contributions,
      itcAtRisk,
    };

    setResults((current) => ({ ...current, healthData }));
    toast.success("Compliance health score updated.");
  }

  async function handleAskCopilot() {
    if (!copilotQuestion.trim()) {
      toast.error("Enter a question for the AI copilot.");
      return;
    }

    try {
      const question = copilotQuestion.trim();
      setCopilotMessages((current) => [...current, { role: "user", content: question }]);
      setCopilotQuestion("");
      const response = await withProgress("Generating AI remediation", () =>
        askCopilot({
          question,
          context: (results.reconData?.mismatches || []).slice(0, 10),
        })
      );
      setCopilotMessages((current) => [...current, { role: "assistant", content: response.answer }]);
      toast.success("Copilot response generated.");
    } catch (error) {
      toast.error(error.response?.data?.detail || error.message || "Failed to contact the AI copilot.");
    }
  }

  function handleAddNotice(event) {
    event.preventDefault();

    if (!noticeDraft.noticeId.trim()) {
      toast.error("Notice ID is required.");
      return;
    }

    setNotices((current) => [
      {
        id: crypto.randomUUID(),
        noticeId: noticeDraft.noticeId.trim(),
        deadline: noticeDraft.deadline,
        status: noticeDraft.status,
        notes: noticeDraft.notes.trim(),
      },
      ...current,
    ]);

    setNoticeDraft({ noticeId: "", deadline: "", status: "Open", notes: "" });
    toast.success("Notice logged.");
  }

  const summary = {
    matchRate: results.reconData?.compliance_score ?? 0,
    itcAtRisk: results.healthData?.itcAtRisk || 0,
    vendorAlerts: results.vendorData?.findings?.length || 0,
    openNotices: notices.filter((notice) => notice.status !== "Resolved").length,
  };

  const quickInsightBars = [
    { label: "Mismatch Volume", value: results.reconData?.mismatches?.length || 0 },
    { label: "ITC Flags", value: results.itcData?.findings?.length || 0 },
    { label: "Vendor Red Flags", value: results.vendorData?.findings?.length || 0 },
    { label: "Invoice Exceptions", value: results.invoiceData?.findings?.length || 0 },
  ];

  if (showLanding) {
    return <LandingPage onGetStarted={() => setShowLanding(false)} />;
  }

  return (
    <div className="relative min-h-screen px-4 py-4 md:px-5 md:py-4">
      <ProgressOverlay visible={progress.visible} label={progress.label} progress={progress.value} />

      <div className="relative mx-auto flex max-w-[1600px] flex-col gap-4 md:flex-row">
        <Sidebar sections={sections} activeSection={activeSection} onSelect={setActiveSection} apiHealth={apiHealth} />

        <main className="flex-1 space-y-4">
          <div className="glass-panel p-5 md:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[11px] uppercase tracking-widest text-zinc-500">
                  <Sparkles className="h-3 w-3" />
                  Audit Workspace
                </div>
                <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight text-white md:text-3xl">
                  GST Compliance Command Center
                </h1>
                <p className="mt-2 max-w-2xl text-xs leading-6 text-zinc-500">
                  Upload ledgers, run deterministic compliance checks, and surface ITC risk. All data stays local.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[360px]">
                <FileBadge file={purchaseFile} label="Purchase Register" />
                <FileBadge file={gstrFile} label="GSTR-2B" />
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            <StatCard icon={ShieldCheck} label="Match Rate" value={`${summary.matchRate}%`} hint="Last reconciliation" accent="cyan" delay={0} />
            <StatCard icon={ShieldAlert} label="ITC At Risk" value={formatCurrency(summary.itcAtRisk)} hint="Detected across ITC checks" accent="amber" delay={0.05} />
            <StatCard icon={Building2} label="Vendor Alerts" value={summary.vendorAlerts} hint="Counterparties requiring review" accent="violet" delay={0.1} />
            <StatCard icon={ClipboardList} label="Open Notices" value={summary.openNotices} hint="Stored locally in this workspace" accent="emerald" delay={0.15} />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22 }}
              className="space-y-6"
            >
              {activeSection === "overview" ? (
                <div className="space-y-6">
                  <SectionHeading
                    eyebrow="Unified Intake"
                    title="Load audit data once. Reuse it everywhere."
                    description="Attach your Purchase Register, GSTR-2B, and invoice register through premium drag-and-drop zones. Once loaded, every audit module can reuse the same data stream."
                    action={
                      <button type="button" className="premium-button" onClick={handleRunReconciliation}>
                        <Play className="h-4 w-4" />
                        Run Full Reconciliation
                      </button>
                    }
                  />

                  <div className="grid gap-5 xl:grid-cols-3">
                    <UploadZone
                      label="Purchase Register"
                      description="Upload the internal purchase ledger for the target filing period."
                      file={purchaseFile}
                      onChange={handlePurchaseChange}
                      onClear={() => handlePurchaseChange(null)}
                      accent="cyan"
                    />
                    <UploadZone
                      label="GSTR-2B / Government Data"
                      description="Attach the government-side return data to reconcile supplier filings."
                      file={gstrFile}
                      onChange={handleGstrChange}
                      onClear={() => handleGstrChange(null)}
                      accent="violet"
                    />
                    <UploadZone
                      label="Invoice Register"
                      description="Optional dedicated register for document compliance checks and HSN validation."
                      file={invoiceFile}
                      onChange={handleInvoiceChange}
                      onClear={() => handleInvoiceChange(null)}
                      accent="emerald"
                    />
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
                    <BarList data={quickInsightBars} />

                    <div className="glass-panel p-6">
                      <p className="font-display text-xl font-semibold text-white">Quick launch actions</p>
                      <div className="mt-5 space-y-3">
                        <button type="button" className="secondary-button w-full justify-between" onClick={handleRunItc}>
                          Launch ITC Eligibility
                          <WalletCards className="h-4 w-4" />
                        </button>
                        <button type="button" className="secondary-button w-full justify-between" onClick={handleRunVendorRisk}>
                          Launch Vendor Profiling
                          <Building2 className="h-4 w-4" />
                        </button>
                        <button type="button" className="secondary-button w-full justify-between" onClick={handleRunInvoiceCompliance}>
                          Launch Invoice Compliance
                          <ReceiptText className="h-4 w-4" />
                        </button>
                        <button type="button" className="secondary-button w-full justify-between" onClick={handleGenerateHealthScore}>
                          Refresh Health Score
                          <Gauge className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {activeSection === "reconciliation" ? (
                <div className="space-y-6">
                  <SectionHeading
                    eyebrow="Workspace 01"
                    title="Ledger reconciliation with premium controls"
                    description="Compare Purchase Register records against GSTR-2B, use fuzzy typo matching, and surface AI-guided remediation at mismatch level."
                    action={
                      <button type="button" className="premium-button" onClick={handleRunReconciliation}>
                        <RefreshCw className="h-4 w-4" />
                        Run Reconciliation
                      </button>
                    }
                  />

                  <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
                    <div className="space-y-5">
                      <UploadZone
                        compact
                        label="Purchase Register"
                        description="Primary source of internal invoices."
                        file={purchaseFile}
                        onChange={handlePurchaseChange}
                        onClear={() => handlePurchaseChange(null)}
                        accent="cyan"
                      />
                      <UploadZone
                        compact
                        label="GSTR-2B"
                        description="Government-side matching dataset."
                        file={gstrFile}
                        onChange={handleGstrChange}
                        onClear={() => handleGstrChange(null)}
                        accent="violet"
                      />
                    </div>

                    <div className="glass-panel p-6">
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Ignore mismatches below (INR)">
                          <input
                            className="input-shell"
                            type="number"
                            min="0"
                            value={reconConfig.ignore_below_amount}
                            onChange={(event) => setReconConfig((current) => ({ ...current, ignore_below_amount: Number(event.target.value) }))}
                          />
                        </Field>
                        <Field label="Date tolerance (days)">
                          <input
                            className="input-shell"
                            type="number"
                            min="0"
                            max="30"
                            value={reconConfig.date_tolerance_days}
                            onChange={(event) => setReconConfig((current) => ({ ...current, date_tolerance_days: Number(event.target.value) }))}
                          />
                        </Field>
                        <Field label="Amount variance tolerance (%)">
                          <input
                            className="input-shell"
                            type="number"
                            min="0"
                            max="10"
                            step="0.5"
                            value={reconConfig.amount_variance_tolerance}
                            onChange={(event) => setReconConfig((current) => ({ ...current, amount_variance_tolerance: Number(event.target.value) }))}
                          />
                        </Field>
                        <Field label="HSN mismatch handling">
                          <select
                            className="input-shell"
                            value={reconConfig.hsn_sac_mismatch_level}
                            onChange={(event) => setReconConfig((current) => ({ ...current, hsn_sac_mismatch_level: event.target.value }))}
                          >
                            <option value="ignore">Ignore</option>
                            <option value="warn">Warn</option>
                            <option value="fail">Fail</option>
                          </select>
                        </Field>
                        <div className="md:col-span-2">
                          <Field label="Exclude vendors" hint="Comma separated">
                            <input
                              className="input-shell"
                              type="text"
                              value={reconConfig.exclude_vendors}
                              placeholder="Acme Corp, Globex"
                              onChange={(event) => setReconConfig((current) => ({ ...current, exclude_vendors: event.target.value }))}
                            />
                          </Field>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 xl:grid-cols-2">
                        <Toggle
                          checked={reconConfig.strict_date_matching}
                          onChange={(value) => setReconConfig((current) => ({ ...current, strict_date_matching: value }))}
                          label="Strict date matching"
                          description="Require exact transaction dates unless tolerance is used."
                        />
                        <Toggle
                          checked={reconConfig.detect_duplicates}
                          onChange={(value) => setReconConfig((current) => ({ ...current, detect_duplicates: value }))}
                          label="Detect duplicates"
                          description="Flag duplicate invoice references before merge expansion."
                        />
                        <Toggle
                          checked={reconConfig.enable_fuzzy_matching}
                          onChange={(value) => setReconConfig((current) => ({ ...current, enable_fuzzy_matching: value }))}
                          label="Fuzzy typo matching"
                          description="Resolve near-identical invoice IDs across both ledgers."
                        />
                        <Toggle
                          checked={reconConfig.ignore_pending_invoices}
                          onChange={(value) => setReconConfig((current) => ({ ...current, ignore_pending_invoices: value }))}
                          label="Ignore pending invoices"
                          description="Exclude invoices with pending status from the audit."
                        />
                      </div>
                    </div>
                  </div>

                  <ResultPanel title="Ledger Reconciliation" data={results.reconData} />
                </div>
              ) : null}

              {activeSection === "itc" ? (
                <div className="space-y-6">
                  <SectionHeading
                    eyebrow="Workspace 02"
                    title="ITC eligibility and blocked credit intelligence"
                    description="Run legal rule checks on the reconciliation payload, including Section 16 supplier non-filing and Section 17(5) blocked credit detection."
                    action={
                      <button type="button" className="premium-button" onClick={handleRunItc}>
                        <Play className="h-4 w-4" />
                        Run ITC Audit
                      </button>
                    }
                  />

                  <div className="glass-panel p-6">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <Field label="Ignore variance below (INR)">
                        <input
                          className="input-shell"
                          type="number"
                          min="0"
                          value={itcConfig.ignore_itc_variance_below}
                          onChange={(event) => setItcConfig((current) => ({ ...current, ignore_itc_variance_below: Number(event.target.value) }))}
                        />
                      </Field>
                      <Field label="ITC cap (%)">
                        <input
                          className="input-shell"
                          type="number"
                          min="50"
                          max="100"
                          step="5"
                          value={itcConfig.itc_cap_percentage}
                          onChange={(event) => setItcConfig((current) => ({ ...current, itc_cap_percentage: Number(event.target.value) }))}
                        />
                      </Field>
                      <Field label="Lookback months">
                        <select
                          className="input-shell"
                          value={itcConfig.itc_lookback_months}
                          onChange={(event) => setItcConfig((current) => ({ ...current, itc_lookback_months: Number(event.target.value) }))}
                        >
                          <option value="1">1 Month</option>
                          <option value="3">3 Months</option>
                          <option value="6">6 Months</option>
                          <option value="12">12 Months</option>
                        </select>
                      </Field>
                      <Field label="Eligible categories">
                        <select
                          className="input-shell"
                          value={itcConfig.allowed_itc_categories.join(",")}
                          onChange={(event) =>
                            setItcConfig((current) => ({
                              ...current,
                              allowed_itc_categories: event.target.value.split(","),
                            }))
                          }
                        >
                          <option value="Goods,Services,Both">Goods + Services</option>
                          <option value="Goods">Goods only</option>
                          <option value="Services">Services only</option>
                          <option value="Both">Both</option>
                        </select>
                      </Field>
                    </div>

                    <div className="mt-5 grid gap-3 xl:grid-cols-2">
                      <Toggle
                        checked={itcConfig.detect_blocked_credits}
                        onChange={(value) => setItcConfig((current) => ({ ...current, detect_blocked_credits: value }))}
                        label="Detect blocked credits"
                        description="Flag motor vehicles, food, beverages, health insurance, and personal-use items."
                      />
                      <Toggle
                        checked={itcConfig.strict_itc_validation}
                        onChange={(value) => setItcConfig((current) => ({ ...current, strict_itc_validation: value }))}
                        label="Strict ITC validation"
                        description="Treat missing GSTR entries as ineligible until supplier compliance is fixed."
                      />
                      <Toggle
                        checked={itcConfig.apply_reverse_charge}
                        onChange={(value) => setItcConfig((current) => ({ ...current, apply_reverse_charge: value }))}
                        label="Apply reverse charge restrictions"
                        description="Include reverse charge assumptions in the audit context."
                      />
                      <Toggle
                        checked={itcConfig.reject_incomplete_gstr2a}
                        onChange={(value) => setItcConfig((current) => ({ ...current, reject_incomplete_gstr2a: value }))}
                        label="Reject incomplete GSTR-2A entries"
                        description="Escalate entries missing critical supplier-side data."
                      />
                    </div>
                  </div>

                  <ResultPanel title="ITC Eligibility" data={results.itcData} />
                </div>
              ) : null}

              {activeSection === "vendor" ? (
                <div className="space-y-6">
                  <SectionHeading
                    eyebrow="Workspace 03"
                    title="Vendor risk intelligence"
                    description="Score vendor reliability from mismatch density, concentration risk, and blocked vendor watchlists."
                    action={
                      <button type="button" className="premium-button" onClick={handleRunVendorRisk}>
                        <Play className="h-4 w-4" />
                        Analyze Vendor Risk
                      </button>
                    }
                  />

                  <div className="glass-panel p-6">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <Field label="Mismatch threshold (%)">
                        <input
                          className="input-shell"
                          type="number"
                          min="0"
                          max="100"
                          value={vendorConfig.vendor_mismatch_threshold}
                          onChange={(event) => setVendorConfig((current) => ({ ...current, vendor_mismatch_threshold: Number(event.target.value) }))}
                        />
                      </Field>
                      <Field label="Minimum transaction count">
                        <input
                          className="input-shell"
                          type="number"
                          min="1"
                          value={vendorConfig.min_transaction_count}
                          onChange={(event) => setVendorConfig((current) => ({ ...current, min_transaction_count: Number(event.target.value) }))}
                        />
                      </Field>
                      <Field label="Anomaly window (days)">
                        <input
                          className="input-shell"
                          type="number"
                          min="7"
                          max="90"
                          value={vendorConfig.anomaly_window_days}
                          onChange={(event) => setVendorConfig((current) => ({ ...current, anomaly_window_days: Number(event.target.value) }))}
                        />
                      </Field>
                      <Field label="Risk sensitivity">
                        <select
                          className="input-shell"
                          value={vendorConfig.risk_sensitivity}
                          onChange={(event) => setVendorConfig((current) => ({ ...current, risk_sensitivity: event.target.value }))}
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>
                      </Field>
                      <Field label="Max concentration (%)">
                        <input
                          className="input-shell"
                          type="number"
                          min="10"
                          max="50"
                          value={vendorConfig.max_concentration_percentage}
                          onChange={(event) => setVendorConfig((current) => ({ ...current, max_concentration_percentage: Number(event.target.value) }))}
                        />
                      </Field>
                      <Field label="Payment delay threshold (days)">
                        <input
                          className="input-shell"
                          type="number"
                          min="0"
                          max="90"
                          value={vendorConfig.payment_delay_threshold_days}
                          onChange={(event) => setVendorConfig((current) => ({ ...current, payment_delay_threshold_days: Number(event.target.value) }))}
                        />
                      </Field>
                      <Field label="Turnover ratio threshold">
                        <input
                          className="input-shell"
                          type="number"
                          min="0.5"
                          max="5"
                          step="0.1"
                          value={vendorConfig.turnover_ratio_threshold}
                          onChange={(event) => setVendorConfig((current) => ({ ...current, turnover_ratio_threshold: Number(event.target.value) }))}
                        />
                      </Field>
                      <div className="md:col-span-2 xl:col-span-2">
                        <Field label="Blocked vendors or GSTINs" hint="Comma separated">
                          <input
                            className="input-shell"
                            type="text"
                            value={vendorConfig.blocked_vendor_gstins}
                            placeholder="Soylent Corp, 27ABCDE1234F1Z5"
                            onChange={(event) => setVendorConfig((current) => ({ ...current, blocked_vendor_gstins: event.target.value }))}
                          />
                        </Field>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 xl:grid-cols-2">
                      <Toggle
                        checked={vendorConfig.enable_anomaly_detection}
                        onChange={(value) => setVendorConfig((current) => ({ ...current, enable_anomaly_detection: value }))}
                        label="Enable anomaly detection"
                        description="Increase scrutiny for clustered mismatch patterns and outlier behavior."
                      />
                    </div>
                  </div>

                  <ResultPanel title="Vendor Risk Profiler" data={results.vendorData} />
                </div>
              ) : null}

              {activeSection === "invoice" ? (
                <div className="space-y-6">
                  <SectionHeading
                    eyebrow="Workspace 04"
                    title="Invoice and document compliance"
                    description="Validate GSTIN structure, HSN/SAC presence, future dates, and invoice formatting using a dedicated file or the purchase register fallback."
                    action={
                      <button type="button" className="premium-button" onClick={handleRunInvoiceCompliance}>
                        <Play className="h-4 w-4" />
                        Run Document Audit
                      </button>
                    }
                  />

                  <div className="grid gap-5 xl:grid-cols-[0.72fr_1.28fr]">
                    <UploadZone
                      label="Invoice Register"
                      description="Upload a dedicated invoice register or reuse the purchase register already loaded into the workspace."
                      file={invoiceFile || purchaseFile}
                      onChange={handleInvoiceChange}
                      onClear={() => handleInvoiceChange(null)}
                      accent="emerald"
                    />

                    <div className="glass-panel p-6">
                      <div className="grid gap-3 xl:grid-cols-2">
                        <Toggle
                          checked={invoiceConfig.validate_gstin_format}
                          onChange={(value) => setInvoiceConfig((current) => ({ ...current, validate_gstin_format: value }))}
                          label="Validate GSTIN format"
                          description="Regex validate GSTIN structure on every row."
                        />
                        <Toggle
                          checked={invoiceConfig.detect_duplicate_invoices}
                          onChange={(value) => setInvoiceConfig((current) => ({ ...current, detect_duplicate_invoices: value }))}
                          label="Detect duplicate invoices"
                          description="Spot duplicate invoice numbers for the same supplier."
                        />
                        <Toggle
                          checked={invoiceConfig.require_hsn_sac}
                          onChange={(value) => setInvoiceConfig((current) => ({ ...current, require_hsn_sac: value }))}
                          label="Require HSN / SAC"
                          description="Enforce presence and validate codes against the configured master."
                        />
                        <Toggle
                          checked={invoiceConfig.reject_future_invoices}
                          onChange={(value) => setInvoiceConfig((current) => ({ ...current, reject_future_invoices: value }))}
                          label="Reject future-dated invoices"
                          description="Catch invoices posted beyond the current audit date."
                        />
                        <Toggle
                          checked={invoiceConfig.detect_qty_mismatches}
                          onChange={(value) => setInvoiceConfig((current) => ({ ...current, detect_qty_mismatches: value }))}
                          label="Detect quantity mismatches"
                          description="Reserved control for richer line-item validation."
                        />
                        <Toggle
                          checked={invoiceConfig.validate_einvoice_format}
                          onChange={(value) => setInvoiceConfig((current) => ({ ...current, validate_einvoice_format: value }))}
                          label="Validate e-invoice format"
                          description="Apply e-invoice formatting guardrails where required."
                        />
                        <Toggle
                          checked={invoiceConfig.validate_cin_pan}
                          onChange={(value) => setInvoiceConfig((current) => ({ ...current, validate_cin_pan: value }))}
                          label="Validate CIN / PAN"
                          description="Check corporate identifiers where available."
                        />
                        <Toggle
                          checked={invoiceConfig.reject_special_chars}
                          onChange={(value) => setInvoiceConfig((current) => ({ ...current, reject_special_chars: value }))}
                          label="Reject special characters"
                          description="Keep invoice numbering clean and GST-ready."
                        />
                        <Toggle
                          checked={invoiceConfig.check_invoice_sequence}
                          onChange={(value) => setInvoiceConfig((current) => ({ ...current, check_invoice_sequence: value }))}
                          label="Check invoice sequence"
                          description="Reserve space for sequence validation in future iterations."
                        />
                        <div className="xl:col-span-2">
                          <Field label="Minimum invoice amount (INR)">
                            <input
                              className="input-shell"
                              type="number"
                              min="0"
                              value={invoiceConfig.min_invoice_amount}
                              onChange={(event) => setInvoiceConfig((current) => ({ ...current, min_invoice_amount: Number(event.target.value) }))}
                            />
                          </Field>
                        </div>
                      </div>
                    </div>
                  </div>

                  <ResultPanel title="Invoice Compliance" data={results.invoiceData} />
                </div>
              ) : null}

              {activeSection === "health" ? (
                <div className="space-y-6">
                  <SectionHeading
                    eyebrow="Workspace 05"
                    title="CFO-grade compliance dashboard"
                    description="Blend outcomes from every completed module into a board-level view with module contribution bars and ITC exposure."
                    action={
                      <button type="button" className="premium-button" onClick={handleGenerateHealthScore}>
                        <Activity className="h-4 w-4" />
                        Generate Health Score
                      </button>
                    }
                  />

                  <div className="glass-panel p-6">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <Field label="Risk sensitivity">
                        <select
                          className="input-shell"
                          value={healthConfig.risk_sensitivity}
                          onChange={(event) => setHealthConfig((current) => ({ ...current, risk_sensitivity: event.target.value }))}
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>
                      </Field>
                      <Field label="Returns weight (%)">
                        <input
                          className="input-shell"
                          type="number"
                          min="0"
                          max="100"
                          value={healthConfig.returns_weight}
                          onChange={(event) => setHealthConfig((current) => ({ ...current, returns_weight: Number(event.target.value) }))}
                        />
                      </Field>
                      <Field label="ITC weight (%)">
                        <input
                          className="input-shell"
                          type="number"
                          min="0"
                          max="100"
                          value={healthConfig.itc_weight}
                          onChange={(event) => setHealthConfig((current) => ({ ...current, itc_weight: Number(event.target.value) }))}
                        />
                      </Field>
                      <Field label="Vendor weight (%)">
                        <input
                          className="input-shell"
                          type="number"
                          min="0"
                          max="100"
                          value={healthConfig.vendor_weight}
                          onChange={(event) => setHealthConfig((current) => ({ ...current, vendor_weight: Number(event.target.value) }))}
                        />
                      </Field>
                      <Field label="Invoice weight (%)">
                        <input
                          className="input-shell"
                          type="number"
                          min="0"
                          max="100"
                          value={healthConfig.invoice_weight}
                          onChange={(event) => setHealthConfig((current) => ({ ...current, invoice_weight: Number(event.target.value) }))}
                        />
                      </Field>
                      <Field label="Low severity multiplier">
                        <input
                          className="input-shell"
                          type="number"
                          min="0"
                          max="10"
                          value={healthConfig.low_sev_weight}
                          onChange={(event) => setHealthConfig((current) => ({ ...current, low_sev_weight: Number(event.target.value) }))}
                        />
                      </Field>
                      <Field label="Medium severity multiplier">
                        <input
                          className="input-shell"
                          type="number"
                          min="0"
                          max="10"
                          value={healthConfig.med_sev_weight}
                          onChange={(event) => setHealthConfig((current) => ({ ...current, med_sev_weight: Number(event.target.value) }))}
                        />
                      </Field>
                      <Field label="High severity multiplier">
                        <input
                          className="input-shell"
                          type="number"
                          min="0"
                          max="10"
                          value={healthConfig.high_sev_weight}
                          onChange={(event) => setHealthConfig((current) => ({ ...current, high_sev_weight: Number(event.target.value) }))}
                        />
                      </Field>
                    </div>
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-6">
                      <StatCard icon={Gauge} label="Compliance Score" value={`${results.healthData?.compliance_score ?? 0}%`} hint="Weighted across active modules" accent="cyan" />
                      <StatCard icon={ShieldAlert} label="Portfolio Risk" value={results.healthData?.risk_score ?? 0} hint="Higher means more urgent remediation" accent="amber" />
                      <StatCard icon={WalletCards} label="ITC Exposure" value={formatCurrency(results.healthData?.itcAtRisk || 0)} hint="Calculated from ITC evidence impacts" accent="violet" />
                    </div>

                    <BarList
                      data={results.healthData?.chartData || []}
                      formatter={(value) => `${value.toFixed(2)} pts`}
                    />
                  </div>

                  <ResultPanel title="Compliance Health Score" data={results.healthData} />
                </div>
              ) : null}

              {activeSection === "report" ? (
                <div className="space-y-4">
                  <SectionHeading
                    eyebrow="Workspace 06"
                    title="Pre-Filing Summary Report"
                    description="Aggregates all audit findings into a single printable page. This is the deliverable — print it, sign it, attach it to the client file."
                  />
                  <PreFilingReport results={results} notices={notices} />
                </div>
              ) : null}

              {activeSection === "copilot" ? (
                <div className="space-y-6">
                  <SectionHeading
                    eyebrow="Workspace 06"
                    title="AI audit copilot"
                    description="Ask context-aware questions about your reconciliation results and receive actionable remediation steps tailored to the current mismatch set."
                    action={
                      <button type="button" className="secondary-button" onClick={() => setCopilotMessages([])}>
                        <BrainCircuit className="h-4 w-4" />
                        Clear Conversation
                      </button>
                    }
                  />

                  <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
                    <div className="glass-panel p-6">
                      <p className="font-display text-xl font-semibold text-white">Prompt the copilot</p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        The copilot uses up to ten mismatch records from the current reconciliation run as context. Upload ledgers and run reconciliation for the best answers.
                      </p>

                      <textarea
                        className="input-shell mt-5 min-h-[180px] resize-none"
                        value={copilotQuestion}
                        onChange={(event) => setCopilotQuestion(event.target.value)}
                        placeholder="What should I do about motor vehicle invoices blocked under Section 17(5)?"
                      />

                      <div className="mt-5 flex flex-wrap gap-3">
                        <button type="button" className="premium-button" onClick={handleAskCopilot}>
                          <Send className="h-4 w-4" />
                          Ask Copilot
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => setCopilotQuestion("Draft a supplier follow-up email for invoices missing in GSTR-2B.")}
                        >
                          <Upload className="h-4 w-4" />
                          Load Suggested Prompt
                        </button>
                      </div>
                    </div>

                    <div className="glass-panel p-6">
                      <div className="flex items-center justify-between gap-4">
                        <p className="font-display text-xl font-semibold text-white">Conversation</p>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                          {(results.reconData?.mismatches || []).slice(0, 10).length} context records
                        </span>
                      </div>

                      <div className="mt-5 space-y-4">
                        {copilotMessages.length ? (
                          copilotMessages.map((message, index) => (
                            <div
                              key={`${message.role}-${index}`}
                              className={cn(
                                "rounded-3xl border p-4",
                                message.role === "assistant"
                                  ? "border-cyan-400/20 bg-cyan-400/10"
                                  : "border-white/10 bg-white/5"
                              )}
                            >
                              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                {message.role === "assistant" ? "AI Copilot" : "You"}
                              </p>
                              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-200">{message.content}</p>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-3xl border border-dashed border-white/10 p-6 text-sm leading-7 text-slate-400">
                            Start a conversation to generate remediation guidance, supplier outreach drafts, or plain-English explanations of audit exceptions.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {activeSection === "notices" ? (
                <div className="space-y-6">
                  <SectionHeading
                    eyebrow="Workspace 07"
                    title="Notice tracker"
                    description="Log incoming GST notices, assign status, and keep operational context close to the underlying audit data."
                  />

                  <div className="grid gap-6 xl:grid-cols-[0.76fr_1.24fr]">
                    <form className="glass-panel space-y-4 p-6" onSubmit={handleAddNotice}>
                      <Field label="Notice ID">
                        <input
                          className="input-shell"
                          type="text"
                          value={noticeDraft.noticeId}
                          onChange={(event) => setNoticeDraft((current) => ({ ...current, noticeId: event.target.value }))}
                          placeholder="ASMT-10 / DRC-01 / Internal Ref"
                        />
                      </Field>
                      <Field label="Deadline">
                        <input
                          className="input-shell"
                          type="date"
                          value={noticeDraft.deadline}
                          onChange={(event) => setNoticeDraft((current) => ({ ...current, deadline: event.target.value }))}
                        />
                      </Field>
                      <Field label="Status">
                        <select
                          className="input-shell"
                          value={noticeDraft.status}
                          onChange={(event) => setNoticeDraft((current) => ({ ...current, status: event.target.value }))}
                        >
                          <option value="Open">Open</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                      </Field>
                      <Field label="Notes">
                        <textarea
                          className="input-shell min-h-[140px] resize-none"
                          value={noticeDraft.notes}
                          onChange={(event) => setNoticeDraft((current) => ({ ...current, notes: event.target.value }))}
                          placeholder="Scope, action owner, supplier follow-up, internal dependencies..."
                        />
                      </Field>
                      <button type="submit" className="premium-button w-full">
                        <CheckCircle2 className="h-4 w-4" />
                        Add Notice
                      </button>
                    </form>

                    <div className="glass-panel p-6">
                      <div className="mb-5 flex items-center justify-between gap-4">
                        <p className="font-display text-xl font-semibold text-white">Active notices</p>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">{notices.length} total</span>
                      </div>

                      <div className="space-y-3">
                        {notices.length ? (
                          notices.map((notice) => (
                            <div key={notice.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <div>
                                  <p className="font-medium text-white">{notice.noticeId}</p>
                                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">Due {notice.deadline || "Not set"}</p>
                                  <p className="mt-3 text-sm leading-6 text-slate-400">{notice.notes || "No notes added."}</p>
                                </div>
                                <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
                                  {notice.status}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-3xl border border-dashed border-white/10 p-6 text-sm text-slate-400">
                            No notices tracked yet. Add one from the left panel to build a response queue.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
