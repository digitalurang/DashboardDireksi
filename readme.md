# Direksi Dashboard RS Umum Madina — Application Development & Handover Guide

This document serves as the comprehensive development guide, architectural blueprint, and handover documentation for the **Direksi Dashboard** application of RS Umum Madina Bukittinggi, prepared for the IT development team.

---

## 1. System Overview & Architecture

The **Direksi Dashboard** is a lightweight, responsive, and standalone desktop executive dashboard. It is designed to display hospital performance metrics (BOR, GDR/NDR, clinical statistics, staff presence, financial estimates, and patient feedback) without requiring complex system setups, cloud dependencies, or database management systems.

### High-Level Architecture
The application runs as a hybrid desktop utility:
1. **Backend Server**: A lightweight [Flask](file:///c:/Users/User/Documents/IDE/Dashboard%20Direksi/app.py) server runs locally in a background daemon thread, handling REST API requests, loading/modifying the local JSON database, creating backups, and serving static assets.
2. **Desktop Shell**: The main thread spawns a native-looking Chromium window (using Edge or Chrome in `--app` mode).
3. **Frontend SPA**: A single-page application built on vanilla HTML5/CSS3/ES6+ JS, communicating asynchronously with the local backend.

```
+-------------------------------------------------------------+
|                     Desktop Window Shell                    |
|  +-------------------------------------------------------+  |
|  |                  HTML5 / CSS3 / JS                    |  |
|  |             (Single-Page App Dashboard)               |  |
|  +---------------------------+---------------------------+  |
|                              | (AJAX Requests)              |
|                              v                              |
|  +-------------------------------------------------------+  |
|  |                     Flask WSGI                        |  |
|  |             (Background Daemon Thread)                |  |
|  +---------------------------+---------------------------+  |
|                              | (JSON reads/writes)          |
|                              v                              |
|  +-------------------------------------------------------+  |
|  |                 database.json & Backups               |  |
|  |                 (Writable local storage)              |  |
|  +-------------------------------------------------------+  |
+-------------------------------------------------------------+
```

---

## 2. Backend Server & API Reference

### Backend Tech Stack
- **Python 3.x**: Language runtime.
- **Flask (>= 3.0.0)**: Local WSGI web framework and API provider.
- **Werkzeug (>= 3.0.0)**: Used for secure user password hashing via `generate_password_hash` and verification via `check_password_hash` (using `scrypt`/`pbkdf2` algorithms).
- **Multithreading**: Spawns Flask in a background daemon thread so the main execution thread can launch browser contexts and run a persistence loop.

### Desktop Window Launch Logic
When [app.py](file:///c:/Users/User/Documents/IDE/Dashboard%20Direksi/app.py) starts:
1. Spawns the Flask app on `http://localhost:5000` inside a daemon thread.
2. Pauses the main thread for 1 second to ensure Flask binds to the port.
3. Probes standard Windows paths for Microsoft Edge and Google Chrome:
   - `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`
   - `C:\Program Files\Microsoft\Edge\Application\msedge.exe`
   - `C:\Program Files\Google\Chrome\Application\chrome.exe`
   - `C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`
4. If found, spawns a process using `--app=http://localhost:5000` (this tells the Chromium engine to display the site in a chromeless app frame with no address bar, tabs, or toolbars).
5. If no browser is found at these paths, falls back to opening the system's default browser.
6. Runs a `while True` loop to keep the parent thread alive, terminating gracefully on `KeyboardInterrupt`.

### API Endpoints Reference
All API endpoints require a valid user session, returning `401 Unauthorized` if accessed by unauthenticated clients.

| Route | Method | Auth Required | Request Payload | Response Format & Status | Functional Behavior |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/login` | `GET` | No | None | HTML (200 OK) | Serves the login screen page ([login.html](file:///c:/Users/User/Documents/IDE/Dashboard%20Direksi/login.html)). |
| `/login` | `POST` | No | Form data: `username`, `password` | Redirect (302 Found) | Validates credentials against the `users` list. Spawns session variables (`user`, `role`, `nama`). Redirects to `/` on success, or to `/login?error=1` on failure. Fallback: permits `admin`/`root` if the database has no user records yet. |
| `/logout` | `GET` | No | None | Redirect (302 Found) | Clears all session keys and redirects to `/login`. |
| `/` | `GET` | Yes | None | HTML (200 OK) | Serves the primary single-page application dashboard interface ([index.html](file:///c:/Users/User/Documents/IDE/Dashboard%20Direksi/index.html)). |
| `/api/me` | `GET` | Yes | None | JSON (200 OK) | Returns active user metadata: `{"username": "...", "nama": "...", "role": "..."}`. |
| `/api/save_data` | `POST` | Yes | JSON: `{"table": "tableName", "data": [...]}` | JSON (200 OK / 400 Bad Request / 500 Error) | Replaces the list under the target key in the database file. If writing to the `users` table, hashes any plain text passwords before saving. Triggers automated rolling backup. |
| `/api/backup` | `POST` | Yes | None | JSON (200 OK) | Manually invokes the rolling database backup system. |
| `/api/export_csv/<table>` | `GET` | Yes | None | File Stream (200 OK / 404 Not Found) | Serializes the requested table's JSON data into standard CSV. Complex objects or nested tables are written as JSON strings inside fields to preserve row alignment. |

---

## 3. Database System & Persistent Storage

### Storage Model
The database is a flat file, `database.json`, located in the `datas/` directory. It uses a document-oriented structure where each key is a table name mapped to an array of objects. Each row has a unique identifier string (`id`), which is populated by a UUIDv4 on the client side if missing.

### Local vs Frozen Path Resolution
To support packaging into a read-only directory structure (using PyInstaller), [app.py](file:///c:/Users/User/Documents/IDE/Dashboard%20Direksi/app.py) handles paths dynamically:
```python
if getattr(sys, 'frozen', False):
    BUNDLE_DIR = sys._MEIPASS
    EXE_DIR = os.path.dirname(sys.executable)
else:
    BUNDLE_DIR = os.path.dirname(os.path.abspath(__file__))
    EXE_DIR = BUNDLE_DIR
```
- **`BUNDLE_DIR`**: Read-only directory containing bundled code, templates, and static assets. Points to the temporary folder extraction directory (`sys._MEIPASS`) when compiled.
- **`EXE_DIR`**: Persistent, writable folder where the compiled `.exe` runs.
- **`datas/database.json`**: Located at `EXE_DIR/datas/database.json` to ensure user updates persist.

### First-Run Provisioning
Since the executable folder won't initially contain `datas/database.json`, [app.py](file:///c:/Users/User/Documents/IDE/Dashboard%20Direksi/app.py#L30-L36) checks for its existence at startup:
- If `EXE_DIR/datas/` does not exist, it is created.
- If `database.json` is missing, it is cloned from the read-only template `BUNDLE_DIR/datas/database.json`. This bootstraps the application with seed data.

### Automated Rolling Backups
Whenever `/api/save_data` or `/api/backup` is triggered:
1. The app creates a backup copy at `datas/backups/database_YYYYMMDD_HHMMSS.json` using `shutil.copy2()`.
2. The folder contents are listed, sorted alphabetically (which aligns chronologically), and capped:
   ```python
   backups = sorted([f for f in os.listdir(BACKUP_DIR) if f.endswith('.json')])
   while len(backups) > 30:
       oldest = backups.pop(0)
       os.remove(os.path.join(BACKUP_DIR, oldest))
   ```
This retains exactly the last 30 backups to prevent disk bloat while offering solid recovery options.

### Key Database Tables

#### Table: `pengaturan` (System Configurations)
Holds global configuration data, limits, benchmarks, accent colors, and executive details in a single-element list.
```json
[
  {
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
  }
]
```

#### Table: `users` (User Accounts)
Holds accounts for dashboard access. The `password_hash` uses security strings verified by Werkzeug.
```json
[
  {
    "id": "user-admin",
    "username": "admin",
    "password_hash": "scrypt:32768:8:1$K...",
    "nama": "Administrator",
    "role": "Admin"
  }
]
```

#### Table: `notifikasi` (Notifications Log)
Stores dynamic, generated alerts and backup status messages.
```json
[
  {
    "id": "notif-uuid",
    "tanggal": "2026-05-22",
    "judul": "BOR Melebihi Benchmark",
    "pesan": "Keterisian tempat tidur BOR mencapai 87.5% pada Mei 2026.",
    "dibaca": false
  }
]
```

#### Table: `sensus_rawat_inap` (Inpatient Metrics)
Details clinical statistics used to calculate BOR, LOS, BTO, TOI, NDR, and GDR indicators.
```json
[
  {
    "id": "rawat-inap-uuid",
    "bulan": "Januari",
    "pasien_keluar": 150,
    "hari_perawatan": 720,
    "mati_kurang_48": 3,
    "mati_lebih_48": 2,
    "total_mati": 5,
    "bor": 65.4,
    "los": 4.8,
    "bto": 2.7,
    "toi": 1.5,
    "ndr": 13.3,
    "gdr": 33.3
  }
]
```

*Other clinical tables:* `karyawan` (personnel databases), `sensus_igd`, `sensus_poli_spesialis`, `sensus_poli_umum`, `penunjang_medis`, `kehadiran_sdm`.

---

## 4. Frontend Application & UI Engine

The frontend is implemented inside [index.html](file:///c:/Users/User/Documents/IDE/Dashboard%20Direksi/index.html) and styled via [style.css](file:///c:/Users/User/Documents/IDE/Dashboard%20Direksi/static/css/style.css). It uses zero UI build tools, enabling direct modifications in standard code editors.

### Single-Page App View Management
Routing is handled by checking a target's `data-view` attribute and running the `switchView()` function in [app.js](file:///c:/Users/User/Documents/IDE/Dashboard%20Direksi/static/js/app.js):
```javascript
function switchView(viewId) {
    navItems.forEach(nav => {
        if (nav.getAttribute('data-view') === viewId) nav.classList.add('active');
        else nav.classList.remove('active');
    });

    views.forEach(view => {
        if (view.id === viewId) view.classList.add('view-active');
        else view.classList.remove('view-active');
    });

    // Invoke respective view render functions
    if (viewId === 'view-dashboard') renderDashboard();
    else if (viewId === 'view-pelayanan') renderPelayananView();
    else if (viewId === 'view-keuangan') renderKeuanganView();
    else if (viewId === 'view-sdm') renderSdmView();
    else if (viewId === 'view-mutu') renderMutuView();
    else if (viewId === 'view-analytics') renderAnalyticsView();
    else if (viewId === 'view-pengaturan') renderPengaturanView();
}
```

### Visual Customizer & Accent Colors
Variables inside [style.css](file:///c:/Users/User/Documents/IDE/Dashboard%20Direksi/static/css/style.css) establish theme-wide tokens:
- Primary colors (`--c-primary`, default Indigo `#4F46E5`), transition duration (`--trans-base`, `0.3s ease`), background tints (`--bg-base`), and text values are controlled dynamically.
- `window.applyTheme(theme, accentColor, fontScale, persist)` takes parameters, rewriting values inside the document root element (`document.documentElement.style.setProperty`).
- Supports **Light Mode** and **Dark Mode** toggle, customizable font sizing (`small`, `medium`, `large`), and custom accent colors (reflected dynamically across all panels and chart elements).

### Session Guard (Port Validation)
To support developers launching the page directly inside browsers or live server ports, a fallback script checks the loading port:
- If running on `port === 5000` (Flask), it delegates security to Flask sessions.
- If running on other ports, it inspects `sessionStorage.getItem('user')`. If missing, it immediately redirects the browser window to [login.html](file:///c:/Users/User/Documents/IDE/Dashboard%20Direksi/login.html).

### Data Layer (`dataManager.js`)
Client-side CRUD operations are coordinated by `DataManager` in [dataManager.js](file:///c:/Users/User/Documents/IDE/Dashboard%20Direksi/static/js/dataManager.js).
- **Online/Offline Mode**: Saves data by making a `POST` request to `/api/save_data`. If the request fails (e.g. running from static live-server mockups), it catches the exception and falls back to a local storage simulation, displaying a warning notification.
- **Cross-Table Search**: When searching within the active table, the manager searches other database tables. If matches are found elsewhere, it displays a helper card allowing the user to switch tables with the search terms preserved.
- **Security Check (Self-Deletion Guard)**: Prevents admins from deleting their own account in the user management table:
  ```javascript
  if (this.currentTable === 'users') {
      const user = this.db.users.find(u => u.id === id);
      if (user && window.CURRENT_USER && user.username === window.CURRENT_USER.username) {
          this.showToast('Anda tidak dapat menghapus akun Anda sendiri.', 'error');
          return;
      }
  }
  ```

---

## 5. Interactive UI Features & Controls

### A. Bed Availability Indicator
- Designed as a compact, premium Doughnut chart matched with a linear capacity indicator bar.
- BOR calculations are derived from active monthly inpatient census figures.
- Dynamic color transitions based on capacity status:
  - **BOR > 85%**: Renders elements in Red (`--c-danger`), warning of critical overcapacity.
  - **BOR 70% - 85%**: Renders elements in Amber (`--c-warning`), signaling high capacity.
  - **BOR < 70%**: Renders elements in primary Indigo/Teal, indicating stable operations.

### B. Period Selection Modal
- Triggered by clicking the calendar icon in the topbar. Renders a pop-up overlay centered on the screen with a blur backdrop (`backdrop-filter: blur(6px)`).
- Allows selecting the active year and month. Clicking "Terapkan" closes the dialog, updates the global `currentPeriod`, and refreshes the current view's charts and indicators.

### C. System Settings List
The Settings view exposes at least 13 critical system-wide configuration parameters:
1. **Tema**: Basic interface skin (Light vs Dark).
2. **Warna Aksen**: Accent theme color picker.
3. **Ukuran Font**: Scaling multiplier (Small, Medium, Large).
4. **Nama RS**: Display name in headers and brand labels.
5. **Kota**: Location descriptor.
6. **Total Tempat Tidur**: Capacity value for calculating BOR.
7. **Tahun Aktif**: Base year for report rendering.
8. **Nama Direktur**: Profile display name.
9. **Jabatan**: Title string.
10. **Tarif Pelayanan (Rawat Inap, IGD, Spesialis, Umum, Penunjang)**: Used for calculating financial estimations.
11. **Biaya Tetap Bulanan**: Base operational expenditure.
12. **GDR/NDR Benchmarks**: Regulatory clinical quality limits.
13. **Target Margin**: Minimum desired profit ratio.

### D. System Notification Engine
Monitors monthly clinical and financial performance figures against configured benchmarks to generate notifications:
- **BOR Warn**: Fired if BOR is outside the `benchmark_bor_min` to `benchmark_bor_max` range.
- **Mortality Alert**: Fired if GDR/NDR exceeds target benchmarks.
- **Financial Alert**: Fired if the profit margin is below the `target_margin` ratio.
- **Complaints Alert**: Fired if there are unresolved patient complaints.
- **SDM Alert**: Fired if there are unexcused staff absences (alpha).
A red badge displays the count of unread alerts over the bell icon in the topbar. Clicking "Tandai Sudah Dibaca" clears the badge.

### E. Custom Right-Click Context Menu
Right-clicking cards or charts opens a custom context menu (`.custom-context-menu`) styled to match the theme:
- Positioned dynamically using event coordinates (`clientX`, `clientY`).
- Displays the target card's header in bold at the top.
- Provides contextual options:
  1. **Buka Tab Detail**: Navigates to the relevant detail tab.
  2. **Kelola Data**: Opens the Data Management tab with the source table preloaded.
  3. **Refresh Chart**: Reloads data and redraws the chart.
  4. **Ekspor CSV**: Generates and downloads a CSV export of the card's source data.

### F. CSV Exporter
Uses the Javascript `Blob` API to assemble data lists in CSV format and trigger file downloads directly in the browser:
```javascript
function downloadCsv(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
```

---

## 6. Build, Setup, and Execution Guide

### Development Environment Setup
1. **Initialize Virtual Environment**:
   ```powershell
   python -m venv .venv
   .venv\Scripts\Activate.ps1
   ```
2. **Install Dependencies**:
   ```powershell
   pip install -r requirements.txt
   ```
3. **Run the Server**:
   ```powershell
   python app.py
   ```
   This starts the Flask backend and opens the dashboard in Microsoft Edge or Google Chrome.

### Build and Compilation Script
The build process is automated by [build.ps1](file:///c:/Users/User/Documents/IDE/Dashboard%20Direksi/build.ps1) using PyInstaller:
1. Installs PyInstaller, Flask, and Werkzeug inside the active Python environment.
2. Clears previous builds (`build` and `dist` folders).
3. Executes PyInstaller with the following configuration:
   - `--onedir`: Compiles into a single distribution folder (recommended for faster startup and troubleshooting).
   - `--windowed` / `--noconsole`: Hides the console terminal at runtime.
   - `--add-data`: Maps static assets (`static/`), database templates (`datas/`), and HTML files (`index.html`, `login.html`) to the output package.

```powershell
# Run compilation
.\build.ps1
```

### Compiled Directory Structure
The compiled files are generated in `dist/DashboardDireksi/`:
```
dist/DashboardDireksi/
├── DashboardDireksi.exe             # Application launcher
└── _internal/                       # Python interpreter and assets (Do not modify)
    ├── python314.dll                # Python runtime library
    ├── base_library.zip             # Internal standard library files
    ├── static/                      # Bundled frontend assets (HTML, CSS, JS)
    └── datas/                       # Read-only seed database configuration
```

### Production Deployment
1. Copy the compiled `dist/DashboardDireksi/` folder to the target Windows machine. (Python is not required on the target machine).
2. Double-click `DashboardDireksi.exe` to run the application.
3. On first startup, the app creates a writable `datas/` directory next to the executable and copies the seed database there.
4. The background Flask server starts on port `5000` and launches Microsoft Edge or Google Chrome in standalone `--app` mode, rendering the dashboard in a clean, app-like desktop window.
