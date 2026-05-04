/**
 * ExamShield - Logic Halaman Pengaturan
 * File: js/pengaturan.js
 * Prinsip: Modular & Secure
 */

import { 
    onAuthChange, 
    getUserData, 
    updateUserPassword, // ✅ FUNGSI BARU dari firebase-config
    getSystemSettings,  // ✅ FUNGSI BARU
    saveSystemSettings, // ✅ FUNGSI BARU
    getSchoolProfile,   // ✅ FUNGSI BARU
    saveSchoolProfile   // ✅ FUNGSI BARU
} from './firebase-config.js';

document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. Cek Login
    onAuthChange(async (user) => {
        if (!user) {
            window.location.href = '../index.html';
            return;
        }

        // 2. Load Data Awal
        await loadSchoolProfile();
        await loadSystemSettings();
    });

    // 3. Event: Ganti Password
    const formPass = document.getElementById('form-password');
    formPass.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const oldPass = document.getElementById('old-password').value;
        const newPass = document.getElementById('new-password').value;
        const confirmPass = document.getElementById('confirm-password').value;

        if (newPass !== confirmPass) {
            alert('Password baru dan konfirmasi tidak cocok!');
            return;
        }

        // Panggil fungsi update di firebase-config (menggunakan re-auth)
        const result = await updateUserPassword(oldPass, newPass);
        
        if (result.success) {
            alert('✅ Password berhasil diubah! Silakan login ulang.');
            formPass.reset();
            setTimeout(() => window.location.href = '../index.html', 2000);
        } else {
            alert('❌ Gagal: ' + result.error);
        }
    });

    // 4. Event: Simpan Anti-Curang
    document.getElementById('btn-save-anticheat').addEventListener('click', async () => {
        const settings = {
            detectTab: document.getElementById('toggle-tab-detect').checked,
            requireFullscreen: document.getElementById('toggle-fullscreen').checked,
            blockCopyPaste: document.getElementById('toggle-copy-paste').checked
        };

        const res = await saveSystemSettings(settings);
        if (res.success) alert('✅ Pengaturan Anti-Curang disimpan.');
        else alert('❌ Gagal menyimpan pengaturan.');
    });

    // 5. Event: Simpan Profil Sekolah
    const formSchool = document.getElementById('form-school');
    formSchool.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const profile = {
            name: document.getElementById('school-name').value,
            npsn: document.getElementById('school-npsn').value,
            address: document.getElementById('school-address').value
        };

        const res = await saveSchoolProfile(profile);
        if (res.success) alert('✅ Profil sekolah berhasil diupdate.');
        else alert('❌ Gagal update profil.');
    });
});

// Helper: Load Data
async function loadSchoolProfile() {
    const res = await getSchoolProfile();
    if (res.success && res.data) {
        document.getElementById('school-name').value = res.data.name || '';
        document.getElementById('school-npsn').value = res.data.npsn || '';
        document.getElementById('school-address').value = res.data.address || '';
    }
}

async function loadSystemSettings() {
    const res = await getSystemSettings();
    if (res.success && res.data) {
        document.getElementById('toggle-tab-detect').checked = res.data.detectTab ?? true;
        document.getElementById('toggle-fullscreen').checked = res.data.requireFullscreen ?? true;
        document.getElementById('toggle-copy-paste').checked = res.data.blockCopyPaste ?? true;
    }
}
