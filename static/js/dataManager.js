// DataManager class to handle data operations and the Manajemen Data view
class DataManager {
    constructor() {
        this.db = null;
        this.currentTable = null;
        this.currentPage = 1;
        this.itemsPerPage = 15;
        this.filteredData = [];
        this.sortColumn = null;
        this.sortDirection = 'asc';
        
        // Define schemas for tables, especially empty ones
        this.tableSchemas = {
            keuangan: ['id', 'tanggal', 'kategori', 'jumlah', 'keterangan'],
            komplain: ['id', 'tanggal', 'sumber', 'deskripsi', 'status', 'tindakan'],
            farmasi: ['id', 'bulan', 'resep_terlayani', 'waktu_tunggu_racikan', 'ketersediaan_obat'],
            ipsrs: ['id', 'bulan', 'jumlah_kerusakan', 'waktu_respon', 'selesai_tepat_waktu'],
            risiko: ['id', 'tanggal', 'insiden', 'tingkat_risiko', 'unit', 'tindakan_perbaikan'],
            notifikasi: ['id', 'tanggal', 'judul', 'pesan', 'dibaca'],
            pengaturan: ['id', 'nama_rs', 'kota', 'total_tempat_tidur', 'tahun_aktif', 'tarif_rawat_inap', 'tarif_igd', 'tarif_spesialis', 'tarif_umum', 'tarif_penunjang', 'rasio_biaya_operasional', 'biaya_tetap_bulanan', 'rasio_koleksi', 'rasio_bpjs', 'benchmark_gdr', 'benchmark_ndr', 'benchmark_bor_min', 'benchmark_bor_max', 'target_margin', 'direktur', 'jabatan_direktur'],
            users: ['id', 'username', 'password_hash', 'nama', 'role']
        };
        
        // DOM Elements
        this.tablePicker = document.getElementById('dmTablePicker');
        this.searchInput = document.getElementById('dmSearch');
        this.addBtn = document.getElementById('dmAddBtn');
        this.refreshBtn = document.getElementById('dmRefreshBtn');
        this.exportCsvBtn = document.getElementById('dmExportCsvBtn');
        
        this.thead = document.getElementById('dmThead');
        this.tbody = document.getElementById('dmTbody');
        this.emptyState = document.getElementById('dmEmpty');
        this.statsText = document.getElementById('dmStatsText');
        
        this.prevPageBtn = document.getElementById('dmPrevPage');
        this.nextPageBtn = document.getElementById('dmNextPage');
        this.pageInfo = document.getElementById('dmPageInfo');
        
        this.modalOverlay = document.getElementById('modalOverlay');
        this.modalClose = document.getElementById('modalClose');
        this.modalCancel = document.getElementById('modalCancel');
        this.modalSave = document.getElementById('modalSave');
        this.modalForm = document.getElementById('modalForm');
        this.modalTitle = document.getElementById('modalTitle');
        
        this.confirmOverlay = document.getElementById('confirmOverlay');
        this.confirmCancel = document.getElementById('confirmCancel');
        this.confirmDelete = document.getElementById('confirmDelete');
        
        this.toast = document.getElementById('dmToast');
        this.toastMsg = document.getElementById('dmToastMsg');
        
        this.editModeId = null;
        this.deleteModeId = null;
        
        this.initEventListeners();
    }

    setDatabase(dbData) {
        this.db = dbData;
        this.populateTablePicker();
    }

    initEventListeners() {
        if (!this.tablePicker) return;

        this.tablePicker.addEventListener('change', (e) => {
            this.currentTable = e.target.value;
            this.currentPage = 1;
            this.searchInput.value = '';
            this.renderTable();
        });

        let searchTimeout;
        this.searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.currentPage = 1;
                this.renderTable();
            }, 300);
        });

        this.addBtn.addEventListener('click', () => {
            if (!this.currentTable) {
                this.showToast('Silakan pilih tabel terlebih dahulu', 'error');
                return;
            }
            this.openModal();
        });

        this.refreshBtn.addEventListener('click', () => {
            this.renderTable();
            this.showToast('Data direfresh');
        });

        if (this.exportCsvBtn) {
            this.exportCsvBtn.addEventListener('click', () => {
                if (!this.currentTable) {
                    this.showToast('Pilih tabel terlebih dahulu untuk diexport', 'error');
                    return;
                }
                // Use backend export API
                window.location.href = `/api/export_csv/${this.currentTable}`;
                this.showToast(`Mendownload ${this.currentTable}.csv...`);
            });
        }

        this.prevPageBtn.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderTableData();
            }
        });

        this.nextPageBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.renderTableData();
            }
        });

        // Modal
        this.modalClose.addEventListener('click', () => this.closeModal());
        this.modalCancel.addEventListener('click', () => this.closeModal());
        this.modalSave.addEventListener('click', () => this.saveData());
        
        // Confirm
        this.confirmCancel.addEventListener('click', () => {
            this.confirmOverlay.style.display = 'none';
            this.deleteModeId = null;
        });
        this.confirmDelete.addEventListener('click', () => this.executeDelete());
    }

    populateTablePicker() {
        if (!this.db || !this.tablePicker) return;
        
        // Clear existing options except placeholder
        this.tablePicker.innerHTML = '<option value="">— Pilih Tabel —</option>';
        
        const tables = Object.keys(this.db);
        tables.forEach(table => {
            const opt = document.createElement('option');
            opt.value = table;
            opt.textContent = table.replace(/_/g, ' ').toUpperCase();
            this.tablePicker.appendChild(opt);
        });
    }

    getColumnsForTable(tableName) {
        if (!this.db || !this.db[tableName]) return [];
        
        // Use schema if defined
        if (this.tableSchemas[tableName]) {
            return this.tableSchemas[tableName];
        }
        
        if (this.db[tableName].length === 0) return [];
        
        // Extract keys from the first record, ignore 'id' for display if needed
        return Object.keys(this.db[tableName][0]);
    }

    itemContainsTerm(item, term) {
        if (item === null || item === undefined) return false;
        if (typeof item === 'object') {
            return Object.values(item).some(val => this.itemContainsTerm(val, term));
        }
        return String(item).toLowerCase().includes(term);
    }

    switchToTableWithSearch(tableName, searchTerm) {
        if (this.tablePicker) {
            this.tablePicker.value = tableName;
        }
        this.currentTable = tableName;
        this.currentPage = 1;
        if (this.searchInput) {
            this.searchInput.value = searchTerm;
        }
        this.renderTable();
    }

    renderTable() {
        const search = this.searchInput ? this.searchInput.value.toLowerCase() : '';
        
        // Setup Cross-matches for global search
        const crossMatches = [];
        if (search && this.db) {
            Object.keys(this.db).forEach(tableName => {
                if (tableName === this.currentTable) return;
                const tableData = this.db[tableName];
                const matchCount = tableData.filter(item => this.itemContainsTerm(item, search)).length;
                if (matchCount > 0) {
                    crossMatches.push({ tableName, count: matchCount });
                }
            });
        }

        let crossMatchesContainer = document.getElementById('dmCrossMatches');
        if (!crossMatchesContainer) {
            crossMatchesContainer = document.createElement('div');
            crossMatchesContainer.id = 'dmCrossMatches';
            crossMatchesContainer.style.margin = '0px 24px 16px 24px';
            crossMatchesContainer.style.padding = '12px 16px';
            crossMatchesContainer.style.background = 'rgba(79,70,229,0.06)';
            crossMatchesContainer.style.border = '1px solid rgba(79,70,229,0.15)';
            crossMatchesContainer.style.borderRadius = '8px';
            crossMatchesContainer.style.fontSize = '13px';
            const statsBar = document.getElementById('dmStatsBar');
            if (statsBar) {
                statsBar.parentNode.insertBefore(crossMatchesContainer, statsBar.nextSibling);
            }
        }

        if (search && crossMatches.length > 0) {
            crossMatchesContainer.style.display = 'block';
            let html = `<div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; color:var(--text-main);">
                <i class="fas fa-search-plus" style="color:var(--c-primary); font-size:14px; margin-right:4px;"></i>
                <span>Hasil pencarian juga ditemukan di tabel lain:</span>`;
            crossMatches.forEach(match => {
                const displayName = match.tableName.replace(/_/g, ' ').toUpperCase();
                html += `<button class="dm-btn dm-btn-sm dm-btn-outline" style="padding:2px 8px; font-size:11px; margin-left:4px; display:inline-flex; align-items:center; gap:4px; border-radius:6px; cursor:pointer;" onclick="window.dataManager.switchToTableWithSearch('${match.tableName}', '${search}')">
                    <strong>${displayName}</strong> (${match.count} data)
                </button>`;
            });
            html += `</div>`;
            crossMatchesContainer.innerHTML = html;
        } else {
            crossMatchesContainer.style.display = 'none';
        }

        if (!this.currentTable || !this.db || !this.db[this.currentTable]) {
            this.thead.innerHTML = '';
            this.tbody.innerHTML = '';
            this.emptyState.style.display = 'flex';
            this.statsText.textContent = '—';
            return;
        }

        this.emptyState.style.display = 'none';
        
        // Setup Columns
        const columns = this.getColumnsForTable(this.currentTable);
        const tr = document.createElement('tr');
        
        // Make columns user-friendly
        columns.forEach(col => {
            if(col === 'id') return; // Skip showing UUID
            const th = document.createElement('th');
            th.textContent = col.replace(/_/g, ' ').toUpperCase();
            
            // Add sorting capability
            th.style.cursor = 'pointer';
            th.onclick = () => {
                if (this.sortColumn === col) {
                    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    this.sortColumn = col;
                    this.sortDirection = 'asc';
                }
                this.renderTable();
            };
            if (this.sortColumn === col) {
                const icon = document.createElement('i');
                icon.className = this.sortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
                icon.style.marginLeft = '8px';
                icon.style.color = 'var(--c-primary)';
                th.appendChild(icon);
            }
            
            tr.appendChild(th);
        });
        
        // Actions column
        const thActions = document.createElement('th');
        thActions.textContent = 'AKSI';
        thActions.style.width = '120px';
        thActions.style.textAlign = 'right';
        tr.appendChild(thActions);
        
        this.thead.innerHTML = '';
        this.thead.appendChild(tr);

        // Filter Data
        let data = [...this.db[this.currentTable]];
        if (search) {
            data = data.filter(item => this.itemContainsTerm(item, search));
        }
        
        // Sort Data
        if (this.sortColumn) {
            data.sort((a, b) => {
                let valA = a[this.sortColumn];
                let valB = b[this.sortColumn];
                if (typeof valA === 'string') valA = valA.toLowerCase();
                if (typeof valB === 'string') valB = valB.toLowerCase();
                
                if (valA === valB) return 0;
                if (valA === null || valA === undefined) return 1;
                if (valB === null || valB === undefined) return -1;
                
                if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
                if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }
        
        this.filteredData = data;
        
        // Stats
        this.statsText.textContent = `Menampilkan ${data.length} data dari tabel ${this.currentTable.replace(/_/g, ' ').toUpperCase()}`;

        this.renderTableData();
    }

    renderTableData() {
        this.tbody.innerHTML = '';
        
        const data = this.filteredData;
        const totalPages = Math.ceil(data.length / this.itemsPerPage) || 1;
        
        if (this.currentPage > totalPages) this.currentPage = totalPages;
        
        const startIdx = (this.currentPage - 1) * this.itemsPerPage;
        const endIdx = startIdx + this.itemsPerPage;
        const pageData = data.slice(startIdx, endIdx);
        
        const columns = this.getColumnsForTable(this.currentTable);

        if (pageData.length === 0) {
            this.tbody.innerHTML = '<tr><td colspan="100%" style="text-align:center; color:var(--text-mute); padding: 30px;">Tidak ada data yang ditemukan.</td></tr>';
        } else {
            pageData.forEach(row => {
                const tr = document.createElement('tr');
                
                columns.forEach(col => {
                    if(col === 'id') return;
                    const td = document.createElement('td');
                    let val = row[col];
                    
                    if (col === 'password_hash') {
                        val = '••••••••';
                    } else {
                        if (typeof val === 'object' && val !== null) {
                            val = JSON.stringify(val);
                        }
                        if (typeof val === 'string' && val.length > 50) val = val.substring(0, 50) + '...';
                    }
                    
                    td.textContent = val !== null && val !== undefined ? val : '-';
                    tr.appendChild(td);
                });

                // Actions
                const tdActions = document.createElement('td');
                tdActions.style.textAlign = 'right';
                
                const btnEdit = document.createElement('button');
                btnEdit.className = 'dm-btn dm-btn-sm dm-btn-outline';
                btnEdit.style.padding = '6px';
                btnEdit.style.marginRight = '4px';
                btnEdit.innerHTML = '<i class="fas fa-edit"></i>';
                btnEdit.onclick = () => this.openModal(row);
                
                const btnDel = document.createElement('button');
                btnDel.className = 'dm-btn dm-btn-sm dm-btn-danger';
                btnDel.style.padding = '6px';
                btnDel.innerHTML = '<i class="fas fa-trash"></i>';
                btnDel.onclick = () => this.confirmDeleteAction(row.id);
                
                tdActions.appendChild(btnEdit);
                tdActions.appendChild(btnDel);
                tr.appendChild(tdActions);

                this.tbody.appendChild(tr);
            });
        }

        // Pagination controls
        this.pageInfo.textContent = `Halaman ${this.currentPage} dari ${totalPages}`;
        this.prevPageBtn.disabled = this.currentPage === 1;
        this.nextPageBtn.disabled = this.currentPage === totalPages;
    }

    openModal(record = null) {
        this.modalForm.innerHTML = '';
        this.editModeId = record ? record.id : null;
        
        this.modalTitle.textContent = record ? `Edit Data: ${this.currentTable.replace(/_/g, ' ').toUpperCase()}` : `Tambah Data: ${this.currentTable.replace(/_/g, ' ').toUpperCase()}`;
        
        const columns = this.getColumnsForTable(this.currentTable);
        
        columns.forEach(col => {
            if (col === 'id') return;
            
            const group = document.createElement('div');
            group.className = 'form-group';
            group.style.marginBottom = '16px';
            
            const label = document.createElement('label');
            label.textContent = col.replace(/_/g, ' ').toUpperCase();
            label.style.display = 'block';
            label.style.marginBottom = '6px';
            label.style.fontSize = '12px';
            label.style.fontWeight = '600';
            label.style.color = 'var(--text-sub)';
            
            const input = document.createElement('input');
            
            if (col === 'password_hash') {
                input.type = 'password';
                input.name = col;
                input.value = ''; // Always empty for security
                label.textContent = record ? 'PASSWORD BARU (kosongkan jika tidak diubah)' : 'PASSWORD';
            } else {
                input.type = 'text';
                input.name = col;
                let val = record && record[col] !== null ? record[col] : '';
                if (typeof val === 'object' && val !== null) {
                    val = JSON.stringify(val);
                }
                input.value = val;
            }
            input.className = 'dm-input';
            input.style.width = '100%';
            input.style.padding = '10px';
            input.style.border = '1px solid var(--border-color)';
            input.style.borderRadius = '8px';
            
            group.appendChild(label);
            group.appendChild(input);
            this.modalForm.appendChild(group);
        });
        
        this.modalOverlay.style.display = 'flex';
    }

    closeModal() {
        this.modalOverlay.style.display = 'none';
        this.editModeId = null;
    }

    saveData() {
        const formData = new FormData(this.modalForm);
        const dataObj = {};
        formData.forEach((value, key) => {
            if (value === '') {
                dataObj[key] = null;
            } else if (typeof value === 'string' && (value.trim().startsWith('{') || value.trim().startsWith('['))) {
                try {
                    dataObj[key] = JSON.parse(value);
                } catch (e) {
                    dataObj[key] = value;
                }
            } else if (!isNaN(value) && value.trim() !== '') {
                dataObj[key] = value.includes('.') ? parseFloat(value) : parseInt(value, 10);
            } else {
                dataObj[key] = value;
            }
        });

        // Add UUID if new
        if (!this.editModeId) {
            dataObj.id = 'new-' + Date.now();
            this.db[this.currentTable].unshift(dataObj);
            this.showToast('Data berhasil ditambahkan');
        } else {
            dataObj.id = this.editModeId;
            const idx = this.db[this.currentTable].findIndex(r => r.id === this.editModeId);
            if (idx > -1) {
                // If editing users and password is blank, preserve the old hash
                if (this.currentTable === 'users' && !dataObj.password_hash) {
                    delete dataObj.password_hash; // Remove so it doesn't overwrite
                }
                
                // Keep original ID
                this.db[this.currentTable][idx] = { ...this.db[this.currentTable][idx], ...dataObj };
            }
            this.showToast('Data berhasil diperbarui');
        }
        
        // Sync with backend
        fetch('/api/save_data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ table: this.currentTable, data: this.db[this.currentTable] })
        })
        .then(res => {
            if (!res.ok) throw new Error('HTTP error ' + res.status);
            return res.json();
        })
        .then(resData => {
            if (resData.status === 'success') {
                this.showToast('Perubahan berhasil disimpan ke database');
            } else {
                this.showToast('Gagal sinkronisasi: ' + resData.error, 'error');
            }
        })
        .catch(err => {
            console.warn('Sync failed (running offline/static mode):', err);
            this.showToast('Disimpan secara lokal (Simulasi)', 'warning');
        });

        this.closeModal();
        this.renderTable();
    }

    openDeleteConfirm(id) {
        if (this.currentTable === 'users') {
            const user = this.db.users.find(u => u.id === id);
            if (user && window.CURRENT_USER && user.username === window.CURRENT_USER.username) {
                this.showToast('Anda tidak dapat menghapus akun Anda sendiri.', 'error');
                return;
            }
        }
        this.deleteModeId = id;
        this.confirmOverlay.style.display = 'flex';
    }

    executeDelete() {
        if (this.deleteModeId && this.currentTable) {
            this.db[this.currentTable] = this.db[this.currentTable].filter(r => r.id !== this.deleteModeId);
            this.showToast('Data berhasil dihapus');
            
            // Sync with backend
            fetch('/api/save_data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ table: this.currentTable, data: this.db[this.currentTable] })
            })
            .then(res => {
                if (!res.ok) throw new Error('HTTP error ' + res.status);
                return res.json();
            })
            .then(resData => {
                if (resData.status === 'success') {
                    this.showToast('Data terhapus dari database');
                } else {
                    this.showToast('Gagal sinkronisasi hapus: ' + resData.error, 'error');
                }
            })
            .catch(err => {
                console.warn('Sync failed (running offline/static mode):', err);
                this.showToast('Dihapus secara lokal (Simulasi)', 'warning');
            });
        }
        
        this.confirmOverlay.style.display = 'none';
        this.deleteModeId = null;
        this.renderTable();
    }

    showToast(message, type = 'success') {
        this.toastMsg.textContent = message;
        this.toast.style.background = type === 'error' ? 'var(--c-danger)' : 'var(--c-success)';
        
        this.toast.classList.add('show');
        setTimeout(() => {
            this.toast.classList.remove('show');
        }, 3000);
    }
}

// Global instance
window.dataManager = new DataManager();
