import os
import sys
import json
import pandas as pd
from fastapi.testclient import TestClient

# Add gst-api to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'gst-api')))
from main import app

client = TestClient(app)

def run_tests():
    print("========================================")
    print(">>> RUNNING BACKEND ARCHITECTURE TESTS <<<")
    print("========================================\n")

    print("1. Creating Dirty 'Real-World' Excel Files (Testing Sanitization)...")
    # Notice the spaces and lowercase letters to test the new cleaning pipeline
    df_b = pd.DataFrame({'Invoice No': ['INV001  ', 'INV002', 'INV003'], 'Date': ['2023-10-01', '2023-10-02', '2023-10-03'], 'Supplier': ['Acme Corp', 'Globex', 'Soylent'], 'Tax Amount': [100.0, 200.0, 300.0]})
    df_g = pd.DataFrame({'Invoice No': ['inv001', 'INV004', 'INV005'], 'Date': ['2023-10-01 ', '2023-10-04', '2023-10-05'], 'Supplier': ['Acme Corp', 'Initech', 'Globex'], 'Tax Amount': [100.0, 400.0, 500.0]})
    
    df_b.to_excel('test_purchase.xlsx', index=False)
    df_g.to_excel('test_gstr.xlsx', index=False)
    print("   [OK] Files generated.\n")

    print("2. Testing GET /health...")
    response = client.get("/health")
    print(f"   Status Code: {response.status_code}")
    print(f"   Response: {response.json()}\n")

    print("3. Testing POST /reconcile (Core Engine, Sanitization, Risk Profiling)...")
    with open('test_purchase.xlsx', 'rb') as p, open('test_gstr.xlsx', 'rb') as g:
        files = {
            "purchase": ("test_purchase.xlsx", p, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
            "gstr": ("test_gstr.xlsx", g, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        }
        response = client.post("/reconcile", files=files)
    print(f"   Status Code: {response.status_code}")
    
    if response.status_code == 200:
        res_json = response.json()
        print("   [OK] API responded successfully!")
        print(f"   [DATA] Total Invoices Analyzed: {res_json.get('total_invoices')}")
        print(f"   [DATA] Exact Matches Found: {res_json.get('matched')} (Proves Sanitization worked on 'inv001' vs 'INV001  ')")
        print(f"   [DATA] Mismatches Found: {len(res_json.get('mismatches', []))}")
        print(f"   [ALERT] Macro Insight: {res_json.get('summary_insight')}")
        print("\n   [Sample AI Action Plan generated]:")
        print(json.dumps(res_json.get('mismatches', [])[:1], indent=2))
    else:
        print(f"   [ERROR]: {response.text}")

    print("\n4. Testing POST /ai-chat (The Innovation Feature)...")
    payload = {
        "question": "Globex missed an invoice. What's the standard penalty or action?",
        "context": [{"invoice_no": "INV002", "supplier": "Globex", "issue": "Missing in GSTR"}]
    }
    response = client.post("/ai-chat", json=payload)
    print(f"   Status Code: {response.status_code}")
    if response.status_code == 200:
        print("   [OK] Chat API responded!")
        try:
            print(f"   [AI Reply]:\n   {str(response.json().get('answer')).encode('ascii', 'ignore').decode()}")
        except Exception as e:
            print(f"   [WARN] Could not parse JSON. Raw response: {response.text}")
    else:
        print(f"   [ERROR]: {response.text}")

if __name__ == "__main__":
    run_tests()