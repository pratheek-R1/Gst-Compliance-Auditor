# GST Audit MVP Feature Implementation Prompt

**Purpose**: Add lightweight audit configuration controls to each GST audit module to elevate the app from a basic demo to professional configurable audit software.

**Critical Rule**: DO NOT rewrite backend logic. DO NOT auto-run anything. DO NOT break existing functionality.

---

## Implementation Strategy (In Order)

1. Add simple audit controls to the UI
2. Connect controls to existing backend logic (pass as parameters)
3. Run existing audit functions with the control parameters
4. Verify module still works
5. Verify no existing functionality broke

---

## Per-Module Requirements

### 1. Returns Reconciliation Module
**Add these audit controls to the UI:**
- `ignore_below_amount` (Number Input): Ignore mismatches below ₹X
- `strict_date_matching` (Checkbox): Strict date matching [ON/OFF]
- `detect_duplicates` (Checkbox): Detect duplicate invoices [ON/OFF]

**Button**: Run Reconciliation Audit

**Output Structure**:
- Status (Pass/Fail/Warning)
- Severity (Low/Medium/High)
- Findings (list of issues found)
- Evidence (table of affected records)
- Explanation (why this matters)
- Recommended Action (what to fix)

---

### 2. ITC Eligibility Module
**Add these audit controls to the UI:**
- `detect_blocked_credits` (Checkbox): Detect blocked credits [ON/OFF]
- `ignore_itc_variance_below` (Number Input): Ignore ITC variance below ₹X
- `strict_itc_validation` (Checkbox): Strict ITC validation [ON/OFF]

**Button**: Run ITC Audit

**Output Structure**: Same as Returns Reconciliation

---

### 3. Vendor Risk Module
**Add these audit controls to the UI:**
- `vendor_mismatch_threshold` (Slider): Vendor mismatch threshold % (0-100)
- `enable_anomaly_detection` (Checkbox): Enable anomaly detection [ON/OFF]
- `risk_sensitivity` (Selectbox): High-risk sensitivity [Low / Medium / High]

**Button**: Analyze Vendor Risk

**Output Structure**: Same as Returns Reconciliation

---

### 4. Invoice Compliance Module
**Add these audit controls to the UI:**
- `validate_gstin_format` (Checkbox): Validate GSTIN format [ON/OFF]
- `detect_duplicate_invoices` (Checkbox): Detect duplicate invoices [ON/OFF]
- `require_hsn_sac` (Checkbox): Require HSN/SAC [ON/OFF]

**Button**: Run Invoice Compliance Audit

**Important**: This module must work independently.

**Output Structure**: Same as Returns Reconciliation

---

### 5. Compliance Health Score Module
**Add these audit controls to the UI:**
- `risk_sensitivity` (Selectbox): Risk sensitivity [Low / Medium / High]

**Button**: Generate Compliance Score

**Output Structure**: Same as Returns Reconciliation

---

### 6. Notice Tracker Module
**Add these input fields:**
- Notice ID (Text Input)
- Deadline (Date Input)
- Status (Selectbox: Open / In Progress / Resolved)
- Notes (Text Area)

**Button**: Add Notice

**Output**: Store notices in a simple table/dataframe

---

## Streamlit UI Components to Use

```
- st.checkbox()          → For ON/OFF controls
- st.selectbox()         → For dropdown selections (Low/Medium/High)
- st.slider()            → For percentage/threshold inputs
- st.number_input()      → For currency/amount inputs
- st.dataframe()         → For evidence tables
- st.metric()            → For summary scores
- st.warning()           → For warning messages
- st.success()           → For success messages
- st.expander()          → For collapsible sections
```

---

## UX Workflow (Do NOT Change)

```
Step 1: Upload
        ↓
Step 2: Configure (user sets audit controls)
        ↓
Step 3: Execute (user clicks Run button)
```

**DO NOT:**
- Auto-run audits after upload
- Auto-trigger any AI/Gemini calls
- Hide controls
- Dump raw JSON output
- Create giant one-click workflows
- Create fake enterprise complexity

---

## Output Structure (All Modules)

Every audit finding should return a structured result with:

```json
{
  "status": "Pass|Fail|Warning",
  "severity": "Low|Medium|High",
  "findings": [
    {
      "title": "Finding title",
      "description": "What was found",
      "count": 0
    }
  ],
  "evidence": [
    {
      "record_id": "...",
      "issue": "...",
      "impact": "..."
    }
  ],
  "explanation": "Why this matters",
  "recommended_action": "What to do about it"
}
```

Then render this using:
- `st.metric()` for status/severity
- `st.dataframe()` for evidence table
- `st.write()` or `st.info()` for explanation/action

---

## AI Rules (Do NOT Violate)

**Allowed**:
- Explain findings in plain English
- Summarize risks
- Draft remediation actions

**NOT Allowed**:
- Invent findings
- Hallucinate calculations
- Answer unrelated prompts using audit context

**Source of Truth**: Deterministic backend logic (your existing audit functions) remains the source of truth.

---

## Implementation Checklist

- [ ] Add controls UI to Returns Reconciliation module
- [ ] Pass control values to existing reconciliation function
- [ ] Format output with st.metric() + st.dataframe() + st.write()
- [ ] Test: module still works, no breaking changes
- [ ] Repeat for ITC Eligibility module
- [ ] Repeat for Vendor Risk module
- [ ] Repeat for Invoice Compliance module
- [ ] Repeat for Compliance Health Score module
- [ ] Add Notice Tracker table
- [ ] Final regression test: all modules work, no functionality broken
- [ ] Code review: no hardcoded values, clean parameter passing

---

## Code Pattern (Reference)

```python
# 1. Upload section
uploaded_file = st.file_uploader("Upload CSV/Excel", type=["csv", "xlsx"])

if uploaded_file:
    # 2. Configure section
    st.subheader("Audit Configuration")
    col1, col2 = st.columns(2)
    
    with col1:
        threshold = st.number_input("Ignore below ₹", min_value=0, value=1000)
    with col2:
        strict_mode = st.checkbox("Strict matching")
    
    # 3. Execute section
    if st.button("Run Audit"):
        # Call existing backend function with parameters
        result = existing_audit_function(
            data=uploaded_file,
            threshold=threshold,
            strict_mode=strict_mode
        )
        
        # 4. Display findings
        st.metric("Status", result["status"])
        st.dataframe(result["evidence"])
        st.write(f"**Explanation**: {result['explanation']}")
```

---

## Notes

- Keep implementation lightweight and MVP-friendly
- No overengineering
- No destabilization of current working system
- Each control should be a simple parameter passed to existing functions
- If a function doesn't exist or needs modification, flag it for the data team—don't invent it
