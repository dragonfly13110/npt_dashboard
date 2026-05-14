import csv
import json
import urllib.request
import urllib.parse

csv_file = r"t:\web\npt_dashboard\เบอร์เจ้าหน้าที่.csv"
url = "https://cjjirwqoovypymndhvwt.supabase.co/rest/v1/personnel"
api_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqamlyd3Fvb3Z5cHltbmRodnd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NDQyOTQsImV4cCI6MjA4NzUyMDI5NH0.4IRMDKdboN2BrAfgGW9-Y6LGw6tp6yb4Sjbc9ZL3hEA"

rows = []
keys = ['full_name', 'position', 'phone', 'province', 'district', 'office_type', 'department', 'status']

with open(csv_file, 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        # Expected CSV columns: full_name,position,phone,province,district,office_type,department
        clean_row = {k: v.strip() if v else '' for k, v in row.items()}
        clean_row['status'] = 'ปฏิบัติงาน'
        
        # Ensure all keys are present
        final_row = {k: clean_row.get(k, '') for k in keys}
        rows.append(final_row)

data = json.dumps(rows).encode('utf-8')
req = urllib.request.Request(url, data=data, method='POST')
req.add_header('apikey', api_key)
req.add_header('Authorization', f'Bearer {api_key}')
req.add_header('Content-Type', 'application/json')
req.add_header('Prefer', 'return=minimal')

try:
    response = urllib.request.urlopen(req)
    print(f"Success! Status code: {response.getcode()}")
except Exception as e:
    print(f"Error: {e}")
    if hasattr(e, 'read'):
        print(e.read().decode('utf-8'))
