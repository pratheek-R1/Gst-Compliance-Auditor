# GST Audit Assistant - Backend Architecture & Technical Documentation

This document provides a detailed overview of the backend infrastructure for the GST Audit Assistant. The backend is designed as a robust, high-performance REST API powered by **FastAPI** that bridges the React frontend with a sophisticated Python/Pandas analytical engine (**gst_brain**) and Google's Gemini AI.

---

## 1. High-Level Architectural Overview

The backend operates on a decoupled, modular architecture divided into three primary layers:

```text
┌────────────────────────────────────────────────────────┐
│                   React Frontend                       │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP POST / REST
                            ▼
┌────────────────────────────────────────────────────────┐
│             FastAPI Routing Layer (gst-api)            │
│   • CORS Middleware • File Uploads & Session Mgmt      │
└───────────────────────────┬────────────────────────────┘
                            │ Internal Python Calls
                            ▼
┌────────────────────────────────────────────────────────┐
│             Analytical Engine (gst_brain)              │
│   • Data Sanitization • Pandas Merge & Reconciliation  │
│   • Deterministic Business Rules • AI Copilot Wrapper  │
└────────────────────────────────────────────────────────┘
```

1. **API Routing Layer (`gst-api/main.py`)**: Handles incoming HTTP requests, manages temporary file storage for uploads, enforces CORS policies, and defines the RESTful endpoints.
2. **Core Analytical Engine (`gst_brain/main.py`)**: Executes heavy data manipulation, data sanitization, Pandas-based ledger merges, and discrepancy identification.
3. **Enterprise Compliance Modules (`gst_brain/enterprise_modules.py`)**: Enforces deterministic, rule-based checks simulating Indian GST laws (e.g., Section 16/17 rules, vendor profiling, invoice formatting).
4. **AI Integration Wrapper (`gst_brain/gemini_client.py`)**: Integrates with the Google GenAI SDK (`gemini-2.5-flash`) for automated root-cause analysis and the interactive Audit Copilot.

---

## 2. Directory & File Structure

```text
gst-hackathon-project/
├── gst-api/
│   ├── main.py                 # FastAPI application and route definitions
│   ├── requirements.txt        # API dependencies (fastapi, uvicorn, python-multipart)
│   └── temp_uploads/           # Session-isolated directory for uploaded ledgers
└── gst_brain/
    ├── main.py                 # Core Pandas reconciliation engine & data sanitization
    ├── enterprise_modules.py   # Deterministic compliance rules (ITC, Vendor Risk, Doc Audit)
    ├── gemini_client.py        # Gemini AI client wrapper (Batch insights & RAG Copilot)
    ├── requirements.txt        # Engine dependencies (pandas, openpyxl, google-genai, thefuzz)
    └── .env                    # Environment configuration (GOOGLE_API_KEY)
```

---

## 3. Core API Endpoints

The FastAPI application exposes the following REST endpoints to the frontend:

### `POST /reconcile`
* **Description**: The primary reconciliation endpoint. Accepts two uploaded files (Purchase Register and GSTR-2B/2A) along with audit tolerance parameters.
* **Parameters**: `ignore_below_amount`, `strict_date_matching`, `detect_duplicates`, `date_tolerance_days`, `amount_variance_tolerance`, `exclude_vendors`, `hsn_sac_mismatch_level`, `ignore_pending_invoices`, `enable_fuzzy_matching`.
* **Flow**: Saves files to `temp_uploads/` using UUIDs to prevent concurrent collision, invokes `process_gst()`, cleans up temporary files, and returns a structured JSON summary with AI insights.

### `POST /api/v1/modules/itc-eligibility`
* **Description**: Evaluates Input Tax Credit (ITC) eligibility and reversal risks.
* **Payload**: JSON object containing rules like `detect_blocked_credits`, `itc_cap_percentage`, `itc_lookback_months`.
* **Flow**: Routes reconciliation data through `run_itc_eligibility_module()` to flag Section 17(5) blocked credits, Section 16(2)(c) tax defaults, and time-barred claims.

### `POST /api/v1/modules/vendor-risk`
* **Description**: Generates vendor risk profiles and red flags.
* **Payload**: JSON object containing thresholds like `vendor_mismatch_threshold`, `min_transaction_count`, `blocked_vendor_gstins`.
* **Flow**: Calls `run_vendor_risk_module()` to identify habitual defaulters, calculate spend concentration, and verify against blocked vendor lists.

### `POST /api/v1/modules/invoice-compliance`
* **Description**: Performs a standalone documentation audit on a single ledger (Purchase Register).
* **Parameters**: Uploaded file and boolean flags (`validate_gstin_format`, `reject_future_invoices`, `min_invoice_amount`, `reject_special_chars`).
* **Flow**: Uses `run_invoice_compliance_module()` to perform regex-based GSTIN validation, duplicate checks, HSN master verification, and date sequence validation.

### `POST /ai-chat`
* **Description**: Powers the AI Audit Copilot.
* **Payload**: JSON containing `question` (user query) and `context` (current mismatches/audit findings).
* **Flow**: Calls `get_chat_response()` to provide contextual, CA-grade accounting advice using RAG.

### `GET /health` & `GET /ewaybill/{ewaybill_no}`
* **Description**: Utility endpoints for system health monitoring and e-waybill validity simulation.

---

## 4. Deep Dive: Analytical Engine (`gst_brain`)

### A. Data Sanitization & Normalization
Real-world accounting ledgers contain typos, trailing spaces, and inconsistent date formats. Before merging, `clean_dataframe()` normalizes the data:
* Strips leading/trailing whitespace from column headers and string values.
* Converts invoice numbers to uppercase string representations.
* Normalizes dates to `YYYY-MM-DD` (or `YYYY-MM` if flexible matching is enabled).

### B. Pandas Outer Merge Logic
The core engine merges the Purchase Register (`df_book`) and GSTR-2B (`df_gstr`) using a Pandas outer join:
```python
merged_df = pd.merge(df_book, df_gstr, on=merge_cols, how='outer', suffixes=('_book', '_gstr'), indicator=True)
```
The `_merge` indicator column reveals the discrepancy type:
* `left_only`: Invoice present in Books but missing in GSTR (High Risk - Tax not paid by supplier).
* `right_only`: Invoice present in GSTR but missing in Books (Medium Risk - Unclaimed ITC).
* `both`: Present in both, subjected to secondary checks (Amount variance, Date tolerance, HSN/SAC matching).

### C. Advanced Fuzzy Matching
If `enable_fuzzy_matching` is active, the engine uses `thefuzz` library (Levenshtein distance) to compare unmatched `left_only` and `right_match` records. If invoice numbers and supplier names have a similarity score > 80% and tax amounts match within tolerance, they are reclassified from "Missing" to "Fuzzy Match (Typo)".

---

## 5. AI Integration Architecture

The backend leverages Google's Gemini LLM (`gemini-2.5-flash`) via the official `google-genai` SDK for two distinct workflows:

### 1. Batch Discrepancy Insights (`get_batch_insights`)
To optimize token usage and avoid latency/rate limits, the backend extracts the top 50 mismatches and sends them to Gemini in a single prompt. The prompt instructs Gemini to act as an expert Indian Chartered Accountant and return a strict JSON mapping of invoice numbers to root-cause explanations and actionable remediation steps.

### 2. Contextual AI Copilot (`get_chat_response`)
Acts as a Retrieval-Augmented Generation (RAG) agent. It injects the user's active reconciliation dataset into the system prompt as context, ensuring that answers to questions like *"Why is INV001 failing?"* or *"What should I do about my blocked credits?"* are highly specific, accurate, and actionable.

---

## 6. Error Handling & Security

* **Session Isolation**: Uploaded files are prefixed with a unique `uuid4()` session ID, ensuring that concurrent requests from multiple users do not overwrite each other's files.
* **Automatic Cleanup**: A `try...finally` block ensures that temporary files are deleted immediately after Pandas finishes processing, preventing disk space exhaustion.
* **Graceful AI Fallback**: If the Gemini API fails (e.g., quota exhaustion, network timeout), the engine catches the exception and returns a graceful fallback message (`"AI analysis failed: ..."`) while preserving all deterministic mathematical results.
* **CORS & Middleware**: Configured with `CORSMiddleware` allowing seamless communication with the Vite/React frontend.
