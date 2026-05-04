/**
 * ExamShield - Login Logic
 * File: js/login.js
 * 
 * Menangani: role selection, form validation, auth flow, session, redirect
 * ✅ Siap integrasi Firebase (komentar di bagian auth)
 */

// ============================================
// 🎯 STATE & CONFIG
// ============================================
let selectedRole = 'admin';

// Mock database (HANYA UNTUK DEMO — ganti dengan Firestore nanti)
const DB = {
  users: {
    'admin': { password: '123456', role: 'admin', nama: 'Administrator', nip: 'ADMIN001' },
    '198501012010011001': { password: 'Guru@123', role: 'guru', nama: 'Budi Santoso', nip: '198501012010011001', mapel: 'Matematika' },
    'siswa001': { password: 'Siswa@1', role: 'siswa', nama: 'Ahmad Fauzi', nisn: '0012345678', kelas: 'XII IPA 1' },
  }
};

// ============================================
// 🎨 UI INTERACTIONS
// ============================================

/**
 * Inisialisasi event listener untuk login page
 */
export function initLogin() {
  // 1. Role selector
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      selectedRole = e.currentTarget.dataset.role;
    });
  });

  // 2. Toggle password visibility
  const togglePassword = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('password');
  
  if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', () => {
      const type = passwordInput.type === 'password' ? 'text' : 'password';
      passwordInput.type = type;
      togglePassword.classList.toggle('fa-eye');
      togglePassword.classList.toggle('fa-eye-slash');
    });
  }

  // 3. Form submit handler
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  // 4. Pre-fill demo credentials (opsional, untuk testing)
  prefillDemoCredentials();
}

/**
 * Pre-fill username/password untuk testing cepat
 */
function prefillDemoCredentials() {
  const userField = document.getElementById('username');
  const passField = document.getElementById('password');
  
  // Hanya isi jika field kosong (agar tidak ganggu user sungguhan)
  if (userField && !userField.value) userField.value = 'admin';
  if (passField && !passField.value) passField.value = '123456';
}

// ============================================
// 🔐 AUTHENTICATION LOGIC
// ============================================

/**
 * Handle form submit login
 * @param {Event} e 
 */
async function handleLogin(e) {
  e.preventDefault();
  
  const username = document.getElementById('username')?.value.trim();
  const password = document.getElementById('password')?.value.trim();
  const errorEl = document.getElementById('login-error');
  
  // Reset error state
  if (errorEl) {
    errorEl.classList.add('hidden');
    errorEl.textContent = '';
  }
  
  // Validasi input dasar
  if (!username || !password) {
    showToast('Harap isi username dan password!', 'warn');
    return;
  }
  
  try {
    // 🔹 OPSI A: Pakai mock DB (untuk demo)
    const userData = await authenticateWithMockDB(username, password, selectedRole);
    
    // 🔹 OPSI B: Pakai Firebase Auth (uncomment saat integrasi)
    // const userData = await authenticateWithFirebase(username, password, selectedRole);
    
    if (!userData.success) {
      showError(userData.error || 'Login gagal!');
      return;
    }
    
    // ✅ Login berhasil
    await onLoginSuccess(userData.data);
    
  } catch (error) {
    console.error('Login error:', error);
    showError('Terjadi kesalahan sistem. Silakan coba lagi.');
  }
}

/**
 * Autentikasi dengan mock database (DEMO ONLY)
 */
async function authenticateWithMockDB(username, password, selectedRole) {
  // Simulasi delay network
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const userData = DB.users[username];
  
  if (!userData) {
    return { success: false, error: 'Username tidak ditemukan!' };
  }
  
  if (userData.password !== password) {
    return { success: false, error: 'Password salah!' };
  }
  
  if (userData.role !== selectedRole) {
    return { 
      success: false, 
      error: `Role tidak sesuai! Anda terdaftar sebagai ${userData.role}.` 
    };
  }
  
  return { 
    success: true, 
    data: { 
      uid: username, 
      role: userData.role, 
      nama: userData.nama,
      mapel: userData.mapel || null,
      kelas: userData.kelas || null
    } 
  };
}

/**
 * Autentikasi dengan Firebase Auth (SIAP PAKAI)
 * Uncomment & isi config saat integrasi
 */
/*
async function authenticateWithFirebase(username, password, selectedRole) {
  try {
    // 1. Format email untuk Firebase Auth (jika perlu)
    const email = username.includes('@') ? username : `${username}@examshield.id`;
    
    // 2. Login via Firebase Auth
    const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js');
    const { auth, db } = await import('../modules/firebase-config.js');
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    
    // 3. Ambil profil user dari Firestore
    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js');
    const userDoc = await getDoc(doc(db, 'users', uid));
    
    if (!userDoc.exists()) {
      await auth.signOut();
      return { success: false, error: 'Data user tidak ditemukan di database!' };
    }
    
    const userData = userDoc.data();
    
    // 4. Validasi role
    if (userData.role !== selectedRole) {
      await auth.signOut();
      return { 
        success: false, 
        error: `Role tidak sesuai! Anda terdaftar sebagai ${userData.role}.` 
      };
    }
    
    return { 
      success: true, 
      data: { 
        uid, 
        role: userData.role, 
        nama: userData.nama,
        mapel: userData.mapel || null,
        kelas: userData.kelas || null
      } 
    };
    
  } catch (error) {
    console.error('Firebase auth error:', error);
    
    // Map Firebase error codes to user-friendly messages
    const errorMap = {
      'auth/user-not-found': 'Username tidak ditemukan.',
      'auth/wrong-password': 'Password salah.',
      'auth/invalid-email': 'Format email tidak valid.',
      'auth/too-many-requests': 'Terlalu banyak percobaan. Coba lagi nanti.'
    };
    
    return { 
      success: false, 
      error: errorMap[error.code] || error.message || 'Login gagal!' 
    };
  }
}
*/

// ============================================
// 🚀 POST-LOGIN FLOW
// ============================================

/**
 * Eksekusi setelah login berhasil
 * @param {object} userData 
 */
async function onLoginSuccess(userData) {
  // 1. Simpan session (localStorage lebih persisten daripada sessionStorage)
  const sessionData = {
    uid: userData.uid,
    role: userData.role,
    nama: userData.nama,
    mapel: userData.mapel,
    kelas: userData.kelas,
    loginTime: new Date().toISOString()
  };
  
  localStorage.setItem('examshield_session', JSON.stringify(sessionData));
  
  // 2. Tampilkan toast sukses
  showToast(`Selamat datang, ${userData.nama}! 👋`, 'success');
  
  // 3. Redirect ke dashboard sesuai role
  const targetPage = getDashboardPage(userData.role);
  
  // Loading feedback
  showLoading(true);
  
  setTimeout(() => {
    window.location.href = `modules/${targetPage}.html`;
  }, 800);
}

/**
 * Dapatkan halaman dashboard default berdasarkan role
 */
function getDashboardPage(role) {
  const map = {
    'admin': 'dashboard',
    'guru': 'g-dashboard', 
    'siswa': 's-dashboard'
  };
  return map[role] || 'dashboard';
}

// ============================================
// 🎨 UI HELPERS
// ============================================

/**
 * Tampilkan error message di form
 */
function showError(message) {
  const errorEl = document.getElementById('login-error');
  if (!errorEl) return;
  
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
  
  // Animasi shake
  errorEl.style.animation = 'shake 0.3s ease';
  setTimeout(() => {
    errorEl.style.animation = '';
  }, 300);
}

/**
 * Tampilkan toast notification
 */
function showToast(message, type = 'info') {
  // Pastikan container ada
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
    document.body.appendChild(container);
  }
  
  const icons = { success: '✅', error: '❌', warn: '⚠️', info: 'ℹ️' };
  const colors = {
    success: 'background:#064e3b;border:1px solid #065f46;color:#6ee7b7',
    error: 'background:#450a0a;border:1px solid #7f1d1d;color:#fca5a5',
    warn: 'background:#451a03;border:1px solid #78350f;color:#fcd34d',
    info: 'background:#1e3a5f;border:1px solid #1e40af;color:#93c5fd'
  };
  
  const toast = document.createElement('div');
  toast.style.cssText = `
    display:flex;align-items:center;gap:10px;
    padding:12px 16px;border-radius:8px;
    min-width:280px;font-size:13px;font-weight:500;
    animation:slideIn 0.3s ease;
    box-shadow:0 8px 24px rgba(0,0,0,0.4);
    ${colors[type] || colors.info}
  `;
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  
  container.appendChild(toast);
  
  // Auto-remove
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/**
 * Tampilkan/hide loading overlay
 */
function showLoading(show) {
  let overlay = document.getElementById('login-loading');
  
  if (show && !overlay) {
    overlay = document.createElement('div');
    overlay.id = 'login-loading';
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(10,14,26,0.95);
      display:flex;align-items:center;justify-content:center;
      flex-direction:column;gap:16px;z-index:9998;
    `;
    overlay.innerHTML = `
      <div style="width:40px;height:40px;border:3px solid rgba(79,142,247,0.3);
        border-top-color:#4f8ef7;border-radius:50%;
        animation:spin 1s linear infinite;"></div>
      <div style="color:#e8edf8;font-size:14px;">Memuat dashboard...</div>
    `;
    document.body.appendChild(overlay);
    
    // Tambahkan keyframes jika belum ada
    if (!document.getElementById('login-keyframes')) {
      const style = document.createElement('style');
      style.id = 'login-keyframes';
      style.textContent = `
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { transform:translateX(100%);opacity:0; } to { transform:translateX(0);opacity:1; } }
        @keyframes slideOut { from { transform:translateX(0);opacity:1; } to { transform:translateX(100%);opacity:0; } }
        @keyframes shake { 0%,100% { transform:translateX(0); } 25% { transform:translateX(-5px); } 75% { transform:translateX(5px); } }
      `;
      document.head.appendChild(style);
    }
  }
  
  if (overlay) {
    overlay.style.display = show ? 'flex' : 'none';
  }
}

// ============================================
// 🔄 AUTO-CHECK SESSION (Optional)
// ============================================

/**
 * Cek apakah user sudah login, redirect ke dashboard jika ya
 * Panggil di DOMContentLoaded jika ingin auto-redirect
 */
export function checkExistingSession() {
  try {
    const sessionRaw = localStorage.getItem('examshield_session');
    if (!sessionRaw) return false;
    
    const session = JSON.parse(sessionRaw);
    
    // Validasi session sederhana (bisa diperkuat dengan timestamp expiry)
    if (session.uid && session.role && session.nama) {
      // Opsional: cek apakah masih di halaman login
      if (window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/')) {
        const target = getDashboardPage(session.role);
        window.location.href = `modules/${target}.html`;
        return true;
      }
    }
  } catch (e) {
    console.warn('Session check error:', e);
    localStorage.removeItem('examshield_session');
  }
  return false;
}

// ============================================
// 🚀 EXPORT PUBLIC API
// ============================================
export {
  initLogin,
  checkExistingSession,
  // Untuk testing/debug
  DB,
  selectedRole
};
