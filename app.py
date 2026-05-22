from flask import Flask, request, jsonify, redirect, url_for, session, render_template_string, send_from_directory, Response
import json
import os
import sys
import threading
import webbrowser
import datetime
import shutil
import csv
import io
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__)
app.secret_key = 'super_secret_key_madina_2026'

if getattr(sys, 'frozen', False):
    BUNDLE_DIR = sys._MEIPASS
    EXE_DIR = os.path.dirname(sys.executable)
else:
    BUNDLE_DIR = os.path.dirname(os.path.abspath(__file__))
    EXE_DIR = BUNDLE_DIR

STATIC_DIR = os.path.join(BUNDLE_DIR, 'static')
HTML_DIR = BUNDLE_DIR

DATAS_DIR = os.path.join(EXE_DIR, 'datas')
BACKUP_DIR = os.path.join(DATAS_DIR, 'backups')
DB_PATH = os.path.join(DATAS_DIR, 'database.json')

# Auto-copy bundled database to persistent storage on first run
if not os.path.exists(DATAS_DIR):
    os.makedirs(DATAS_DIR, exist_ok=True)
if not os.path.exists(DB_PATH):
    bundled_db = os.path.join(BUNDLE_DIR, 'datas', 'database.json')
    if os.path.exists(bundled_db):
        shutil.copy2(bundled_db, DB_PATH)
        
os.makedirs(BACKUP_DIR, exist_ok=True)

def load_db():
    if not os.path.exists(DB_PATH):
        return {}
    with open(DB_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_db(content):
    # Auto-backup before save
    if os.path.exists(DB_PATH):
        timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_path = os.path.join(BACKUP_DIR, f'database_{timestamp}.json')
        shutil.copy2(DB_PATH, backup_path)
        
        # Keep only last 30 backups
        backups = sorted([f for f in os.listdir(BACKUP_DIR) if f.endswith('.json')])
        while len(backups) > 30:
            oldest = backups.pop(0)
            try:
                os.remove(os.path.join(BACKUP_DIR, oldest))
            except Exception:
                pass

    with open(DB_PATH, 'w', encoding='utf-8') as f:
        json.dump(content, f, indent=2, ensure_ascii=False)

@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory(STATIC_DIR, filename)

@app.route('/datas/<path:filename>')
def serve_datas(filename):
    if 'user' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    return send_from_directory(DATAS_DIR, filename)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        db = load_db()
        users = db.get('users', [])
        
        user_found = False
        if users:
            for u in users:
                if u.get('username') == username:
                    # check password hash
                    if check_password_hash(u.get('password_hash', ''), password):
                        session['user'] = username
                        session['role'] = u.get('role', 'Viewer')
                        session['nama'] = u.get('nama', username)
                        user_found = True
                    break
        else:
            # Fallback if users table doesn't exist yet
            if username == 'admin' and password == 'root':
                session['user'] = 'admin'
                session['role'] = 'Admin'
                session['nama'] = 'Admin'
                user_found = True
                
        if user_found:
            return redirect(url_for('index'))
        else:
            return redirect(url_for('login', error=1))
            
    with open(os.path.join(HTML_DIR, 'login.html'), 'r', encoding='utf-8') as f:
        return render_template_string(f.read())

@app.route('/logout')
def logout():
    session.pop('user', None)
    session.pop('role', None)
    session.pop('nama', None)
    return redirect(url_for('login'))

@app.route('/api/me')
def get_current_user():
    if 'user' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    db = load_db()
    users = db.get('users', [])
    for u in users:
        if u.get('username') == session['user']:
            return jsonify({
                "username": u.get('username'),
                "nama": u.get('nama', session['user']),
                "role": u.get('role', session.get('role', 'Viewer'))
            })
    # Fallback for admin/root login without users table
    return jsonify({
        "username": session['user'],
        "nama": session.get('nama', session['user']),
        "role": session.get('role', 'Admin')
    })

@app.route('/')
def index():
    if 'user' not in session:
        return redirect(url_for('login'))
        
    with open(os.path.join(HTML_DIR, 'index.html'), 'r', encoding='utf-8') as f:
        return render_template_string(f.read())

@app.route('/api/save_data', methods=['POST'])
def save_data():
    if 'user' not in session:
        return jsonify({"error": "Unauthorized"}), 401
        
    try:
        req_data = request.json
        table_name = req_data.get('table')
        table_records = req_data.get('data')
        
        if not table_name or table_records is None:
            return jsonify({"status": "error", "error": "Missing table or data"}), 400
            
        db_content = load_db()
        
        # If updating users, hash passwords if they are plain text
        if table_name == 'users':
            for record in table_records:
                pwd = record.get('password_hash', '')
                if pwd and not pwd.startswith('scrypt:') and not pwd.startswith('pbkdf2:'):
                    record['password_hash'] = generate_password_hash(pwd)

        db_content[table_name] = table_records
        save_db(db_content)
            
        return jsonify({"status": "success", "message": f"Table '{table_name}' saved successfully"})
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500

@app.route('/api/backup', methods=['POST'])
def manual_backup():
    if 'user' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    try:
        db = load_db()
        save_db(db) # This triggers backup
        return jsonify({"status": "success", "message": "Backup created successfully"})
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500

@app.route('/api/export_csv/<table>', methods=['GET'])
def export_csv(table):
    if 'user' not in session:
        return jsonify({"error": "Unauthorized"}), 401
        
    db = load_db()
    data = db.get(table, [])
    
    if not data:
        return Response("No data found", status=404)
        
    output = io.StringIO()
    if isinstance(data, list) and len(data) > 0:
        keys = list(data[0].keys())
        writer = csv.DictWriter(output, fieldnames=keys)
        writer.writeheader()
        for row in data:
            clean_row = {}
            for k, v in row.items():
                if isinstance(v, (dict, list)):
                    clean_row[k] = json.dumps(v)
                else:
                    clean_row[k] = v
            writer.writerow(clean_row)
            
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-disposition": f"attachment; filename={table}.csv"}
    )

def start_server():
    app.run(debug=False, port=5000, use_reloader=False)

if __name__ == '__main__':
    import time
    import subprocess
    import webbrowser
    import os
    
    # Start flask in a background thread
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()
    
    time.sleep(1) # Give flask a second to start
    
    print("Launching native desktop window...")
    
    # Try to launch Edge or Chrome in app mode (chromeless native window)
    paths = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
    ]
    
    launched = False
    for browser_path in paths:
        if os.path.exists(browser_path):
            try:
                subprocess.Popen([browser_path, "--app=http://localhost:5000"])
                launched = True
                break
            except Exception as e:
                print(f"Failed to launch browser at {browser_path}: {e}")
                
    if not launched:
        print("Fallback: launching default web browser.")
        webbrowser.open('http://localhost:5000')

    # Keep the main thread alive since Flask is in a daemon thread
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Shutting down...")
