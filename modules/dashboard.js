/**
 * ExamShield - Dashboard Logic
 * File: modules/dashboard.js
 * Menghandle logika tampilan, sinkronisasi Firestore, dan interaksi UI
 */

import {
    onAuthChange,
    getUserData,
    getDashboardStats,
    getActiveUjian,
    monitorSiswaUjian,
    logoutUser
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
            // 2. Muat Profil User (Nama, Email, Avatar)
            await loadUserProfile(user.uid);

            // 3. Muat Statistik Dashboard (Guru, Siswa, Ujian, Soal)
            await loadDashboardStats();

            // 4. Muat Daftar Ujian Aktif
            await loadActiveExams();

            // 5. Aktifkan Listener Real-time untuk Monitoring Siswa
            setupRealtimeMonitoring();

            // 6. Setup Event Listener UI (Sidebar, Tombol, Logout)
            setupUIHandlers();

        } catch (error) {
            console.error("Gagal memuat dashboard:", error);
            alert("Terjadi kesalahan koneksi database. Silakan cek console atau refresh halaman.");
        } finally {
            showLoading(false);
        }
    });
}

// ==========================================
// 📦 FUNGSI LOAD & RENDER DATA
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
        // Update angka statistik ke elemen HTML
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

    // Listener real-time: otomatis update ketika ada siswa menjawab/maju soal
    monitorSiswaUjian((students) => {
        if (students.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">Belum ada siswa yang sedang mengerjakan ujian.</p>';
            return;
        }

        container.innerHTML = students.map(student => {
            const total = student.totalSoal || 20;
            const current = student.progress || 0;
            const percent = Math.min((current / total) * 100, 100);
            
            // Warna progress bar dinamis berdasarkan persentase
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
// 🎨 FUNGSI UI & INTERAKSI
// ==========================================

function setupUIHandlers() {
    // 1. Highlight Menu Sidebar yang Aktif
    const currentPage = window.location.pathname.split('/').pop();
    document.querySelectorAll('.menu-item').forEach(link => {
        link.classList.remove('active');
        const linkPage = link.getAttribute('href').split('/').pop();
        if (linkPage === currentPage) link.classList.add('active');
    });

    // 2. Handler Logout
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

    // 3. Handler Tombol Aksi Cepat
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
// 🛠️ UTILITIES
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
