import pandas as pd
import json
import datetime
import re
from typing import Dict, Any

def generate_standard_response(
    module_name: str, 
    status: str, 
    severity: str, 
    exceptions: list, 
    evidence: list, 
    explanation: str, 
    suggested_action: str, 
    risk_score: int
) -> Dict[str, Any]:
    """Standardized output schema mandated for all enterprise compliance modules."""
    # Convert exceptions list into findings list (grouped by issue if needed, but we'll just map them to findings and evidence format)
    
    # We will build findings by grouping rule violations
    findings_dict = {}
    evidence_mapped = []
    
    for ex in exceptions:
        rule = ex.get("rule_violated", ex.get("flag", "Exception Detected"))
        if rule not in findings_dict:
            findings_dict[rule] = 0
        findings_dict[rule] += 1
        
        evidence_mapped.append({
            "record_id": str(ex.get("invoice_no", ex.get("supplier", "Unknown"))),
            "issue": rule,
            "impact": str(ex.get("itc_at_risk", ex.get("error_count", "N/A")))
        })

    findings_list = [
        {"title": k, "description": f"Found {v} instances of {k}", "count": v}
        for k, v in findings_dict.items()
    ]
    
    return {
        "module": module_name,
        "status": status,
        "severity": severity,
        "findings": findings_list,
        "evidence": evidence_mapped if evidence_mapped else exceptions,
        "explanation": explanation,
        "recommended_action": suggested_action,
        "risk_score": risk_score
    }

def run_itc_eligibility_module(
    reconciliation_data: dict, 
    detect_blocked_credits: bool = True,
    ignore_itc_variance_below: float = 0.0,
    strict_itc_validation: bool = True,
    allowed_itc_categories: list = None,
    apply_reverse_charge: bool = False,
    itc_cap_percentage: int = 100,
    itc_lookback_months: int = 12,
    reject_incomplete_gstr2a: bool = False
) -> Dict[str, Any]:
    """Module 2: ITC Eligibility & Reversal Checks (Deterministic)"""
    if allowed_itc_categories is None:
        allowed_itc_categories = ["Goods", "Services", "Both"]
        
    mismatches = reconciliation_data.get("mismatches", [])
    exceptions = []
    evidence = []
    
    ineligible_itc_value = 0.0
    for m in mismatches:
        book_tax = m.get("book_tax", 0)
        gstr_tax = m.get("gstr_tax", 0)
        tax_diff = abs(book_tax - gstr_tax)
        
        if tax_diff <= ignore_itc_variance_below:
            continue
            
        itc_claimed = book_tax
        
        # 2.3 ITC Cap
        if itc_cap_percentage < 100:
            allowed_tax = (itc_cap_percentage / 100.0) * itc_claimed
            if itc_claimed > allowed_tax:
                ineligible_itc_value += (itc_claimed - allowed_tax)
                exceptions.append({
                    "invoice_no": m["invoice_no"],
                    "supplier": m["supplier"],
                    "rule_violated": f"ITC Cap Exceeded ({itc_cap_percentage}%)",
                    "itc_at_risk": itc_claimed - allowed_tax
                })
        
        if strict_itc_validation and m.get("issue") == "Missing in GSTR" and book_tax > 0:
            ineligible_itc_value += book_tax
            exceptions.append({
                "invoice_no": m["invoice_no"],
                "supplier": m["supplier"],
                "rule_violated": "Section 16(2)(c) - Tax not paid to govt by supplier",
                "itc_at_risk": book_tax
            })
            
        if detect_blocked_credits:
            item_desc = str(m.get("item_desc", "")).lower()
            if any(k in item_desc for k in ['motor vehicle', 'food', 'beverages', 'club', 'health insurance', 'personal']):
                # Prevent double counting if already flagged for something else
                if not any(e["invoice_no"] == m["invoice_no"] and "Section 17(5) Blocked Credit" in e["rule_violated"] for e in exceptions):
                    ineligible_itc_value += book_tax
                    exceptions.append({
                        "invoice_no": m["invoice_no"],
                        "supplier": m["supplier"],
                        "rule_violated": f"Section 17(5) Blocked Credit - {m.get('item_desc', 'Flagged Item')}",
                        "itc_at_risk": book_tax
                    })
            elif m.get("issue") == "Potential Blocked Credit (Sec 17(5))":
                 if not any(e["invoice_no"] == m["invoice_no"] and "Section 17(5) Blocked Credit" in e["rule_violated"] for e in exceptions):
                    ineligible_itc_value += book_tax
                    exceptions.append({
                        "invoice_no": m["invoice_no"],
                        "supplier": m["supplier"],
                        "rule_violated": f"Section 17(5) Blocked Credit - {m.get('item_desc', 'Flagged Item')}",
                        "itc_at_risk": book_tax
                    })
            elif m.get("issue") == "Tax Mismatch" and book_tax > gstr_tax:
                ineligible_itc_value += tax_diff
                exceptions.append({
                    "invoice_no": m["invoice_no"],
                    "supplier": m["supplier"],
                    "rule_violated": "Section 17(5) - Possible Blocked Credit or Excess Claim",
                    "itc_at_risk": tax_diff
                })
            
        # 2.4 Time Period Window
        if m.get("date"):
            try:
                inv_date = datetime.datetime.strptime(m["date"], "%Y-%m-%d")
                cutoff = datetime.datetime.now() - datetime.timedelta(days=itc_lookback_months*30)
                if inv_date < cutoff:
                    exceptions.append({
                        "invoice_no": m["invoice_no"],
                        "supplier": m["supplier"],
                        "rule_violated": f"Outside {itc_lookback_months} Month Lookback Period",
                        "itc_at_risk": book_tax
                    })
            except Exception:
                pass
                
        # 2.5 GSTR-2A Completeness (Mock check for missing critical fields in missing entries)
        if reject_incomplete_gstr2a and m.get("issue") == "Missing in GSTR":
             exceptions.append({
                 "invoice_no": m["invoice_no"],
                 "supplier": m["supplier"],
                 "rule_violated": "Incomplete GSTR-2A Entry",
                 "itc_at_risk": book_tax
             })

    status = "Fail" if exceptions else "Pass"
    severity = "High" if ineligible_itc_value > 5000 else "Medium" if exceptions else "Low"
    risk_score = min(100, int((ineligible_itc_value / 1000) * 10)) if exceptions else 0
    
    explanation = f"Detected {len(exceptions)} instances of ineligible ITC claims amounting to ₹{ineligible_itc_value}."
    suggested_action = "Reverse ITC immediately under Rule 37A or withhold vendor payment." if exceptions else "No ITC reversals required based on current dataset."

    return generate_standard_response(
        "ITC Eligibility & Reversal Checks", status, severity, exceptions, evidence, explanation, suggested_action, risk_score
    )

def run_vendor_risk_module(
    reconciliation_data: dict, 
    vendor_mismatch_threshold: int = 50,
    enable_anomaly_detection: bool = True,
    risk_sensitivity: str = "Medium",
    min_transaction_count: int = 5,
    anomaly_window_days: int = 30,
    blocked_vendor_gstins: list = None,
    max_concentration_percentage: int = 25,
    payment_delay_threshold_days: int = 30,
    turnover_ratio_threshold: float = 2.0
) -> Dict[str, Any]:
    """Module 4: Risk-Based Red Flags & Vendor Profiling"""
    if blocked_vendor_gstins is None:
        blocked_vendor_gstins = []
        
    mismatches = reconciliation_data.get("mismatches", [])
    total_invoices = reconciliation_data.get("total_invoices", max(len(mismatches), 1))
    exceptions = []
    evidence = []
    
    supplier_errors = {}
    supplier_totals = {}
    
    for m in mismatches:
        sup = m.get("supplier", "Unknown")
        supplier_errors[sup] = supplier_errors.get(sup, 0) + 1
        supplier_totals[sup] = supplier_totals.get(sup, 0.0) + m.get("book_tax", 0.0)
        
    total_spend = sum(supplier_totals.values()) if supplier_totals else 1.0
    
    risk_score = 0
    status = "Pass"
    severity = "Low"
    
    # Adjust threshold based on sensitivity
    error_threshold = 3
    if risk_sensitivity == "High":
        error_threshold = 1
    elif risk_sensitivity == "Medium":
        error_threshold = 2
        
    for sup, count in supplier_errors.items():
        mismatch_percent = (count / total_invoices) * 100
        
        # Original error checks
        if count >= error_threshold or (enable_anomaly_detection and mismatch_percent >= vendor_mismatch_threshold):
            exceptions.append({"supplier": sup, "error_count": count, "flag": "Habitual Defaulter or High Mismatch Ratio"})
            status = "Warning"
            severity = "High" if risk_sensitivity == "High" else "Medium"
            risk_score += (25 if risk_sensitivity == "High" else 15)
            
        # 3.1 Min Transaction Count
        if count < min_transaction_count and count > 0:
            exceptions.append({"supplier": sup, "error_count": count, "flag": f"Low-activity vendor (Under {min_transaction_count} txns)"})
            status = "Warning" if status != "Fail" else status
            
        # 3.3 Blocked Vendor List
        # Note: We don't have GSTIN mapped to supplier string in dummy data, so we'll match by name/string loosely for the MVP
        if sup in blocked_vendor_gstins:
            exceptions.append({"supplier": sup, "error_count": count, "flag": "Vendor is on blocked list"})
            status = "Fail"
            severity = "High"
            risk_score += 50
            
        # 3.4 Concentration Risk
        concentration = (supplier_totals.get(sup, 0) / total_spend) * 100
        if concentration > max_concentration_percentage:
            exceptions.append({"supplier": sup, "error_count": count, "flag": f"High Concentration ({concentration:.1f}%)"})
            status = "Warning" if status != "Fail" else status
            risk_score += 10
            
    risk_score = min(100, risk_score)
    explanation = f"Identified {len(exceptions)} high-risk vendors exhibiting repeated non-compliance."
    suggested_action = "Initiate vendor audit. Issue automated notices requesting GSTR-1 compliance before releasing next payment tranche."

    return generate_standard_response(
        "Risk-Based Red Flags & Anomaly Detection", status, severity, exceptions, evidence, explanation, suggested_action, risk_score
    )

def run_invoice_compliance_module(
    book_df: pd.DataFrame,
    validate_gstin_format: bool = True,
    detect_duplicate_invoices: bool = True,
    require_hsn_sac: bool = False,
    reject_future_invoices: bool = True,
    detect_qty_mismatches: bool = False,
    min_invoice_amount: float = 0.0,
    validate_einvoice_format: bool = False,
    validate_cin_pan: bool = False,
    reject_special_chars: bool = False,
    check_invoice_sequence: bool = False
) -> Dict[str, Any]:
    """Module 5: Invoice & Documentation Compliance (Rule-based Regex/Format checks)"""
    exceptions = []
    evidence = []
    
    # Mock HSN Master
    HSN_MASTER = {
        '8474': {'rate': 18, 'description': 'Machinery'},
        '8471': {'rate': 18, 'description': 'Computers'},
        '9982': {'rate': 18, 'description': 'Software Services'},
        '8703': {'rate': 28, 'description': 'Motor Vehicles'},
        '9983': {'rate': 18, 'description': 'Consulting'}
    }

    if require_hsn_sac and 'HSN/SAC' in book_df.columns:
        for _, row in book_df.iterrows():
            hsn = str(row.get('HSN/SAC', ''))
            inv = row.get('Invoice No', 'Unknown')
            if hsn and hsn not in HSN_MASTER:
                exceptions.append({"invoice_no": inv, "rule_violated": f"HSN {hsn} not in government master"})
    elif require_hsn_sac and 'HSN/SAC' not in book_df.columns:
        exceptions.append({"invoice_no": "ALL", "rule_violated": "Missing HSN/SAC Column entirely"})
        
    # Check for duplicate invoices
    if detect_duplicate_invoices and 'Invoice No' in book_df.columns:
        duplicates = book_df[book_df.duplicated(['Invoice No', 'Supplier'], keep=False)]
        for _, row in duplicates.iterrows():
            inv = row['Invoice No']
            sup = row.get('Supplier', 'Unknown')
            exceptions.append({"invoice_no": inv, "supplier": sup, "rule_violated": "Duplicate Entry in Purchase Register"})

        # Check for valid invoice format (Alphanumeric, max 16 chars as per GST rules)
        invalid_format = book_df[~book_df['Invoice No'].astype(str).str.match(r'^[a-zA-Z0-9\-\/]{1,16}$')]
        for _, row in invalid_format.iterrows():
             inv = row['Invoice No']
             exceptions.append({"invoice_no": inv, "rule_violated": "Invalid Invoice Number Format (Rule 46)"})
             
    if validate_gstin_format and 'GSTIN' in book_df.columns:
        invalid_gstin = book_df[~book_df['GSTIN'].astype(str).str.match(r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$')]
        for _, row in invalid_gstin.iterrows():
            inv = row.get('Invoice No', 'Unknown')
            exceptions.append({"invoice_no": inv, "rule_violated": "Invalid GSTIN Format"})

    # 4.1 Future Dates
    if reject_future_invoices and 'Date' in book_df.columns:
        today = datetime.datetime.now()
        for _, row in book_df.iterrows():
            d = pd.to_datetime(row['Date'], errors='coerce')
            if pd.notna(d) and d > today:
                inv = row.get('Invoice No', 'Unknown')
                exceptions.append({"invoice_no": inv, "rule_violated": "Invoice date is in the future"})

    # 4.3 Min Amount Threshold
    if min_invoice_amount > 0 and 'Tax Amount' in book_df.columns:
        for _, row in book_df.iterrows():
            amt = pd.to_numeric(row['Tax Amount'], errors='coerce')
            if pd.notna(amt) and amt < min_invoice_amount:
                inv = row.get('Invoice No', 'Unknown')
                exceptions.append({"invoice_no": inv, "rule_violated": f"Invoice below minimum threshold (₹{min_invoice_amount})"})

    # 4.6 Special Characters
    if reject_special_chars and 'Invoice No' in book_df.columns:
        invalid_chars = book_df[book_df['Invoice No'].astype(str).str.contains(r'[^a-zA-Z0-9\-\/]', na=False)]
        for _, row in invalid_chars.iterrows():
            inv = row['Invoice No']
            exceptions.append({"invoice_no": inv, "rule_violated": "Invoice contains invalid special characters"})

    status = "Fail" if exceptions else "Pass"
    severity = "Medium" if exceptions else "Low"
    risk_score = min(100, len(exceptions) * 10)
    
    explanation = f"Documentation audit complete. Found {len(exceptions)} formatting or duplication errors."
    suggested_action = "Correct internal ERP entries to prevent GSTR-2B matching failures."
    
    return generate_standard_response(
        "Invoice & Documentation Compliance", status, severity, exceptions, evidence, explanation, suggested_action, risk_score
    )
