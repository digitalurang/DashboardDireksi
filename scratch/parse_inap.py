import json

def parse_inap():
    filepath = 'datas/SENSUS_RAWAT_INAP_2026_STRUCTURED.json'
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
    
    # 1. Parse 'Jml pasien,hr,rwt & md'
    sheet_jml = data['sheets']['Jml pasien,hr,rwt & md']
    rows_jml = sheet_jml['structured_table']['rows']
    
    jml_data = {}
    for row in rows_jml:
        m = row.get('column_1') or row.get('BULAN')
        if m in months:
            # column_2 is discharge patients
            pasien_keluar = row.get('column_2')
            # column_4 is HP
            hari_perawatan = row.get('column_4')
            # column_6 is deaths < 48
            mati_kurang_48 = row.get('column_6')
            # column_7 is deaths >= 48
            mati_lebih_48 = row.get('column_7')
            # column_8 is total deaths
            total_mati = row.get('column_8')
            
            jml_data[m] = {
                "pasien_keluar": int(pasien_keluar) if pasien_keluar and pasien_keluar.isdigit() else 0,
                "hari_perawatan": int(hari_perawatan) if hari_perawatan and hari_perawatan.isdigit() else 0,
                "mati_kurang_48": int(mati_kurang_48) if mati_kurang_48 and mati_kurang_48.isdigit() else 0,
                "mati_lebih_48": int(mati_lebih_48) if mati_lebih_48 and mati_lebih_48.isdigit() else 0,
                "total_mati": int(total_mati) if total_mati and total_mati.isdigit() else 0,
            }

    # Helper to parse other sheets
    def extract_metric(sheet_name, header_idx, val_idx):
        sheet = data['sheets'].get(sheet_name)
        if not sheet:
            return {}
        
        headers = sheet['structured_table']['headers']
        rows = sheet['structured_table']['rows']
        
        res = {}
        # Jan is in header
        jan_month = headers[0] # 'Januari'
        jan_val = headers[val_idx]
        try:
            res[jan_month] = float(jan_val)
        except ValueError:
            res[jan_month] = 0.0
            
        for row in rows:
            m = row.get(jan_month)
            if m in months:
                val = row.get(jan_val, 0)
                try:
                    res[m] = float(val)
                except (ValueError, TypeError):
                    res[m] = 0.0
        return res

    bor_map = extract_metric('Bor ', 0, 14)
    los_map = extract_metric('Los', 0, 5)
    bto_map = extract_metric('BTO', 0, 5)
    toi_map = extract_metric('TOI', 0, 13)
    
    # NDR and GDR need special care because deaths might be int and rate float, or keys might differ
    def extract_death_rate(sheet_name, rate_idx):
        sheet = data['sheets'].get(sheet_name)
        if not sheet:
            return {}
        headers = sheet['structured_table']['headers']
        rows = sheet['structured_table']['rows']
        res = {}
        # Jan
        jan_month = headers[0]
        jan_val = headers[rate_idx]
        try:
            res[jan_month] = float(jan_val)
        except ValueError:
            res[jan_month] = 0.0
            
        for row in rows:
            m = row.get(jan_month)
            if m in months:
                val = row.get(jan_val, 0)
                try:
                    res[m] = float(val)
                except (ValueError, TypeError):
                    res[m] = 0.0
        return res

    ndr_map = extract_death_rate('NDR', 9) # index 9 in headers is '0.09551098376313276' or similar
    gdr_map = extract_death_rate('GDR', 5) # index 5 is '1.7369727047146404' or similar
    
    # Combine everything
    combined = []
    for m in months:
        j = jml_data.get(m, {
            "pasien_keluar": 0, "hari_perawatan": 0, "mati_kurang_48": 0, "mati_lebih_48": 0, "total_mati": 0
        })
        
        combined.append({
            "bulan": m,
            "pasien_keluar": j["pasien_keluar"],
            "hari_perawatan": j["hari_perawatan"],
            "mati_kurang_48": j["mati_kurang_48"],
            "mati_lebih_48": j["mati_lebih_48"],
            "total_mati": j["total_mati"],
            "bor": round(bor_map.get(m, 0.0), 2),
            "los": round(los_map.get(m, 0.0), 2),
            "bto": round(bto_map.get(m, 0.0), 2),
            "toi": round(toi_map.get(m, 0.0), 2),
            "ndr": round(ndr_map.get(m, 0.0), 2),
            "gdr": round(gdr_map.get(m, 0.0), 2),
        })
        
    print(json.dumps(combined[:4], indent=2))

if __name__ == '__main__':
    parse_inap()
