/**
 * ExamShield - Core Application Logic
 * File: app.js
 * 
 * Catatan: 
 * - File ini menangani seluruh logika Dashboard & Pengaturan.
 * - Data disimpan sementara di Memory & LocalStorage (sesuai request "buat baru saja").
 */

// ==========================================
// 1. DATA STORE (MOCK DATABASE)
// ==========================================
// Inisialisasi data awal agar aplikasi tidak crash saat pertama kali dibuka.

const DEFAULT_DB = {
    users: {
        admin: { password: '123456', role: 'admin', nama: 'Administrator' },
        '198501012010011001': { password: 'Guru@123', role: 'guru', nama: 'Budi Santoso', mapel: 'Matematika' },
        'siswa001': { password: 'Siswa@1', role: 'siswa', nama: 'Ahmad Fauzi', nisn: '0012345678', kelas: 'XII IPA 1' }
    },
    settings: {
        antiCurang: {
            deteksiTab: true,
            wajibFullscreen: true,
            blokirCopyPaste: true,
            maksPelanggaran: 3
        }
    },
    sekolah: {
        nama: 'SMA Negeri 1 Contoh',
        npsn: '12345678',
        tahunAjaran: '2024/2025',
        semester: 'Genap'
    },
    stats: {
        totalUjian: 12,
        totalSoal: 450,
        totalSiswa: 120
    }
};

// Load dari LocalStorage jika ada, jika tidak pakai Default
let DB = JSON.parse(localStorage.getItem('examShieldDB')) || DEFAULT_DB;

// Session State
let session = JSON.parse(localStorage.getItem('examShieldSession')) || { user: null, role: null };

// ==========================================
// 2. CORE FUNCTIONS
// ==========================================

function saveDB() {
    localStorage.setItem('examShieldDB', JSON.stringify(DB));
}

function navigateTo(viewId) {
    // Sembunyikan semua section
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    
    // Tampilkan section yang diminta
    const target = document.getElementById(viewId);
    if (target) {
        target.classList.remove('hidden');
        target.style.animation = 'fadeIn 0.3s ease';
        
        // Jika masuk ke Pengaturan, refresh data UI
        if (viewId === 'view-pengaturan') {
            renderPengaturanUI();
        }
    }
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span> <span>${message}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ==========================================
// 3. FITUR PENGATURAN (SETTINGS)
// ==========================================

/**
 * Merender UI Halaman Pengaturan berdasarkan data terbaru
 */
function renderPengaturanUI() {
    // 1. Update Checkbox Anti-Curang
    const ac = DB.settings.antiCurang;
    document.getElementById('toggle-tab').checked = ac.deteksiTab;
    document.getElementById('toggle-fullscreen').checked = ac.wajibFullscreen;
    document.getElementById('toggle-copas').checked = ac.blokirCopyPaste;
    document.getElementById('input-max-violation').value = ac.maksPelanggaran;

    // 2. Update Form Profil Sekolah
    document.getElementById('input-sekolah-nama').value = DB.sekolah.nama;
    document.getElementById('input-sekolah-npsn').value = DB.sekolah.npsn;
    document.getElementById('input-tahun-ajaran').value = DB.sekolah.tahunAjaran;
    document.getElementById('select-semester').value = DB.sekolah.semester;

    // 3. Update Statistik
    document.getElementById('stat-total-ujian').textContent = DB.stats.totalUjian;
    document.getElementById('stat-total-soal').textContent = DB.stats.totalSoal;
    document.getElementById('stat-total-siswa').textContent = DB.stats.totalSiswa;
}

/**
 * Logika Simpan Pengaturan Umum & Anti-Curang
 */
function handleSaveSettings() {
    // Ambil nilai dari input
    DB.settings.antiCurang = {
        deteksiTab: document.getElementById('toggle-tab').checked,
        wajibFullscreen: document.getElementById('toggle-fullscreen').checked,
        blokirCopyPaste: document.getElementById('toggle-copas').checked,
        maksPelanggaran: parseInt(document.getElementById('input-max-violation').value) || 3
    };

    DB.sekolah = {
        nama: document.getElementById('input-sekolah-nama').value,
        npsn: document.getElementById('input-sekolah-npsn').value,
        tahunAjaran: document.getElementById('input-tahun-ajaran').value,
        semester: document.getElementById('select-semester').value
    };

    saveDB(); // Simpan ke LocalStorage
    showToast('Pengaturan sistem berhasil disimpan!');
}

/**
 * Logika Ganti Password
 */
function handleGantiPassword() {
    const oldPass = document.getElementById('pw-lama').value;
    const newPass = document.getElementById('pw-baru').value;
    const confirmPass = document.getElementById('pw-konfirm').value;

    // Validasi
    if (!oldPass || !newPass || !confirmPass) {
        showToast('Semua field password harus diisi!', 'error');
        return;
    }

    // Cek Password Lama
    const currentUser = DB.users[session.user];
    if (currentUser.password !== oldPass) {
        showToast('Password lama salah!', 'error');
        return;
    }

    if (newPass !== confirmPass) {
        showToast('Konfirmasi password baru tidak cocok!', 'error');
        return;
    }

    // Update Password
    currentUser.password = newPass;
    saveDB();
    
    // Reset Form & Tutup Modal
    document.getElementById('pw-lama').value = '';
    document.getElementById('pw-baru').value = '';
    document.getElementById('pw-konfirm').value = '';
    closeModal('modal-ganti-pw');
    
    showToast('Password berhasil diubah!');
}

// ==========================================
// 4. INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Jika belum login, arahkan ke login (simulasi)
    if (!session.user) {
        // Di real app, redirect ke index.html. 
        // Untuk demo ini, kita login otomatis sebagai admin
        session = { user: 'admin', role: 'admin' };
        localStorage.setItem('examShieldSession', JSON.stringify(session));
    }

    console.log('App Initialized. User:', session.user);
    
    // Render halaman awal
    navigateTo('view-dashboard'); // Pastikan ada div id="view-dashboard"
    
    // Setup Event Listeners untuk Tombol Simpan
    const btnSave = document.getElementById('btn-save-settings');
    if (btnSave) btnSave.addEventListener('click', handleSaveSettings);

    const btnPw = document.getElementById('btn-save-pw');
    if (btnPw) btnPw.addEventListener('click', handleGantiPassword);
});

// Helper Modal
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
