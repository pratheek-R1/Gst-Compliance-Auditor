"""
Generate realistic GST test data for demo purposes.
Creates a Purchase Register and GSTR-2B file with intentional mismatches,
blocked credits, and vendor issues to showcase all platform features.
"""
import pandas as pd
import random
from datetime import datetime, timedelta

# --- Realistic Indian Supplier Data ---
SUPPLIERS = [
    {"name": "Tata Steel Ltd", "gstin": "27AAACT2727Q1ZK"},
    {"name": "Reliance Industries", "gstin": "27AAACR5055K1ZT"},
    {"name": "Infosys Ltd", "gstin": "29AABCI1234F1Z5"},
    {"name": "Wipro Technologies", "gstin": "29AABCW5678G1Z2"},
    {"name": "Mahindra & Mahindra", "gstin": "27AAACM1234H1Z6"},
    {"name": "Larsen & Toubro", "gstin": "27AABCL5678P1Z3"},
    {"name": "Hindustan Unilever", "gstin": "27AABCH1234Q1Z8"},
    {"name": "Asian Paints Ltd", "gstin": "27AABCA5678R1Z1"},
    {"name": "Bajaj Auto Ltd", "gstin": "27AABCB1234S1Z4"},
    {"name": "Sun Pharma Industries", "gstin": "27AABCS5678T1Z7"},
    {"name": "Godrej Consumer Products", "gstin": "27AABCG1234U1Z0"},
    {"name": "Havells India Ltd", "gstin": "27AABCH5678V1Z3"},
    {"name": "Amul Dairy Coop", "gstin": "24AABCA1234W1Z6"},
    {"name": "Maruti Suzuki India", "gstin": "06AABCM5678X1Z9"},
    {"name": "ITC Limited", "gstin": "19AABCI1234Y1Z2"},
    {"name": "Ramesh Brothers Trading", "gstin": "27AABCR5678Z1Z5"},
    {"name": "Patel & Sons Hardware", "gstin": "24AABCP1234A2Z8"},
    {"name": "Sharma Logistics Pvt", "gstin": "07AABCS5678B2Z1"},
    {"name": "Gupta Electronics Hub", "gstin": "09AABCG1234C2Z4"},
    {"name": "Krishnan Textiles", "gstin": "33AABCK5678D2Z7"},
]

HSN_CODES = [
    "8471", "7308", "8504", "3926", "8544", "7210", "3004", "6204",
    "8517", "9403", "8481", "7318", "3917", "8443", "2710",
]

ITEM_DESCRIPTIONS = [
    "MS Steel Plates (Grade A)", "Copper Wire 2.5mm", "Industrial Bearings SKF",
    "Hydraulic Pump Assembly", "PVC Pipe Fittings 4inch", "Electrical Switchgear Panel",
    "Office Furniture - Desks", "IT Server Hardware", "Chemical Solvent (Toluene)",
    "Packaging Material - Cartons", "LED Lighting Fixtures", "Safety Equipment - Helmets",
    "Raw Cotton Bales", "Diesel Generator 25KVA", "Lubricating Oil (20L)",
    "Rubber Gaskets Assorted", "Stainless Steel Rods", "Cement Bags (OPC 53)",
    "Glass Panels - Tempered", "Aluminium Extrusion Profiles",
]

# Blocked credit items (Section 17(5))
BLOCKED_ITEMS = [
    "Employee Lunch Catering Service", "Motor Vehicle - Maruti Swift VDI",
    "Club Membership Fee - Annual", "Health Insurance Premium - Staff",
    "Beverages for Office Pantry", "Personal Gift Items for Directors",
    "Restaurant Bill - Team Outing", "Cab Service - Personal Travel",
]

def random_date(start_str="2024-04-01", end_str="2025-03-31"):
    start = datetime.strptime(start_str, "%Y-%m-%d")
    end = datetime.strptime(end_str, "%Y-%m-%d")
    delta = (end - start).days
    return start + timedelta(days=random.randint(0, delta))

def generate_invoice_no(prefix, index):
    month = random.choice(["APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC", "JAN", "FEB", "MAR"])
    return f"{prefix}/{month}/2024/{str(index).zfill(4)}"

# --- Generate Purchase Register ---
purchase_rows = []
gstr_rows = []

invoice_counter = 1

for i in range(75):
    supplier = random.choice(SUPPLIERS)
    inv_no = generate_invoice_no("PUR", invoice_counter)
    invoice_counter += 1
    date = random_date()
    hsn = random.choice(HSN_CODES)
    item = random.choice(ITEM_DESCRIPTIONS)
    taxable = round(random.uniform(5000, 500000), 2)
    tax_rate = random.choice([5, 12, 18, 28])
    tax_amount = round(taxable * tax_rate / 100, 2)

    purchase_rows.append({
        "Invoice No": inv_no,
        "Supplier": supplier["name"],
        "GSTIN": supplier["gstin"],
        "Date": date.strftime("%Y-%m-%d"),
        "HSN/SAC": hsn,
        "Item Description": item,
        "Taxable Value": taxable,
        "Tax Rate": tax_rate,
        "Tax Amount": tax_amount,
    })

    # --- Create matching GSTR entry (with intentional issues) ---
    scenario = random.random()

    if scenario < 0.55:
        # EXACT MATCH (55%)
        gstr_rows.append({
            "Invoice No": inv_no,
            "Supplier": supplier["name"],
            "GSTIN": supplier["gstin"],
            "Date": date.strftime("%Y-%m-%d"),
            "HSN/SAC": hsn,
            "Item Description": item,
            "Taxable Value": taxable,
            "Tax Rate": tax_rate,
            "Tax Amount": tax_amount,
        })
    elif scenario < 0.70:
        # TYPO IN INVOICE NUMBER (15%)
        typo_inv = inv_no.replace("/", "-") if "/" in inv_no else inv_no + " "
        gstr_rows.append({
            "Invoice No": typo_inv,
            "Supplier": supplier["name"],
            "GSTIN": supplier["gstin"],
            "Date": date.strftime("%Y-%m-%d"),
            "HSN/SAC": hsn,
            "Item Description": item,
            "Taxable Value": taxable,
            "Tax Rate": tax_rate,
            "Tax Amount": tax_amount,
        })
    elif scenario < 0.80:
        # TAX AMOUNT MISMATCH (10%)
        wrong_tax = round(tax_amount + random.uniform(50, 2000), 2)
        gstr_rows.append({
            "Invoice No": inv_no,
            "Supplier": supplier["name"],
            "GSTIN": supplier["gstin"],
            "Date": date.strftime("%Y-%m-%d"),
            "HSN/SAC": hsn,
            "Item Description": item,
            "Taxable Value": taxable,
            "Tax Rate": tax_rate,
            "Tax Amount": wrong_tax,
        })
    elif scenario < 0.90:
        # DATE MISMATCH (10%)
        wrong_date = date + timedelta(days=random.randint(1, 15))
        gstr_rows.append({
            "Invoice No": inv_no,
            "Supplier": supplier["name"],
            "GSTIN": supplier["gstin"],
            "Date": wrong_date.strftime("%Y-%m-%d"),
            "HSN/SAC": hsn,
            "Item Description": item,
            "Taxable Value": taxable,
            "Tax Rate": tax_rate,
            "Tax Amount": tax_amount,
        })
    else:
        # MISSING IN GSTR (10%) - do not add to gstr_rows
        pass

# Add blocked credit items to purchase register
for i, blocked_item in enumerate(BLOCKED_ITEMS):
    supplier = random.choice(SUPPLIERS)
    inv_no = generate_invoice_no("PUR", invoice_counter)
    invoice_counter += 1
    date = random_date()
    taxable = round(random.uniform(2000, 80000), 2)
    tax_amount = round(taxable * 0.18, 2)

    purchase_rows.append({
        "Invoice No": inv_no,
        "Supplier": supplier["name"],
        "GSTIN": supplier["gstin"],
        "Date": date.strftime("%Y-%m-%d"),
        "HSN/SAC": random.choice(["9963", "8703", "9992", "9996"]),
        "Item Description": blocked_item,
        "Taxable Value": taxable,
        "Tax Rate": 18,
        "Tax Amount": tax_amount,
    })
    gstr_rows.append({
        "Invoice No": inv_no,
        "Supplier": supplier["name"],
        "GSTIN": supplier["gstin"],
        "Date": date.strftime("%Y-%m-%d"),
        "HSN/SAC": random.choice(["9963", "8703", "9992", "9996"]),
        "Item Description": blocked_item,
        "Taxable Value": taxable,
        "Tax Rate": 18,
        "Tax Amount": tax_amount,
    })

# Add duplicate invoice entries
dup_inv = generate_invoice_no("PUR", invoice_counter)
invoice_counter += 1
supplier = SUPPLIERS[0]
date = random_date()
for _ in range(2):
    purchase_rows.append({
        "Invoice No": dup_inv,
        "Supplier": supplier["name"],
        "GSTIN": supplier["gstin"],
        "Date": date.strftime("%Y-%m-%d"),
        "HSN/SAC": "7308",
        "Item Description": "MS Steel Plates (Grade A)",
        "Taxable Value": 125000.00,
        "Tax Rate": 18,
        "Tax Amount": 22500.00,
    })

# Add a future-dated invoice
future_inv = generate_invoice_no("PUR", invoice_counter)
invoice_counter += 1
purchase_rows.append({
    "Invoice No": future_inv,
    "Supplier": "Sharma Logistics Pvt",
    "GSTIN": "07AABCS5678B2Z1",
    "Date": "2026-12-15",
    "HSN/SAC": "9965",
    "Item Description": "Freight Charges - Outstation",
    "Taxable Value": 45000.00,
    "Tax Rate": 18,
    "Tax Amount": 8100.00,
})

# Add invalid GSTIN entry
bad_gstin_inv = generate_invoice_no("PUR", invoice_counter)
invoice_counter += 1
purchase_rows.append({
    "Invoice No": bad_gstin_inv,
    "Supplier": "Unknown Trader XYZ",
    "GSTIN": "INVALID123",
    "Date": random_date().strftime("%Y-%m-%d"),
    "HSN/SAC": "",
    "Item Description": "Miscellaneous Supplies",
    "Taxable Value": 18000.00,
    "Tax Rate": 18,
    "Tax Amount": 3240.00,
})

# --- Write to Excel ---
df_purchase = pd.DataFrame(purchase_rows)
df_gstr = pd.DataFrame(gstr_rows)

output_dir = "."
purchase_path = f"{output_dir}/Demo_Purchase_Register_FY2024.xlsx"
gstr_path = f"{output_dir}/Demo_GSTR2B_FY2024.xlsx"

df_purchase.to_excel(purchase_path, index=False, sheet_name="Purchase Register")
df_gstr.to_excel(gstr_path, index=False, sheet_name="GSTR-2B")

print(f"[OK] Purchase Register: {len(df_purchase)} rows -> {purchase_path}")
print(f"[OK] GSTR-2B:           {len(df_gstr)} rows -> {gstr_path}")
print(f"\n[DATA] Test Scenarios Included:")
print(f"   - ~55% Exact matches")
print(f"   - ~15% Invoice number typos (fuzzy matching test)")
print(f"   - ~10% Tax amount mismatches")
print(f"   - ~10% Date mismatches")
print(f"   - ~10% Missing in GSTR (ITC at risk)")
print(f"   - {len(BLOCKED_ITEMS)} Section 17(5) blocked credit items")
print(f"   - 1 Duplicate invoice entry")
print(f"   - 1 Future-dated invoice")
print(f"   - 1 Invalid GSTIN entry")
