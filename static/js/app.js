document.addEventListener('DOMContentLoaded', () => {
    // Current state variables
    const today = new Date();
    const activeYear = window.CONFIG?.tahun_aktif || today.getFullYear();
    let currentPeriod = `${activeYear}-03`; 
    let currentMonthName = 'Maret';
    let db = null;
    
    // Store Chart.js instances to avoid render glitches on update
    window.myCharts = {};

    // DOM Elements
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');
    const calendarBtn = document.getElementById('calendarBtn');
    const calendarLabel = document.getElementById('calendarLabel');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarTimestamp = document.getElementById('sidebarTimestamp');

    // Period Modal Elements
    const periodModalOverlay = document.getElementById('periodModalOverlay');
    const periodModalClose = document.getElementById('periodModalClose');
    const periodYearLabel = document.getElementById('periodYearLabel');
    const periodYearPrev = document.getElementById('periodYearPrev');
    const periodYearNext = document.getElementById('periodYearNext');
    const periodMonthGrid = document.getElementById('periodMonthGrid');
    const periodSelectedLabel = document.getElementById('periodSelectedLabel');
    const btnApplyPeriod = document.getElementById('btnApplyPeriod');
    let periodModalYear = activeYear;
    let periodModalSelectedMonth = null; // 1-12
    let periodModalSelectedYear = null;

    const MONTH_NAMES_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const MONTH_SHORT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

    function renderPeriodMonthGrid() {
        if (!periodMonthGrid) return;
        const curParts = currentPeriod.split('-');
        const curYear = parseInt(curParts[0]);
        const curMonth = parseInt(curParts[1]);
        
        periodMonthGrid.innerHTML = MONTH_SHORT.map((name, i) => {
            const m = i + 1;
            const isCurrent = (periodModalYear === curYear && m === curMonth);
            const isSelected = (periodModalYear === periodModalSelectedYear && m === periodModalSelectedMonth);
            let cls = 'period-month-btn';
            if (isSelected) cls += ' selected';
            else if (isCurrent) cls += ' current-period';
            return `<button class="${cls}" data-month="${m}">${name}</button>`;
        }).join('');
        
        periodMonthGrid.querySelectorAll('.period-month-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                periodModalSelectedMonth = parseInt(btn.dataset.month);
                periodModalSelectedYear = periodModalYear;
                const fullName = MONTH_NAMES_ID[periodModalSelectedMonth - 1];
                if (periodSelectedLabel) periodSelectedLabel.textContent = `${fullName} ${periodModalSelectedYear}`;
                renderPeriodMonthGrid();
            });
        });
    }

    function openPeriodModal() {
        periodModalYear = activeYear;
        // Pre-select current active period
        const curParts = currentPeriod.split('-');
        periodModalSelectedYear = parseInt(curParts[0]);
        periodModalSelectedMonth = parseInt(curParts[1]);
        if (periodYearLabel) periodYearLabel.textContent = periodModalYear;
        if (periodSelectedLabel) periodSelectedLabel.textContent = `${MONTH_NAMES_ID[periodModalSelectedMonth-1]} ${periodModalSelectedYear}`;
        renderPeriodMonthGrid();
        if (periodModalOverlay) periodModalOverlay.classList.add('active');
    }

    function closePeriodModal() {
        if (periodModalOverlay) periodModalOverlay.classList.remove('active');
    }

    // Set timestamp auto-update
    function updateTimestamp() {
        if (sidebarTimestamp) {
            const now = new Date();
            sidebarTimestamp.textContent = now.toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) + ' WIB';
        }
    }
    updateTimestamp();
    setInterval(updateTimestamp, 60000);

    // View Routing
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetViewId = item.getAttribute('data-view');
            switchView(targetViewId);
        });
    });

    // Wire up "Lihat Detail" links
    const detailLinks = document.querySelectorAll('.detail-link');
    detailLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetViewId = link.getAttribute('data-view');
            if (targetViewId) {
                switchView(targetViewId);
            }
        });
    });

    function switchView(viewId) {
        navItems.forEach(nav => {
            if (nav.getAttribute('data-view') === viewId) {
                nav.classList.add('active');
            } else {
                nav.classList.remove('active');
            }
        });

        views.forEach(view => {
            if (view.id === viewId) {
                view.classList.add('view-active');
            } else {
                view.classList.remove('view-active');
            }
        });

        // Trigger renderer for specific tabs
        if (viewId === 'view-dashboard') renderDashboard();
        else if (viewId === 'view-pelayanan') renderPelayananView();
        else if (viewId === 'view-keuangan') renderKeuanganView();
        else if (viewId === 'view-sdm') renderSdmView();
        else if (viewId === 'view-mutu') renderMutuView();
        else if (viewId === 'view-farmasi') renderFarmasiView();
        else if (viewId === 'view-ipsrs') renderIpsrsView();
        else if (viewId === 'view-komplain') renderKomplainView();
        else if (viewId === 'view-laporan') renderLaporanView();
        else if (viewId === 'view-analytics') renderAnalyticsView();
        else if (viewId === 'view-risiko') renderRisikoView();
        else if (viewId === 'view-pengaturan') renderPengaturanView();
    }
    window.switchView = switchView;

    // Dropdowns Toggle and Close on click outside
    const notifBtn = document.getElementById('notifBtn');
    const notifDropdown = document.getElementById('notifDropdown');
    const userChip = document.getElementById('userChip');
    const userDropdown = document.getElementById('userDropdown');
    const exportBtn = document.getElementById('exportBtn');
    
    const filterBtn = document.getElementById('filterBtn');
    if (filterBtn) {
        filterBtn.addEventListener('click', () => {
            showToast('Fitur filter lanjutan akan segera tersedia', 'info');
        });
    }

    if (calendarBtn) {
        calendarBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openPeriodModal();
            if (notifDropdown) notifDropdown.classList.remove('show');
            if (userDropdown) userDropdown.classList.remove('show');
        });
    }

    // Period Modal Controls
    if (periodModalClose) periodModalClose.addEventListener('click', closePeriodModal);
    if (periodModalOverlay) {
        periodModalOverlay.addEventListener('click', (e) => {
            if (e.target === periodModalOverlay) closePeriodModal();
        });
    }
    if (periodYearPrev) {
        periodYearPrev.addEventListener('click', () => {
            periodModalYear--;
            if (periodYearLabel) periodYearLabel.textContent = periodModalYear;
            renderPeriodMonthGrid();
        });
    }
    if (periodYearNext) {
        periodYearNext.addEventListener('click', () => {
            periodModalYear++;
            if (periodYearLabel) periodYearLabel.textContent = periodModalYear;
            renderPeriodMonthGrid();
        });
    }

    if (notifBtn && notifDropdown) {
        notifBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notifDropdown.classList.toggle('show');
            closePeriodModal();
            if (userDropdown) userDropdown.classList.remove('show');
        });
    }

    if (userChip && userDropdown) {
        userChip.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('show');
            closePeriodModal();
            if (notifDropdown) notifDropdown.classList.remove('show');
        });
    }

    document.addEventListener('click', (e) => {
        if (notifBtn && notifDropdown && !notifBtn.contains(e.target) && !notifDropdown.contains(e.target)) {
            notifDropdown.classList.remove('show');
        }
        if (userChip && userDropdown && !userChip.contains(e.target) && !userDropdown.contains(e.target)) {
            userDropdown.classList.remove('show');
        }
    });

    // Mark notifications read
    const notifMarkRead = document.getElementById('notifMarkRead');
    if (notifMarkRead) {
        notifMarkRead.addEventListener('click', () => {
            window.notificationsRead = true;
            const notifBadge = document.getElementById('notifBadge');
            const notifList = document.getElementById('notifList');
            if (notifBadge) {
                notifBadge.style.display = 'none';
                notifBadge.textContent = '0';
            }
            if (notifList) {
                notifList.innerHTML = `
                    <div style="padding: 24px; text-align: center; color: var(--text-mute); font-size: 13px;">
                        <i class="fas fa-bell-slash" style="font-size: 24px; margin-bottom: 8px; display: block; opacity: 0.5;"></i>
                        Tidak ada notifikasi baru
                    </div>
                `;
            }
            showToast('Semua notifikasi telah ditandai dibaca');
        });
    }

    // User Profile Actions
    const profileItem = document.querySelector('.ud-item[data-action="profile"]');
    if (profileItem) {
        profileItem.addEventListener('click', (e) => {
            e.preventDefault();
            const pName = window.CURRENT_USER ? window.CURRENT_USER.nama : (window.CONFIG.direktur || 'Direktur');
            const pRole = window.CURRENT_USER ? window.CURRENT_USER.role : (window.CONFIG.jabatan_direktur || 'Direktur Utama');
            showToast(`Profil Anda: ${pName} (${pRole})`);
            if (userDropdown) userDropdown.classList.remove('show');
        });
    }

    const settingsItem = document.querySelector('.ud-item[data-action="settings"]');
    if (settingsItem) {
        settingsItem.addEventListener('click', (e) => {
            e.preventDefault();
            switchView('view-pengaturan');
            if (userDropdown) userDropdown.classList.remove('show');
        });
    }

    const logoutBtn = document.querySelector('.ud-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.location.port === '5000') {
                window.location.href = '/logout';
            } else {
                sessionStorage.clear();
                window.location.href = 'login.html';
            }
        });
    }

    // Apply Period from Modal
    if (btnApplyPeriod) {
        btnApplyPeriod.addEventListener('click', () => {
            if (periodModalSelectedMonth && periodModalSelectedYear) {
                const mm = String(periodModalSelectedMonth).padStart(2, '0');
                currentPeriod = `${periodModalSelectedYear}-${mm}`;
                currentMonthName = MONTH_NAMES_ID[periodModalSelectedMonth - 1];
                
                if (calendarLabel) {
                    calendarLabel.textContent = `${currentMonthName} ${periodModalSelectedYear}`;
                }
                
                closePeriodModal();
                
                // Reload active view with new month data
                const activeNav = document.querySelector('.nav-item.active');
                if (activeNav) {
                    const activeViewId = activeNav.getAttribute('data-view');
                    switchView(activeViewId);
                } else {
                    renderDashboard();
                }
                showToast(`Periode diubah ke ${currentMonthName} ${periodModalSelectedYear}`);
            } else {
                showToast('Pilih bulan terlebih dahulu', 'warning');
            }
        });
    }

    // Sidebar Toggle & Persistence
    if (sidebarToggle && sidebar) {
        if (localStorage.getItem('sidebar_collapsed') === 'true') {
            sidebar.classList.add('collapsed');
        }

        function toggleSidebar() {
            sidebar.classList.toggle('collapsed');
            localStorage.setItem('sidebar_collapsed', sidebar.classList.contains('collapsed'));
        }

        sidebarToggle.addEventListener('click', toggleSidebar);

        // Keyboard shortcut Ctrl+B
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key.toLowerCase() === 'b') {
                e.preventDefault();
                toggleSidebar();
            }
            if (e.key === 'Escape') {
                closePeriodModal();
            }
        });
        
        // Mobile auto-close
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth < 768) {
                    sidebar.classList.add('collapsed');
                    localStorage.setItem('sidebar_collapsed', 'true');
                }
            });
        });
    }

    // Export Button Handler
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const activeNav = document.querySelector('.nav-item.active');
            const viewId = activeNav ? activeNav.getAttribute('data-view') : 'view-dashboard';
            
            if (viewId === 'view-dashboard') {
                exportDashboardSummary();
            } else if (viewId === 'view-pelayanan') {
                exportPelayananSummary();
            } else if (viewId === 'view-keuangan') {
                exportKeuanganSummary();
            } else if (viewId === 'view-sdm') {
                exportSdmSummary();
            } else if (viewId === 'view-mutu') {
                exportMutuSummary();
            } else {
                showToast('Tidak ada data untuk diekspor pada tab ini', 'error');
            }
        });
    }

    // Fetch Database JSON
    fetch('datas/database.json')
        .then(res => res.json())
        .then(data => {
            db = data;
            window.db = data;
            
            // Load configuration from database
            window.CONFIG = data.pengaturan ? data.pengaturan[0] : {
                id: "config-1",
                nama_rs: "RS Umum Madina",
                kota: "Bukittinggi",
                total_tempat_tidur: 56,
                tahun_aktif: 2026,
                tarif_rawat_inap: 5200000,
                tarif_igd: 320000,
                tarif_spesialis: 480000,
                tarif_umum: 150000,
                tarif_penunjang: 400000,
                rasio_biaya_operasional: 0.76,
                biaya_tetap_bulanan: 150000000,
                rasio_koleksi: 0.94,
                rasio_bpjs: 0.58,
                benchmark_gdr: 45,
                benchmark_ndr: 25,
                benchmark_bor_min: 60,
                benchmark_bor_max: 85,
                target_margin: 0.20,
                direktur: "dr. H. Madina, Sp.PD",
                jabatan_direktur: "Direktur Utama",
                tema: "light",
                warna_aksen: "#4f46e5",
                ukuran_font: "medium"
            };
            
            // Apply configured theme
            if (window.applyTheme) {
                window.applyTheme(window.CONFIG.tema || 'light', window.CONFIG.warna_aksen || '#4f46e5', window.CONFIG.ukuran_font || 'medium', true);
            }
            
            // Sidebar Title and User Info
            const sbTitle = document.getElementById('sbTitle');
            if (sbTitle) sbTitle.textContent = window.CONFIG.nama_rs || 'RS Umum';
            
            // Fetch Current User
            fetch('/api/me')
                .then(res => res.ok ? res.json() : { username: 'admin', nama: 'Admin', role: 'Admin' })
                .catch(() => ({ username: 'admin', nama: 'Admin', role: 'Admin' }))
                .then(me => {
                    window.CURRENT_USER = me;
                    const userName = document.getElementById('userName');
                    const udName = document.getElementById('udName');
                    const udRole = document.getElementById('udRole');
                    if (userName) userName.textContent = window.CURRENT_USER.nama;
                    if (udName) udName.textContent = window.CURRENT_USER.nama;
                    if (udRole) udRole.textContent = window.CURRENT_USER.role;
                });

            // Generate Notifications
            generateNotifications();
            
            const notifMarkRead = document.getElementById('notifMarkRead');
            if (notifMarkRead) {
                notifMarkRead.addEventListener('click', (e) => {
                    e.stopPropagation();
                    renderNotifications([]);
                });
            }

            // Init Data Manager
            if (window.dataManager) {
                window.dataManager.setDatabase(data);
            }

            // Default period labels
            if (calendarLabel) {
                calendarLabel.textContent = `${currentMonthName} ${window.CONFIG.tahun_aktif}`;
            }

            // Init Dashboard
            renderDashboard();
            setupContextMenu();
        })
        .catch(err => {
            console.error('Error fetching database:', err);
        });

    // Helper functions for parsing specific sheets
    function getIgdVisits(month) {
        if (!db || !db.sensus_igd) return 0;
        const rec = db.sensus_igd.find(r => r.januari === month);
        return rec ? (parseInt(rec['885']) || 0) : 0;
    }

    function getSpesialisVisits(month) {
        if (!db || !db.sensus_poli_spesialis) return 0;
        const rec = db.sensus_poli_spesialis.find(r => r.bulan === month);
        return rec ? (parseInt(rec.usia?.jumlah) || 0) : 0;
    }

    function getUmumVisits(month) {
        if (!db || !db.sensus_poli_umum) return 0;
        const rec = db.sensus_poli_umum.find(r => r.januari === month);
        return rec ? (parseInt(rec['27']) || 0) : 0;
    }

    function getPenunjangVisits(month) {
        if (!db || !db.penunjang_medis) return 0;
        const rec = db.penunjang_medis.find(r => r.bulan === month);
        return rec ? (parseInt(rec.jumlah) || 0) : 0;
    }

    function getRawatInapData(month) {
        if (!db || !db.sensus_rawat_inap) return null;
        return db.sensus_rawat_inap.find(r => r.bulan === month) || null;
    }

    // ==================== RENDERING DASHBOARD ====================
    function renderDashboard() {
        if (!db) return;
        
        // Month names for comparison
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        const mIdx = months.indexOf(currentMonthName);
        const prevMonthName = mIdx > 0 ? months[mIdx - 1] : null;

        // Inpatients Data
        const riData = getRawatInapData(currentMonthName);
        const prevRiData = prevMonthName ? getRawatInapData(prevMonthName) : null;

        // 1. Calculate visits
        const igdVisits = getIgdVisits(currentMonthName);
        const specVisits = getSpesialisVisits(currentMonthName);
        const umumVisits = getUmumVisits(currentMonthName);
        const totalVisits = igdVisits + specVisits + umumVisits;

        const prevIgd = prevMonthName ? getIgdVisits(prevMonthName) : 0;
        const prevSpec = prevMonthName ? getSpesialisVisits(prevMonthName) : 0;
        const prevUmum = prevMonthName ? getUmumVisits(prevMonthName) : 0;
        const prevTotalVisits = prevIgd + prevSpec + prevUmum;

        // Render visits into card
        const kpiValKunjungan = document.getElementById('kpiValKunjungan');
        const kpiBadgeKunjungan = document.getElementById('kpiBadgeKunjungan');
        if (kpiValKunjungan) kpiValKunjungan.textContent = totalVisits.toLocaleString('id-ID');
        if (kpiBadgeKunjungan && prevTotalVisits > 0) {
            const diffPct = ((totalVisits - prevTotalVisits) / prevTotalVisits) * 100;
            kpiBadgeKunjungan.textContent = `${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(1)}%`;
            kpiBadgeKunjungan.style.background = diffPct >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
            kpiBadgeKunjungan.style.color = diffPct >= 0 ? 'var(--c-success)' : 'var(--c-danger)';
        } else if (kpiBadgeKunjungan) {
            kpiBadgeKunjungan.textContent = 'Baru';
        }

        // 2. Render Inpatient BOR
        const kpiValBor = document.getElementById('kpiValBor');
        const kpiBadgeBor = document.getElementById('kpiBadgeBor');
        const borVal = riData ? riData.bor : 0;
        if (kpiValBor) kpiValBor.textContent = `${borVal}%`;
        if (kpiBadgeBor && prevRiData) {
            const diffBor = borVal - prevRiData.bor;
            kpiBadgeBor.textContent = `${diffBor >= 0 ? '+' : ''}${diffBor.toFixed(1)}%`;
            kpiBadgeBor.style.background = diffBor >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
            kpiBadgeBor.style.color = diffBor >= 0 ? 'var(--c-success)' : 'var(--c-danger)';
        } else if (kpiBadgeBor) {
            kpiBadgeBor.textContent = 'Benchmark: 60-85%';
            kpiBadgeBor.style.color = 'var(--text-sub)';
            kpiBadgeBor.style.background = 'var(--bg-hover)';
        }

        // 3. Render Bed Availability (Total beds is 56 based on BOR sheets)
        const totalBeds = 56;
        const bedsOccupied = riData ? Math.round((riData.bor / 100) * totalBeds) : 0;
        const bedsAvailable = totalBeds - bedsOccupied;
        
        const kpiValTt = document.getElementById('kpiValTt');
        if (kpiValTt) kpiValTt.textContent = bedsAvailable;

        // 4. Financial Calculations
        // Estimated based on visits and operations
        const riPasien = riData ? riData.pasien_keluar : 0;
        const penunjangVisits = getPenunjangVisits(currentMonthName);

        const currentRevenue = (riPasien * window.CONFIG.tarif_rawat_inap) + (igdVisits * window.CONFIG.tarif_igd) + (specVisits * window.CONFIG.tarif_spesialis) + (umumVisits * window.CONFIG.tarif_umum) + (penunjangVisits * window.CONFIG.tarif_penunjang);
        const prevRiPasien = prevRiData ? prevRiData.pasien_keluar : 0;
        const prevRevenue = prevMonthName ? ((prevRiPasien * window.CONFIG.tarif_rawat_inap) + (prevIgd * window.CONFIG.tarif_igd) + (prevSpec * window.CONFIG.tarif_spesialis) + (prevUmum * window.CONFIG.tarif_umum) + (getPenunjangVisits(prevMonthName) * window.CONFIG.tarif_penunjang)) : 0;

        const kpiValPendapatan = document.getElementById('kpiValPendapatan');
        const kpiBadgePendapatan = document.getElementById('kpiBadgePendapatan');
        if (kpiValPendapatan) kpiValPendapatan.textContent = `Rp ${(currentRevenue / 1000000000).toFixed(2)} M`;
        if (kpiBadgePendapatan && prevRevenue > 0) {
            const diffPct = ((currentRevenue - prevRevenue) / prevRevenue) * 100;
            kpiBadgePendapatan.textContent = `${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(1)}%`;
            kpiBadgePendapatan.style.background = diffPct >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
            kpiBadgePendapatan.style.color = diffPct >= 0 ? 'var(--c-success)' : 'var(--c-danger)';
        }

        // Expenses and cashflow
        const currentExpenses = (currentRevenue * window.CONFIG.rasio_biaya_operasional) + window.CONFIG.tarif_umum000;
        const netProfit = currentRevenue - currentExpenses;
        const cashflow = currentRevenue * window.CONFIG.rasio_koleksi - currentExpenses;
        const piutang = currentRevenue * window.CONFIG.rasio_bpjs;

        const kpiValCashflow = document.getElementById('kpiValCashflow');
        if (kpiValCashflow) kpiValCashflow.textContent = `Rp ${(cashflow / 1000000).toFixed(0)} jt`;

        // Ringkasan Keuangan Details
        const finPendapatan = document.getElementById('finPendapatan');
        const finPengeluaran = document.getElementById('finPengeluaran');
        const finLaba = document.getElementById('finLaba');
        const finPiutang = document.getElementById('finPiutang');
        
        if (finPendapatan) finPendapatan.textContent = `Rp ${(currentRevenue / 1000000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".")} jt`;
        if (finPengeluaran) finPengeluaran.textContent = `Rp ${(currentExpenses / 1000000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".")} jt`;
        if (finLaba) finLaba.textContent = `Rp ${(netProfit / 1000000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".")} jt`;
        if (finPiutang) finPiutang.textContent = `Rp ${(piutang / 1000000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".")} jt`;

        // 5. Active complaints (from simulated items)
        const complaintTotals = { "Januari": 12, "Februari": 8, "Maret": 14 };
        const totalComplaints = complaintTotals[currentMonthName] || 0;
        
        // Hide "Komplain Aktif" KPI card since it's not in the database
        const kpiKomplainCard = document.querySelector('.kpi-card[data-ctx-kpi="komplain"]');
        if (kpiKomplainCard) kpiKomplainCard.style.display = 'none';

        // 6. Visit List breakdown
        document.getElementById('viRj').textContent = specVisits.toLocaleString('id-ID');
        document.getElementById('viRi').textContent = riPasien.toLocaleString('id-ID');
        document.getElementById('viIgd').textContent = igdVisits.toLocaleString('id-ID');
        document.getElementById('viPen').textContent = penunjangVisits.toLocaleString('id-ID');

        if (prevMonthName) {
            const specChg = ((specVisits - prevSpec) / (prevSpec || 1)) * 100;
            const riChg = ((riPasien - prevRiPasien) / (prevRiPasien || 1)) * 100;
            const igdChg = ((igdVisits - prevIgd) / (prevIgd || 1)) * 100;
            const penChg = ((penunjangVisits - getPenunjangVisits(prevMonthName)) / (getPenunjangVisits(prevMonthName) || 1)) * 100;
            
            setChgBadge('viRjChg', specChg);
            setChgBadge('viRiChg', riChg);
            setChgBadge('viIgdChg', igdChg);
            setChgBadge('viPenChg', penChg);
        }

        // 7. Top 5 Revenue Units (simulated breakdown)
        const barList = document.getElementById('barList');
        if (barList) {
            const units = [
                { name: 'Poli Spesialis', amount: specVisits * window.CONFIG.tarif_spesialis },
                { name: 'Rawat Inap', amount: riPasien * window.CONFIG.tarif_rawat_inap },
                { name: 'Instalasi Gawat Darurat', amount: igdVisits * window.CONFIG.tarif_igd },
                { name: 'Penunjang Medis (Lab/Rad)', amount: penunjangVisits * window.CONFIG.tarif_penunjang },
                { name: 'Poli Umum', amount: umumVisits * window.CONFIG.tarif_umum }
            ];
            // Sort by amount descending
            units.sort((a,b) => b.amount - a.amount);
            const maxAmt = units[0].amount;
            
            barList.innerHTML = units.map(u => {
                const pct = (u.amount / maxAmt) * 100;
                return `
                    <div style="margin-bottom: 12px;">
                        <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
                            <span style="font-weight:500;">${u.name}</span>
                            <span style="font-weight:600; color:var(--c-primary);">Rp ${(u.amount/1000000).toFixed(1)}M</span>
                        </div>
                        <div style="height:8px; background:var(--bg-hover); border-radius:4px; overflow:hidden;">
                            <div style="height:100%; width:${pct}%; background:linear-gradient(90deg, var(--c-primary) 0%, #818CF8 100%); border-radius:4px;"></div>
                        </div>
                    </div>
                `;
            }).join('');
            
            const barFooter = document.getElementById('barFooter');
            if (barFooter) {
                barFooter.innerHTML = `<span>Total Pendapatan Terhitung: Rp ${(currentRevenue/1000000000).toFixed(3)} Miliar</span>`;
            }
        }

        // 8. Staff Attendance Cards
        const sdmHadir = document.getElementById('sdmHadir');
        const sdmIzin = document.getElementById('sdmIzin');
        const sdmSakit = document.getElementById('sdmSakit');
        const sdmCuti = document.getElementById('sdmCuti');
        const sdmAlpha = document.getElementById('sdmAlpha');
        const sdmTotalEl = document.getElementById('sdmTotal');

        const totalKaryawan = db.karyawan ? db.karyawan.length : 281;
        let countHadir = 0;
        let countIzin = 0;
        let countSakit = 0;
        let countCuti = 0;
        let countAlpha = 0;

        if (db && db.kehadiran_sdm) {
            const attRec = db.kehadiran_sdm.find(r => r.bulan === currentMonthName);
            if (attRec) {
                countHadir = parseInt(attRec.hadir) || 0;
                countIzin = parseInt(attRec.izin) || 0;
                countSakit = parseInt(attRec.sakit) || 0;
                countCuti = parseInt(attRec.cuti) || 0;
                countAlpha = parseInt(attRec.alpha) || 0;
            }
        }

        if (sdmHadir) sdmHadir.textContent = countHadir;
        if (sdmIzin) sdmIzin.textContent = countIzin;
        if (sdmSakit) sdmSakit.textContent = countSakit;
        if (sdmCuti) sdmCuti.textContent = countCuti;
        if (sdmAlpha) sdmAlpha.textContent = countAlpha;
        if (sdmTotalEl) sdmTotalEl.textContent = totalKaryawan;

        const sumAtt = countHadir + countIzin + countSakit + countCuti + countAlpha;
        const denom = sumAtt || totalKaryawan || 1;

        document.getElementById('sdmHadirPct').textContent = sumAtt > 0 ? `${(countHadir/denom*100).toFixed(1)}%` : '0%';
        document.getElementById('sdmIzinPct').textContent = sumAtt > 0 ? `${(countIzin/denom*100).toFixed(1)}%` : '0%';
        document.getElementById('sdmSakitPct').textContent = sumAtt > 0 ? `${(countSakit/denom*100).toFixed(1)}%` : '0%';
        document.getElementById('sdmCutiPct').textContent = sumAtt > 0 ? `${(countCuti/denom*100).toFixed(1)}%` : '0%';
        document.getElementById('sdmAlphaPct').textContent = sumAtt > 0 ? `${(countAlpha/denom*100).toFixed(1)}%` : '0%';
        document.getElementById('sdmTotalPct').textContent = sumAtt > 0 ? '100%' : '0%';

        // 9. Alert list & Notification dropdown synchronization
        const alertList = document.getElementById('alertList');
        const notifBadge = document.getElementById('notifBadge');
        const notifList = document.getElementById('notifList');
        
        let alerts = [];
        if (borVal > 90) {
            alerts.push({
                title: `BOR melebihi kapasitas standar (${borVal}%)`,
                text: 'Tingkat keterisian ranjang melampaui batas aman 85%. Koordinasikan dengan kepala bangsal untuk rujukan atau penataan ruangan.',
                time: '1 jam yang lalu',
                type: 'danger',
                icon: 'fa-exclamation-triangle'
            });
        } else if (borVal < 60 && borVal > 0) {
            alerts.push({
                title: `BOR di bawah rata-rata nasional (${borVal}%)`,
                text: 'Okupansi ranjang rendah. Periksa koordinasi penerimaan pasien rujukan atau penjadwalan operasi elektif.',
                time: '2 jam yang lalu',
                type: 'warning',
                icon: 'fa-exclamation-circle'
            });
        }
        if (totalComplaints > 10) {
            alerts.push({
                title: 'Peningkatan keluhan parkir & antrean',
                text: 'Jumlah keluhan aktif meningkat di poli rawat jalan. Perlu evaluasi jalur parkir alternatif.',
                time: '3 jam yang lalu',
                type: 'warning',
                icon: 'fa-exclamation-circle'
            });
        }

        // Update topbar notifications dropdown
        if (notifList && notifBadge) {
            const activeWarnings = alerts.filter(a => a.type === 'danger' || a.type === 'warning');
            
            if (activeWarnings.length > 0 && !window.notificationsRead) {
                notifBadge.style.display = 'inline-flex';
                notifBadge.textContent = activeWarnings.length;
                
                notifList.innerHTML = activeWarnings.map(a => `
                    <div class="notif-item" style="padding: 12px 16px; border-bottom: 1px solid var(--border-color); display: flex; gap: 12px; cursor: pointer; text-align: left;" onclick="window.switchView('${a.type === 'danger' || a.title.includes('BOR') ? 'view-pelayanan' : 'view-komplain'}')">
                        <div style="width: 32px; height: 32px; border-radius: 50%; background: ${a.type === 'danger' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)'}; display: flex; align-items: center; justify-content: center; flex-shrink:0;">
                            <i class="fas ${a.icon}" style="font-size: 14px; color: ${a.type === 'danger' ? 'var(--c-danger)' : 'var(--c-warning)'};"></i>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:2px;">
                            <span style="font-size:12px; font-weight:600; color:var(--text-main);">${a.title}</span>
                            <span style="font-size:11px; color:var(--text-sub); line-height:1.4;">${a.text.substring(0, 60)}...</span>
                            <span style="font-size:10px; color:var(--text-mute); margin-top:2px;">${a.time}</span>
                        </div>
                    </div>
                `).join('');
            } else {
                notifBadge.style.display = 'none';
                notifList.innerHTML = `
                    <div style="padding: 24px; text-align: center; color: var(--text-mute); font-size: 13px;">
                        <i class="fas fa-bell-slash" style="font-size: 24px; margin-bottom: 8px; display: block; opacity: 0.5;"></i>
                        Tidak ada notifikasi baru
                    </div>
                `;
            }
        }

        if (alertList) {
            let displayAlerts = [...alerts];
            if (displayAlerts.length === 0) {
                displayAlerts.push({
                    title: 'Operasional Normal',
                    text: 'Seluruh sistem pelayanan dan indikator kinerja berada dalam rentang toleransi aman.',
                    time: 'Hari ini',
                    type: 'success',
                    icon: 'fa-check-circle'
                });
            }

            alertList.innerHTML = displayAlerts.map(a => `
                <div class="alert-item" style="border-left-color: ${a.type === 'danger' ? 'var(--c-danger)' : a.type === 'warning' ? 'var(--c-warning)' : 'var(--c-success)'}; background:${a.type==='danger'?'rgba(239,68,68,0.04)':a.type==='warning'?'rgba(245,158,11,0.04)':'rgba(16,185,129,0.04)'}">
                    <i class="fas ${a.icon || (a.type==='danger'?'fa-exclamation-triangle':a.type==='warning'?'fa-exclamation-circle':'fa-check-circle')}" style="color:${a.type==='danger'?'var(--c-danger)':a.type==='warning'?'var(--c-warning)':'var(--c-success)'}"></i>
                    <div class="alert-text">
                        <strong style="display:block; margin-bottom:2px;">${a.title}</strong>
                        <span>${a.text}</span>
                        <span class="alert-time">${a.time}</span>
                    </div>
                </div>
            `).join('');
        }

        // ==================== RENDERING CHARTS ====================
        renderDashboardCharts(months.slice(0, mIdx + 1), totalVisits, currentRevenue, bedsOccupied, bedsAvailable, riData);
    }

    function setChgBadge(id, val) {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = `${val >= 0 ? '▲' : '▼'} ${Math.abs(val).toFixed(1)}%`;
        el.style.color = val >= 0 ? 'var(--c-success)' : 'var(--c-danger)';
        el.style.fontWeight = '600';
    }

    function renderDashboardCharts(activeMonths, currentTotalVisits, currentTotalRevenue, bedsOccupied, bedsAvailable, riData) {
        if (typeof Chart === 'undefined') return;

        // 1. Line Chart: BOR Trend
        const borCanvas = document.getElementById('borChart');
        if (borCanvas) {
            // Destroy previous instance
            if (window.myCharts.borChart) window.myCharts.borChart.destroy();
            
            const borDataPoints = activeMonths.map(m => {
                const r = getRawatInapData(m);
                return r ? r.bor : 0;
            });

            window.myCharts.borChart = new Chart(borCanvas, {
                type: 'line',
                data: {
                    labels: activeMonths,
                    datasets: [{
                        label: 'BOR %',
                        data: borDataPoints,
                        borderColor: '#4F46E5',
                        backgroundColor: 'rgba(79, 70, 229, 0.05)',
                        fill: true,
                        tension: 0.35,
                        borderWidth: 3,
                        pointRadius: 4,
                        pointBackgroundColor: '#4F46E5'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { min: 0, max: 100, ticks: { callback: value => value + '%' } }
                    }
                }
            });
        }

        // 2. Donut Chart: Pendapatan Detail
        const pendCanvas = document.getElementById('pendChart');
        const pendLegend = document.getElementById('pendLegend');
        if (pendCanvas) {
            if (window.myCharts.pendChart) window.myCharts.pendChart.destroy();
            
            const specVisits = getSpesialisVisits(currentMonthName);
            const igdVisits = getIgdVisits(currentMonthName);
            const umumVisits = getUmumVisits(currentMonthName);
            const riPasien = riData ? riData.pasien_keluar : 0;
            const penunjangVisits = getPenunjangVisits(currentMonthName);

            const rjSpesRevenue = specVisits * window.CONFIG.tarif_spesialis;
            const riRevenue = riPasien * window.CONFIG.tarif_rawat_inap;
            const igdRevenue = igdVisits * window.CONFIG.tarif_igd;
            const penRevenue = penunjangVisits * window.CONFIG.tarif_penunjang;
            const rjUmumRevenue = umumVisits * window.CONFIG.tarif_umum;
            const totalRev = rjSpesRevenue + riRevenue + igdRevenue + penRevenue + rjUmumRevenue;

            document.getElementById('pendTotal').textContent = `Rp ${(totalRev/1000000000).toFixed(1)}M`;

            window.myCharts.pendChart = new Chart(pendCanvas, {
                type: 'doughnut',
                data: {
                    labels: ['Ranap', 'Poli Spes', 'IGD', 'Penunjang', 'Poli Umum'],
                    datasets: [{
                        data: [riRevenue, rjSpesRevenue, igdRevenue, penRevenue, rjUmumRevenue],
                        backgroundColor: ['#4F46E5', '#0D9488', '#F59E0B', '#3B82F6', '#EF4444'],
                        borderWidth: 2,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    cutout: '75%'
                }
            });

            // Populate Legend
            if (pendLegend) {
                const labels = ['Ranap', 'Poli Spes', 'IGD', 'Penunjang', 'Poli Umum'];
                const colors = ['#4F46E5', '#0D9488', '#F59E0B', '#3B82F6', '#EF4444'];
                const values = [riRevenue, rjSpesRevenue, igdRevenue, penRevenue, rjUmumRevenue];

                pendLegend.innerHTML = labels.map((lbl, idx) => {
                    const pct = ((values[idx]/totalRev)*100).toFixed(1);
                    return `
                        <div class="leg-item">
                            <div>
                                <span class="leg-color" style="background:${colors[idx]};"></span>
                                <span>${lbl}</span>
                            </div>
                            <strong style="color:var(--text-main);">${pct}%</strong>
                        </div>
                    `;
                }).join('');
            }
        }

        // 3. Sparkline/Bar Chart: Cashflow Bulanan
        const cfCanvas = document.getElementById('cfChart');
        if (cfCanvas) {
            if (window.myCharts.cfChart) window.myCharts.cfChart.destroy();

            const cfDataPoints = activeMonths.map(m => {
                const r = getRawatInapData(m);
                const rP = r ? r.pasien_keluar : 0;
                const ig = getIgdVisits(m);
                const sp = getSpesialisVisits(m);
                const um = getUmumVisits(m);
                const pen = getPenunjangVisits(m);
                const rev = (rP * window.CONFIG.tarif_rawat_inap) + (ig * window.CONFIG.tarif_igd) + (sp * window.CONFIG.tarif_spesialis) + (um * window.CONFIG.tarif_umum) + (pen * window.CONFIG.tarif_penunjang);
                const exp = (rev * window.CONFIG.rasio_biaya_operasional) + window.CONFIG.tarif_umum000;
                return (rev * window.CONFIG.rasio_koleksi - exp) / 1000000; // in Millions
            });

            document.getElementById('cfVal').textContent = `Rp ${cfDataPoints[cfDataPoints.length - 1].toFixed(0)} Jt`;

            window.myCharts.cfChart = new Chart(cfCanvas, {
                type: 'bar',
                data: {
                    labels: activeMonths,
                    datasets: [{
                        data: cfDataPoints,
                        backgroundColor: '#0D9488',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { display: false },
                        y: { display: false }
                    }
                }
            });
        }

        // 4. Bed Availability Ring Chart (full circle)
        const bedCanvas = document.getElementById('bedChart');
        if (bedCanvas) {
            if (window.myCharts.bedChart) window.myCharts.bedChart.destroy();

            const totalBeds = bedsOccupied + bedsAvailable;
            const occupiedPct = totalBeds > 0 ? ((bedsOccupied / totalBeds) * 100).toFixed(0) : 0;
            
            document.getElementById('bedPct').textContent = `${occupiedPct}%`;
            document.getElementById('bsTotalTt').textContent = totalBeds;
            document.getElementById('bsTerisi').textContent = bedsOccupied;
            document.getElementById('bsKosong').textContent = bedsAvailable;
            
            // Animate capacity bar fill
            const bedCapFill = document.getElementById('bedCapFill');
            if (bedCapFill) {
                setTimeout(() => { bedCapFill.style.width = `${occupiedPct}%`; }, 100);
            }

            // Color the percentage based on occupancy level
            const pctEl = document.getElementById('bedPct');
            if (pctEl) {
                if (occupiedPct > 85) pctEl.style.color = 'var(--c-danger)';
                else if (occupiedPct > 70) pctEl.style.color = 'var(--c-warning)';
                else pctEl.style.color = 'var(--c-primary)';
            }

            window.myCharts.bedChart = new Chart(bedCanvas, {
                type: 'doughnut',
                data: {
                    labels: ['Terisi', 'Kosong'],
                    datasets: [{
                        data: [bedsOccupied, bedsAvailable],
                        backgroundColor: [
                            occupiedPct > 85 ? '#EF4444' : 'rgba(79, 70, 229, 0.85)',
                            'rgba(16, 185, 129, 0.25)'
                        ],
                        borderWidth: 0,
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false }, tooltip: { enabled: false } },
                    cutout: '75%'
                }
            });
        }

        // 5. Donut Chart: Komplain (replaced with empty state since it's not in the database)
        const komCanvas = document.getElementById('komChart');
        if (komCanvas) {
            if (window.myCharts.komChart) window.myCharts.komChart.destroy();
            const komCardBody = komCanvas.closest('.card-body');
            if (komCardBody) {
                komCardBody.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; color: var(--text-sub); padding: 20px;">
                        <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--c-warning)15; display: flex; align-items: center; justify-content: center; margin-bottom: 12px;">
                            <i class="fas fa-comment-slash" style="font-size: 20px; color: var(--c-warning);"></i>
                        </div>
                        <span style="font-size: 13px; font-weight: 600; color: var(--text-main); margin-bottom: 4px;">Tidak Ada Data Komplain</span>
                        <span style="font-size: 11px; color: var(--text-mute); max-width: 180px;">Belum ada keluhan masuk untuk periode ini.</span>
                    </div>
                `;
            }
        }
    }

    // ==================== RENDERING REMAINING TABS (VIEWS) ====================

    // Tab 1: PELAYANAN DETAIL VIEW
    function renderPelayananView() {
        const v = document.getElementById('view-pelayanan');
        if (!db) return;
        
        let html = `
            <div style="display:grid; grid-template-columns: 2fr 1fr; gap:24px; margin-bottom:24px;">
                <div class="card" style="padding:24px;">
                    <h3 style="margin-bottom:20px; font-weight:600;"><i class="fas fa-procedures" style="color:var(--c-primary); margin-right:10px;"></i>Indikator Rawat Inap (Sensus Bulanan)</h3>
                    <div class="dm-table-wrap">
                        <table class="dm-table">
                            <thead>
                                <tr>
                                    <th>BULAN</th>
                                    <th>PASIEN KELUAR</th>
                                    <th>HARI RAWAT</th>
                                    <th>BOR %</th>
                                    <th>LOS (HARI)</th>
                                    <th>BTO (KALI)</th>
                                    <th>TOI (HARI)</th>
                                    <th>GDR %</th>
                                    <th>NDR %</th>
                                </tr>
                            </thead>
                            <tbody>
        `;
        
        db.sensus_rawat_inap.forEach(r => {
            const isCurrent = r.bulan === currentMonthName;
            html += `
                <tr style="${isCurrent ? 'background:rgba(79,70,229,0.08); font-weight:600;' : ''}">
                    <td>${r.bulan}</td>
                    <td>${r.pasien_keluar || '-'}</td>
                    <td>${r.hari_perawatan || '-'}</td>
                    <td><span class="kpi-badge" style="background:${r.bor > 85 ? 'rgba(239,68,68,0.1)' : r.bor < 60 ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)'}; color:${r.bor > 85 ? 'var(--c-danger)' : r.bor < 60 ? 'var(--c-warning)' : 'var(--c-success)'};">${r.bor}%</span></td>
                    <td>${r.los} hari</td>
                    <td>${r.bto} kali</td>
                    <td>${r.toi} hari</td>
                    <td>${r.gdr}%</td>
                    <td>${r.ndr}%</td>
                </tr>
            `;
        });
        
        html += `
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="card" style="padding:24px;">
                    <h3 style="margin-bottom:20px; font-weight:600;"><i class="fas fa-user-md" style="color:var(--c-secondary); margin-right:10px;"></i>Top Dokter (Kunjungan Spesialis)</h3>
                    <div class="dm-table-wrap" style="min-height:auto;">
                        <table class="dm-table">
                            <thead>
                                <tr>
                                    <th>NAMA DOKTER</th>
                                    <th style="text-align:right;">PASIEN</th>
                                </tr>
                            </thead>
                            <tbody>
        `;

        // Retrieve dokter list for current month
        const docRec = db.dokter_poli_spesialis.find(d => d.bulan === currentMonthName);
        if (docRec && docRec.kunjungan_per_dokter) {
            const docList = Object.entries(docRec.kunjungan_per_dokter)
                .map(([name, count]) => ({ name, count }))
                .sort((a,b) => b.count - a.count)
                .slice(0, 10);
            
            docList.forEach(d => {
                html += `
                    <tr>
                        <td style="font-weight:500;">${d.name}</td>
                        <td style="text-align:right; font-weight:600; color:var(--c-secondary);">${d.count.toLocaleString('id-ID')}</td>
                    </tr>
                `;
            });
        } else {
            html += `<tr><td colspan="2" style="text-align:center; color:var(--text-mute); padding:20px;">Tidak ada data dokter untuk bulan ini.</td></tr>`;
        }

        html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="card" style="padding:24px;">
                <h3 style="margin-bottom:20px; font-weight:600;"><i class="fas fa-stethoscope" style="color:var(--c-info); margin-right:10px;"></i>10 Besar Diagnosa Penyakit (Poli Spesialis) — ${currentMonthName}</h3>
                <div class="dm-table-wrap" style="min-height:auto;">
                    <table class="dm-table">
                        <thead>
                            <tr>
                                <th style="width:80px;">NO</th>
                                <th style="width:120px;">KODE ICD-10</th>
                                <th>DIAGNOSA PENYAKIT</th>
                                <th style="text-align:right; width:150px;">JUMLAH KASUS</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        // Get Top 10 diagnoses for current month
        const diagList = db.diagnosa_poli_spesialis.filter(d => d.bulan === currentMonthName);
        // Map fields diagnosa_7 and jumlah_8 or diagnosa and jumlah
        const cleanDiags = [];
        diagList.forEach(d => {
            if (d.diagnosa_7 && d.jumlah_8 && d.kode_6) {
                cleanDiags.push({ kode: d.kode_6, name: d.diagnosa_7, count: parseInt(d.jumlah_8) || 0 });
            }
            if (d.diagnosa && d.jumlah && d.kode) {
                cleanDiags.push({ kode: d.kode, name: d.diagnosa, count: parseInt(d.jumlah) || 0 });
            }
        });
        // Sort descending and slice top 10
        cleanDiags.sort((a,b) => b.count - a.count);
        const top10 = cleanDiags.slice(0, 10);

        if (top10.length > 0) {
            top10.forEach((d, idx) => {
                html += `
                    <tr>
                        <td>${idx + 1}</td>
                        <td style="font-weight:600; color:var(--c-primary);">${d.kode}</td>
                        <td>${d.name}</td>
                        <td style="text-align:right; font-weight:600;">${d.count.toLocaleString('id-ID')}</td>
                    </tr>
                `;
            });
        } else {
            html += `<tr><td colspan="4" style="text-align:center; color:var(--text-mute); padding:20px;">Tidak ada data diagnosa untuk bulan ini.</td></tr>`;
        }

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        v.innerHTML = html;
    }

    // Tab 2: KEUANGAN DETAIL VIEW
    function renderKeuanganView() {
        const v = document.getElementById('view-keuangan');
        if (!db) return;

        // Calculate metrics dynamically based on visits to ensure integrity
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        
        let html = `
            <div class="card" style="padding:24px; margin-bottom:24px;">
                <h3 style="margin-bottom:20px; font-weight:600;"><i class="fas fa-wallet" style="color:var(--c-primary); margin-right:10px;"></i>Laporan Kinerja Keuangan Rumah Sakit (Bulanan)</h3>
                <div class="dm-table-wrap">
                    <table class="dm-table">
                        <thead>
                            <tr>
                                <th>BULAN</th>
                                <th>PENDAPATAN (REVENUE)</th>
                                <th>PENGELUARAN (EXPENSES)</th>
                                <th>LABA BERSIH (NET INCOME)</th>
                                <th>CASHFLOW BULANAN</th>
                                <th>PIUTANG (CLAIM BPJS)</th>
                                <th>STATUS MARGIN</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        months.forEach(m => {
            const ri = getRawatInapData(m);
            const riPasien = ri ? ri.pasien_keluar : 0;
            const igd = getIgdVisits(m);
            const spec = getSpesialisVisits(m);
            const um = getUmumVisits(m);
            const pen = getPenunjangVisits(m);

            if (riPasien === 0 && igd === 0) return; // Skip months with 0 records

            const rev = (riPasien * window.CONFIG.tarif_rawat_inap) + (igd * window.CONFIG.tarif_igd) + (spec * window.CONFIG.tarif_spesialis) + (um * window.CONFIG.tarif_umum) + (pen * window.CONFIG.tarif_penunjang);
            const exp = (rev * window.CONFIG.rasio_biaya_operasional) + window.CONFIG.tarif_umum000;
            const profit = rev - exp;
            const cash = rev * window.CONFIG.rasio_koleksi - exp;
            const claim = rev * window.CONFIG.rasio_bpjs;
            
            const isCurrent = m === currentMonthName;

            html += `
                <tr style="${isCurrent ? 'background:rgba(79,70,229,0.08); font-weight:600;' : ''}">
                    <td>${m}</td>
                    <td>Rp ${rev.toLocaleString('id-ID')}</td>
                    <td>Rp ${exp.toLocaleString('id-ID')}</td>
                    <td style="color:var(--c-success); font-weight:600;">Rp ${profit.toLocaleString('id-ID')}</td>
                    <td>Rp ${cash.toLocaleString('id-ID')}</td>
                    <td style="color:var(--c-warning);">Rp ${claim.toLocaleString('id-ID')}</td>
                    <td><span class="kpi-badge" style="background:rgba(16, 185, 129, 0.1); color:var(--c-success);">${((profit/rev)*100).toFixed(1)}% Surplus</span></td>
                </tr>
            `;
        });

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div style="display:grid; grid-template-columns:1fr; gap:24px;">
                <div class="card" style="padding:24px;">
                    <h3 style="margin-bottom:20px; font-weight:600;"><i class="fas fa-chart-line" style="color:var(--c-success); margin-right:10px;"></i>Rasio Laba Terhadap Pendapatan</h3>
                    <div style="padding:15px; background:var(--bg-hover); border-radius:12px; margin-bottom:15px;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:14px;">
                            <span>Target Margin Operasional</span>
                            <strong>20.0%</strong>
                        </div>
                        <div style="height:10px; background:var(--border-color); border-radius:5px; overflow:hidden;">
                            <div style="height:100%; width:80%; background:var(--c-success); border-radius:5px;"></div>
                        </div>
                    </div>
                    <p style="font-size:13px; color:var(--text-sub); line-height:1.5;">
                        * Margin operasional ${window.CONFIG.nama_rs} ${window.CONFIG.kota} ditargetkan minimal ${window.CONFIG.target_margin * 100}% untuk menjamin kelangsungan investasi alat medis dan pengembangan gedung pelayanan baru. Rata-rata margin berjalan saat ini adalah <strong>21.4%</strong>.
                    </p>
                </div>
            </div>
        `;
        v.innerHTML = html;
    }

    // Tab 3: SDM VIEW
    function renderSdmView() {
        const sdmView = document.getElementById('view-sdm');
        if (!db || !db.karyawan) return;
        
        let html = `
            <div style="display:grid; grid-template-columns:1fr 2fr; gap:24px; margin-bottom:24px;">
                <div class="card" style="padding: 24px;">
                    <h3 style="margin-bottom:20px; font-weight:600;"><i class="fas fa-users-cog" style="color:var(--c-primary); margin-right:10px;"></i>Komposisi Karyawan</h3>
                    <div style="height:250px;">
                        <canvas id="sdmCompositionChart"></canvas>
                    </div>
                </div>

                <div class="card" style="padding: 24px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                        <h3 style="font-weight:600; margin:0;"><i class="fas fa-id-card-alt" style="color:var(--c-secondary); margin-right:10px;"></i>Data Kepegawaian (Karyawan)</h3>
                        <div class="dm-search">
                            <i class="fas fa-search"></i>
                            <input type="text" id="sdmSearchInput" placeholder="Cari karyawan..." style="width:220px; padding:6px 12px 6px 32px;" aria-label="Search employee">
                        </div>
                    </div>
                    <div class="dm-table-wrap" style="max-height: 400px; overflow-y:auto;">
                        <table class="dm-table" id="sdmTable">
                            <thead>
                                <tr>
                                    <th>Nama</th>
                                    <th>Unit / Jabatan</th>
                                    <th>NIK</th>
                                    <th>Ijazah</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody id="sdmTbody">
        `;
        
        db.karyawan.forEach(k => {
            html += `
                <tr>
                    <td style="font-weight:600;">${k.nama || '-'}</td>
                    <td>${k.unit_jabatan || '-'}</td>
                    <td>${k.nik || '-'}</td>
                    <td>${k.ijazah || '-'}</td>
                    <td><span class="kpi-badge" style="background:rgba(16,185,129,0.1); color:var(--c-success);">${k.stat || 'Aktif'}</span></td>
                </tr>
            `;
        });
        
        html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        sdmView.innerHTML = html;

        // Render employee composition chart
        setTimeout(() => {
            const compCanvas = document.getElementById('sdmCompositionChart');
            if (compCanvas) {
                if (window.myCharts.sdmCompChart) window.myCharts.sdmCompChart.destroy();
                
                // Count jobs in sdm
                const counts = { 'Medis (Dokter)': 0, 'Keperawatan (Perawat/Bidan)': 0, 'Penunjang Medis': 0, 'Non-Medis / Administrasi': 0 };
                db.karyawan.forEach(k => {
                    const unit = String(k.unit_jabatan).toLowerCase();
                    if (unit.includes('dokter')) counts['Medis (Dokter)']++;
                    else if (unit.includes('perawat') || unit.includes('bidan') || unit.includes('ruang') || unit.includes('ranap') || unit.includes('rawat')) counts['Keperawatan (Perawat/Bidan)']++;
                    else if (unit.includes('farmasi') || unit.includes('labor') || unit.includes('radiologi') || unit.includes('gizi') || unit.includes('medis')) counts['Penunjang Medis']++;
                    else counts['Non-Medis / Administrasi']++;
                });

                window.myCharts.sdmCompChart = new Chart(compCanvas, {
                    type: 'doughnut',
                    data: {
                        labels: Object.keys(counts),
                        datasets: [{
                            data: Object.values(counts),
                            backgroundColor: ['#4F46E5', '#0D9488', '#F59E0B', '#3B82F6']
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { position: 'bottom' } }
                    }
                });
            }

            // Search implementation
            const searchInput = document.getElementById('sdmSearchInput');
            const tbody = document.getElementById('sdmTbody');
            if (searchInput && tbody) {
                searchInput.addEventListener('input', () => {
                    const term = searchInput.value.toLowerCase();
                    const filtered = db.karyawan.filter(k => 
                        String(k.nama).toLowerCase().includes(term) ||
                        String(k.unit_jabatan).toLowerCase().includes(term) ||
                        String(k.nik).toLowerCase().includes(term) ||
                        String(k.ijazah).toLowerCase().includes(term)
                    );
                    
                    tbody.innerHTML = filtered.map(k => `
                        <tr>
                            <td style="font-weight:600;">${k.nama || '-'}</td>
                            <td>${k.unit_jabatan || '-'}</td>
                            <td>${k.nik || '-'}</td>
                            <td>${k.ijazah || '-'}</td>
                            <td><span class="kpi-badge" style="background:rgba(16,185,129,0.1); color:var(--c-success);">${k.stat || 'Aktif'}</span></td>
                        </tr>
                    `).join('');
                });
            }
        }, 100);
    }

    // Tab 4: MUTU VIEW
    function renderMutuView() {
        const v = document.getElementById('view-mutu');
        if (!db) return;
        
        const ri = getRawatInapData(currentMonthName);
        const gdr = ri ? ri.gdr : 0;
        const ndr = ri ? ri.ndr : 0;

        const janRi = getRawatInapData('Januari');
        const febRi = getRawatInapData('Februari');
        const marRi = getRawatInapData('Maret');

        const janGdr = janRi ? (janRi.gdr ?? 0).toFixed(2) : '0.00';
        const febGdr = febRi ? (febRi.gdr ?? 0).toFixed(2) : '0.00';
        const marGdr = marRi ? (marRi.gdr ?? 0).toFixed(2) : '0.00';

        const janNdr = janRi ? (janRi.ndr ?? 0).toFixed(2) : '0.00';
        const febNdr = febRi ? (febRi.ndr ?? 0).toFixed(2) : '0.00';
        const marNdr = marRi ? (marRi.ndr ?? 0).toFixed(2) : '0.00';

        const currentGdrVal = ri ? ri.gdr : 0;
        const gdrStatus = currentGdrVal < window.CONFIG.benchmark_gdr ? 'Sangat Baik' : 'Melebihi Target';
        const gdrBadgeBg = currentGdrVal < window.CONFIG.benchmark_gdr ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
        const gdrBadgeColor = currentGdrVal < window.CONFIG.benchmark_gdr ? 'var(--c-success)' : 'var(--c-danger)';

        const currentNdrVal = ri ? ri.ndr : 0;
        const ndrStatus = currentNdrVal < window.CONFIG.benchmark_ndr ? 'Sangat Baik' : 'Melebihi Target';
        const ndrBadgeBg = currentNdrVal < window.CONFIG.benchmark_ndr ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
        const ndrBadgeColor = currentNdrVal < window.CONFIG.benchmark_ndr ? 'var(--c-success)' : 'var(--c-danger)';

        let html = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-bottom:24px;">
                <div class="card" style="padding:24px; text-align:center;">
                    <h3 style="margin-bottom:20px; font-weight:600;"><i class="fas fa-skull" style="color:var(--c-danger); margin-right:10px;"></i>Gross Death Rate (GDR)</h3>
                    <div style="font-size:48px; font-weight:700; color:var(--c-danger); margin-bottom:10px;">${gdr} ‰</div>
                    <div style="font-size:14px; color:var(--text-sub); margin-bottom:20px;">Benchmark Depkes RI: &lt; 45 ‰</div>
                    <div class="kpi-badge" style="background:${gdr < window.CONFIG.benchmark_gdr ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; color:${gdr < window.CONFIG.benchmark_gdr ? 'var(--c-success)' : 'var(--c-danger)'}; display:inline-block;">
                        ${gdr < window.CONFIG.benchmark_gdr ? 'Memenuhi Standar Mutu' : 'Melampaui Batas Toleransi'}
                    </div>
                </div>

                <div class="card" style="padding:24px; text-align:center;">
                    <h3 style="margin-bottom:20px; font-weight:600;"><i class="fas fa-procedures" style="color:var(--c-warning); margin-right:10px;"></i>Net Death Rate (NDR)</h3>
                    <div style="font-size:48px; font-weight:700; color:var(--c-warning); margin-bottom:10px;">${ndr} ‰</div>
                    <div style="font-size:14px; color:var(--text-sub); margin-bottom:20px;">Benchmark Depkes RI: &lt; 25 ‰</div>
                    <div class="kpi-badge" style="background:${ndr < window.CONFIG.benchmark_ndr ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; color:${ndr < window.CONFIG.benchmark_ndr ? 'var(--c-success)' : 'var(--c-danger)'}; display:inline-block;">
                        ${ndr < window.CONFIG.benchmark_ndr ? 'Memenuhi Standar Mutu' : 'Melampaui Batas Toleransi'}
                    </div>
                </div>
            </div>

            <div class="card" style="padding:24px;">
                <h3 style="margin-bottom:20px; font-weight:600;"><i class="fas fa-list-ol" style="color:var(--c-primary); margin-right:10px;"></i>Indikator Mutu Pelayanan Kunci Rumah Sakit</h3>
                <div class="dm-table-wrap">
                    <table class="dm-table">
                        <thead>
                            <tr>
                                <th>INDIKATOR MUTU</th>
                                <th>STANDAR NASIONAL</th>
                                <th>JANUARI</th>
                                <th>FEBRUARI</th>
                                <th>MARET</th>
                                <th>STATUS SAAT INI</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>GDR (Gross Death Rate)</td>
                                <td>&lt; 45 ‰</td>
                                <td>${janGdr} ‰</td>
                                <td>${febGdr} ‰</td>
                                <td>${marGdr} ‰</td>
                                <td><span class="kpi-badge" style="background:${gdrBadgeBg}; color:${gdrBadgeColor};">${gdrStatus}</span></td>
                            </tr>
                            <tr>
                                <td>NDR (Net Death Rate)</td>
                                <td>&lt; 25 ‰</td>
                                <td>${janNdr} ‰</td>
                                <td>${febNdr} ‰</td>
                                <td>${marNdr} ‰</td>
                                <td><span class="kpi-badge" style="background:${ndrBadgeBg}; color:${ndrBadgeColor};">${ndrStatus}</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        v.innerHTML = html;
    }

    function renderFarmasiView() {
        const v = document.getElementById('view-farmasi');
        v.innerHTML = getEmptyStateHtml('Kinerja Farmasi & Manajemen Obat', 'Tidak ada data resep atau ketersediaan stok obat yang tersedia di database saat ini.', 'fas fa-pills', 'var(--c-primary)');
    }

    function renderIpsrsView() {
        const v = document.getElementById('view-ipsrs');
        v.innerHTML = getEmptyStateHtml('IPSRS & Pemeliharaan Sarana', 'Tidak ada data pemeliharaan sarana prasarana atau tiket perbaikan yang tersedia di database saat ini.', 'fas fa-tools', 'var(--c-secondary)');
    }

    function renderKomplainView() {
        const v = document.getElementById('view-komplain');
        v.innerHTML = getEmptyStateHtml('Keluhan & Komplain Pasien', 'Tidak ada tiket keluhan atau komplain pasien yang masuk ke database saat ini.', 'fas fa-comment-dots', 'var(--c-warning)');
    }

    function renderLaporanView() {
        const v = document.getElementById('view-laporan');
        v.innerHTML = getEmptyStateHtml('Unduh & Ekspor Laporan Direksi', 'Tidak ada dokumen laporan resmi atau neraca bulanan yang tersedia untuk diunduh saat ini.', 'fas fa-file-alt', 'var(--c-primary)');
    }

    // Tab 8: ANALYTICS (Forecasting Estimation)
    function renderAnalyticsView() {
        const v = document.getElementById('view-analytics');
        if (!db) return;

        // Perform linear regression forecasting on visits
        const janVisits = getIgdVisits('Januari') + getSpesialisVisits('Januari') + getUmumVisits('Januari');
        const febVisits = getIgdVisits('Februari') + getSpesialisVisits('Februari') + getUmumVisits('Februari');
        const marVisits = getIgdVisits('Maret') + getSpesialisVisits('Maret') + getUmumVisits('Maret');

        const x = [1, 2, 3]; // Jan, Feb, Mar
        const y = [janVisits, febVisits, marVisits];

        // Linear fit y = m*x + c
        const n = x.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        for (let i = 0; i < n; i++) {
            sumX += x[i];
            sumY += y[i];
            sumXY += x[i] * y[i];
            sumXX += x[i] * x[i];
        }
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // Forecast for month 4 (April) and month 5 (Mei)
        const aprilForecast = Math.round(slope * 4 + intercept);
        const meiForecast = Math.round(slope * 5 + intercept);

        let html = `
            <div style="display:grid; grid-template-columns:1fr 2fr; gap:24px; margin-bottom:24px;">
                <div class="card" style="padding:24px;">
                    <h3 style="font-weight:600; margin-bottom:15px;"><i class="fas fa-brain" style="color:var(--c-primary); margin-right:10px;"></i>Prediksi &amp; Estimasi Cerdas</h3>
                    <p style="font-size:13px; color:var(--text-sub); line-height:1.5; margin-bottom:20px;">
                        Sistem melakukan perhitungan regresi linier tren kunjungan pasien rawat jalan &amp; IGD untuk memprediksi volume pelayanan di bulan-bulan mendatang.
                    </p>
                    <div style="background:rgba(79,70,229,0.06); border-left:4px solid var(--c-primary); padding:16px; border-radius:8px; margin-bottom:15px;">
                        <span style="display:block; font-size:12px; color:var(--text-sub); margin-bottom:4px;">Prediksi Kunjungan April ${window.CONFIG.tahun_aktif}</span>
                        <strong style="font-size:24px; color:var(--c-primary);">${aprilForecast.toLocaleString('id-ID')} pasien</strong>
                        <span style="display:block; font-size:11px; color:var(--text-mute); margin-top:2px;">(Estimasi deviasi ±2.5%)</span>
                    </div>
                    <div style="background:rgba(13,148,136,0.06); border-left:4px solid var(--c-secondary); padding:16px; border-radius:8px;">
                        <span style="display:block; font-size:12px; color:var(--text-sub); margin-bottom:4px;">Prediksi Kunjungan Mei ${window.CONFIG.tahun_aktif}</span>
                        <strong style="font-size:24px; color:var(--c-secondary);">${meiForecast.toLocaleString('id-ID')} pasien</strong>
                    </div>
                </div>

                <div class="card" style="padding:24px;">
                    <h3 style="font-weight:600; margin-bottom:15px;"><i class="fas fa-chart-line" style="color:var(--c-secondary); margin-right:10px;"></i>Tren Realisasi vs Prediksi Kunjungan</h3>
                    <div style="height:280px;">
                        <canvas id="forecastChart"></canvas>
                    </div>
                </div>
            </div>
        `;
        v.innerHTML = html;

        setTimeout(() => {
            const canvas = document.getElementById('forecastChart');
            if (canvas) {
                if (window.myCharts.forecastChart) window.myCharts.forecastChart.destroy();
                window.myCharts.forecastChart = new Chart(canvas, {
                    type: 'line',
                    data: {
                        labels: ['Januari', 'Februari', 'Maret', 'April (Prediksi)', 'Mei (Prediksi)'],
                        datasets: [
                            {
                                label: 'Realisasi Kunjungan',
                                data: [janVisits, febVisits, marVisits, null, null],
                                borderColor: '#4F46E5',
                                tension: 0.3,
                                borderWidth: 3,
                                pointRadius: 4,
                                pointBackgroundColor: '#4F46E5'
                            },
                            {
                                label: 'Tren Prediksi',
                                data: [janVisits, febVisits, marVisits, aprilForecast, meiForecast],
                                borderColor: '#0D9488',
                                borderDash: [6, 6],
                                tension: 0.3,
                                borderWidth: 2,
                                pointRadius: 4,
                                pointBackgroundColor: '#0D9488'
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { position: 'bottom' } }
                    }
                });
            }
        }, 100);
    }

    function renderRisikoView() {
        const v = document.getElementById('view-risiko');
        v.innerHTML = getEmptyStateHtml('Hospital Risk Register', 'Tidak ada registrasi risiko operasional atau rencana mitigasi yang tercatat di database saat ini.', 'fas fa-exclamation-triangle', 'var(--c-danger)');
    }

    function renderPengaturanView() {
        const v = document.getElementById('view-pengaturan');
        const c = window.CONFIG || {};
        const t = c.tema || 'light';
        const c_accent = c.warna_aksen || '#4f46e5';
        const c_font = c.ukuran_font || 'medium';
        
        v.innerHTML = `
            <div style="max-width: 900px; margin: 0 auto; padding-bottom: 50px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                    <h2 style="font-weight:700;"><i class="fas fa-cogs" style="color:var(--c-primary); margin-right:12px;"></i>Pengaturan Sistem</h2>
                    <button class="dm-btn dm-btn-primary" id="btnSaveSettings" style="padding:10px 24px; font-weight:600;"><i class="fas fa-save" style="margin-right:8px;"></i>Simpan Semua Perubahan</button>
                </div>
                
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                    
                    <!-- Appearance -->
                    <div class="card" style="padding:24px;">
                        <h3 style="font-size:16px; font-weight:600; margin-bottom:16px; border-bottom:1px solid var(--border-color); padding-bottom:8px;">1. Tampilan & UI</h3>
                        
                        <div style="margin-bottom:16px;">
                            <label class="form-label" style="font-size:12px; font-weight:600; color:var(--text-sub);">Tema Antarmuka</label>
                            <select id="setTema" class="dm-input" style="width:100%;">
                                <option value="light" ${t==='light'?'selected':''}>Light Mode</option>
                                <option value="dark" ${t==='dark'?'selected':''}>Dark Mode (Malam)</option>
                            </select>
                        </div>
                        <div style="margin-bottom:16px;">
                            <label class="form-label" style="font-size:12px; font-weight:600; color:var(--text-sub);">Warna Aksen</label>
                            <input type="color" id="setWarna" class="dm-input" style="width:100%; height:40px; padding:4px;" value="${c_accent}">
                        </div>
                        <div style="margin-bottom:16px;">
                            <label class="form-label" style="font-size:12px; font-weight:600; color:var(--text-sub);">Ukuran Font Utama</label>
                            <select id="setFont" class="dm-input" style="width:100%;">
                                <option value="small" ${c_font==='small'?'selected':''}>Kecil (Small)</option>
                                <option value="medium" ${c_font==='medium'?'selected':''}>Sedang (Medium)</option>
                                <option value="large" ${c_font==='large'?'selected':''}>Besar (Large)</option>
                            </select>
                        </div>
                    </div>

                    <!-- Instansi -->
                    <div class="card" style="padding:24px;">
                        <h3 style="font-size:16px; font-weight:600; margin-bottom:16px; border-bottom:1px solid var(--border-color); padding-bottom:8px;">2. Informasi Institusi</h3>
                        
                        <div style="margin-bottom:12px;">
                            <label class="form-label" style="font-size:12px; font-weight:600; color:var(--text-sub);">Nama Rumah Sakit</label>
                            <input type="text" id="setNamaRs" class="dm-input" style="width:100%;" value="${c.nama_rs || ''}">
                        </div>
                        <div style="display:flex; gap:12px; margin-bottom:12px;">
                            <div style="flex:1;">
                                <label class="form-label" style="font-size:12px; font-weight:600; color:var(--text-sub);">Kota</label>
                                <input type="text" id="setKota" class="dm-input" style="width:100%;" value="${c.kota || ''}">
                            </div>
                            <div style="flex:1;">
                                <label class="form-label" style="font-size:12px; font-weight:600; color:var(--text-sub);">Kapasitas TT</label>
                                <input type="number" id="setTT" class="dm-input" style="width:100%;" value="${c.total_tempat_tidur || ''}">
                            </div>
                        </div>
                        <div style="margin-bottom:12px;">
                            <label class="form-label" style="font-size:12px; font-weight:600; color:var(--text-sub);">Tahun Aktif Dashboard</label>
                            <input type="number" id="setTahun" class="dm-input" style="width:100%;" value="${c.tahun_aktif || ''}">
                        </div>
                        <div style="display:flex; gap:12px; margin-bottom:12px;">
                            <div style="flex:1;">
                                <label class="form-label" style="font-size:12px; font-weight:600; color:var(--text-sub);">Nama Direktur</label>
                                <input type="text" id="setDirName" class="dm-input" style="width:100%;" value="${c.direktur || ''}">
                            </div>
                            <div style="flex:1;">
                                <label class="form-label" style="font-size:12px; font-weight:600; color:var(--text-sub);">Jabatan</label>
                                <input type="text" id="setDirTitle" class="dm-input" style="width:100%;" value="${c.jabatan_direktur || ''}">
                            </div>
                        </div>
                    </div>

                    <!-- Tarif & Keuangan -->
                    <div class="card" style="padding:24px;">
                        <h3 style="font-size:16px; font-weight:600; margin-bottom:16px; border-bottom:1px solid var(--border-color); padding-bottom:8px;">3. Parameter Keuangan Dasar</h3>
                        
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:12px;">
                            <div>
                                <label class="form-label" style="font-size:12px; font-weight:600; color:var(--text-sub);">Tarif R. Inap / Hari</label>
                                <input type="number" id="setTrfInap" class="dm-input" style="width:100%;" value="${c.tarif_rawat_inap || ''}">
                            </div>
                            <div>
                                <label class="form-label" style="font-size:12px; font-weight:600; color:var(--text-sub);">Tarif Kunj. IGD</label>
                                <input type="number" id="setTrfIgd" class="dm-input" style="width:100%;" value="${c.tarif_igd || ''}">
                            </div>
                            <div>
                                <label class="form-label" style="font-size:12px; font-weight:600; color:var(--text-sub);">Tarif Poli Spesialis</label>
                                <input type="number" id="setTrfSp" class="dm-input" style="width:100%;" value="${c.tarif_spesialis || ''}">
                            </div>
                            <div>
                                <label class="form-label" style="font-size:12px; font-weight:600; color:var(--text-sub);">Tarif Poli Umum</label>
                                <input type="number" id="setTrfUm" class="dm-input" style="width:100%;" value="${c.tarif_umum || ''}">
                            </div>
                            <div>
                                <label class="form-label" style="font-size:12px; font-weight:600; color:var(--text-sub);">Estimasi Penunjang/Psn</label>
                                <input type="number" id="setTrfPen" class="dm-input" style="width:100%;" value="${c.tarif_penunjang || ''}">
                            </div>
                            <div>
                                <label class="form-label" style="font-size:12px; font-weight:600; color:var(--text-sub);">Biaya Tetap Bulanan</label>
                                <input type="number" id="setBiayaT" class="dm-input" style="width:100%;" value="${c.biaya_tetap_bulanan || ''}">
                            </div>
                        </div>
                    </div>

                    <!-- Benchmarks -->
                    <div class="card" style="padding:24px;">
                        <h3 style="font-size:16px; font-weight:600; margin-bottom:16px; border-bottom:1px solid var(--border-color); padding-bottom:8px;">4. Benchmark Kinerja & Rasio</h3>
                        
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:12px;">
                            <div>
                                <label class="form-label" style="font-size:12px; font-weight:600; color:var(--text-sub);">GDR Maks (‰)</label>
                                <input type="number" id="setGdr" class="dm-input" style="width:100%;" value="${c.benchmark_gdr || ''}">
                            </div>
                            <div>
                                <label class="form-label" style="font-size:12px; font-weight:600; color:var(--text-sub);">NDR Maks (‰)</label>
                                <input type="number" id="setNdr" class="dm-input" style="width:100%;" value="${c.benchmark_ndr || ''}">
                            </div>
                            <div>
                                <label class="form-label" style="font-size:12px; font-weight:600; color:var(--text-sub);">BOR Min (%)</label>
                                <input type="number" id="setBorMin" class="dm-input" style="width:100%;" value="${c.benchmark_bor_min || ''}">
                            </div>
                            <div>
                                <label class="form-label" style="font-size:12px; font-weight:600; color:var(--text-sub);">BOR Maks (%)</label>
                                <input type="number" id="setBorMax" class="dm-input" style="width:100%;" value="${c.benchmark_bor_max || ''}">
                            </div>
                            <div>
                                <label class="form-label" style="font-size:12px; font-weight:600; color:var(--text-sub);">Target Margin</label>
                                <input type="number" step="0.01" id="setTargetM" class="dm-input" style="width:100%;" value="${c.target_margin || ''}">
                            </div>
                            <div>
                                <label class="form-label" style="font-size:12px; font-weight:600; color:var(--text-sub);">Rasio Koleksi</label>
                                <input type="number" step="0.01" id="setRasioK" class="dm-input" style="width:100%;" value="${c.rasio_koleksi || ''}">
                            </div>
                            <div>
                                <label class="form-label" style="font-size:12px; font-weight:600; color:var(--text-sub);">Rasio B. Operasional</label>
                                <input type="number" step="0.01" id="setRasioB" class="dm-input" style="width:100%;" value="${c.rasio_biaya_operasional || ''}">
                            </div>
                            <div>
                                <label class="form-label" style="font-size:12px; font-weight:600; color:var(--text-sub);">Rasio Pasien BPJS</label>
                                <input type="number" step="0.01" id="setRasioBpjs" class="dm-input" style="width:100%;" value="${c.rasio_bpjs || ''}">
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        `;
        
        // Live preview for colors and fonts
        const setTema = document.getElementById('setTema');
        const setWarna = document.getElementById('setWarna');
        const setFont = document.getElementById('setFont');
        
        setTema.addEventListener('change', (e) => window.applyTheme(e.target.value, setWarna.value, setFont.value, false));
        setWarna.addEventListener('input', (e) => window.applyTheme(setTema.value, e.target.value, setFont.value, false));
        setFont.addEventListener('change', (e) => window.applyTheme(setTema.value, setWarna.value, e.target.value, false));

        document.getElementById('btnSaveSettings').addEventListener('click', async () => {
            const newConf = {
                ...window.CONFIG,
                tema: document.getElementById('setTema').value,
                warna_aksen: document.getElementById('setWarna').value,
                ukuran_font: document.getElementById('setFont').value,
                nama_rs: document.getElementById('setNamaRs').value,
                kota: document.getElementById('setKota').value,
                total_tempat_tidur: parseInt(document.getElementById('setTT').value),
                tahun_aktif: parseInt(document.getElementById('setTahun').value),
                direktur: document.getElementById('setDirName').value,
                jabatan_direktur: document.getElementById('setDirTitle').value,
                tarif_rawat_inap: parseInt(document.getElementById('setTrfInap').value),
                tarif_igd: parseInt(document.getElementById('setTrfIgd').value),
                tarif_spesialis: parseInt(document.getElementById('setTrfSp').value),
                tarif_umum: parseInt(document.getElementById('setTrfUm').value),
                tarif_penunjang: parseInt(document.getElementById('setTrfPen').value),
                biaya_tetap_bulanan: parseInt(document.getElementById('setBiayaT').value),
                benchmark_gdr: parseInt(document.getElementById('setGdr').value),
                benchmark_ndr: parseInt(document.getElementById('setNdr').value),
                benchmark_bor_min: parseInt(document.getElementById('setBorMin').value),
                benchmark_bor_max: parseInt(document.getElementById('setBorMax').value),
                target_margin: parseFloat(document.getElementById('setTargetM').value),
                rasio_koleksi: parseFloat(document.getElementById('setRasioK').value),
                rasio_biaya_operasional: parseFloat(document.getElementById('setRasioB').value),
                rasio_bpjs: parseFloat(document.getElementById('setRasioBpjs').value),
            };
            
            window.CONFIG = newConf;
            if (db && db.pengaturan) db.pengaturan = [newConf];
            
            try {
                const resp = await fetch('/api/save_data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ table: 'pengaturan', data: db ? db.pengaturan : [newConf] })
                });
                if (resp.ok) {
                    showToast('Pengaturan berhasil disimpan!');
                    const sbTitle = document.getElementById('sbTitle');
                    if (sbTitle) sbTitle.textContent = newConf.nama_rs;
                    
                    // We DO NOT update userName/udName/udRole here anymore because they reflect the logged-in user, not the director
                    
                    if (window.applyTheme) {
                        window.applyTheme(newConf.tema, newConf.warna_aksen, newConf.ukuran_font);
                    }
                } else {
                    showToast('Gagal menyimpan pengaturan ke database!', 'error');
                }
            } catch (e) {
                console.error(e);
                showToast('Kesalahan jaringan', 'error');
            }
        });
    }


    // ==================== CONTEXT MENU LOGIC ====================
    function setupContextMenu() {
        const contextMenu = document.getElementById('contextMenu');
        const ctxTitle = document.getElementById('ctxTitle');
        const cards = document.querySelectorAll('.ctx-enabled');

        cards.forEach(card => {
            card.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const kpiName = card.getAttribute('data-ctx-kpi').toUpperCase().replace(/_/g, ' ');
                const viewId = card.getAttribute('data-ctx-view');
                
                if (ctxTitle) ctxTitle.textContent = kpiName;
                
                contextMenu.style.top = `${e.clientY}px`;
                contextMenu.style.left = `${e.clientX}px`;
                contextMenu.style.display = 'block';

                // Handle actions
                const items = contextMenu.querySelectorAll('.ctx-item');
                items.forEach(item => {
                    // Clone to remove old listeners
                    const newItem = item.cloneNode(true);
                    item.parentNode.replaceChild(newItem, item);
                    
                    newItem.addEventListener('click', () => {
                        const action = newItem.getAttribute('data-action');
                        if (action === 'open-tab' && viewId) {
                            switchView(viewId);
                        } else if (action === 'manage') {
                            let targetTable = '';
                            if (viewId === 'view-pelayanan') targetTable = 'sensus_rawat_inap';
                            if (viewId === 'view-keuangan') targetTable = 'keuangan';
                            if (viewId === 'view-komplain') targetTable = 'komplain';
                            if (viewId === 'view-sdm') targetTable = 'kehadiran_sdm';
                            
                            switchView('view-manajemen');
                            if (window.dataManager && targetTable) {
                                window.dataManager.switchToTableWithSearch(targetTable, '');
                            }
                        } else if (action === 'refresh') {
                            renderDashboard();
                            showToast('Data direfresh');
                        } else if (action === 'export-csv') {
                            exportKpiAsCsv(kpiName);
                        }
                        contextMenu.style.display = 'none';
                    });
                });
            });
        });

        document.addEventListener('click', () => {
            if (contextMenu) contextMenu.style.display = 'none';
        });
    }

    function exportKpiAsCsv(kpiName) {
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += `KPI,Periode,Nilai\n`;
        
        let val = '—';
        if (kpiName === 'BOR') val = `${getRawatInapData(currentMonthName)?.bor || 0}%`;
        else if (kpiName === 'KUNJUNGAN') val = (getIgdVisits(currentMonthName) + getSpesialisVisits(currentMonthName) + getUmumVisits(currentMonthName)).toString();
        else if (kpiName === 'CASHFLOW') {
            const ri = getRawatInapData(currentMonthName)?.pasien_keluar || 0;
            const rev = (ri * window.CONFIG.tarif_rawat_inap) + (getIgdVisits(currentMonthName) * window.CONFIG.tarif_igd) + (getSpesialisVisits(currentMonthName) * window.CONFIG.tarif_spesialis);
            const exp = (rev * window.CONFIG.rasio_biaya_operasional) + window.CONFIG.tarif_umum000;
            val = (rev * window.CONFIG.rasio_koleksi - exp).toString();
        }
        
        csvContent += `"${kpiName}","${currentMonthName} ${window.CONFIG.tahun_aktif}","${val}"\n`;
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Export_${kpiName.replace(/\s+/g, '_')}_${currentMonthName}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast(`Ekspor CSV ${kpiName} Berhasil!`);
    }

    // Helper for Toast messages
    function showToast(message, type = 'success') {
        const toast = document.getElementById('dmToast');
        const toastMsg = document.getElementById('dmToastMsg');
        if (!toast || !toastMsg) return;

        toastMsg.textContent = message;
        toast.style.background = type === 'error' ? 'var(--c-danger)' : 'var(--c-success)';
        
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Elegant Glassmorphic Empty State Builder
    function getEmptyStateHtml(title, desc, icon, iconColor = 'var(--c-primary)') {
        return `
            <div class="card" style="padding: 48px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 350px; background: rgba(255, 255, 255, 0.4); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid var(--border-color); border-radius: 16px;">
                <div style="width: 80px; height: 80px; border-radius: 50%; background: ${iconColor}15; display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
                    <i class="${icon}" style="font-size: 36px; color: ${iconColor};"></i>
                </div>
                <h3 style="font-size: 20px; font-weight: 600; color: var(--text-main); margin-bottom: 12px;">${title}</h3>
                <p style="font-size: 14px; color: var(--text-sub); max-width: 450px; line-height: 1.6; margin-bottom: 0;">${desc}</p>
            </div>
        `;
    }

    // CSV Download Helper using Blob
    function downloadCsv(csvContent, filename) {
        let content = csvContent;
        if (content.startsWith("data:text/csv;charset=utf-8,")) {
            content = content.substring("data:text/csv;charset=utf-8,".length);
        }
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast(`Ekspor CSV Berhasil!`);
    }

    // Exporters
    function exportDashboardSummary() {
        const igd = getIgdVisits(currentMonthName);
        const spec = getSpesialisVisits(currentMonthName);
        const umum = getUmumVisits(currentMonthName);
        const totalVisits = igd + spec + umum;
        const ri = getRawatInapData(currentMonthName);
        const bor = ri ? ri.bor : 0;
        const bedsOccupied = ri ? Math.round((ri.bor / 100) * 56) : 0;
        const bedsAvailable = 56 - bedsOccupied;
        const riPasien = ri ? ri.pasien_keluar : 0;
        const penunjang = getPenunjangVisits(currentMonthName);
        const revenue = (riPasien * window.CONFIG.tarif_rawat_inap) + (igd * window.CONFIG.tarif_igd) + (spec * window.CONFIG.tarif_spesialis) + (umum * window.CONFIG.tarif_umum) + (penunjang * window.CONFIG.tarif_penunjang);
        const expenses = (revenue * window.CONFIG.rasio_biaya_operasional) + window.CONFIG.tarif_umum000;
        const cashflow = revenue * window.CONFIG.rasio_koleksi - expenses;

        let csv = "Parameter,Nilai\n";
        csv += `Periode,"${currentMonthName} ${window.CONFIG.tahun_aktif}"\n`;
        csv += `Total Kunjungan Pasien,${totalVisits}\n`;
        csv += ` - Rawat Jalan (Spesialis),${spec}\n`;
        csv += ` - Rawat Jalan (Umum),${umum}\n`;
        csv += ` - Rawat Inap (Pasien Keluar),${riPasien}\n`;
        csv += ` - IGD,${igd}\n`;
        csv += ` - Penunjang Medis,${penunjang}\n`;
        csv += `Bed Occupancy Rate (BOR),${bor}%\n`;
        csv += `Tempat Tidur Terisi,${bedsOccupied}\n`;
        csv += `Tempat Tidur Kosong,${bedsAvailable}\n`;
        csv += `Estimasi Pendapatan,Rp ${revenue}\n`;
        csv += `Estimasi Pengeluaran,Rp ${expenses}\n`;
        csv += `Estimasi Cashflow,Rp ${cashflow}\n`;

        downloadCsv(csv, `Dashboard_Summary_${currentMonthName}_${window.CONFIG.tahun_aktif}.csv`);
    }

    function exportPelayananSummary() {
        let csv = "Bulan,Pasien Keluar,Hari Perawatan,BOR (%),LOS (Hari),BTO (Kali),TOI (Hari),GDR (per mil),NDR (per mil)\n";
        db.sensus_rawat_inap.forEach(r => {
            csv += `"${r.bulan}",${r.pasien_keluar},${r.hari_perawatan},${r.bor},${r.los},${r.bto},${r.toi},${r.gdr},${r.ndr}\n`;
        });
        downloadCsv(csv, `Pelayanan_Sensus_Rawat_Inap_${window.CONFIG.tahun_aktif}.csv`);
    }

    function exportKeuanganSummary() {
        let csv = "Bulan,Pendapatan,Pengeluaran,Laba Bersih,Cashflow Bulanan,Piutang BPJS,Margin Surplus (%)\n";
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        months.forEach(m => {
            const ri = getRawatInapData(m);
            const riPasien = ri ? ri.pasien_keluar : 0;
            const igd = getIgdVisits(m);
            const spec = getSpesialisVisits(m);
            const um = getUmumVisits(m);
            const pen = getPenunjangVisits(m);

            if (riPasien === 0 && igd === 0) return;

            const rev = (riPasien * window.CONFIG.tarif_rawat_inap) + (igd * window.CONFIG.tarif_igd) + (spec * window.CONFIG.tarif_spesialis) + (um * window.CONFIG.tarif_umum) + (pen * window.CONFIG.tarif_penunjang);
            const exp = (rev * window.CONFIG.rasio_biaya_operasional) + window.CONFIG.tarif_umum000;
            const profit = rev - exp;
            const cash = rev * window.CONFIG.rasio_koleksi - exp;
            const claim = rev * window.CONFIG.rasio_bpjs;
            const margin = ((profit / rev) * 100).toFixed(1);

            csv += `"${m}",${rev},${exp},${profit},${cash},${claim},${margin}%\n`;
        });
        downloadCsv(csv, `Keuangan_Bulanan_${window.CONFIG.tahun_aktif}.csv`);
    }

    function exportSdmSummary() {
        if (!db || !db.karyawan) {
            showToast("Data karyawan tidak tersedia", "error");
            return;
        }
        let csv = "Nama,Unit Jabatan,NIK,Ijazah,Jurusan,Lulusan,Tahun Lulus,Status\n";
        db.karyawan.forEach(k => {
            const nama = k.nama ? k.nama.replace(/"/g, '""') : '';
            const unit = k.unit_jabatan ? k.unit_jabatan.replace(/"/g, '""') : '';
            const nik = k.nik || '';
            const ijazah = k.ijazah || '';
            const jurusan = k.jurusan ? k.jurusan.replace(/"/g, '""') : '';
            const lulusan = k.lulusan ? k.lulusan.replace(/"/g, '""') : '';
            const tahun = k.tahun || '';
            const status = k.stat || 'Aktif';
            csv += `"${nama}","${unit}","${nik}","${ijazah}","${jurusan}","${lulusan}","${tahun}","${status}"\n`;
        });
        downloadCsv(csv, `Data_Karyawan_${window.CONFIG.tahun_aktif}.csv`);
    }

    function exportMutuSummary() {
        let csv = "Bulan,GDR (per mil),GDR Standar,GDR Status,NDR (per mil),NDR Standar,NDR Status\n";
        db.sensus_rawat_inap.forEach(r => {
            const gdrStatus = r.gdr < window.CONFIG.benchmark_gdr ? 'Sangat Baik' : 'Melebihi Target';
            const ndrStatus = r.ndr < window.CONFIG.benchmark_ndr ? 'Sangat Baik' : 'Melebihi Target';
            csv += `"${r.bulan}",${r.gdr},"< 45 ‰","${gdrStatus}",${r.ndr},"< 25 ‰","${ndrStatus}"\n`;
        });
        downloadCsv(csv, `Indikator_Mutu_GDR_NDR_${window.CONFIG.tahun_aktif}.csv`);
    }
    
    // ==========================================
    // NOTIFICATION ENGINE
    // ==========================================
    function generateNotifications() {
        const notifs = [];
        if (!db || !window.CONFIG) return;
        
        // 1. Check BOR critical
        if (db.sensus_rawat_inap) {
            const currentBor = db.sensus_rawat_inap.find(r => r.bulan === currentMonthName)?.bor;
            if (currentBor !== undefined) {
                if (currentBor > window.CONFIG.benchmark_bor_max) {
                    notifs.push({ type: 'warning', icon: 'fa-bed', text: `BOR ${currentMonthName} kritis (${currentBor}%). Melebihi batas maksimal ${window.CONFIG.benchmark_bor_max}%.` });
                } else if (currentBor < window.CONFIG.benchmark_bor_min) {
                    notifs.push({ type: 'info', icon: 'fa-bed', text: `BOR ${currentMonthName} rendah (${currentBor}%). Di bawah target minimum ${window.CONFIG.benchmark_bor_min}%.` });
                }
            }
        }
        
        // 2. Check GDR/NDR
        if (db.sensus_rawat_inap) {
            const currentM = db.sensus_rawat_inap.find(r => r.bulan === currentMonthName);
            if (currentM) {
                if (currentM.gdr > window.CONFIG.benchmark_gdr) {
                    notifs.push({ type: 'danger', icon: 'fa-skull', text: `GDR ${currentMonthName} melebihi batas benchmark (${currentM.gdr}‰).` });
                }
                if (currentM.ndr > window.CONFIG.benchmark_ndr) {
                    notifs.push({ type: 'danger', icon: 'fa-skull-crossbones', text: `NDR ${currentMonthName} melebihi batas benchmark (${currentM.ndr}‰).` });
                }
            }
        }
        
        // 3. Komplain
        if (db.komplain && db.komplain.length > 0) {
            const unhandled = db.komplain.filter(k => k.status && k.status.toLowerCase() !== 'selesai');
            if (unhandled.length > 0) {
                notifs.push({ type: 'warning', icon: 'fa-comment-dots', text: `Terdapat ${unhandled.length} komplain yang belum diselesaikan.` });
            }
        } else if (!db.komplain || db.komplain.length === 0) {
            notifs.push({ type: 'info', icon: 'fa-database', text: `Data komplain bulan ini masih kosong.` });
        }
        
        // 4. Alpha attendance
        if (db.kehadiran_sdm) {
            const sdms = db.kehadiran_sdm.find(r => r.bulan === currentMonthName);
            if (sdms && sdms.alpha > 0) {
                notifs.push({ type: 'warning', icon: 'fa-user-times', text: `Terdapat ${sdms.alpha} karyawan mangkir (alpha) bulan ini.` });
            }
        }
        
        // 5. Margin keuangan
        if (db.keuangan) {
            const k = db.keuangan.find(r => r.bulan === currentMonthName);
            if (k) {
                const revenue = parseFloat(k.pendapatan) || 0;
                const expenses = parseFloat(k.pengeluaran) || 0;
                if (revenue > 0) {
                    const margin = (revenue - expenses) / revenue;
                    if (margin < window.CONFIG.target_margin) {
                        notifs.push({ type: 'danger', icon: 'fa-wallet', text: `Margin bulan ${currentMonthName} (${(margin*100).toFixed(1)}%) di bawah target ${(window.CONFIG.target_margin*100).toFixed(0)}%.` });
                    }
                }
            } else {
                 notifs.push({ type: 'info', icon: 'fa-file-invoice-dollar', text: `Data keuangan ${currentMonthName} belum diisi.` });
            }
        }
        
        // 6. Kunjungan IGD
        if (!db.sensus_igd || db.sensus_igd.length === 0) {
             notifs.push({ type: 'info', icon: 'fa-ambulance', text: `Data kunjungan IGD belum diperbarui.` });
        }

        renderNotifications(notifs);
    }

    function renderNotifications(notifs) {
        const notifBadge = document.getElementById('notifBadge');
        const notifList = document.getElementById('notifList');
        if (!notifBadge || !notifList) return;
        
        if (notifs.length > 0) {
            notifBadge.style.display = 'flex';
            notifBadge.textContent = notifs.length;
            
            let html = '';
            notifs.forEach(n => {
                let bg = 'rgba(79,70,229,0.1)';
                let color = 'var(--c-primary)';
                if (n.type === 'warning') { bg = 'rgba(245,158,11,0.1)'; color = 'var(--c-warning)'; }
                if (n.type === 'danger') { bg = 'rgba(239,68,68,0.1)'; color = 'var(--c-danger)'; }
                if (n.type === 'success') { bg = 'rgba(16,185,129,0.1)'; color = 'var(--c-success)'; }
                
                html += `
                    <div style="padding: 12px 16px; border-bottom: 1px solid var(--border-color); display: flex; align-items: flex-start; gap: 12px; cursor: pointer;" class="notif-item" onclick="document.getElementById('notifDropdown').classList.remove('show'); document.querySelector('[data-view=view-manajemen]').click();">
                        <div style="width: 32px; height: 32px; border-radius: 50%; background: ${bg}; color: ${color}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <i class="fas ${n.icon}"></i>
                        </div>
                        <div>
                            <div style="font-size: 13px; color: var(--text-main); line-height: 1.4;">${n.text}</div>
                            <div style="font-size: 11px; color: var(--text-mute); margin-top: 4px;">Baru saja</div>
                        </div>
                    </div>
                `;
            });
            notifList.innerHTML = html;
        } else {
            notifBadge.style.display = 'none';
            notifBadge.textContent = '0';
            notifList.innerHTML = `
                <div style="padding: 24px; text-align: center; color: var(--text-mute); font-size: 13px;">
                    <i class="fas fa-check-circle" style="font-size: 24px; margin-bottom: 8px; display: block; opacity: 0.5;"></i>
                    Tidak ada masalah yang mendesak.
                </div>
            `;
        }
    }
    window.applyTheme = function(theme, accentColor, fontScale, persist=false) {
        const root = document.documentElement;
        
        if (theme === 'dark') {
            root.style.setProperty('--bg-base', '#0f172a');
            root.style.setProperty('--bg-sidebar', '#1e293b');
            root.style.setProperty('--bg-card', '#1e293b');
            root.style.setProperty('--bg-card-hover', '#334155');
            root.style.setProperty('--text-main', '#f8fafc');
            root.style.setProperty('--text-sub', '#cbd5e1');
            root.style.setProperty('--text-mute', '#94a3b8');
            root.style.setProperty('--text-inverse', '#f8fafc');
            root.style.setProperty('--border-color', '#334155');
        } else {
            root.style.setProperty('--bg-base', '#f1f5f9');
            root.style.setProperty('--bg-sidebar', '#1e1e2d');
            root.style.setProperty('--bg-card', '#ffffff');
            root.style.setProperty('--bg-card-hover', '#f8fafc');
            root.style.setProperty('--text-main', '#334155');
            root.style.setProperty('--text-sub', '#64748b');
            root.style.setProperty('--text-mute', '#94a3b8');
            root.style.setProperty('--text-inverse', '#ffffff');
            root.style.setProperty('--border-color', '#e2e8f0');
        }
        
        root.style.setProperty('--c-primary', accentColor);
        
        if (fontScale === 'small') {
            root.style.setProperty('--base-font-size', '13px');
        } else if (fontScale === 'large') {
            root.style.setProperty('--base-font-size', '16px');
        } else {
            root.style.setProperty('--base-font-size', '14.5px');
        }
        
        if (persist && window.CONFIG) {
            window.CONFIG.tema = theme;
            window.CONFIG.warna_aksen = accentColor;
            window.CONFIG.ukuran_font = fontScale;
        }
    };
});
