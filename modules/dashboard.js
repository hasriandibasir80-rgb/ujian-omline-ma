/**
 * ExamShield - Dashboard Logic
 * File: modules/dashboard.js
 * Menghandle logika tampilan, sinkronisasi Firestore, dan interaksi UI
 * 
 * ✅ UPDATE: Menambahkan fitur Log Aktivitas, Rekap Nilai, Kelola Kelas
 * ✅ PRINSIP: Semua fungsi lama dipertahankan, hanya additive changes
 */

import {
    onAuthChange,
    getUserData,
    getDashboardStats,
    getActiveUjian,
    monitorSiswaUjian,
    logoutUser,
    // ✅ IMPORT BARU untuk fitur tambahan
    getActivityLogs,
    getGradeRecap,
    getClasses,
    addClass,
    updateClass,
    deleteClass,
    logActivity
} from './firebase-config.js';

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
});

async function initDashboard() {
    showLoading(true);

    // 1. Cek Status Authentication
    onAuthChange(async (user) => {
        if (!user) {
            window.location.href = '../index.html';
            return;
        }

        try {
            // 2. Muat Profil User (Nama, Email, Avatar) - ✅ FUNGSI LAMA
            await loadUserProfile(user.uid);

            // 3. Muat Statistik Dashboard (Guru, Siswa, Ujian, Soal) - ✅ FUNGSI LAMA
            await loadDashboardStats();

            // 4. Muat Daftar Ujian Aktif - ✅ FUNGSI LAMA
            await loadActiveExams();

            // 5. Aktifkan Listener Real-time untuk Monitoring Siswa - ✅ FUNGSI LAMA
            setupRealtimeMonitoring();

            // 6. Setup Event Listener UI (Sidebar, Tombol, Logout) - ✅ FUNGSI LAMA
            setupUIHandlers();

            // ✅ FITUR BARU: Muat Log Aktivitas
            await loadActivityLog();

            // ✅ FITUR BARU: Muat Rekap Nilai
            await loadGradeRecap();

            // ✅ FITUR BARU: Muat Daftar Kelas
            await loadClassList();

            // ✅ FITUR BARU: Setup Handler untuk Fitur Baru
            setupNewFeatureHandlers();

        } catch (error) {
            console.error("Gagal memuat dashboard:", error);
            alert("Terjadi kesalahan koneksi database. Silakan cek console atau refresh halaman.");
        } finally {
            showLoading(false);
        }
    });
}

// ==========================================
// 📦 FUNGSI LOAD & RENDER DATA (EXISTING - TIDAK DIUBAH)
// ==========================================

async function loadUserProfile(uid) {
    const res = await getUserData(uid);
    if (res.success) {
        const user = res.data;
        document.querySelector('.user-info h4').textContent = user.nama || 'Administrator';
        document.querySelector('.user-info p').textContent = user.email || 'admin@examshield.id';
        document.querySelector('.avatar').textContent = (user.nama || 'Admin').charAt(0).toUpperCase();
    }
}

async function loadDashboardStats() {
    const res = await getDashboardStats();
    if (res.success) {
        const stats = res.data;
        updateStatCard('stat-guru', stats.totalGuru);
        updateStatCard('stat-siswa', stats.totalSiswa);
        updateStatCard('stat-ujian', stats.totalUjian);
        updateStatCard('stat-soal', stats.totalBankSoal || 0);
    }
}

async function loadActiveExams() {
    const res = await getActiveUjian();
    const container = document.querySelector('.content-grid .card:last-child .card-body');

    if (res.success && res.data.length > 0) {
        container.innerHTML = res.data.map(exam => `
            <div class="exam-box">
                <h4>${exam.judul || 'Ujian Tanpa Judul'}</h4>
                <p>${exam.kelas || '-'} • ${exam.durasi || 90} menit</p>
                <div class="token-box">
                    <span>Token:</span> <strong>${exam.token || 'N/A'}</strong>
                </div>
            </div>
        `).join('');
    } else {
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">Tidak ada ujian aktif saat ini.</p>';
    }
}

function setupRealtimeMonitoring() {
    const container = document.querySelector('.content-grid .card:first-child .card-body');

    monitorSiswaUjian((students) => {
        if (students.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">Belum ada siswa yang sedang mengerjakan ujian.</p>';
            return;
        }

        container.innerHTML = students.map(student => {
            const total = student.totalSoal || 20;
            const current = student.progress || 0;
            const percent = Math.min((current / total) * 100, 100);
            const barColor = percent >= 80 ? '#10b981' : (percent >= 40 ? '#3b82f6' : '#f59e0b');
            const dotColor = percent >= 80 ? 'green' : (percent >= 40 ? 'blue' : 'yellow');

            return `
                <div class="student-row">
                    <div class="student-info">
                        <span class="dot ${dotColor}"></span>
                        <span>${student.namaSiswa || 'Siswa'}</span>
                        <small>${student.namaUjian || 'Ujian'}</small>
                    </div>
                    <div class="progress-wrap">
                        <span>${current}/${total} soal</span>
                        <div class="progress-bar">
                            <div class="fill" style="width: ${percent}%; background: ${barColor};"></div>
                        </div>
                    </div>
                </div>
            `;
        }).join('') + `<a href="admin/monitoring-live.html" class="view-all">Lihat Semua →</a>`;
    });
}

// ==========================================
// 🎨 FUNGSI UI & INTERAKSI (EXISTING - TIDAK DIUBAH)
// ==========================================

function setupUIHandlers() {
    const currentPage = window.location.pathname.split('/').pop();
    document.querySelectorAll('.menu-item').forEach(link => {
        link.classList.remove('active');
        const linkPage = link.getAttribute('href').split('/').pop();
        if (linkPage === currentPage) link.classList.add('active');
    });

    const logoutBtn = document.querySelector('.logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (confirm('Yakin ingin keluar dari sistem?')) {
                await logoutUser();
                window.location.href = '../index.html';
            }
        });
    }

    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const text = btn.textContent.trim();
            if (text.includes('Tambah Guru')) window.location.href = 'admin/data-guru.html';
            if (text.includes('Tambah Siswa')) window.location.href = 'admin/data-siswa.html';
            if (text.includes('Buat Ujian')) window.location.href = 'admin/daftar-ujian.html';
            if (text.includes('Monitoring')) window.location.href = 'admin/monitoring-live.html';
        });
    });
}

// ==========================================
// 🛠️ UTILITIES (EXISTING - TIDAK DIUBAH)
// ==========================================

function updateStatCard(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value !== undefined ? value : 0;
}

function showLoading(isLoading) {
    document.body.style.opacity = isLoading ? '0.6' : '1';
    document.body.style.pointerEvents = isLoading ? 'none' : 'auto';
    document.body.style.transition = 'opacity 0.3s';
}

// ✅ UTILITIES TAMBAHAN (Mobile-friendly helpers)
function formatDateTime(timestamp) {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function formatNilai(nilai) {
    if (nilai === null || nilai === undefined) return '-';
    const n = Number(nilai);
    if (isNaN(n)) return '-';
    return n.toFixed(1);
}

function getStatusBadge(status) {
    const map = {
        'lulus': { class: 'success', text: 'Lulus' },
        'tidak-lulus': { class: 'danger', text: 'Tidak Lulus' },
        'ongoing': { class: 'warning', text: 'Sedang Mengerjakan' },
        'completed': { class: 'info', text: 'Selesai' }
    };
    const cfg = map[status] || { class: 'secondary', text: status || '-' };
    return `<span class="badge badge-${cfg.class}">${cfg.text}</span>`;
}

function showToast(message, type = 'info') {
    // Simple toast notification (mobile-friendly)
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed; bottom: 20px; right: 20px;
        padding: 12px 20px; border-radius: 8px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white; z-index: 9999; font-size: 0.9rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==========================================
// 📋 FUNGSI FITUR BARU: LOG AKTIVITAS
// ==========================================

async function loadActivityLog() {
    const tbody = document.getElementById('activity-log-body');
    const filterType = document.getElementById('filter-log-type')?.value || 'all';
    
    if (!tbody) return; // Fitur tidak ada di HTML lama

    try {
        const res = await getActivityLogs({ limit: 10, type: filterType });
        
        if (res.success && res.data.length > 0) {
            tbody.innerHTML = res.data.map(log => `
                <tr>
                    <td><small>${formatDateTime(log.timestamp)}</small></td>
                    <td><strong>${log.userName || 'Unknown'}</strong></td>
                    <td><span class="badge badge-secondary">${log.role || '-'}</span></td>
                    <td><span class="badge badge-${getActionBadgeClass(log.action)}">${log.action}</span></td>
                    <td><small class="text-muted">${log.detail || '-'}</small></td>
                    <td><code>${log.ipAddress || '-'}</code></td>
                </tr>
            `).join('');
            
            // Update counter
            const counter = document.getElementById('log-count-info');
            if (counter) counter.textContent = `${res.data.length} entri`;
        } else {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Tidak ada log aktivitas</td></tr>`;
        }
    } catch (error) {
        console.error("Error loading activity log:", error);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Gagal memuat log</td></tr>`;
    }
}

function getActionBadgeClass(action) {
    const map = {
        'login': 'success', 'logout': 'secondary',
        'create': 'primary', 'update': 'warning', 'delete': 'danger',
        'exam-start': 'info', 'exam-submit': 'success'
    };
    return map[action] || 'secondary';
}

// ==========================================
// 📊 FUNGSI FITUR BARU: REKAP NILAI
// ==========================================

async function loadGradeRecap() {
    const tbody = document.getElementById('grade-recap-body');
    const filterKelas = document.getElementById('filter-kelas-rekap')?.value || 'all';
    const filterUjian = document.getElementById('filter-ujian-rekap')?.value || 'all';
    
    if (!tbody) return;

    try {
        const res = await getGradeRecap({ kelasId: filterKelas, ujianId: filterUjian });
        
        if (res.success) {
            // Update summary
            if (res.summary) {
                document.getElementById('recap-avg').textContent = formatNilai(res.summary.avg);
                document.getElementById('recap-max').textContent = formatNilai(res.summary.max);
                document.getElementById('recap-min').textContent = formatNilai(res.summary.min);
                document.getElementById('recap-lulus').textContent = `${res.summary.lulus}/${res.summary.total}`;
            }

            // Render table
            if (res.data.length > 0) {
                tbody.innerHTML = res.data.map((item, idx) => `
                    <tr>
                        <td>${idx + 1}</td>
                        <td><strong>${item.namaSiswa || '-'}</strong></td>
                        <td>${item.namaKelas || '-'}</td>
                        <td><small>${item.namaUjian || '-'}</small></td>
                        <td><strong class="text-primary">${formatNilai(item.nilai)}</strong></td>
                        <td>${getStatusBadge(item.status)}</td>
                        <td><small>${formatDateTime(item.tanggal)}</small></td>
                    </tr>
                `).join('');
            } else {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">Tidak ada data nilai</td></tr>`;
            }
        }
    } catch (error) {
        console.error("Error loading grade recap:", error);
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Gagal memuat rekap nilai</td></tr>`;
    }
}

// ==========================================
// 🏫 FUNGSI FITUR BARU: KELOLA KELAS
// ==========================================

async function loadClassList() {
    const grid = document.getElementById('class-list-grid');
    if (!grid) return;

    try {
        const res = await getClasses();
        
        if (res.success && res.data.length > 0) {
            grid.innerHTML = res.data.map(kelas => `
                <div class="class-card" data-id="${kelas.id}">
                    <div class="class-card-header">
                        <h4>${kelas.nama}</h4>
                        <span class="badge badge-primary">${kelas.jenjang}${kelas.jurusan ? ' - ' + kelas.jurusan : ''}</span>
                    </div>
                    <div class="class-card-body">
                        <p><i class="fas fa-chalkboard-teacher"></i> Wali: <strong>${kelas.namaWali || '-'}</strong></p>
                        <p><i class="fas fa-users"></i> Siswa: <strong>${kelas.jumlahSiswa || 0}</strong></p>
                    </div>
                    <div class="class-card-footer">
                        <button class="btn-sm btn-edit-kelas" data-id="${kelas.id}"><i class="fas fa-edit"></i></button>
                        <button class="btn-sm btn-danger btn-delete-kelas" data-id="${kelas.id}"><i class="fas fa-trash"></i></button>
                        <button class="btn-sm btn-info btn-lihat-siswa" data-id="${kelas.id}"><i class="fas fa-eye"></i></button>
                    </div>
                </div>
            `).join('');
        } else {
            grid.innerHTML = `<p class="text-center text-muted">Belum ada kelas terdaftar</p>`;
        }
    } catch (error) {
        console.error("Error loading classes:", error);
        grid.innerHTML = `<p class="text-center text-danger">Gagal memuat daftar kelas</p>`;
    }
}

// ==========================================
// 🎮 HANDLER FITUR BARU & MODAL
// ==========================================

function setupNewFeatureHandlers() {
    // 1. Refresh Log Aktivitas
    const btnRefreshLog = document.getElementById('btn-refresh-log');
    if (btnRefreshLog) {
        btnRefreshLog.addEventListener('click', () => loadActivityLog());
    }

    // 2. Filter Log Aktivitas
    const filterLogType = document.getElementById('filter-log-type');
    if (filterLogType) {
        filterLogType.addEventListener('change', () => loadActivityLog());
    }

    // 3. Filter Rekap Nilai
    const filterKelas = document.getElementById('filter-kelas-rekap');
    const filterUjian = document.getElementById('filter-ujian-rekap');
    if (filterKelas) filterKelas.addEventListener('change', () => loadGradeRecap());
    if (filterUjian) filterUjian.addEventListener('change', () => loadGradeRecap());

    // 4. Export Nilai
    const btnExport = document.getElementById('btn-export-nilai');
    if (btnExport) {
        btnExport.addEventListener('click', () => {
            showToast('Fitur export akan segera tersedia!', 'info');
            // TODO: Implement export to CSV/Excel
        });
    }

    // 5. Modal Kelas: Open
    const btnTambahKelas = document.getElementById('btn-tambah-kelas');
    const modal = document.getElementById('modal-kelas');
    const modalClose = document.getElementById('modal-kelas-close');
    const modalCancel = document.getElementById('modal-kelas-cancel');

    if (btnTambahKelas && modal) {
        btnTambahKelas.addEventListener('click', () => {
            document.getElementById('modal-kelas-title').textContent = 'Tambah Kelas Baru';
            document.getElementById('form-kelas').reset();
            document.getElementById('kelas-id').value = '';
            loadGuruForWaliSelect(); // Load dropdown guru
            openModal(modal);
        });
    }

    if (modalClose) modalClose.addEventListener('click', () => closeModal(modal));
    if (modalCancel) modalCancel.addEventListener('click', () => closeModal(modal));
    
    // Close modal when clicking outside
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal);
        });
    }

    // 6. Modal Kelas: Save
    const btnSaveKelas = document.getElementById('modal-kelas-save');
    if (btnSaveKelas) {
        btnSaveKelas.addEventListener('click', async () => {
            const id = document.getElementById('kelas-id').value;
            const data = {
                nama: document.getElementById('kelas-nama').value,
                jenjang: document.getElementById('kelas-jenjang').value,
                jurusan: document.getElementById('kelas-jurusan').value,
                waliKelasId: document.getElementById('kelas-wali').value,
                updatedAt: new Date()
            };

            if (!data.nama || !data.jenjang || !data.waliKelasId) {
                showToast('Harap lengkapi field wajib!', 'error');
                return;
            }

            try {
                const res = id 
                    ? await updateClass(id, data)
                    : await addClass({ ...data, createdAt: new Date(), jumlahSiswa: 0 });
                
                if (res.success) {
                    showToast(`Kelas berhasil ${id ? 'diperbarui' : 'ditambahkan'}!`, 'success');
                    closeModal(modal);
                    await loadClassList(); // Refresh list
                    await loadGradeRecap(); // Refresh filter options
                } else {
                    showToast('Gagal menyimpan: ' + res.error, 'error');
                }
            } catch (err) {
                console.error("Error saving class:", err);
                showToast('Terjadi kesalahan jaringan', 'error');
            }
        });
    }

    // 7. Delegated Event: Edit/Delete/Lihat Siswa (dynamic elements)
    const classGrid = document.getElementById('class-list-grid');
    if (classGrid) {
        classGrid.addEventListener('click', async (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            
            const id = btn.dataset.id;
            if (btn.classList.contains('btn-edit-kelas')) {
                await openEditKelasModal(id);
            } else if (btn.classList.contains('btn-delete-kelas')) {
                if (confirm('Hapus kelas ini? Data siswa tidak akan terhapus.')) {
                    const res = await deleteClass(id);
                    if (res.success) {
                        showToast('Kelas berhasil dihapus', 'success');
                        await loadClassList();
                    } else {
                        showToast('Gagal menghapus: ' + res.error, 'error');
                    }
                }
            } else if (btn.classList.contains('btn-lihat-siswa')) {
                window.location.href = `admin/data-siswa.html?kelas=${id}`;
            }
        });
    }

    // 8. Search Kelas (simple client-side filter)
    const searchKelas = document.getElementById('search-kelas');
    if (searchKelas) {
        searchKelas.addEventListener('input', (e) => {
            const keyword = e.target.value.toLowerCase();
            const cards = document.querySelectorAll('.class-card');
            cards.forEach(card => {
                const text = card.textContent.toLowerCase();
                card.style.display = text.includes(keyword) ? '' : 'none';
            });
        });
    }
}

// Helper: Load dropdown guru untuk wali kelas
async function loadGuruForWaliSelect() {
    const select = document.getElementById('kelas-wali');
    if (!select) return;
    
    // Preserve existing options
    const firstOption = select.querySelector('option[value=""]');
    select.innerHTML = '';
    if (firstOption) select.appendChild(firstOption);
    
    try {
        // Asumsi firebase-config.js punya getAllGuru()
        const { getAllGuru } = await import('./firebase-config.js');
        const res = await getAllGuru();
        if (res.success) {
            res.data.forEach(guru => {
                const opt = document.createElement('option');
                opt.value = guru.id;
                opt.textContent = guru.nama;
                select.appendChild(opt);
            });
        }
    } catch (err) {
        console.warn("Could not load guru list:", err);
    }
}

// Helper: Open modal edit kelas dengan data existing
async function openEditKelasModal(id) {
    const modal = document.getElementById('modal-kelas');
    if (!modal) return;
    
    try {
        const { getClassById } = await import('./firebase-config.js');
        const res = await getClassById(id);
        
        if (res.success && res.data) {
            const k = res.data;
            document.getElementById('modal-kelas-title').textContent = 'Edit Kelas';
            document.getElementById('kelas-id').value = k.id;
            document.getElementById('kelas-nama').value = k.nama || '';
            document.getElementById('kelas-jenjang').value = k.jenjang || '';
            document.getElementById('kelas-jurusan').value = k.jurusan || 'Umum';
            document.getElementById('kelas-wali').value = k.waliKelasId || '';
            document.getElementById('kelas-siswa').value = k.jumlahSiswa || 0;
            
            await loadGuruForWaliSelect();
            openModal(modal);
        }
    } catch (err) {
        console.error("Error loading class for edit:", err);
        showToast('Gagal memuat data kelas', 'error');
    }
}

// Helper: Modal controls
function openModal(modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevent scroll
}

function closeModal(modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
}

// ✅ Tambahkan CSS untuk toast & badge jika belum ada di dashboard.css
// (Opsional: bisa ditambahkan via JS atau pastikan ada di CSS file)
