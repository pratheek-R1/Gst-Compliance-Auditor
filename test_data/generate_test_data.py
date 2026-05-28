import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os
import random

def generate_test_data():
    num_rows_purchase = 700
    
    # HSN Master Data
    hsn_master = ['8471', '8474', '9982', '8703', '9983'] # 8703 is Motor Vehicles (Blocked)
    
    # Supplier List
    suppliers = [
        {"name": "Acme Corp", "gstin": "27AACCA1234F1Z1", "compliance": 0.95},
        {"name": "Globex Inc", "gstin": "27BCCB2345F1Z2", "compliance": 0.80},
        {"name": "Soylent Corp", "gstin": "27CCDC3456F1Z3", "compliance": 0.99},
        {"name": "Initech", "gstin": "27DDED4567F1Z4", "compliance": 0.50}, # High risk
        {"name": "Umbrella Corp", "gstin": "27EEEE5678F1Z5", "compliance": 0.90}
    ]

    purchase_records = []
    gstr_records = []

    start_date = datetime(2025, 3, 1)

    for i in range(1, num_rows_purchase + 1):
        supplier = random.choice(suppliers)
        inv_date = start_date + timedelta(days=random.randint(0, 30))
        
        # Base valid invoice
        inv_no = f"INV/{2025}/{str(i).zfill(4)}"
        tax_amount = round(random.uniform(500, 50000), 2)
        hsn = random.choice(hsn_master)
        
        desc = "Software Services" if hsn == '9982' else ("Computers" if hsn == '8471' else ("Machinery" if hsn == '8474' else ("Motor Vehicle" if hsn == '8703' else "Consulting")))
        
        # Add to Purchase Register
        purchase_records.append({
            "Invoice No": inv_no,
            "Date": inv_date.strftime("%Y-%m-%d"),
            "Supplier": supplier["name"],
            "GSTIN": supplier["gstin"],
            "Tax Amount": tax_amount,
            "HSN/SAC": hsn,
            "Item Description": desc
        })

        # Add to GSTR-2B based on supplier compliance
        if random.random() < supplier["compliance"]:
            gstr_inv = inv_no
            gstr_tax = tax_amount
            gstr_date = inv_date.strftime("%Y-%m-%d")

            # Introduce some intentional fuzzy matching errors for testing
            if random.random() < 0.05: # 5% chance of typo in invoice number
                gstr_inv = gstr_inv.replace('/', '-')
            
            # Introduce timing differences (supplier reported late)
            if random.random() < 0.05: # 5% chance of date mismatch
                gstr_date = (inv_date + timedelta(days=random.randint(1, 10))).strftime("%Y-%m-%d")

            # Introduce amount mismatch
            if random.random() < 0.05: # 5% chance of amount mismatch
                gstr_tax = round(gstr_tax + random.uniform(-100, 100), 2)

            gstr_records.append({
                "Invoice No": gstr_inv,
                "Date": gstr_date,
                "Supplier": supplier["name"],
                "GSTIN": supplier["gstin"],
                "Tax Amount": gstr_tax,
                "HSN/SAC": hsn
            })

    df_purchase = pd.DataFrame(purchase_records)
    df_gstr = pd.DataFrame(gstr_records)

    # Save files
    test_data_dir = os.path.dirname(os.path.abspath(__file__))
    df_purchase.to_excel(os.path.join(test_data_dir, "Purchase_Register_March2025.xlsx"), index=False)
    df_gstr.to_excel(os.path.join(test_data_dir, "GSTR2B_March2025.xlsx"), index=False)
    
    # Create Vendor History
    vendor_history = []
    for s in suppliers:
        vendor_history.append({
            "Supplier": s["name"],
            "GSTIN": s["gstin"],
            "Filing Rate": f"{int(s['compliance'] * 100)}%",
            "Avg Delay (Days)": random.randint(0, 15) if s['compliance'] > 0.8 else random.randint(10, 45)
        })
    df_vendor = pd.DataFrame(vendor_history)
    df_vendor.to_excel(os.path.join(test_data_dir, "Vendor_Filing_History_12Months.xlsx"), index=False)

    print(f"Generated Purchase_Register_March2025.xlsx with {len(purchase_records)} rows.")
    print(f"Generated GSTR2B_March2025.xlsx with {len(gstr_records)} rows.")
    print(f"Generated Vendor_Filing_History_12Months.xlsx with {len(vendor_history)} rows.")

if __name__ == "__main__":
    generate_test_data()
