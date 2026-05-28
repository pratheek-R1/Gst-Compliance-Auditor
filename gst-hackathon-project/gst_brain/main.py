import os
import json
import pandas as pd
from dotenv import load_dotenv
from typing import Dict, Any

# Get the directory of the current script
script_dir = os.path.dirname(os.path.abspath(__file__))
dotenv_path = os.path.join(script_dir, '.env')

# Load environment variables from the exact .env file location
load_dotenv(dotenv_path=dotenv_path, override=True)

# Configure Google Generative AI
def get_api_key():
    key = os.getenv("GOOGLE_API_KEY")
    if key:
        return key.strip().strip("'").strip('"')
    return None

def get_ai_insight(mismatches_list: list) -> Dict[str, str]:
    """
    Helper function to get AI explanations for a BATCH of tax mismatches.
    Returns a dictionary mapping invoice_no to the AI's advice.
    """
    api_key = get_api_key()
    
    # Delegate to the dedicated Gemini client wrapper
    from gst_brain.gemini_client import get_batch_insights
    return get_batch_insights(mismatches_list, api_key)

def process_gst(
    purchase_file_path: str, 
    gstr_file_path: str,
    ignore_below_amount: float = 0.0,
    strict_date_matching: bool = True,
    detect_duplicates: bool = False,
    date_tolerance_days: int = 0,
    amount_variance_tolerance: float = 0.0,
    exclude_vendors: list = None,
    hsn_sac_mismatch_level: str = "ignore",
    ignore_pending_invoices: bool = False,
    enable_fuzzy_matching: bool = True
) -> dict:
    """
    Input: Paths to two Excel files.
    Output: A dictionary (JSON serializable) with this specific structure:
    {
        "total_invoices": <int>,
        "matched": <int>,
        "mismatches": [
            {
                "invoice_no": <str>,
                "supplier": <str>,
                "date": <str>,
                "issue": <str>,
                "book_tax": <float>,
                "gstr_tax": <float>,
                "ai_explanation": <str>
            }
        ]
    }
    """
    # 1. Load both files using Pandas based on extension.
    def load_file(filepath):
        ext = os.path.splitext(filepath)[1].lower()
        if ext == '.csv':
            return pd.read_csv(filepath)
        return pd.read_excel(filepath)

    try:
        df_book = load_file(purchase_file_path)
        df_gstr = load_file(gstr_file_path)
    except Exception as e:
        print(f"Error reading files: {e}")
        return {"total_invoices": 0, "matched": 0, "mismatches": [], "summary_insight": "File reading failed."}

    # --- SENIOR DEV FEATURE: Data Sanitization Pipeline ---
    # Real-world data is dirty. We strip whitespace and normalize casing so the merge doesn't fail on typos.
    def clean_dataframe(df):
        df.columns = df.columns.str.strip() # Clean column headers
        if 'Invoice No' in df.columns:
            df['Invoice No'] = df['Invoice No'].astype(str).str.strip().str.upper()
        if 'Supplier' in df.columns:
            df['Supplier'] = df['Supplier'].astype(str).str.strip()
        if 'Date' in df.columns:
            if not strict_date_matching:
                df['Date'] = pd.to_datetime(df['Date'], errors='coerce').dt.strftime('%Y-%m') # Month-level matching
            else:
                df['Date'] = pd.to_datetime(df['Date'], errors='coerce').dt.strftime('%Y-%m-%d')
            df['Date'] = df['Date'].fillna('') # Handle invalid dates gracefully
        return df

    df_book = clean_dataframe(df_book)
    df_gstr = clean_dataframe(df_gstr)

    # 1.5 Pending Status Handling
    if ignore_pending_invoices:
        if 'Status' in df_book.columns:
            df_book = df_book[~df_book['Status'].astype(str).str.contains('Pending', case=False, na=False)]
        if 'Status' in df_gstr.columns:
            df_gstr = df_gstr[~df_gstr['Status'].astype(str).str.contains('Pending', case=False, na=False)]

    # 1.3 Exclude Specific Vendors
    if exclude_vendors and len(exclude_vendors) > 0:
        if 'Supplier' in df_book.columns:
            df_book = df_book[~df_book['Supplier'].isin(exclude_vendors)]
        if 'Supplier' in df_gstr.columns:
            df_gstr = df_gstr[~df_gstr['Supplier'].isin(exclude_vendors)]

    # Ensure necessary columns exist
    for df, name in [(df_book, 'Purchase'), (df_gstr, 'GSTR')]:
        if 'Invoice No' not in df.columns or 'Date' not in df.columns:
            print(f"Missing required columns in {name} file. Need 'Invoice No' and 'Date'.")
            return {"total_invoices": 0, "matched": 0, "mismatches": []}

    # Date formatting is now handled in clean_dataframe


    # Convert Tax Amount to numeric, filling NaNs with 0
    for df in [df_book, df_gstr]:
        if 'Tax Amount' in df.columns:
            df['Tax Amount'] = pd.to_numeric(df['Tax Amount'], errors='coerce').fillna(0.0)
        else:
            df['Tax Amount'] = 0.0

    total_invoices = len(df_book) + len(df_gstr)
    matched = 0
    mismatches = []

    if detect_duplicates:
        for df, name in [(df_book, 'Purchase'), (df_gstr, 'GSTR')]:
            dupes = df[df.duplicated(subset=['Invoice No'], keep=False)]
            for _, row in dupes.iterrows():
                mismatches.append({
                    "invoice_no": str(row['Invoice No']),
                    "supplier": str(row.get('Supplier', 'Unknown')),
                    "date": str(row.get('Date', '')),
                    "issue": f"Duplicate in {name}",
                    "severity": "Medium",
                    "book_tax": float(row.get('Tax Amount', 0.0)) if name == 'Purchase' else 0.0,
                    "gstr_tax": float(row.get('Tax Amount', 0.0)) if name == 'GSTR' else 0.0,
                    "item_desc": str(row.get('Item Description', ''))
                })
        # Remove duplicates to prevent exploding joins
        df_book = df_book.drop_duplicates(subset=['Invoice No', 'Date'])
        df_gstr = df_gstr.drop_duplicates(subset=['Invoice No', 'Date'])

    # 2. Perform a reconciliation based on 'Invoice No' (and 'Date' if strict).
    merge_cols = ['Invoice No'] if date_tolerance_days > 0 else ['Invoice No', 'Date']
    merged_df = pd.merge(
        df_book, 
        df_gstr, 
        on=merge_cols, 
        how='outer', 
        suffixes=('_book', '_gstr'),
        indicator=True
    )
    
    # 3. Identify all mismatches first
    for index, row in merged_df.iterrows():
        invoice_no = str(row['Invoice No'])
        date = str(row.get('Date', row.get('Date_book', row.get('Date_gstr', ''))))
        
        supplier = row.get('Supplier_book', row.get('Supplier_gstr', 'Unknown'))
        if pd.isna(supplier): supplier = 'Unknown'
            
        book_tax = float(row.get('Tax Amount_book', 0.0))
        if pd.isna(book_tax): book_tax = 0.0
            
        gstr_tax = float(row.get('Tax Amount_gstr', 0.0))
        if pd.isna(gstr_tax): gstr_tax = 0.0
        
        item_desc = row.get('Item Description', row.get('Item Description_book', ''))
        if pd.isna(item_desc): item_desc = ''
        
        issue = ""
        severity = "Low"
        
        if row['_merge'] == 'left_only':
            issue = "Missing in GSTR"
            severity = "High"
        elif row['_merge'] == 'right_only':
            issue = "Missing in Book"
            severity = "Medium"
        else:
            # 1.1 Date Tolerance
            date_match = True
            if date_tolerance_days > 0:
                d_book = pd.to_datetime(row.get('Date_book', ''), errors='coerce')
                d_gstr = pd.to_datetime(row.get('Date_gstr', ''), errors='coerce')
                if pd.notna(d_book) and pd.notna(d_gstr):
                    if abs((d_book - d_gstr).days) > date_tolerance_days:
                        date_match = False
                elif pd.isna(d_book) != pd.isna(d_gstr):
                    date_match = False

            # 1.2 Amount Variance
            tax_diff = abs(book_tax - gstr_tax)
            variance_ratio = (amount_variance_tolerance / 100.0) * book_tax
            amount_match = tax_diff <= max(variance_ratio, 0.01)

            # 1.4 HSN/SAC
            hsn_match = True
            hsn_book = str(row.get('HSN/SAC_book', ''))
            hsn_gstr = str(row.get('HSN/SAC_gstr', ''))
            if hsn_sac_mismatch_level in ["warn", "fail"] and hsn_book and hsn_gstr and hsn_book != hsn_gstr:
                hsn_match = False
                
            if not date_match:
                issue = "Date Mismatch"
                severity = "Medium"
            elif not amount_match and tax_diff > ignore_below_amount:
                issue = "Tax Mismatch"
                severity = "High" if tax_diff > 1000 else "Medium"
            elif not hsn_match and hsn_sac_mismatch_level == "fail":
                issue = "HSN/SAC Mismatch"
                severity = "Medium"
            else:
                matched += 1
                if not hsn_match and hsn_sac_mismatch_level == "warn":
                    mismatches.append({
                        "invoice_no": invoice_no,
                        "supplier": supplier,
                        "date": date,
                        "issue": "HSN/SAC Warning",
                        "severity": "Low",
                        "book_tax": book_tax,
                        "gstr_tax": gstr_tax,
                        "item_desc": item_desc
                    })
                # Check for Blocked Credits (Section 17(5)) even on perfectly matched invoices
                # We do this here so it's captured in mismatches for the ITC module
                if any(keyword in str(item_desc).lower() for keyword in ['motor vehicle', 'food', 'beverages', 'club', 'health insurance', 'personal']):
                    mismatches.append({
                        "invoice_no": invoice_no,
                        "supplier": supplier,
                        "date": date,
                        "issue": "Potential Blocked Credit (Sec 17(5))",
                        "severity": "High",
                        "book_tax": book_tax,
                        "gstr_tax": gstr_tax,
                        "item_desc": item_desc
                    })
                continue # Exact match or acceptable


        # Build basic mismatch info (No AI call yet)
        mismatches.append({
            "invoice_no": invoice_no,
            "supplier": supplier,
            "date": date,
            "issue": issue,
            "severity": severity,
            "book_tax": book_tax,
            "gstr_tax": gstr_tax,
            "item_desc": item_desc
        })

    if enable_fuzzy_matching:
        try:
            from thefuzz import fuzz
            missing_in_gstr = [m for m in mismatches if m['issue'] == 'Missing in GSTR']
            missing_in_book = [m for m in mismatches if m['issue'] == 'Missing in Book']
            
            matched_indices_book = set()
            new_mismatches = [m for m in mismatches if m['issue'] not in ['Missing in GSTR', 'Missing in Book']]
            
            for m_gstr in missing_in_gstr:
                best_match = None
                best_score = 0
                best_j = -1
                
                for j, m_book in enumerate(missing_in_book):
                    if j in matched_indices_book:
                        continue
                    
                    inv_score = fuzz.ratio(m_gstr['invoice_no'].lower(), m_book['invoice_no'].lower())
                    if inv_score > 80:
                        sup_score = fuzz.ratio(m_gstr['supplier'].lower(), m_book['supplier'].lower())
                        if sup_score > 80:
                            amt_diff = abs(m_gstr['book_tax'] - m_book['gstr_tax'])
                            variance_ratio = (amount_variance_tolerance / 100.0) * m_gstr['book_tax'] if m_gstr['book_tax'] else 0
                            if amt_diff <= max(variance_ratio, 0.01) + ignore_below_amount:
                                if inv_score > best_score:
                                    best_score = inv_score
                                    best_match = m_book
                                    best_j = j
                
                if best_match:
                    matched_indices_book.add(best_j)
                    matched += 1
                    new_mismatches.append({
                        "invoice_no": m_gstr["invoice_no"],
                        "supplier": m_gstr["supplier"],
                        "date": m_gstr["date"],
                        "issue": f"Fuzzy Match (Typo in GSTR: {best_match['invoice_no']})",
                        "severity": "Low",
                        "book_tax": m_gstr["book_tax"],
                        "gstr_tax": best_match["gstr_tax"],
                        "item_desc": m_gstr.get("item_desc", "")
                    })
                else:
                    new_mismatches.append(m_gstr)
                    
            for j, m_book in enumerate(missing_in_book):
                if j not in matched_indices_book:
                    new_mismatches.append(m_book)
                    
            mismatches = new_mismatches
        except ImportError:
            print("thefuzz library not installed. Skipping fuzzy matching.")

    total_invoices = len(df_book)  # Correct total base for compliance calculation

    # 4. Batch Process the AI Insights
    # We only send a subset of data (max 50) to save tokens, improve speed, and prevent JSON truncation errors from the LLM.
    mismatch_data_for_ai = [
        {
            "invoice_no": m["invoice_no"],
            "issue": m["issue"],
            "book_tax": m["book_tax"],
            "gstr_tax": m["gstr_tax"]
        } for m in mismatches
    ][:50]
    
    # Call Gemini ONCE for all mismatches
    ai_insights = get_ai_insight(mismatch_data_for_ai)

    # Attach the AI insights back to the original mismatches list
    evidence_list = []
    findings_dict = {}
    
    for mismatch in mismatches:
        mismatch["ai_explanation"] = ai_insights.get(mismatch["invoice_no"], "No AI insight generated.")
        
        # Build evidence format
        evidence_list.append({
            "record_id": mismatch["invoice_no"],
            "issue": mismatch["issue"],
            "impact": str(mismatch["severity"])
        })
        
        # Aggregate findings
        issue = mismatch["issue"]
        if issue not in findings_dict:
            findings_dict[issue] = 0
        findings_dict[issue] += 1

    findings_list = [
        {"title": k, "description": f"Found {v} instances of {k}", "count": v}
        for k, v in findings_dict.items()
    ]

    # --- SENIOR DEV FEATURE: Macro Risk Profiling & Compliance Scoring ---
    compliance_score = 100 if total_invoices == 0 else int((matched / total_invoices) * 100)
    status = "Pass" if compliance_score > 90 else ("Warning" if compliance_score > 70 else "Fail")
    severity = "Low" if status == "Pass" else ("Medium" if status == "Warning" else "High")
    
    summary_insight = "System Status: Healthy. No major risks identified."
    recommended_action = "No immediate action required."
    
    if mismatches:
        df_mis = pd.DataFrame(mismatches)
        if 'supplier' in df_mis.columns and not df_mis.empty:
            worst_supplier = df_mis['supplier'].value_counts().idxmax()
            worst_count = df_mis['supplier'].value_counts().max()
            summary_insight = f"Supplier '{worst_supplier}' is causing the most friction ({worst_count} discrepancies)."
            recommended_action = "Initiate vendor audit and reconcile mismatches."

    # 5. Return the expected dictionary structure
    return {
        "status": status,
        "severity": severity,
        "findings": findings_list,
        "evidence": evidence_list,
        "explanation": summary_insight,
        "recommended_action": recommended_action,
        "total_invoices": total_invoices,
        "matched": matched,
        "compliance_score": compliance_score,
        "mismatches": mismatches,
        "risk_score": 100 - compliance_score
    }

if __name__ == "__main__":
    # 1. Creates dummy data (2 small DataFrames) and saves them as Excel files
    book_data = {
        'Invoice No': ['INV001', 'INV002', 'INV003'],
        'Date': ['2023-10-01', '2023-10-02', '2023-10-03'],
        'Supplier': ['Acme Corp', 'Globex', 'Soylent Corp'],
        'Tax Amount': [100.0, 200.0, 300.0]
    }
    gstr_data = {
        'Invoice No': ['INV001', 'INV002', 'INV004'],
        'Date': ['2023-10-01', '2023-10-02', '2023-10-04'],
        'Supplier': ['Acme Corp', 'Globex', 'Initech'],
        'Tax Amount': [100.0, 250.0, 400.0]
    }

    df_b = pd.DataFrame(book_data)
    df_g = pd.DataFrame(gstr_data)

    df_b.to_excel('temp_purchase.xlsx', index=False)
    df_g.to_excel('temp_gstr.xlsx', index=False)

    print("Dummy files created: 'temp_purchase.xlsx' and 'temp_gstr.xlsx'\n")

    # 2. Calls 'process_gst' with these dummy files.
    result = process_gst('temp_purchase.xlsx', 'temp_gstr.xlsx')

    # 3. Prints the JSON output to the console so I can verify it works.
    print("--- GST RECONCILIATION RESULT ---")
    print(json.dumps(result, indent=4))
