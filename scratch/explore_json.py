import json
import os

datas_dir = 'datas'
for filename in os.listdir(datas_dir):
    if filename.endswith('.json') and filename != 'database.json':
        filepath = os.path.join(datas_dir, filename)
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            print(f"File: {filename}")
            print(f"  Root keys: {list(data.keys())}")
            if 'metadata' in data:
                print(f"  Metadata: {data['metadata']}")
            if 'sheets' in data:
                print(f"  Sheets keys: {list(data['sheets'].keys())}")
                for sheet, val in data['sheets'].items():
                    print(f"    Sheet '{sheet}' keys: {list(val.keys()) if isinstance(val, dict) else type(val)}")
                    if isinstance(val, dict) and 'records' in val:
                        print(f"      records count: {len(val['records'])}")
                    elif isinstance(val, dict) and 'structured_table' in val:
                        print(f"      structured_table keys: {list(val['structured_table'].keys())}")
                        if 'rows' in val['structured_table']:
                            print(f"        rows count: {len(val['structured_table']['rows'])}")
            if 'data' in data:
                if isinstance(data['data'], dict):
                    print(f"  Data keys: {list(data['data'].keys())}")
                    for dk, dv in data['data'].items():
                        if isinstance(dv, list):
                            print(f"    Data list '{dk}' length: {len(dv)}")
                        elif isinstance(dv, dict):
                            print(f"    Data dict '{dk}' keys: {list(dv.keys())}")
                            if 'records' in dv:
                                print(f"      records count: {len(dv['records'])}")
                else:
                    print(f"  Data is type: {type(data['data'])}")
            print("-" * 50)
        except Exception as e:
            print(f"Error exploring {filename}: {e}")
            print("-" * 50)
