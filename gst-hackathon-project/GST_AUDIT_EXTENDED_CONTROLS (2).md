# GST Audit MVP - Extended Controls Implementation Guide

**Purpose**: Add advanced audit controls to enhance configurability and give auditors granular control over audit logic.

**Critical Rule**: DO NOT rewrite backend logic. Pass controls as parameters. DO NOT break existing functionality.

---

## Implementation Strategy

1. Add new UI controls for each module (sliders, multi-select, inputs)
2. Pass control values as parameters to existing backend functions
3. Update backend function signatures to accept new parameters
4. Integrate controls into audit logic (conditionally apply rules)
5. Test each control independently
6. Verify all existing functionality still works

---

## Module 1: Returns Reconciliation - Extended Controls

### Current Controls (Keep These)
- `ignore_below_amount` (Number Input): Ignore mismatches below ₹X
- `strict_date_matching` (Checkbox): Strict date matching [ON/OFF]
- `detect_duplicates` (Checkbox): Detect duplicate invoices [ON/OFF]

### NEW Controls to Add

#### 1.1 Date Tolerance Window
```
UI Component: st.slider("Date tolerance (days)", min_value=0, max_value=30, value=0)
Backend Parameter: date_tolerance_days (int, default=0)

Logic:
  if date_tolerance_days > 0:
      allow_days_diff = abs(invoice_date - return_date).days <= date_tolerance_days
      is_match = is_match or allow_days_diff
  else:
      # Strict matching (existing behavior)
      is_match = (invoice_date == return_date)
```

#### 1.2 Amount Variance Tolerance
```
UI Component: st.slider("Amount variance tolerance (%)", min_value=0, max_value=10, value=0, step=0.5)
Backend Parameter: amount_variance_tolerance (float, default=0)

Logic:
  if amount_variance_tolerance > 0:
      variance_ratio = (amount_variance_tolerance / 100) * invoice_amount
      amount_match = abs(invoice_amount - return_amount) <= variance_ratio
  else:
      # Exact match required (existing behavior)
      amount_match = (invoice_amount == return_amount)
```

#### 1.3 Exclude Specific Vendors
```
UI Component: 
  excluded_vendors = st.multiselect(
    "Exclude vendors from reconciliation",
    options=get_unique_vendors(data),
    default=[]
  )

Backend Parameter: exclude_vendors (list, default=[])

Logic:
  if exclude_vendors and len(exclude_vendors) > 0:
      data_filtered = data[~data['vendor_name'].isin(exclude_vendors)]
      # Run reconciliation on filtered data
  else:
      # Include all vendors (existing behavior)
      data_filtered = data
```

#### 1.4 HSN/SAC Mismatch Handling
```
UI Component: st.selectbox("HSN/SAC mismatch behavior", ["Ignore", "Warn", "Fail"])
Backend Parameter: hsn_sac_mismatch_level (string: "ignore", "warn", "fail", default="ignore")

Logic:
  if hsn_sac_mismatch_level == "fail":
      if invoice_hsn != return_hsn:
          is_match = False
  elif hsn_sac_mismatch_level == "warn":
      if invoice_hsn != return_hsn:
          add_to_warnings()
  else:
      # Ignore HSN/SAC differences (existing behavior)
      pass
```

#### 1.5 Pending Status Handling
```
UI Component: st.checkbox("Ignore pending status invoices")
Backend Parameter: ignore_pending_invoices (bool, default=False)

Logic:
  if ignore_pending_invoices:
      data_filtered = data[data['invoice_status'] != 'Pending']
  else:
      # Include pending (existing behavior)
      data_filtered = data
```

---

## Module 2: ITC Eligibility - Extended Controls

### Current Controls (Keep These)
- `detect_blocked_credits` (Checkbox): Detect blocked credits [ON/OFF]
- `ignore_itc_variance_below` (Number Input): Ignore ITC variance below ₹X
- `strict_itc_validation` (Checkbox): Strict ITC validation [ON/OFF]

### NEW Controls to Add

#### 2.1 Allow ITC on Specific Categories
```
UI Component:
  allowed_categories = st.multiselect(
    "Allow ITC on categories",
    options=["Goods", "Services", "Both"],
    default=["Goods", "Services"]
  )

Backend Parameter: allowed_itc_categories (list, default=["Goods", "Services"])

Logic:
  if invoice_category not in allowed_itc_categories:
      itc_eligible = False
      add_finding("ITC not allowed for this category")
  else:
      # Apply normal ITC logic (existing behavior)
      pass
```

#### 2.2 Reverse Charge Threshold
```
UI Component: st.checkbox("Apply reverse charge restrictions")
Backend Parameter: apply_reverse_charge (bool, default=False)

Logic:
  if apply_reverse_charge:
      if invoice_amount >= reverse_charge_threshold and is_reverse_charge:
          itc_eligible = False
          add_finding("ITC blocked due to reverse charge")
  else:
      # Include reverse charge invoices (existing behavior)
      pass
```

#### 2.3 Input Tax Credit Cap
```
UI Component: st.slider("ITC cap (%)", min_value=50, max_value=100, value=100, step=5)
Backend Parameter: itc_cap_percentage (int, default=100)

Logic:
  max_itc_allowed = (itc_cap_percentage / 100) * calculated_itc
  itc_eligible = min(itc_eligible, max_itc_allowed)
```

#### 2.4 Time Period Window
```
UI Component: st.selectbox("ITC lookback period", ["1 Month", "3 Months", "6 Months", "12 Months"])
Backend Parameter: itc_lookback_months (int, default=12)

Logic:
  cutoff_date = current_date - timedelta(days=itc_lookback_months*30)
  if invoice_date < cutoff_date:
      itc_eligible = False
      add_finding("Invoice outside ITC lookback period")
```

#### 2.5 GSTR-2A Completeness Check
```
UI Component: st.checkbox("Reject incomplete GSTR-2A entries")
Backend Parameter: reject_incomplete_gstr2a (bool, default=False)

Logic:
  if reject_incomplete_gstr2a:
      required_fields = ['invoice_no', 'invoice_date', 'amount', 'gstin', 'hsn']
      if not all(field in gstr2a_entry for field in required_fields):
          itc_eligible = False
          add_finding("Incomplete GSTR-2A entry")
```

---

## Module 3: Vendor Risk - Extended Controls

### Current Controls (Keep These)
- `vendor_mismatch_threshold` (Slider): Vendor mismatch threshold % (0-100)
- `enable_anomaly_detection` (Checkbox): Enable anomaly detection [ON/OFF]
- `risk_sensitivity` (Selectbox): High-risk sensitivity [Low / Medium / High]

### NEW Controls to Add

#### 3.1 Minimum Transaction Count Threshold
```
UI Component: st.number_input("Minimum transaction count", min_value=1, max_value=1000, value=5)
Backend Parameter: min_transaction_count (int, default=5)

Logic:
  transaction_count = count_vendor_transactions(vendor_id)
  if transaction_count < min_transaction_count:
      risk_level = "Medium"  # Flag as low-activity vendor
      add_finding(f"Vendor has only {transaction_count} transactions")
```

#### 3.2 Transaction Frequency Anomaly Window
```
UI Component: st.slider("Anomaly detection window (days)", min_value=7, max_value=90, value=30)
Backend Parameter: anomaly_window_days (int, default=30)

Logic:
  if enable_anomaly_detection:
      transactions_in_window = count_transactions_in_window(vendor_id, anomaly_window_days)
      avg_transactions = get_historical_average(vendor_id)
      
      if transactions_in_window > (avg_transactions * 2):
          risk_level = "High"
          add_finding("Unusual spike in vendor transactions")
```

#### 3.3 Blocked Vendor List
```
UI Component:
  uploaded_blocked_list = st.file_uploader("Upload blocked vendor GSTs (CSV)", type=["csv"])
  or
  blocked_gstin = st.text_area("Paste blocked GSTs (comma-separated)")

Backend Parameter: blocked_vendor_gstins (list, default=[])

Logic:
  if vendor_gstin in blocked_vendor_gstins:
      risk_level = "Critical"
      add_finding("Vendor is on blocked list")
```

#### 3.4 Concentration Risk Threshold
```
UI Component: st.slider("Max concentration per vendor (%)", min_value=10, max_value=50, value=25)
Backend Parameter: max_concentration_percentage (int, default=25)

Logic:
  total_spend = sum(all_vendor_amounts)
  vendor_spend = sum(current_vendor_amounts)
  concentration_ratio = (vendor_spend / total_spend) * 100
  
  if concentration_ratio > max_concentration_percentage:
      risk_level = "Medium"
      add_finding(f"Vendor concentration at {concentration_ratio}%")
```

#### 3.5 Payment Delay Threshold
```
UI Component: st.slider("Payment delay threshold (days)", min_value=0, max_value=90, value=30)
Backend Parameter: payment_delay_threshold_days (int, default=30)

Logic:
  avg_payment_days = calculate_avg_payment_days(vendor_id)
  if avg_payment_days > payment_delay_threshold_days:
      risk_level = "Low" or "Medium"
      add_finding(f"Vendor average payment delay: {avg_payment_days} days")
```

#### 3.6 Turnover Ratio Threshold
```
UI Component: st.slider("Turnover ratio threshold", min_value=0.5, max_value=5.0, value=2.0, step=0.1)
Backend Parameter: turnover_ratio_threshold (float, default=2.0)

Logic:
  turnover_ratio = vendor_annual_revenue / vendor_transaction_amount
  if turnover_ratio > turnover_ratio_threshold:
      risk_level = "High"
      add_finding(f"Turnover ratio anomaly: {turnover_ratio}")
```

---

## Module 4: Invoice Compliance - Extended Controls

### Current Controls (Keep These)
- `validate_gstin_format` (Checkbox): Validate GSTIN format [ON/OFF]
- `detect_duplicate_invoices` (Checkbox): Detect duplicate invoices [ON/OFF]
- `require_hsn_sac` (Checkbox): Require HSN/SAC [ON/OFF]

### NEW Controls to Add

#### 4.1 Invoice Date Validation
```
UI Component: st.checkbox("Reject future-dated invoices")
Backend Parameter: reject_future_invoices (bool, default=True)

Logic:
  if reject_future_invoices:
      if invoice_date > today:
          compliance_fail = True
          add_finding("Invoice date is in the future")
```

#### 4.2 Line Item Quantity Mismatch
```
UI Component: st.checkbox("Detect line item quantity mismatches")
Backend Parameter: detect_qty_mismatches (bool, default=False)

Logic:
  if detect_qty_mismatches:
      for each_line_item in invoice:
          if line_item_qty != bill_qty:
              compliance_fail = True
              add_finding(f"Qty mismatch on line item: {line_item_qty} vs {bill_qty}")
```

#### 4.3 Minimum Invoice Amount Threshold
```
UI Component: st.number_input("Minimum invoice amount (₹)", min_value=0, value=0)
Backend Parameter: min_invoice_amount (float, default=0)

Logic:
  if min_invoice_amount > 0 and invoice_amount < min_invoice_amount:
      compliance_warn = True
      add_finding(f"Invoice below minimum threshold: ₹{invoice_amount}")
```

#### 4.4 E-Invoice Format Validation
```
UI Component: st.checkbox("Validate E-invoice format (if applicable)")
Backend Parameter: validate_einvoice_format (bool, default=False)

Logic:
  if validate_einvoice_format and has_einvoice:
      if not is_valid_einvoice_format(invoice):
          compliance_fail = True
          add_finding("Invalid E-invoice format")
```

#### 4.5 CIN/PAN Format Validation
```
UI Component: st.checkbox("Validate CIN/PAN format")
Backend Parameter: validate_cin_pan (bool, default=False)

Logic:
  if validate_cin_pan:
      if not is_valid_cin_format(vendor_cin):
          compliance_fail = True
          add_finding("Invalid CIN format")
      if not is_valid_pan_format(vendor_pan):
          compliance_fail = True
          add_finding("Invalid PAN format")
```

#### 4.6 Special Characters in Invoice
```
UI Component: st.checkbox("Reject invoices with special characters")
Backend Parameter: reject_special_chars (bool, default=False)

Logic:
  if reject_special_chars:
      if contains_invalid_chars(invoice_data):
          compliance_fail = True
          add_finding("Invoice contains invalid special characters")
```

#### 4.7 Invoice Number Sequence Check
```
UI Component: st.checkbox("Verify invoice numbering sequence")
Backend Parameter: check_invoice_sequence (bool, default=False)

Logic:
  if check_invoice_sequence:
      previous_invoice_num = get_previous_invoice_number(current_invoice_num)
      if current_invoice_num != (previous_invoice_num + 1):
          compliance_warn = True
          add_finding("Gap in invoice numbering sequence")
```

---

## Module 5: Compliance Health Score - Extended Controls

### Current Controls (Keep These)
- `risk_sensitivity` (Selectbox): Risk sensitivity [Low / Medium / High]

### NEW Controls to Add

#### 5.1 Weight Distribution
```
UI Component:
  col1, col2, col3, col4 = st.columns(4)
  with col1:
      returns_weight = st.slider("Returns weight %", 0, 100, 25)
  with col2:
      itc_weight = st.slider("ITC weight %", 0, 100, 25)
  with col3:
      vendor_weight = st.slider("Vendor weight %", 0, 100, 25)
  with col4:
      invoice_weight = st.slider("Invoice weight %", 0, 100, 25)

Backend Parameter: 
  score_weights = {
    "returns": 25,
    "itc": 25,
    "vendor": 25,
    "invoice": 25
  }

Logic:
  compliance_score = (
      (returns_score * score_weights['returns'] / 100) +
      (itc_score * score_weights['itc'] / 100) +
      (vendor_score * score_weights['vendor'] / 100) +
      (invoice_score * score_weights['invoice'] / 100)
  )
```

#### 5.2 Exclude Modules from Scoring
```
UI Component:
  excluded_modules = st.multiselect(
    "Exclude modules from compliance score",
    options=["Returns Reconciliation", "ITC Eligibility", "Vendor Risk", "Invoice Compliance"],
    default=[]
  )

Backend Parameter: excluded_modules (list, default=[])

Logic:
  active_modules = all_modules - excluded_modules
  compliance_score = calculate_weighted_score(active_modules, weights)
```

#### 5.3 Severity Weighting
```
UI Component:
  severity_weights = {
      "Low": st.slider("Low severity weight", 0, 10, 1),
      "Medium": st.slider("Medium severity weight", 0, 10, 5),
      "High": st.slider("High severity weight", 0, 10, 10)
  }

Backend Parameter: severity_weights (dict)

Logic:
  total_severity = sum(
      count_findings(severity) * severity_weights[severity]
      for severity in ["Low", "Medium", "High"]
  )
  compliance_score = 100 - min(total_severity, 100)
```

---

## Module 6: Notice Tracker (No Changes)

Notice Tracker is a data entry module. No additional controls needed.

---

## Backend Function Signature Updates

### Returns Reconciliation
```python
def reconciliation_audit(
    data,
    # Existing parameters
    ignore_below_amount=1000,
    strict_date_matching=True,
    detect_duplicates=True,
    # NEW parameters
    date_tolerance_days=0,
    amount_variance_tolerance=0,
    exclude_vendors=None,
    hsn_sac_mismatch_level="ignore",
    ignore_pending_invoices=False
):
    """Run returns reconciliation audit with extended controls."""
    pass
```

### ITC Eligibility
```python
def itc_eligibility_audit(
    data,
    # Existing parameters
    detect_blocked_credits=True,
    ignore_itc_variance_below=1000,
    strict_itc_validation=True,
    # NEW parameters
    allowed_itc_categories=["Goods", "Services"],
    apply_reverse_charge=False,
    itc_cap_percentage=100,
    itc_lookback_months=12,
    reject_incomplete_gstr2a=False
):
    """Run ITC eligibility audit with extended controls."""
    pass
```

### Vendor Risk
```python
def vendor_risk_audit(
    data,
    # Existing parameters
    vendor_mismatch_threshold=15,
    enable_anomaly_detection=True,
    risk_sensitivity="Medium",
    # NEW parameters
    min_transaction_count=5,
    anomaly_window_days=30,
    blocked_vendor_gstins=None,
    max_concentration_percentage=25,
    payment_delay_threshold_days=30,
    turnover_ratio_threshold=2.0
):
    """Run vendor risk audit with extended controls."""
    pass
```

### Invoice Compliance
```python
def invoice_compliance_audit(
    data,
    # Existing parameters
    validate_gstin_format=True,
    detect_duplicate_invoices=True,
    require_hsn_sac=True,
    # NEW parameters
    reject_future_invoices=True,
    detect_qty_mismatches=False,
    min_invoice_amount=0,
    validate_einvoice_format=False,
    validate_cin_pan=False,
    reject_special_chars=False,
    check_invoice_sequence=False
):
    """Run invoice compliance audit with extended controls."""
    pass
```

### Compliance Health Score
```python
def compliance_health_score(
    data,
    # Existing parameters
    risk_sensitivity="Medium",
    # NEW parameters
    score_weights=None,
    excluded_modules=None,
    severity_weights=None
):
    """Generate compliance health score with weighted configuration."""
    if score_weights is None:
        score_weights = {"returns": 25, "itc": 25, "vendor": 25, "invoice": 25}
    if severity_weights is None:
        severity_weights = {"Low": 1, "Medium": 5, "High": 10}
    
    pass
```

---

## Streamlit UI Components Reference

```python
# Number/Currency inputs
st.number_input("Label", min_value=0, max_value=None, value=1000)

# Range sliders
st.slider("Label", min_value=0, max_value=100, value=50)

# Toggle switches
st.checkbox("Label", value=False)

# Dropdowns
st.selectbox("Label", options=["Option 1", "Option 2", "Option 3"])

# Multi-select
st.multiselect("Label", options=["Option 1", "Option 2"], default=[])

# Text input
st.text_input("Label", value="default")

# Text area
st.text_area("Label", height=100)

# File upload
st.file_uploader("Label", type=["csv", "xlsx"])

# Display results
st.metric("Title", value=100, delta="change")
st.dataframe(df)
st.info("Information message")
st.warning("Warning message")
st.error("Error message")
```

---

## Implementation Checklist

- [ ] Returns Reconciliation: Add date tolerance control
- [ ] Returns Reconciliation: Add amount variance tolerance control
- [ ] Returns Reconciliation: Add exclude vendors control
- [ ] Returns Reconciliation: Add HSN/SAC mismatch handling
- [ ] Returns Reconciliation: Add pending status handling
- [ ] Test Returns module thoroughly

- [ ] ITC Eligibility: Add category restrictions control
- [ ] ITC Eligibility: Add reverse charge control
- [ ] ITC Eligibility: Add ITC cap control
- [ ] ITC Eligibility: Add lookback period control
- [ ] ITC Eligibility: Add GSTR-2A completeness check
- [ ] Test ITC module thoroughly

- [ ] Vendor Risk: Add transaction count threshold
- [ ] Vendor Risk: Add anomaly window control
- [ ] Vendor Risk: Add blocked vendor list
- [ ] Vendor Risk: Add concentration risk control
- [ ] Vendor Risk: Add payment delay control
- [ ] Vendor Risk: Add turnover ratio control
- [ ] Test Vendor module thoroughly

- [ ] Invoice Compliance: Add future date rejection
- [ ] Invoice Compliance: Add quantity mismatch detection
- [ ] Invoice Compliance: Add minimum amount threshold
- [ ] Invoice Compliance: Add E-invoice validation
- [ ] Invoice Compliance: Add CIN/PAN validation
- [ ] Invoice Compliance: Add special character rejection
- [ ] Invoice Compliance: Add invoice sequence check
- [ ] Test Invoice module thoroughly

- [ ] Compliance Score: Add weight distribution controls
- [ ] Compliance Score: Add module exclusion control
- [ ] Compliance Score: Add severity weighting
- [ ] Test Compliance Score module thoroughly

- [ ] Final regression test: All modules work, no breaking changes
- [ ] Code review: Clean parameter passing, no hardcoded values

---

## Implementation Order (Recommended)

Start with **high-impact, low-risk** controls:

1. **Phase 1** (Week 1):
   - Returns: date tolerance + amount variance
   - Invoice: future date rejection

2. **Phase 2** (Week 2):
   - ITC: category restrictions + lookback period
   - Vendor: transaction count + concentration risk

3. **Phase 3** (Week 3):
   - Vendor: anomaly window + blocked list
   - Invoice: quantity mismatch + sequence check

4. **Phase 4** (Week 4):
   - All remaining controls
   - Compliance Score: weight distribution

---

## Testing Guidelines

For each control:
```
1. Test with control DISABLED (existing behavior)
2. Test with control ENABLED (new behavior)
3. Verify audit result changes appropriately
4. Verify no other modules affected
5. Verify error handling (bad inputs, missing data)
```

Example test case:
```python
# Test: Date Tolerance

# Without tolerance
result_1 = reconciliation_audit(data, date_tolerance_days=0)
assert result_1["matches"] == 5  # Exact matches only

# With 3-day tolerance
result_2 = reconciliation_audit(data, date_tolerance_days=3)
assert result_2["matches"] == 7  # More matches within window
```

---

## Notes

- Keep implementation lightweight and MVP-friendly
- No overengineering
- Pass all controls as function parameters
- Integrate controls into existing logic (don't duplicate)
- One control per commit/PR (easier to revert if needed)
- Test existing functionality after each change
- Document which controls are available in UI
