# GST Audit Workstation

> AI-Powered Intelligent Assistant for Tax Teams — Built on top of existing codebase

An enterprise-grade GST reconciliation and compliance platform that transforms manual tax audit workflows into automated, AI-driven processes. Compare thousands of invoices instantly, identify compliance risks, and get plain-English explanations powered by Gemini AI.

---

## Table Of Content

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Architecture Deep Dive](#architecture-deep-dive)
- [Adding New Features](#adding-new-features)
- [Feature Roadmap](#feature-roadmap)
- [Industry Comparison](#industry-comparison)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## Overview

### The Problem We Solve

In India's GST system, businesses can only claim Input Tax Credit (ITC) if their internal records perfectly match government records (GSTR-2B). The reality: suppliers make typos, forget to file, or put wrong dates. Currently, accountants spend 40+ hours manually comparing Excel sheets using VLOOKUP.

### Our Solution

Upload your Purchase Register and GSTR-2B file → Our engine instantly cross-checks → Flags errors → Identifies risky vendors → AI explains mismatches in plain English.

### Target Users

- **Chartered Accountants (CAs)** — Manage taxes for hundreds of client companies
- **Corporate Tax Teams** — Mid-to-large enterprises with thousands of supplier invoices
- **CFOs** — Want a single Compliance Health Score to assess penalty risk

---

## Project Structure

```
gst-hackathon-project/
├── streamlit_app.py                 # Frontend UI (Streamlit)
├── gst-api/
│   └── main.py                      # FastAPI backend
├── gst_brain/
│   ├── main.py                      # Core reconciliation engine
│   ├── enterprise_modules.py        # Business rules (ITC, Vendor Risk)
│   ├── gemini_client.py             # AI integration
│   └── README.md                    # Brain module documentation
├── test_data/                       # Dummy data for testing
│   ├── README.md                    # Test data documentation
│   ├── generate_test_data.py        # Test data generator
│   ├── Purchase_Register_March2025.xlsx
│   └── GSTR2B_March2025.xlsx
└── docs/
    └── OPENCODE.md                  # This file - development guide
```

---

## Quick Start

### Prerequisites

- Python 3.9+
- Google Gemini API key
- Required packages (see requirements.txt)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd gst-hackathon-project

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export GEMINI_API_KEY="your-api-key-here"

# Run the application
python streamlit_app.py
```

### Testing with Dummy Data

1. Navigate to **Ledger Reconciliation** workspace
2. Upload `test_data/Purchase_Register_March2025.xlsx`
3. Upload `test_data/GSTR2B_March2025.xlsx`
4. Set parameters and run

---

## Architecture Deep Dive

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                          │
│                     (Streamlit Frontend)                       │
│                                                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐             │
│  │   Ledger    │ │     ITC     │ │   Vendor    │             │
│  │Reconciliation│ │ Eligibility │ │    Risk     │             │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘             │
│         │                │                │                    │
│  ┌──────┴──────┐ ┌──────┴──────┐ ┌──────┴──────┐             │
│  │  Invoice    │ │     AI      │ │  Compliance │             │
│  │ Compliance  │ │   Copilot   │ │   Health    │             │
│  └─────────────┘ └─────────────┘ └─────────────┘             │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP/REST
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                       BACKEND API                               │
│                        (FastAPI)                                │
│                                                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │  /reconcile │ │ /api/v1/    │ │  /ai-chat   │               │
│  │            │ │ modules/*   │ │            │               │
│  └──────┬─────┘ └──────┬─────┘ └──────┬─────┘               │
└─────────┼───────────────┼───────────────┼──────────────────────┘
          │               │               │
          ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ANALYTICAL ENGINE                            │
│                     (Python/Pandas)                             │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │                    gst_brain/                          │   │
│  │                                                        │   │
│  │   ┌──────────────┐  ┌─────────────────────┐           │   │
│  │   │   main.py    │  │ enterprise_modules.py│           │   │
│  │   │              │  │                     │           │   │
│  │   │ • process_gst│  │ • ITC Eligibility   │           │   │
│  │   │ • clean_data│  │ • Vendor Risk       │           │   │
│  │   │ • merge_data│  │ • Invoice Compliance│           │   │
│  │   │ • find_diff │  │ • Standard Response │           │   │
│  │   └──────────────┘  └─────────────────────┘           │   │
│  │                                                        │   │
│  │   ┌────────────────────────────────────────────────┐  │   │
│  │   │              gemini_client.py                  │  │   │
│  │   │                                                │  │   │
│  │   │ • get_batch_insights                           │  │   │
│  │   │ • get_chat_response                            │  │   │
│  │   └────────────────────────────────────────────────┘  │   │
│  └────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Module Responsibilities

#### 1. Frontend (`streamlit_app.py`)

**Responsibilities:**
- File upload handling
- User configuration (sliders, checkboxes)
- Results display (tables, metrics, badges)
- Workspace navigation

**Key Functions:**
- `render_enterprise_module(title, data_key)` — Standardized results renderer
- `run_reconciliation(...)` — HTTP client for `/reconcile` endpoint

**Workspaces:**
1. **Ledger Reconciliation** — Compare Purchase Register vs GSTR-2B
2. **ITC Eligibility Auditor** — Check Section 16/17 compliance
3. **Vendor Risk Profiler** — Flag non-compliant suppliers
4. **Invoice Document Audit** — Validate invoice format
5. **Compliance Health Score** — Overall compliance dashboard
6. **Notice Tracker** — CRUD for tax notices
7. **AI Audit Copilot** — Natural language Q&A

#### 2. Backend API (`gst-api/main.py`)

**Responsibilities:**
- File upload receiving and temporary storage
- Request routing to correct engine
- Response formatting

**Endpoints:**
- `POST /reconcile` — Ledger reconciliation
- `POST /api/v1/modules/itc-eligibility` — ITC check
- `POST /api/v1/modules/vendor-risk` — Vendor risk
- `POST /api/v1/modules/invoice-compliance` — Invoice validation
- `POST /ai-chat` — AI Copilot

#### 3. Core Engine (`gst_brain/main.py`)

**Responsibilities:**
- Data sanitization (normalize dates, capitalize, strip)
- File merging (pandas outer join)
- Mismatch identification (left_only, right_only)
- AI insight batch processing

**Key Function: `process_gst()`**

```python
def process_gst(purchase_file_path, gstr_file_path, ...):
    # 1. Load and clean both files
    # 2. Normalize column names
    # 3. Merge on Invoice No (outer join with indicator)
    # 4. Identify mismatch types:
    #    - left_only → Missing in GSTR
    #    - right_only → Missing in Purchase Register
    #    - Both but values differ → Mismatch
    # 5. Batch send mismatches to Gemini AI
    # 6. Return structured JSON response
```

**Data Sanitization (`clean_dataframe`):**
- Capitalize strings
- Strip whitespace
- Standardize date formats (DD/MM/YYYY)
- Handle NaN values

#### 4. Business Rules (`gst_brain/enterprise_modules.py`)

**Responsibilities:**
- Deterministic rule evaluation
- Legal compliance checking (Section 16/17 of CGST Act)
- Standardized response generation

**Key Functions:**

```python
def run_itc_eligibility_module(reconciliation_data, ...):
    # Apply Section 16 rules:
    # • Time window (180 days)
    # • ITC cap percentage
    # • Supplier filing status
    # • Blocked credits under Section 17(5)

def run_vendor_risk_module(reconciliation_data, ...):
    # Calculate risk scores by vendor:
    # • Error count (how often they cause mismatches)
    # • Concentration risk (% of total spend)
    # • Filing history

def run_invoice_compliance_module(book_df, ...):
    # Validate invoice format:
    # • GSTIN format (Regex validation)
    # • Future dates (not allowed)
    # • Duplicate invoices
```

#### 5. AI Integration (`gst_brain/gemini_client.py`)

**Responsibilities:**
- Batch processing for mismatches (50 at a time)
- Conversational Q&A with context injection
- RAG (Retrieval Augmented Generation)

**Key Functions:**

```python
def get_batch_insights(mismatches_list, api_key):
    # Takes list of mismatches
    # Creates prompt explaining each mismatch
    # Returns Gemini-generated explanations

def get_chat_response(question, context, api_key):
    # Injects reconciliation data as context
    # Uses RAG pattern for relevant answers
    # Returns conversational response
```

---

## Adding New Features

### Feature Addition Guide

#### Step 1: Identify the Module

Determine which layer handles your feature:

| Feature Type | Where to Add |
|-------------|--------------|
| New reconciliation rule | `gst_brain/main.py` |
| New compliance check | `gst_brain/enterprise_modules.py` |
| New AI capability | `gst_brain/gemini_client.py` |
| New UI display | `streamlit_app.py` |
| New API endpoint | `gst-api/main.py` |

#### Step 2: Add the Logic

**Example: Adding HSN Validation**

```python
# File: gst_brain/enterprise_modules.py

HSN_MASTER = {
    '8474': {'rate': 18, 'description': 'Machinery'},
    '8471': {'rate': 18, 'description': 'Computers'},
    # ... add more
}

def validate_hsn_codes(invoice_df):
    """
    Validate HSN codes against government master.
    """
    results = []

    for _, row in invoice_df.iterrows():
        hsn = str(row.get('HSN', ''))

        if hsn not in HSN_MASTER:
            results.append({
                'invoice': row.get('Invoice No'),
                'status': 'failed',
                'reason': f'HSN {hsn} not in government master',
                'severity': 'high'
            })
        else:
            # Check if rate matches HSN
            expected_rate = HSN_MASTER[hsn]['rate']
            invoice_rate = row.get('Tax Rate', 0)

            if expected_rate != invoice_rate:
                results.append({
                    'invoice': row.get('Invoice No'),
                    'status': 'warning',
                    'reason': f'Rate mismatch: expected {expected_rate}%, found {invoice_rate}%',
                    'severity': 'medium'
                })
            else:
                results.append({
                    'invoice': row.get('Invoice No'),
                    'status': 'passed',
                    'severity': 'low'
                })

    return {
        'status': 'completed',
        'results': results,
        'summary': {
            'total': len(results),
            'passed': len([r for r in results if r['status'] == 'passed']),
            'failed': len([r for r in results if r['status'] == 'failed']),
            'warnings': len([r for r in results if r['status'] == 'warning'])
        }
    }
```

#### Step 3: Add Standard Response

```python
def run_hsn_validation_module(invoice_df, user_config):
    """
    Main entry point for HSN validation.
    Returns standardized response shape.
    """
    validation_results = validate_hsn_codes(invoice_df)

    return generate_standard_response(
        status='success',
        severity='medium' if validation_results['summary']['failed'] > 0 else 'low',
        findings=validation_results['summary'],
        evidence=validation_results['results'],
        risk_score=calculate_risk_score(validation_results['summary'])
    )
```

#### Step 4: Add API Endpoint

```python
# File: gst-api/main.py

@app.post("/api/v1/modules/hsn-validation")
async def hsn_validation(request: Request):
    """
    Endpoint for HSN code validation.
    """
    body = await request.json()
    invoice_data = body.get('invoice_data')
    user_config = body.get('config', {})

    # Convert to DataFrame
    df = pd.DataFrame(invoice_data)

    # Run validation
    results = run_hsn_validation_module(df, user_config)

    return results
```

#### Step 5: Add UI Workspace

```python
# File: streamlit_app.py

def workspace_hsn_validation():
    """
    New workspace for HSN validation.
    """
    st.header("HSN Code Validation")

    # File upload
    uploaded_file = st.file_uploader(
        "Upload Purchase Register",
        type=['xlsx', 'csv']
    )

    if uploaded_file:
        # Process file
        df = pd.read_excel(uploaded_file)

        if st.button("Validate HSN Codes"):
            # Call API
            response = call_api('/api/v1/modules/hsn-validation', {...})

            # Display results
            render_enterprise_module("HSN Validation", response)
```

---

### Common Patterns

#### Pattern 1: Rule-Based Compliance Check

```python
def rule_based_check(invoice, rule_config):
    """
    Standard pattern for rule-based checks.
    """
    violations = []

    # Rule 1: Check time limit
    if rule_config.get('check_time_limit'):
        days_since_invoice = (datetime.now() - invoice['date']).days
        if days_since_invoice > 180:
            violations.append({
                'rule': 'Section 16(4)',
                'message': 'ITC claim beyond 180 days'
            })

    # Rule 2: Check supplier filing status
    if rule_config.get('check_filing_status'):
        if not invoice['supplier_filed']:
            violations.append({
                'rule': 'Section 16(2)(c)',
                'message': 'Supplier has not filed return'
            })

    return {
        'eligible': len(violations) == 0,
        'violations': violations
    }
```

#### Pattern 2: Batch AI Processing

```python
def batch_ai_process(items, batch_size=50, api_key=None):
    """
    Process large datasets in batches to avoid rate limits.
    """
    results = []

    for i in range(0, len(items), batch_size):
        batch = items[i:i + batch_size]
        batch_results = call_gemini(batch, api_key)
        results.extend(batch_results)

    return results
```

#### Pattern 3: Aggregated Metrics

```python
def calculate_compliance_metrics(reconciliation_data):
    """
    Calculate aggregated compliance metrics.
    """
    total = len(reconciliation_data['invoices'])
    matched = len([i for i in reconciliation_data['invoices'] if i['match_status'] == 'matched'])
    mismatched = total - matched

    return {
        'total_invoices': total,
        'match_rate': (matched / total * 100) if total > 0 else 0,
        'mismatch_rate': (mismatched / total * 100) if total > 0 else 0,
        'compliance_score': (matched / total * 100) if total > 0 else 0,
        'itc_at_risk': sum(i['tax_amount'] for i in reconciliation_data['invoices'] if i['match_status'] != 'matched')
    }
```

---

## Feature Roadmap

### Phase 1: Core Enhancements (Weeks 1-4)

| Feature | Complexity | Impact | Description |
|---------|------------|--------|-------------|
| Fuzzy Matching | Medium | High | Smart invoice matching with confidence scores |
| Auto-Categorization | Low | High | Classify mismatches (Supplier Error, Timing, Amount) |
| CFO Dashboard | Medium | High | Compliance health score, trend charts, ITC at risk |
| HSN Validation | Low | Medium | Validate HSN codes against government master |

### Phase 2: Compliance Depth (Weeks 5-12)

| Feature | Complexity | Impact | Description |
|---------|------------|--------|-------------|
| Section 17(5) Blocked Credits | Medium | High | Detect motor vehicles, personal use items |
| E-Way Bill Integration | High | Medium | Cross-verify with e-way bill data |
| Multi-File Reconciliation | High | High | Support GSTR-1, GSTR-3B, e-way bills |
| GSTR-9 Annual Return | High | High | Annual reconciliation and reporting |

### Phase 3: Enterprise Features (Weeks 13-24)

| Feature | Complexity | Impact | Description |
|---------|------------|--------|-------------|
| Multi-Client Management | High | High | Separate workspaces for CA firm clients |
| Role-Based Access | Medium | High | User roles (Admin, CA, Data Entry) |
| Workflow Queue | Medium | Medium | Kanban-style task management |
| Tally Integration | High | High | Direct data import from Tally |

### Phase 4: AI Excellence (Weeks 25+)

| Feature | Complexity | Impact | Description |
|---------|------------|--------|-------------|
| Predictive Risk Scoring | High | High | ML-based vendor risk prediction |
| Anomaly Detection | High | High | Pattern recognition for fraud detection |
| Automated Remediation | Medium | Medium | Generate supplier reminder emails |
| Document Intelligence | High | Medium | OCR for scanned invoices |

---

## Industry Comparison

### ClearTax GST Feature Matrix

| Feature | This Project | ClearTax | Priority |
|--------|--------------|---------|----------|
| **Core Reconciliation** |
| Purchase Register vs GSTR-2B | ✅ | ✅ | — |
| Fuzzy Matching | ⚠️ Basic | ✅ Advanced | High |
| Multi-File Reconciliation | ❌ | ✅ | High |
| **ITC Compliance** |
| Section 16 Eligibility | ✅ | ✅ | — |
| Section 17 Blocked Credits | ⚠️ Partial | ✅ | High |
| 180-Day Time Limit | ✅ | ✅ | — |
| **Vendor Risk** |
| Filing History Analysis | ✅ | ✅ | — |
| Risk Score Calculation | ✅ | ✅ | — |
| Predictive Risk | ❌ | ✅ | Medium |
| **Invoice Compliance** |
| GSTIN Validation | ✅ | ✅ | — |
| HSN Validation | ❌ | ✅ | High |
| Date Validation | ✅ | ✅ | — |
| **AI Capabilities** |
| Natural Language Q&A | ✅ | ⚠️ Basic | Medium |
| Diagnostic Explanations | ⚠️ Basic | ✅ | Medium |
| Report Generation | ❌ | ✅ | Medium |
| **Enterprise** |
| Multi-Client | ❌ | ✅ | High |
| Role-Based Access | ❌ | ✅ | High |
| API Integration | ❌ | ✅ | High |
| Accounting Software Connectors | ❌ | ✅ | High |
| **Reporting** |
| CFO Dashboard | ⚠️ Basic | ✅ | High |
| Trend Analysis | ❌ | ✅ | Medium |
| Custom Reports | ❌ | ✅ | Medium |

**Legend:** ✅ = Implemented | ⚠️ = Partial | ❌ = Not Yet

### Key Differentiators to Build

1. **Superior AI Explanations** — Our AI copilot should explain *why* mismatches happen and *what to do about it* — more detailed than competitors
2. **Faster Reconciliation** — Handle 10,000+ invoices with incremental processing
3. **Better User Experience** — Simpler UI for non-technical CAs
4. **Cost Advantage** — Lower pricing than ClearTax for mid-market

---

## Testing

### Test Data Location

All test data is in `/workspace/test_data/`:

```
test_data/
├── README.md                          # Full documentation
├── generate_test_data.py             # Regeneration script
├── Purchase_Register_March2025.xlsx  # 675 invoices
├── GSTR2B_March2025.xlsx             # 526 records (78% match)
├── Vendor_Filing_History_12Months.xlsx
├── Invoice_Compliance_Test_Data.xlsx
├── ITC_Eligibility_Test_Data.xlsx
├── Notice_Tracker_Test_Data.xlsx
└── Purchase_Register_*.xlsx          # Historical data
```

### Running Tests

```bash
# Generate fresh test data
cd /workspace/test_data
python generate_test_data.py

# Validate reconciliation
# 1. Upload Purchase_Register_March2025.xlsx
# 2. Upload GSTR2B_March2025.xlsx
# 3. Expected: ~78% match rate

# Validate ITC eligibility
# 1. Run reconciliation first
# 2. Expected: ~60% eligible, ~40% ineligible

# Validate vendor risk
# 1. Upload Vendor_Filing_History_12Months.xlsx
# 2. Expected: 25 low-risk, 20 medium, 10 high, 5 critical
```

### Test Data Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| Total Invoices | 675 | March 2025 purchase register |
| Match Rate | 78% | Invoices present in both files |
| Vendors | 60 | With varied risk profiles |
| Compliance Errors | 15% | Intentionally introduced |
| ITC Eligible | 60% | Simulated eligible scenarios |
| Filing Rate | 82% | Overall vendor compliance |

---

## Deployment

### Local Deployment

```bash
# Start backend
cd gst-hackathon-project
uvicorn gst-api.main:app --reload --port 8000

# Start frontend (separate terminal)
streamlit run streamlit_app.py
```

### Production Deployment

```bash
# Using Docker
docker build -t gst-audit-workstation .
docker run -p 8501:8501 -p 8000:8000 gst-audit-workstation

# Environment variables
export GEMINI_API_KEY="your-key"
export DATABASE_URL="postgresql://..."
```

### Cloud Deployment

```bash
# Deploy frontend to Streamlit Cloud
streamlit deploy

# Deploy backend to Render/Railway/Heroku
# See gst-api/ for deployment configuration
```

---

## Contributing

### Code Standards

1. **Follow existing patterns** — Match the style of surrounding code
2. **Add type hints** — Use Python type annotations
3. **Document functions** — Docstrings for all public functions
4. **Test thoroughly** — Validate against test data before submitting

### Pull Request Process

1. Fork the repository
2. Create a feature branch (`feature/your-feature-name`)
3. Add tests for new functionality
4. Ensure all tests pass
5. Update documentation
6. Submit pull request with description

### Issue Reporting

When reporting issues, include:
- Python version
- Exact steps to reproduce
- Expected vs actual behavior
- Test data file used (if applicable)

---

## License

This project is proprietary software. All rights reserved.

---

## Support

- **Documentation:** See `/docs/` directory
- **Test Data:** See `/test_data/README.md`
- **Code Structure:** See `/gst_brain/README.md`
- **Issues:** Create GitHub issue with full details

---

*Last Updated: May 2025*
*Version: 1.0.0*
*Maintainer: Development Team*
