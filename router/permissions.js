/**
 * ExamShield - Router Permissions
 * File: router/permissions.js
 * 
 * Mendefinisikan akses per role yang SINKRON dengan firestore.rules
 * Jika di rules admin boleh akses X, di sini juga harus boleh.
 */

// Peta akses: role -> array halaman yang boleh diakses
export const ROLE_PERMISSIONS = {
  admin: [
    'dashboard', 'data-guru', 'data-siswa', 'kelola-kelas', 
    'data-ujian', 'bank-soal', 'monitoring', 'rekap-nilai', 
    'analisis-butir', 'log-aktivitas', 'pengaturan'
  ],
  guru: [
    'g-dashboard', 'g-buat-ujian', 'g-bank-soal', 'g-ujian-aktif', 
    'g-analisis', 'g-hasil', 'g-monitoring', 'g-profil', 'g-pengaturan'
  ],
  siswa: [
    's-dashboard', 's-ujian-tersedia', 's-hasil', 's-profil'
  ]
};

// Peta redirect default per role setelah login
export const DEFAULT_REDIRECT = {
  admin: 'dashboard',
  guru: 'g-dashboard',
  siswa: 's-dashboard'
};

// Helper: Cek apakah role boleh akses halaman tertentu
export function canAccess(role, pageId) {
  if (!role || !pageId) return false;
  const allowed = ROLE_PERMISSIONS[role] || [];
  return allowed.includes(pageId);
}

// Helper: Dapatkan redirect default untuk role
export function getDefaultPage(role) {
  return DEFAULT_REDIRECT[role] || 'dashboard';
}

// Helper: Validasi role sesuai yang dipilih di UI
export function validateRoleSelection(selectedRole, userData) {
  if (!userData || !userData.role) return false;
  return userData.role === selectedRole;
}
