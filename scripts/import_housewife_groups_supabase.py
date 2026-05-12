import json
import math
import os
import sys
import urllib.error
import urllib.request

import pandas as pd


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(ROOT, ".env")
SOURCE = sys.argv[1]

COLUMNS = {
    "ปีข้อมูล_พ.ศ.": ("year", "INTEGER"),
    "ชื่อกลุ่ม_ปรับเพื่อจับคู่": ("group_name", "TEXT"),
    "เลขที่": ("address_no", "TEXT"),
    "หมู่": ("moo", "INTEGER"),
    "ตำบล": ("subdistrict", "TEXT"),
    "อำเภอ": ("district", "TEXT"),
    "จังหวัด": ("province", "TEXT"),
    "เบอร์โทรศัพท์": ("phone", "TEXT"),
    "วันที่จัดตั้งกลุ่ม_ต้นฉบับ": ("established_text", "TEXT"),
    "วันที่จัดตั้งกลุ่ม_ค.ศ.": ("established_date", "DATE"),
    "จำนวนสมาชิกกลุ่ม": ("member_count", "INTEGER"),
    "การจดทะเบียนวิสาหกิจชุมชน": ("community_enterprise_registration", "TEXT"),
    "การเป็นกลุ่มต้นแบบ": ("model_group", "TEXT"),
    "การบริหารจัดการทุน": ("fund_management", "NUMERIC"),
    "รายได้กลุ่ม": ("income", "NUMERIC"),
    "กิจกรรมกลุ่ม": ("activity", "TEXT"),
    "มาตรฐานการผลิต": ("production_standard", "TEXT"),
    "ออนไลน์_ในประเทศ": ("online_domestic", "TEXT"),
    "ออนไลน์_ต่างประเทศ": ("online_international", "TEXT"),
    "ออฟไลน์_ในประเทศ": ("offline_domestic", "TEXT"),
    "ออฟไลน์_ต่างประเทศ": ("offline_international", "TEXT"),
    "ระดับการประเมินศักยภาพ": ("potential_level", "TEXT"),
    "Lat": ("lat", "NUMERIC"),
    "Lon": ("lon", "NUMERIC"),
    "มีช่องทางจำหน่าย": ("has_sales_channel", "TEXT"),
}


def load_env():
    values = {}
    if os.path.exists(ENV_PATH):
        with open(ENV_PATH, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                values[key] = value
    values.update({k: v for k, v in os.environ.items() if k.startswith("SUPABASE_")})
    return values


def clean(value, sql_type):
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    if isinstance(value, pd.Timestamp):
        return value.strftime("%Y-%m-%d")
    if sql_type == "DATE":
        if pd.isna(value):
            return None
        return pd.to_datetime(value).strftime("%Y-%m-%d")
    if sql_type == "INTEGER":
        if pd.isna(value):
            return None
        return int(value)
    if sql_type == "NUMERIC":
        if pd.isna(value):
            return None
        return float(value)
    text = str(value).strip()
    return text or None


def sql_literal(value):
    if value is None:
        return "NULL"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def request_sql(project_ref, token, sql):
    url = f"https://api.supabase.com/v1/projects/{project_ref}/database/query"
    body = json.dumps({"query": sql}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "supabase-cli/1.0",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as res:
            return json.loads(res.read().decode("utf-8") or "{}")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Supabase SQL API failed: HTTP {exc.code} {detail}") from exc


def main():
    env = load_env()
    project_ref = env.get("SUPABASE_PROJECT_REF")
    token = env.get("SUPABASE_ACCESS_TOKEN")
    if not project_ref or not token:
        raise SystemExit("Missing SUPABASE_PROJECT_REF or SUPABASE_ACCESS_TOKEN in .env")

    df = pd.read_excel(SOURCE, sheet_name="DATA")
    rows = []
    for _, row in df.iterrows():
        record = {}
        for original, (name, sql_type) in COLUMNS.items():
            record[name] = clean(row.get(original), sql_type)
        if record["group_name"]:
            rows.append(record)

    alter_parts = []
    for name, sql_type in [v for v in COLUMNS.values() if v[0] not in {"group_name", "district", "member_count"}]:
        alter_parts.append(f"ADD COLUMN IF NOT EXISTS {name} {sql_type}")
    setup_sql = f"""
ALTER TABLE housewife_farmer_groups
  {", ".join(alter_parts)};

TRUNCATE TABLE housewife_farmer_groups RESTART IDENTITY;
"""
    request_sql(project_ref, token, setup_sql)

    names = [name for name, _ in COLUMNS.values()]
    chunk_size = 50
    inserted = 0
    for start in range(0, len(rows), chunk_size):
        chunk = rows[start:start + chunk_size]
        values = []
        for record in chunk:
            values.append("(" + ", ".join(sql_literal(record[name]) for name in names) + ")")
        insert_sql = f"""
INSERT INTO housewife_farmer_groups ({", ".join(names)})
VALUES
{",\n".join(values)};
"""
        request_sql(project_ref, token, insert_sql)
        inserted += len(chunk)

    check = request_sql(project_ref, token, "SELECT COUNT(*)::int AS count FROM housewife_farmer_groups;")
    print(json.dumps({"inserted": inserted, "check": check}, ensure_ascii=False))


if __name__ == "__main__":
    main()
