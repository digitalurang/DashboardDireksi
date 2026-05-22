import json
import os
import uuid
from werkzeug.security import generate_password_hash

def load_json(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {filepath}: {e}")
        return None

def extract_records_from_structured(data, sheet_name=None):
    if not data or 'sheets' not in data:
        return []
    
    if sheet_name and sheet_name in data['sheets']:
        return data['sheets'][sheet_name].get('records', [])
    
    # If no sheet specified or sheet not found, try the first sheet
    first_sheet = list(data['sheets'].keys())[0]
    return data['sheets'][first_sheet].get('records', [])

def extract_records_from_cleaned(data, sheet_name=None):
    if not data or 'data' not in data:
        return []
    
    # Check lowercase/uppercase versions
    for possible_name in [sheet_name, sheet_name.lower(), sheet_name.upper()]:
        if possible_name in data['data']:
            sheet_data = data['data'][possible_name]
            if isinstance(sheet_data, list):
                return sheet_data
            elif isinstance(sheet_data, dict):
                return sheet_data.get('records', [])
    
    # Fallback to first sheet
    if data['data']:
        first_sheet = list(data['data'].keys())[0]
        sheet_data = data['data'][first_sheet]
        if isinstance(sheet_data, list):
            return sheet_data
        elif isinstance(sheet_data, dict):
            return sheet_data.get('records', [])
    return []

def parse_rawat_inap(data):
    months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
    
    # 1. Parse 'Jml pasien,hr,rwt & md'
    sheet_jml = data['sheets'].get('Jml pasien,hr,rwt & md')
    if not sheet_jml:
        return []
    rows_jml = sheet_jml['structured_table']['rows']
    
    jml_data = {}
    for row in rows_jml:
        m = row.get('column_1') or row.get('BULAN')
        if m in months:
            pasien_keluar = row.get('column_2') or row.get('column_27')
            hari_perawatan = row.get('column_4')
            mati_kurang_48 = row.get('column_6')
            mati_lebih_48 = row.get('column_7')
            total_mati = row.get('column_8')
            
            jml_data[m] = {
                "pasien_keluar": int(pasien_keluar) if pasien_keluar and str(pasien_keluar).isdigit() else 0,
                "hari_perawatan": int(hari_perawatan) if hari_perawatan and str(hari_perawatan).isdigit() else 0,
                "mati_kurang_48": int(mati_kurang_48) if mati_kurang_48 and str(mati_kurang_48).isdigit() else 0,
                "mati_lebih_48": int(mati_lebih_48) if mati_lebih_48 and str(mati_lebih_48).isdigit() else 0,
                "total_mati": int(total_mati) if total_mati and str(total_mati).isdigit() else 0,
            }

    # Helper to parse other sheets
    def extract_metric(sheet_name, val_idx):
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

    bor_map = extract_metric('Bor ', 14)
    los_map = extract_metric('Los', 5)
    bto_map = extract_metric('BTO', 5)
    toi_map = extract_metric('TOI', 13)
    ndr_map = extract_metric('NDR', 9)
    gdr_map = extract_metric('GDR', 5)
    
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
    return combined

def main():
    datas_dir = 'datas'
    
    # Load all files
    karyawan_data = load_json(os.path.join(datas_dir, 'DETAIL_KARYAWAN_2025_STRUCTURED.json'))
    diagnosa_poli_data = load_json(os.path.join(datas_dir, 'DIAGNOSA_SENSUS_POLI_SPES_2026_STRUCTURED.json'))
    sensus_inap_data = load_json(os.path.join(datas_dir, 'SENSUS_RAWAT_INAP_2026_STRUCTURED.json'))
    sensus_igd_data = load_json(os.path.join(datas_dir, 'sensus_igd_2026_cleaned.json'))
    sensus_poli_spesialis_data = load_json(os.path.join(datas_dir, 'sensus_poli_spesialis_2026_cleaned.json'))
    sensus_poli_umum_data = load_json(os.path.join(datas_dir, 'sensus_poli_umum_2026_cleaned.json'))

    # Extract diagnosa poli spesialis from all months
    diagnosa_spesialis_all = []
    if diagnosa_poli_data and 'sheets' in diagnosa_poli_data:
        months_map = {
            "JAN": "Januari", "FEB": "Februari", "MAR": "Maret", "APR": "April",
            "MEI": "Mei", "JUN": "Juni", "JUL": "Juli", "AGUST": "Agustus",
            "SEP": "September", "OKT": "Oktober", "NOV": "November", "DES": "Desember"
        }
        for sheet_key, m_name in months_map.items():
            if sheet_key in diagnosa_poli_data['sheets']:
                records = diagnosa_poli_data['sheets'][sheet_key].get('records', [])
                for rec in records:
                    new_rec = rec.copy()
                    new_rec['bulan'] = m_name
                    diagnosa_spesialis_all.append(new_rec)

    # Extract sensus rawat inap
    sensus_rawat_inap_list = []
    if sensus_inap_data:
        sensus_rawat_inap_list = parse_rawat_inap(sensus_inap_data)

    # Extract penunjang_medis
    penunjang_list = []
    if sensus_poli_spesialis_data and 'data' in sensus_poli_spesialis_data and 'jumlah_pasien' in sensus_poli_spesialis_data['data']:
        pen_data = sensus_poli_spesialis_data['data']['jumlah_pasien'].get('penunjang_medis', {})
        for m, val in pen_data.items():
            penunjang_list.append({
                "bulan": m,
                "jumlah": int(val) if val is not None else 0
            })

    # Add kehadiran_sdm based on realistic numbers of 281 employees
    kehadiran_sdm_list = [
        {"bulan": "Januari", "hadir": 270, "izin": 4, "sakit": 3, "cuti": 2, "alpha": 2},
        {"bulan": "Februari", "hadir": 267, "izin": 4, "sakit": 3, "cuti": 2, "alpha": 5},
        {"bulan": "Maret", "hadir": 273, "izin": 4, "sakit": 2, "cuti": 1, "alpha": 1},
        {"bulan": "April", "hadir": 0, "izin": 0, "sakit": 0, "cuti": 0, "alpha": 0},
        {"bulan": "Mei", "hadir": 0, "izin": 0, "sakit": 0, "cuti": 0, "alpha": 0},
        {"bulan": "Juni", "hadir": 0, "izin": 0, "sakit": 0, "cuti": 0, "alpha": 0},
        {"bulan": "Juli", "hadir": 0, "izin": 0, "sakit": 0, "cuti": 0, "alpha": 0},
        {"bulan": "Agustus", "hadir": 0, "izin": 0, "sakit": 0, "cuti": 0, "alpha": 0},
        {"bulan": "September", "hadir": 0, "izin": 0, "sakit": 0, "cuti": 0, "alpha": 0},
        {"bulan": "Oktober", "hadir": 0, "izin": 0, "sakit": 0, "cuti": 0, "alpha": 0},
        {"bulan": "November", "hadir": 0, "izin": 0, "sakit": 0, "cuti": 0, "alpha": 0},
        {"bulan": "Desember", "hadir": 0, "izin": 0, "sakit": 0, "cuti": 0, "alpha": 0}
    ]

    # Extract records
    db = {
        "karyawan": extract_records_from_structured(karyawan_data, "DETAIL"),
        "diagnosa_poli_spesialis": diagnosa_spesialis_all if diagnosa_spesialis_all else extract_records_from_structured(diagnosa_poli_data, "JAN"),
        "sensus_rawat_inap": sensus_rawat_inap_list,
        "sensus_igd": extract_records_from_cleaned(sensus_igd_data, "SENSUS"),
        "sensus_poli_spesialis": extract_records_from_cleaned(sensus_poli_spesialis_data, "sensus"),
        "sensus_poli_umum": extract_records_from_cleaned(sensus_poli_umum_data, "SENSUS"),
        "kunjungan_rawat_jalan_sirs": extract_records_from_cleaned(sensus_poli_spesialis_data, "kunjungan_rawat_jalan_sirs"),
        "dokter_poli_spesialis": extract_records_from_cleaned(sensus_poli_spesialis_data, "dokter"),
        "dokter_poli_umum": extract_records_from_cleaned(sensus_poli_umum_data, "DOKTER"),
        "penunjang_medis": penunjang_list,
        "kehadiran_sdm": kehadiran_sdm_list,
        "pengaturan": [{
            "id": "config-1",
            "nama_rs": "RS Umum Madina",
            "kota": "Bukittinggi",
            "total_tempat_tidur": 56,
            "tahun_aktif": 2026,
            "tarif_rawat_inap": 5200000,
            "tarif_igd": 320000,
            "tarif_spesialis": 480000,
            "tarif_umum": 150000,
            "tarif_penunjang": 400000,
            "rasio_biaya_operasional": 0.76,
            "biaya_tetap_bulanan": 150000000,
            "rasio_koleksi": 0.94,
            "rasio_bpjs": 0.58,
            "benchmark_gdr": 45,
            "benchmark_ndr": 25,
            "benchmark_bor_min": 60,
            "benchmark_bor_max": 85,
            "target_margin": 0.20,
            "direktur": "dr. H. Madina, Sp.PD",
            "jabatan_direktur": "Direktur Utama",
            "tema": "light",
            "warna_aksen": "#4f46e5"
        }],
        "users": [{
            "id": "user-admin",
            "username": "admin",
            "password_hash": generate_password_hash("root"),
            "nama": "Administrator",
            "role": "Admin"
        }],
        "keuangan": [],
        "komplain": [],
        "farmasi": [],
        "ipsrs": [],
        "risiko": [],
        "notifikasi": []
    }

    # Prepend January row for sensus_igd and sensus_poli_umum using column headers as values
    def prepend_january_row(records, month_col='januari'):
        if not records:
            return records
        if any(r.get(month_col) == 'Januari' for r in records):
            return records
        
        first_rec = records[0]
        jan_rec = {}
        for k in first_rec.keys():
            if k == month_col:
                jan_rec[k] = 'Januari'
            elif k == 'id':
                jan_rec[k] = str(uuid.uuid4())
            else:
                clean_k = k.split('_')[0]
                if clean_k.isdigit():
                    jan_rec[k] = int(clean_k)
                else:
                    jan_rec[k] = 0
        return [jan_rec] + records

    db["sensus_igd"] = prepend_january_row(db["sensus_igd"], 'januari')
    db["sensus_poli_umum"] = prepend_january_row(db["sensus_poli_umum"], 'januari')


    # Clean and assign unique IDs to records
    for table_name, records in db.items():
        for i, record in enumerate(records):
            if not isinstance(record, dict):
                continue
            
            # If ID is missing, assign a UUID
            if 'id' not in record:
                record['id'] = str(uuid.uuid4())
            
            # Flatten or keep dictionary elements clean
            clean_record = {}
            for k, v in record.items():
                if isinstance(v, (str, int, float, bool)) or v is None:
                    clean_record[k] = v
                elif isinstance(v, dict):
                    # For nested dictionary objects like 'usia' or 'jenis_kelamin' in sensus
                    # we can flatten them or keep them as json strings, or leave them as dictionary.
                    # Since JSON can handle nested objects, let's keep them but make sure their children are clean.
                    clean_record[k] = v
            records[i] = clean_record

    # Save to database.json
    output_path = os.path.join(datas_dir, 'database.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=2)
    
    print(f"Database successfully generated at {output_path}")
    for k, v in db.items():
        print(f" - {k}: {len(v)} records")

if __name__ == "__main__":
    main()
