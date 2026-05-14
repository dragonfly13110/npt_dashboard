import csv

csv_file = r"t:\web\npt_dashboard\เบอร์เจ้าหน้าที่.csv"
sql_file = r"t:\web\npt_dashboard\scripts\insert_personnel.sql"

keys = ['full_name', 'position', 'phone', 'province', 'district', 'office_type', 'department', 'status']
sql_statements = []

with open(csv_file, 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        clean_row = {k: v.strip() if v else '' for k, v in row.items()}
        clean_row['status'] = 'ปฏิบัติงาน'
        
        # Escape single quotes in SQL
        values = []
        for k in keys:
            val = clean_row.get(k, '')
            val = val.replace("'", "''")
            values.append(f"'{val}'")
            
        sql = f"INSERT INTO personnel ({', '.join(keys)}) VALUES ({', '.join(values)});"
        sql_statements.append(sql)

with open(sql_file, 'w', encoding='utf-8') as f:
    f.write("\n".join(sql_statements))

print("SQL file generated.")
