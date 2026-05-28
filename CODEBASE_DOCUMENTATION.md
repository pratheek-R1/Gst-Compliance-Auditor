# GST Audit Assistant - Codebase Documentation

This document provides a comprehensive, in-depth explanation of the current codebase for the GST Audit Assistant. It breaks down the architecture, the specific files, the functions within those files, and how they map to the business features of the application.

This document is designed to be fed into Claude (or any LLM) to provide complete context of the existing system so you can brainstorm and build features on top of it.

---

## 1. High-Level Architecture Overview

The system is built as a modular, three-tier application:

1.  **Frontend (Streamlit)**: `gst-hackathon-project/streamlit_app.py`
    *   Provides the User Interface (UI).
    *   Handles file uploads, user configurations (sliders, checkboxes), and displays the results in tables and metrics.
    *   Acts as a client that sends HTTP requests to the backend API.
2.  **Backend API (FastAPI)**: `gst-hackathon-project/gst-api/main.py`
    *   Acts as the middleman.
    *   Receives files from the frontend, saves them temporarily, and routes the data to the correct analytical engine.
    *   Exposes REST endpoints (e.g., `/reconcile`, `/api/v1/modules/itc-eligibility`).
3.  **Analytical Engine & AI (Python/Pandas)**: `gst-hackathon-project/gst_brain/`
    *   The "Brain" of the application.
    *   `main.py`: Contains the core reconciliation logic (matching Purchase Register vs GSTR-2B).
    *   `enterprise_modules.py`: Contains the deterministic business rules for auditing (ITC eligibility, Vendor Risk).
    *   `gemini_client.py`: Handles communication with Google's Gemini AI to generate natural language insights.

---

## 2. In-Depth File & Function Breakdown

### A. The Frontend (`gst-hackathon-project/streamlit_app.py`)

This file contains the entire user interface. It is divided into "Workspaces" accessible via a sidebar menu.

*   **`render_enterprise_module(title, data_key)`**:
    *   *Purpose*: A reusable UI component. It takes the JSON response from the backend and standardizes how it looks on screen (renders pass/fail badges, risk scores, and evidence tables).
*   **`run_reconciliation(...)`**:
    *   *Purpose*: A helper function that takes the uploaded files and UI parameters and makes a `POST` request to the backend `/reconcile` endpoint.

**Feature Mapping (The Workspaces):**
*   **Workspace 1: Ledger Reconciliation**:
    *   *What it does*: Compares the company's internal Purchase Register against the Government's GSTR-2B file.
    *   *UI Controls*: Sliders for date tolerance, amount variance, and strict matching.
*   **Workspace 2: ITC Eligibility Auditor**:
    *   *What it does*: Checks if the company is legally allowed to claim Input Tax Credit (refunds) based on specific rules.
    *   *UI Controls*: Checkboxes for reverse charge, blocked credits, and lookback periods.
*   **Workspace 3: Vendor Risk Profiler**:
    *   *What it does*: Analyzes the reconciliation data to flag vendors who consistently make mistakes or are on a blocked list.
    *   *UI Controls*: Anomaly window sliders, concentration risk limits.
*   **Workspace 4: Invoice Document Audit**:
    *   *What it does*: Looks at a single file (Purchase Register) and ensures all invoices are formatted correctly (valid GSTIN, not future-dated).
*   **Workspace 5: Compliance Health Score**:
    *   *What it does*: Aggregates the results of the above modules and calculates an overall score (0-100) using custom weighting sliders.
*   **Workspace 6: Notice Tracker**:
    *   *What it does*: A simple CRUD (Create, Read, Update, Delete) table stored in Streamlit session state to track physical tax notices from the government.
*   **Workspace 7: AI Audit Copilot**:
    *   *What it does*: A chat interface where the user can ask questions. It sends the `recon_data` (the mismatches) along with the user's question to the backend to get AI insights.

---

### B. The Core Logic (`gst-hackathon-project/gst_brain/main.py`)

This file handles the most complex operation: Ledger Reconciliation.

*   **`process_gst(purchase_file_path, gstr_file_path, ...)`**:
    *   *The Core Engine*: This is the heart of the app. It takes the two Excel files and compares them.
    *   **Data Sanitization (`clean_dataframe`)**: Normalizes the data (capitalizes strings, strips whitespace, standardizes date formats) so that `VLOOKUP`-style merges don't fail due to typos.
    *   **The Merge**: Uses `pandas.merge(..., how='outer', indicator=True)` to combine the two datasets based on 'Invoice No'.
    *   **Mismatch Identification**: Iterates through the merged data. If an entry is `left_only`, it's missing in GSTR. If it's `right_only`, it's missing in the books. It also checks for date mismatches, tax amount variances, and duplicate invoices.
    *   **Batch AI Processing (`get_ai_insight`)**: Takes the first 50 mismatches and sends them to Gemini in one batch to generate explanations for *why* they mismatched and what to do.
    *   *Output*: Returns a highly structured JSON dictionary containing `matched` count, `total_invoices`, and a detailed `mismatches` list.

---

### C. The Business Rules (`gst-hackathon-project/gst_brain/enterprise_modules.py`)

This file contains the deterministic logic (Rule-based checks) that simulate actual tax laws and audit procedures.

*   **`generate_standard_response(...)`**:
    *   *Purpose*: Ensures every audit module returns data in the exact same JSON shape (`status`, `severity`, `findings`, `evidence`, `risk_score`).
*   **`run_itc_eligibility_module(reconciliation_data, ...)`**:
    *   *What it does*: Takes the mismatches from `process_gst`.
    *   *Logic*: Applies rules like checking if an invoice is outside the allowable time window (e.g., 12 months), or if it violates the ITC cap percentage, or if the supplier hasn't paid their tax (Missing in GSTR but claimed in books).
*   **`run_vendor_risk_module(reconciliation_data, ...)`**:
    *   *What it does*: Groups mismatches by the supplier name.
    *   *Logic*: Calculates how often a vendor makes mistakes (`error_count`). If a vendor makes too many mistakes (above threshold), or if a single vendor accounts for too much of the total spend (`concentration risk`), they are flagged.
*   **`run_invoice_compliance_module(book_df, ...)`**:
    *   *What it does*: Analyzes the raw dataframe directly (no reconciliation).
    *   *Logic*: Uses Regular Expressions (Regex) to validate GSTIN formats. Uses pandas date logic to ensure no invoices are dated in the future. Checks for duplicate invoice numbers from the same supplier.

---

### D. The AI Wrapper (`gst-hackathon-project/gst_brain/gemini_client.py`)
*(Note: I am inferring the contents based on how it's called in `main.py` and API)*

*   **`get_batch_insights(mismatches_list, api_key)`**:
    *   Takes the list of mismatches, creates a prompt for the Gemini LLM, and asks it to provide a brief explanation and recommended action for each mismatch.
*   **`get_chat_response(question, context, api_key)`**:
    *   Powers the "AI Audit Copilot". Takes the user's free-text question, injects the recent audit findings as context (RAG - Retrieval Augmented Generation), and asks Gemini to answer the question based *only* on that context.

---

### E. The API Layer (`gst-hackathon-project/gst-api/main.py`)

This is standard FastAPI routing code.

*   **`@app.post("/reconcile")`**:
    *   Receives the `UploadFile` objects.
    *   Saves them to disk using `uuid` to prevent filename collisions if multiple users use the app simultaneously.
    *   Calls `process_gst` from the brain.
*   **`@app.post("/api/v1/modules/...")`**:
    *   Endpoints for the specific enterprise modules (ITC, Vendor Risk). They receive JSON payloads containing user configuration and the reconciliation data, and route them to `enterprise_modules.py`.
*   **`@app.post("/ai-chat")`**:
    *   Endpoint for the Copilot chat.

---

## 3. Data Flow Example (The User Journey)

1.  **User Action**: The user goes to the "Ledger Reconciliation" tab, uploads `Purchase.xlsx` and `GSTR.xlsx`, sets "Ignore below ₹" to 500, and clicks "Run".
2.  **Frontend (`streamlit_app.py`)**: Bundles the files and the `500` parameter and sends an HTTP POST request to `http://127.0.0.1:8000/reconcile`.
3.  **API (`gst-api/main.py`)**: Receives the request. Saves files to `/temp_uploads/purchase_123.xlsx`. Calls `process_gst()`.
4.  **Brain (`gst_brain/main.py`)**:
    *   Loads files into Pandas.
    *   Cleans data (removes spaces, formats dates).
    *   Merges data.
    *   Finds an invoice missing in GSTR. The tax amount is ₹600 (which is > 500, so it gets flagged).
    *   Sends this flagged mismatch to Gemini via `get_ai_insight`.
    *   Gemini returns: *"Supplier has not filed their returns. Withhold payment."*
    *   The Brain packages this all into a JSON dictionary and returns it to the API.
5.  **API**: Sends the JSON back to the Frontend.
6.  **Frontend**: Uses `render_enterprise_module()` to display the JSON as pretty UI tables, red/green badges, and metrics.

---

## 4. Current State & Limitations

*   **Dummy Data Reliance**: The system heavily relies on specific column names (`Invoice No`, `Date`, `Supplier`, `Tax Amount`, `GSTIN`). If a user uploads a file with different column names, the system will likely fail or skip matching.
*   **Scalability**: The `process_gst` function currently sends mismatches to Gemini in batches of 50. For massive ledgers (10,000+ mismatches), this will hit rate limits, cost a lot of tokens, or fail.
*   **Database**: There is no persistent database (like PostgreSQL or MongoDB). State is held in the Streamlit session. If the user refreshes the page, data is lost.
*   **Vendor Matching**: Vendor matching is currently done on exact string matching (Supplier Name). In reality, it should be done using the GSTIN (unique ID) to prevent typos ("Acme Corp" vs "Acme Corporation").