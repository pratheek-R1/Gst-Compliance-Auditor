import sys
import os
import shutil
import json
import uuid
import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from gst_brain.main import process_gst
from gst_brain.enterprise_modules import run_itc_eligibility_module, run_vendor_risk_module, run_invoice_compliance_module

app = FastAPI(title="Enterprise GST Compliance API", version="2.0.0")

# Add CORS middleware to allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TEMP_UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "temp_uploads")
os.makedirs(TEMP_UPLOADS_DIR, exist_ok=True)

@app.post("/reconcile")
async def reconcile(
    purchase: UploadFile = File(...), 
    gstr: UploadFile = File(...),
    ignore_below_amount: float = 0.0,
    strict_date_matching: bool = True,
    detect_duplicates: bool = False,
    date_tolerance_days: int = 0,
    amount_variance_tolerance: float = 0.0,
    exclude_vendors: str = "",
    hsn_sac_mismatch_level: str = "ignore",
    ignore_pending_invoices: bool = False,
    enable_fuzzy_matching: bool = True
):
    # Handle exceptions (e.g., if files are not Excel or CSV)
    allowed_extensions = ('.xlsx', '.xls', '.csv')
    if not purchase.filename.lower().endswith(allowed_extensions):
        raise HTTPException(status_code=400, detail="Purchase file must be an Excel (.xlsx, .xls) or CSV file.")
    if not gstr.filename.lower().endswith(allowed_extensions):
        raise HTTPException(status_code=400, detail="GSTR file must be an Excel (.xlsx, .xls) or CSV file.")

    # Parse excluded vendors
    vendor_list = [v.strip() for v in exclude_vendors.split(",")] if exclude_vendors else []

    # Use UUID to prevent file-overwrite bugs when multiple users hit the API concurrently
    session_id = str(uuid.uuid4())
    _, purchase_ext = os.path.splitext(purchase.filename)
    _, gstr_ext = os.path.splitext(gstr.filename)
    
    purchase_path = os.path.join(TEMP_UPLOADS_DIR, f"purchase_{session_id}{purchase_ext}")
    gstr_path = os.path.join(TEMP_UPLOADS_DIR, f"gstr_{session_id}{gstr_ext}")

    try:
        # Save purchase file
        with open(purchase_path, "wb") as buffer:
            shutil.copyfileobj(purchase.file, buffer)
            
        # Save GSTR file
        with open(gstr_path, "wb") as buffer:
            shutil.copyfileobj(gstr.file, buffer)
            
        # Call the imported function
        result = process_gst(
            purchase_path, 
            gstr_path,
            ignore_below_amount=ignore_below_amount,
            strict_date_matching=strict_date_matching,
            detect_duplicates=detect_duplicates,
            date_tolerance_days=date_tolerance_days,
            amount_variance_tolerance=amount_variance_tolerance,
            exclude_vendors=vendor_list,
            hsn_sac_mismatch_level=hsn_sac_mismatch_level,
            ignore_pending_invoices=ignore_pending_invoices,
            enable_fuzzy_matching=enable_fuzzy_matching
        )
        
        # Return the result dictionary directly as JSON
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing files: {str(e)}")
    finally:
        purchase.file.close()
        gstr.file.close()
        if os.path.exists(purchase_path):
            try: os.remove(purchase_path)
            except: pass
        if os.path.exists(gstr_path):
            try: os.remove(gstr_path)
            except: pass
# ==========================================
# ENTERPRISE COMPLIANCE MODULES (NEW)
# ==========================================

@app.post("/api/v1/modules/itc-eligibility")
async def module_itc_eligibility(payload: dict = Body(...)):
    """Module 2: ITC Eligibility & Reversal Checks"""
    try:
        detect_blocked_credits = payload.get("detect_blocked_credits", True)
        ignore_itc_variance_below = float(payload.get("ignore_itc_variance_below", 0.0))
        strict_itc_validation = payload.get("strict_itc_validation", True)
        
        allowed_itc_categories = payload.get("allowed_itc_categories", ["Goods", "Services", "Both"])
        apply_reverse_charge = payload.get("apply_reverse_charge", False)
        itc_cap_percentage = int(payload.get("itc_cap_percentage", 100))
        itc_lookback_months = int(payload.get("itc_lookback_months", 12))
        reject_incomplete_gstr2a = payload.get("reject_incomplete_gstr2a", False)
        
        response = run_itc_eligibility_module(
            payload, 
            detect_blocked_credits=detect_blocked_credits,
            ignore_itc_variance_below=ignore_itc_variance_below,
            strict_itc_validation=strict_itc_validation,
            allowed_itc_categories=allowed_itc_categories,
            apply_reverse_charge=apply_reverse_charge,
            itc_cap_percentage=itc_cap_percentage,
            itc_lookback_months=itc_lookback_months,
            reject_incomplete_gstr2a=reject_incomplete_gstr2a
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/modules/vendor-risk")
async def module_vendor_risk(payload: dict = Body(...)):
    """Module 4: Risk-Based Red Flags & Vendor Profiling"""
    try:
        vendor_mismatch_threshold = int(payload.get("vendor_mismatch_threshold", 50))
        enable_anomaly_detection = payload.get("enable_anomaly_detection", True)
        risk_sensitivity = payload.get("risk_sensitivity", "Medium")
        
        min_transaction_count = int(payload.get("min_transaction_count", 5))
        anomaly_window_days = int(payload.get("anomaly_window_days", 30))
        blocked_vendor_gstins = payload.get("blocked_vendor_gstins", [])
        max_concentration_percentage = int(payload.get("max_concentration_percentage", 25))
        payment_delay_threshold_days = int(payload.get("payment_delay_threshold_days", 30))
        turnover_ratio_threshold = float(payload.get("turnover_ratio_threshold", 2.0))
        
        response = run_vendor_risk_module(
            payload, 
            vendor_mismatch_threshold=vendor_mismatch_threshold,
            enable_anomaly_detection=enable_anomaly_detection,
            risk_sensitivity=risk_sensitivity,
            min_transaction_count=min_transaction_count,
            anomaly_window_days=anomaly_window_days,
            blocked_vendor_gstins=blocked_vendor_gstins,
            max_concentration_percentage=max_concentration_percentage,
            payment_delay_threshold_days=payment_delay_threshold_days,
            turnover_ratio_threshold=turnover_ratio_threshold
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/modules/invoice-compliance")
async def module_invoice_compliance(
    purchase: UploadFile = File(...),
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
):
    """Module 5: Invoice & Documentation Compliance"""
    allowed_extensions = ('.xlsx', '.xls', '.csv')
    if not purchase.filename.lower().endswith(allowed_extensions):
        raise HTTPException(status_code=400, detail="Invalid file type.")
        
    session_id = str(uuid.uuid4())
    _, ext = os.path.splitext(purchase.filename)
    filepath = os.path.join(TEMP_UPLOADS_DIR, f"doc_audit_{session_id}{ext}")
    
    try:
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(purchase.file, buffer)
        
        # Deterministic read
        df = pd.read_excel(filepath) if ext in ['.xlsx', '.xls'] else pd.read_csv(filepath)
        response = run_invoice_compliance_module(
            df,
            validate_gstin_format=validate_gstin_format,
            detect_duplicate_invoices=detect_duplicate_invoices,
            require_hsn_sac=require_hsn_sac,
            reject_future_invoices=reject_future_invoices,
            detect_qty_mismatches=detect_qty_mismatches,
            min_invoice_amount=min_invoice_amount,
            validate_einvoice_format=validate_einvoice_format,
            validate_cin_pan=validate_cin_pan,
            reject_special_chars=reject_special_chars,
            check_invoice_sequence=check_invoice_sequence
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        purchase.file.close()
        if os.path.exists(filepath):
            try: os.remove(filepath)
            except: pass

# ==========================================
# EXISTING CORE ROUTES (UNTOUCHED)
# ==========================================


@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/ai-chat")
async def ai_chat(payload: dict = Body(...)):
    """
    Advanced Endpoint for a Custom AI Chat Assistant.
    Allows the frontend to ask follow-up questions about the mismatches.
    """
    question = payload.get("question")
    context = payload.get("context", [])
    
    if not question:
        raise HTTPException(status_code=400, detail="Question is required.")
        
    try:
        from gst_brain.main import get_api_key
        from gst_brain.gemini_client import get_chat_response
        
        api_key = get_api_key()
        answer = get_chat_response(question, context, api_key)
        return {"answer": answer}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"answer": f"Error generating response: {str(e)}"}

@app.get("/ewaybill/{ewaybill_no}")
def check_ewaybill(ewaybill_no: str):
    if ewaybill_no == "123456":
        return {"valid": True, "status": "Active", "generator": "GSTN"}
    else:
        return {"valid": False, "status": "Invalid", "generator": "GSTN"}

# Run command: uvicorn main:app --reload --host 0.0.0.0 --port 8000
