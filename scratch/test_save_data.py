import urllib.request
import urllib.parse
import http.cookiejar
import json

# Setup cookie handler
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

try:
    # 1. Login
    login_url = "http://localhost:5000/login"
    login_data = urllib.parse.urlencode({"username": "admin", "password": "root"}).encode("utf-8")
    print("Logging in...")
    req = urllib.request.Request(login_url, data=login_data, method="POST")
    res = opener.open(req)
    print("Login status:", res.status)

    # 2. Get current database to back up one item
    db_url = "http://localhost:5000/datas/database.json"
    print("Reading database...")
    res = opener.open(db_url)
    db = json.loads(res.read().decode("utf-8"))
    orig_karyawan = db.get("karyawan", [])
    print("Current karyawan count:", len(orig_karyawan))

    # 3. Add a test karyawan
    test_karyawan = orig_karyawan.copy()
    test_rec = {
        "id": "test-karyawan-123",
        "nama": "Test Karyawan",
        "unit_jabatan": "Medis (Dokter)",
        "nik": "12345",
        "ijazah": "S1",
        "stat": "Aktif"
    }
    test_karyawan.append(test_rec)

    save_url = "http://localhost:5000/api/save_data"
    save_data = json.dumps({"table": "karyawan", "data": test_karyawan}).encode("utf-8")
    print("Saving updated table...")
    req = urllib.request.Request(save_url, data=save_data, method="POST", headers={"Content-Type": "application/json"})
    res = opener.open(req)
    print("Save status:", res.status)
    print("Save response:", res.read().decode("utf-8"))

    # 4. Read back and verify
    print("Verifying save...")
    res = opener.open(db_url)
    db_new = json.loads(res.read().decode("utf-8"))
    k_names = [k.get("nama") for k in db_new.get("karyawan", [])]
    if "Test Karyawan" in k_names:
        print("Verification SUCCESS: 'Test Karyawan' found in database!")
    else:
        print("Verification FAILED: 'Test Karyawan' NOT found.")

    # 5. Cleanup
    print("Cleaning up (removing test record)...")
    save_data_cleanup = json.dumps({"table": "karyawan", "data": orig_karyawan}).encode("utf-8")
    req = urllib.request.Request(save_url, data=save_data_cleanup, method="POST", headers={"Content-Type": "application/json"})
    res = opener.open(req)
    print("Cleanup status:", res.status)
    print("Integration test completed.")
except Exception as e:
    print("Error during test:", e)
