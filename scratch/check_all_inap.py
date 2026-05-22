import json
import os

filepath = 'datas/SENSUS_RAWAT_INAP_2026_STRUCTURED.json'
with open(filepath, 'r', encoding='utf-8') as f:
    data = json.load(f)

for name in ['Bor ', 'Los', 'BTO', 'TOI', 'NDR', 'GDR']:
    if name in data['sheets']:
        sheet = data['sheets'][name]
        headers = sheet['structured_table']['headers']
        rows = sheet['structured_table']['rows']
        print(f"--- Sheet: {name} ---")
        print(f"Headers: {headers}")
        print(f"Row 0 (Feb): {rows[0] if len(rows) > 0 else 'N/A'}")
        print(f"Row 1 (Mar): {rows[1] if len(rows) > 1 else 'N/A'}")
        print(f"Row 2 (Apr): {rows[2] if len(rows) > 2 else 'N/A'}")
        print()
