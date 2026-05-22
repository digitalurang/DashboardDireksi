import json
import os

filepath = 'datas/SENSUS_RAWAT_INAP_2026_STRUCTURED.json'
with open(filepath, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Let's inspect 'Jml pasien,hr,rwt & md'
print("--- Jml pasien,hr,rwt & md ---")
sheet = data['sheets']['Jml pasien,hr,rwt & md']
rows = sheet['structured_table']['rows']
for i, row in enumerate(rows[:5]):
    print(f"Row {i}: {row}")

# Let's inspect 'Los'
print("--- Los ---")
sheet = data['sheets']['Los']
headers = sheet['structured_table']['headers']
print(f"Headers: {headers}")
rows = sheet['structured_table']['rows']
for i, row in enumerate(rows[:5]):
    print(f"Row {i}: {row}")

# Let's inspect 'Bor '
print("--- Bor ---")
sheet = data['sheets']['Bor ']
headers = sheet['structured_table']['headers']
print(f"Headers: {headers}")
rows = sheet['structured_table']['rows']
for i, row in enumerate(rows[:5]):
    print(f"Row {i}: {row}")
