/**
 * ExamShield - Router Guard
 * File: router/guard.js
 * 
 * Fungsi untuk memvalidasi akses sebelum mengizinkan navigasi.
 * Bekerja bersama permissions.js dan sinkron dengan firestore.rules.
 */

import { canAccess, getDefaultPage, validateRoleSelection } from './permissions.js';

/**
 * Guard: Validasi sebelum login diizinkan
 * @param {string} selectedRole - Role yang dipilih di UI (admin/guru/siswa)
 * @param {object} userData - Data user dari DB/Firestore
 * @returns {object} { allowed: boolean, message: string, redirect: string }
 */
export function guardLogin(selectedRole, userData) {
  // 1. Validasi role selection sesuai data user
  if (!validateRoleSelection(selectedRole, userData)) {
    return {
      allowed: false,
      message: 'Role tidak sesuai. Silakan pilih tab yang benar.',
      redirect: null
    };
  }

  // 2. Cek apakah user punya akses ke halaman default role-nya
  const defaultPage = getDefaultPage(userData.role);
  if (!canAccess(userData.role, defaultPage)) {
    return {
      allowed: false,
      message: 'Akses ditolak: Role tidak memiliki izin akses sistem.',
      redirect: null
    };
  }

  // ✅ Login diizinkan
  return {
    allowed: true,
    message: 'Login berhasil',
    redirect: defaultPage
  };
}

/**
 * Guard: Validasi sebelum navigasi ke halaman tertentu
 * @param {string} role - Role user yang sedang login
 * @param {string} targetPage - Halaman yang ingin diakses
 * @returns {object} { allowed: boolean, message: string, fallback: string }
 */
export function guardNavigation(role, targetPage) {
  // Admin bisa akses semua (sesuai firestore.rules)
  if (role === 'admin') {
    return { allowed: true, message: '', fallback: 'dashboard' };
  }

  // Cek permissions
  if (!canAccess(role, targetPage)) {
    return {
      allowed: false,
      message: 'Akses ditolak: Anda tidak memiliki izin untuk halaman ini.',
      fallback: getDefaultPage(role)
    };
  }

  return { allowed: true, message: '', fallback: getDefaultPage(role) };
}

/**
 * Guard: Validasi akses data berdasarkan ownership (untuk guru)
 * @param {string} role 
 * @param {string} currentUserId 
 * @param {string} targetOwnerId - ID pemilik data yang diakses
 * @returns {boolean}
 */
export function guardDataAccess(role, currentUserId, targetOwnerId) {
  if (role === 'admin') return true; // Admin bisa akses semua
  if (role === 'guru') return currentUserId === targetOwnerId; // Guru hanya akses data sendiri
  return false; // Siswa tidak boleh akses data user lain
}
