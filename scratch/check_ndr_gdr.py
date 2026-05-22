import json

filepath = 'datas/SENSUS_RAWAT_INAP_2026_STRUCTURED.json'
with open(filepath, 'r', encoding='utf-8') as f:
    data = json.load(f)

for sheet_name in ['NDR', 'GDR']:
    sheet = data['sheets'][sheet_name]
    print(f"=== {sheet_name} ===")
    headers = sheet['structured_table']['headers']
    print(f"Headers: {headers}")
    for idx, row in enumerate(sheet['structured_table']['rows']):
        print(f"Row {idx}: {row}")
