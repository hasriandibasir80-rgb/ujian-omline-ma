document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Logika Pindah Tab (Role Switcher) ---
    const tabs = document.querySelectorAll('.tab-btn');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Hapus kelas 'active' dari semua tab
            tabs.forEach(t => t.classList.remove('active'));
            // Tambah kelas 'active' ke tab yang diklik
            tab.classList.add('active');
            
            // (Opsional) Logika tambahan jika field berubah per role
            const role = tab.getAttribute('data-role');
            console.log(`Role terpilih: ${role}`);
        });
    });

    // --- 2. Logika Toggle Password (Lihat/Sembunyikan) ---
    const togglePassword = document.querySelector('#togglePassword');
    const passwordInput = document.querySelector('#password');

    togglePassword.addEventListener('click', function () {
        // Ubah tipe input antara password dan text
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        // Ubah ikon mata (open/close)
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });

    // --- 3. Logika Submit Form (Login) ---
    const loginForm = document.getElementById('loginForm');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Mencegah reload halaman
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        // Ambil role yang sedang aktif
        const activeTab = document.querySelector('.tab-btn.active');
        const role = activeTab.getAttribute('data-role');

        if (!username || !password) {
            alert('Harap isi username dan password!');
            return;
        }

        console.log('Login Attempt:', { role, username, password });
        
        // Di sini nanti kita akan memanggil fungsi Firebase Auth
        // authenticateUser(role, username, password);
        
        alert(`Login sebagai ${role} berhasil! (Simulasi)`);
    });
});
