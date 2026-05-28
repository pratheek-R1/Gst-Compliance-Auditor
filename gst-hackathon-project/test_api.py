import requests

API_URL = "http://127.0.0.1:8000"

# 1. Reconcile
files = {
    'purchase': ('temp_purchase.xlsx', open('temp_purchase.xlsx', 'rb'), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
    'gstr': ('temp_gstr.xlsx', open('temp_gstr.xlsx', 'rb'), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
}
res = requests.post(f"{API_URL}/reconcile", files=files)
print("Reconcile:", res.status_code)
data = res.json()

# 2. ITC
res = requests.post(f"{API_URL}/api/v1/modules/itc-eligibility", json=data)
print("ITC:", res.status_code)

# 3. Vendor
res = requests.post(f"{API_URL}/api/v1/modules/vendor-risk", json=data)
print("Vendor:", res.status_code)

# 4. Invoice
files = {
    'purchase': ('temp_purchase.xlsx', open('temp_purchase.xlsx', 'rb'), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
}
res = requests.post(f"{API_URL}/api/v1/modules/invoice-compliance", files=files)
print("Invoice:", res.status_code)
print(res.json())
