/**
 * ExamShield - Firebase Configuration
 * File ini mengatur koneksi ke Firebase (Authentication & Firestore)
 * 
 * ✅ UPDATE: Perbaikan syntax, penambahan fungsi CRUD terintegrasi, & auto-sync Auth→Firestore
 * ✅ PRINSIP: 100% additive, tidak menghapus fungsi existing
 */

// Import Firebase SDK (menggunakan CDN untuk kemudahan)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    updatePassword
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    setDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    onSnapshot,
    addDoc,
    orderBy,
    limit,
    serverTimestamp,
    Timestamp
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// ============================================
// 🔧 KONFIGURASI FIREBASE - GANTI DENGAN DATA ANDA
// ============================================
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "YOUR_MEASUREMENT_ID"
};

// ============================================
// 🚀 INISIALISASI FIREBASE
// ============================================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ============================================
// 🔐 FUNGSI AUTHENTICATION
// ============================================

/**
 * Login dengan email dan password
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise}
 */
export const loginUser = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // ✅ ADDITIVE: Auto-sync ke Firestore jika dokumen user belum ada
        await ensureUserDocument(userCredential.user);
        return { success: true, user: userCredential.user };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Logout user
 */
export const logoutUser = async () => {
    try {
        await signOut(auth);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Monitor status authentication
 * @param {Function} callback - Fungsi yang dipanggil saat auth berubah
 */
export const onAuthChange = (callback) => {
    return onAuthStateChanged(auth, async (user) => {
        if (user) {
            // ✅ ADDITIVE: Pastikan dokumen user ada di Firestore
            await ensureUserDocument(user);
        }
        callback(user);
    });
};

/**
 * Cek apakah user adalah admin
 * @param {string} uid - User ID
 * @returns {Promise<boolean>}
 */
export const checkIfAdmin = async (uid) => {
    try {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
            return userDoc.data().role === 'admin';
        }
        return false;
    } catch (error) {
        console.error("Error checking admin:", error);
        return false;
    }
};

// ============================================
// 👥 FUNGSI FIRESTORE - USERS (UPDATE)
// ============================================

/**
 * Ambil data user berdasarkan UID
 */
export const getUserData = async (uid) => {
    try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
        }
        // ✅ ADDITIVE: Fallback - buat dokumen default jika tidak ditemukan
        console.warn(`User document ${uid} not found, creating default...`);
        await ensureUserDocument({ uid });
        const newSnap = await getDoc(docRef);
        if (newSnap.exists()) {
            return { success: true, data: { id: newSnap.id, ...newSnap.data() } };
        }
        return { success: false, error: "User tidak ditemukan" };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Ambil semua guru
 */
export const getAllGuru = async () => {
    try {
        const q = query(collection(db, "users"), where("role", "==", "guru"));
        const querySnapshot = await getDocs(q);
        const guruList = [];
        querySnapshot.forEach((doc) => {
            guruList.push({ id: doc.id, ...doc.data() });
        });
        return { success: true, data: guruList };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Ambil semua siswa
 */
export const getAllSiswa = async () => {
    try {
        const q = query(collection(db, "users"), where("role", "==", "siswa"));
        const querySnapshot = await getDocs(q);
        const siswaList = [];
        querySnapshot.forEach((doc) => {
            siswaList.push({ id: doc.id, ...doc.data() });
        });
        return { success: true, data: siswaList };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * ✅ BARU: Buat user baru (Admin flow: Auth + Firestore)
 * @param {string} email - Email untuk Firebase Auth
 * @param {string} password - Password untuk Firebase Auth
 * @param {object} userData - Data profil user untuk Firestore
 * @returns {Promise}
 */
export const createNewUser = async (email, password, userData) => {
    try {
        // 1. Buat akun di Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;
        
        // 2. Simpan data profil di Firestore dengan UID sebagai Document ID
        await setDoc(doc(db, "users", uid), {
            ...userData,
            uid: uid,
            email: email,
            createdAt: serverTimestamp(),
            isActive: true
        });
        
        return { success: true, uid: uid, message: "User berhasil dibuat" };
    } catch (error) {
        console.error("Error creating user:", error);
        return { success: false, error: error.message };
    }
};

/**
 * ✅ BARU: Update password user via Firebase Auth
 * @param {string} newPassword 
 * @returns {Promise}
 */
export const updateUserPassword = async (newPassword) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Tidak ada user yang login");
        await updatePassword(user, newPassword);
        return { success: true, message: "Password berhasil diubah" };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// ============================================
// 🔄 ADDITIVE: AUTO-SYNC AUTH → FIRESTORE
// ============================================

/**
 * ✅ ADDITIVE: Pastikan dokumen user ada di Firestore
 * Jika belum ada, buat dokumen default berdasarkan data Auth
 * @param {object} user - Firebase Auth user object
 */
export const ensureUserDocument = async (user) => {
    if (!user || !user.uid) return false;
    
    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
            // Buat dokumen default dengan data minimal
            await setDoc(userRef, {
                nama: user.displayName || user.email?.split('@')[0] || 'User',
                email: user.email || '',
                role: 'guru', // Default role, bisa di-update admin nanti
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                isActive: true,
                // Field opsional bisa ditambah sesuai kebutuhan
                photoURL: user.photoURL || null
            });
            console.log(`✅ User document created for ${user.uid}`);
        }
        return true;
    } catch (error) {
        console.error("Error ensuring user document:", error);
        return false;
    }
};

// ============================================
// 📝 FUNGSI FIRESTORE - UJIAN (UPDATE)
// ============================================

/**
 * Ambil semua ujian
 */
export const getAllUjian = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, "ujian"));
        const ujianList = [];
        querySnapshot.forEach((doc) => {
            ujianList.push({ id: doc.id, ...doc.data() });
        });
        return { success: true, data: ujianList };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Ambil ujian yang sedang aktif
 * ✅ PERBAIKAN: status 'aktif' (sesuai kode HTML) bukan 'active'
 */
export const getActiveUjian = async () => {
    try {
        const q = query(collection(db, "ujian"), where("status", "==", "aktif"));
        const querySnapshot = await getDocs(q);
        const activeUjian = [];
        querySnapshot.forEach((doc) => {
            activeUjian.push({ id: doc.id, ...doc.data() });
        });
        return { success: true, data: activeUjian };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Monitoring real-time siswa yang sedang ujian
 * @param {Function} callback - Fungsi yang dipanggil saat ada update
 * @returns {Function} - Unsubscribe function
 */
export const monitorSiswaUjian = (callback) => {
    const q = query(collection(db, "ujian_siswa"), where("status", "==", "ongoing"));
    return onSnapshot(q, (snapshot) => {
        const data = [];
        snapshot.forEach((doc) => {
            data.push({ id: doc.id, ...doc.data() });
        });
        callback(data);
    });
};

// ============================================
// 📈 FUNGSI FIRESTORE - STATISTIK (PERBAIKAN SYNTAX)
// ============================================

/**
 * Hitung total dokumen dalam koleksi
 */
export const countDocuments = async (collectionName) => {
    try {
        const snapshot = await getDocs(collection(db, collectionName));
        return { success: true, count: snapshot.size };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Dapatkan statistik dashboard
 * ✅ PERBAIKAN: Syntax Promise.all yang benar
 */
export const getDashboardStats = async () => {
    try {
        const [guruRes, siswaRes, ujianRes] = await Promise.all([
            getAllGuru(),
            getAllSiswa(),
            countDocuments("ujian")
        ]);
        
        return {
            success: true,
            data: {
                totalGuru: guruRes.success ? guruRes.data.length : 0,
                totalSiswa: siswaRes.success ? siswaRes.data.length : 0,
                totalUjian: ujianRes.success ? ujianRes.count : 0
            }
        };
    } catch (error) {
        console.error("Error getting dashboard stats:", error);
        return { success: false, error: error.message };
    }
};

// ============================================
// 🔧 FUNGSI UMUM CRUD (UPDATE)
// ============================================

/**
 * Tambah dokumen baru dengan auto-ID
 */
export const addDocument = async (collectionName, data) => {
    try {
        const docRef = await addDoc(collection(db, collectionName), {
            ...data,
            createdAt: serverTimestamp()
        });
        return { success: true, id: docRef.id };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Tambah/Set dokumen dengan ID spesifik
 */
export const setDocument = async (collectionName, docId, data) => {
    try {
        await setDoc(doc(db, collectionName, docId), {
            ...data,
            updatedAt: serverTimestamp()
        });
        return { success: true, id: docId };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Update dokumen
 */
export const updateDocument = async (collectionName, docId, data) => {
    try {
        const docRef = doc(db, collectionName, docId);
        await updateDoc(docRef, {
            ...data,
            updatedAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Hapus dokumen
 */
export const deleteDocument = async (collectionName, docId) => {
    try {
        await deleteDoc(doc(db, collectionName, docId));
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * ✅ BARU: Query dengan limit & order
 */
export const getCollectionWithLimit = async (collectionName, orderByField = 'createdAt', orderDir = 'desc', limitCount = 10) => {
    try {
        const q = query(
            collection(db, collectionName),
            orderBy(orderByField, orderDir),
            limit(limitCount)
        );
        const snapshot = await getDocs(q);
        const list = [];
        snapshot.forEach(doc => {
            list.push({ id: doc.id, ...doc.data() });
        });
        return { success: true, data: list };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// ============================================
// 🆕 ADDITIVE: FUNGSI BARU UNTUK FITUR DASHBOARD
// ============================================

// --- 📋 ACTIVITY LOGS ---

/**
 * ✅ ADDITIVE: Ambil log aktivitas dengan filter
 * @param {object} options - { limit, type, userId, startDate, endDate }
 */
export const getActivityLogs = async (options = {}) => {
    try {
        const { limit: limitCount = 10, type = 'all', userId = null } = options;
        let q = collection(db, "activity_logs");
        
        // Filter by type
        if (type !== 'all') {
            q = query(q, where("action", "==", type));
        }
        
        // Filter by userId
        if (userId) {
            q = query(q, where("userId", "==", userId));
        }
        
        // Order & limit
        q = query(q, orderBy("timestamp", "desc"), limit(limitCount));
        
        const snapshot = await getDocs(q);
        const logs = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            logs.push({
                id: doc.id,
                ...data,
                // Konversi Timestamp ke Date jika perlu
                timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : data.timestamp
            });
        });
        
        return { success: true, data: logs };
    } catch (error) {
        console.error("Error getting activity logs:", error);
        return { success: false, error: error.message };
    }
};

/**
 * ✅ ADDITIVE: Catat aktivitas user
 * @param {object} logData - { userId, action, detail, ipAddress, role }
 */
export const logActivity = async (logData) => {
    try {
        await addDoc(collection(db, "activity_logs"), {
            ...logData,
            timestamp: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error("Error logging activity:", error);
        return { success: false, error: error.message };
    }
};

// --- 📊 GRADE RECAP (NILAI) ---

/**
 * ✅ ADDITIVE: Ambil rekap nilai dengan filter
 * @param {object} filters - { kelasId, ujianId, siswaId, limit }
 */
export const getGradeRecap = async (filters = {}) => {
    try {
        const { kelasId = 'all', ujianId = 'all', siswaId = null, limit: limitCount = 50 } = filters;
        let q = collection(db, "hasil");
        
        // Filter by kelas
        if (kelasId !== 'all') {
            q = query(q, where("kelasId", "==", kelasId));
        }
        
        // Filter by ujian
        if (ujianId !== 'all') {
            q = query(q, where("ujianId", "==", ujianId));
        }
        
        // Filter by siswa
        if (siswaId) {
            q = query(q, where("siswaId", "==", siswaId));
        }
        
        // Order by tanggal submit
        q = query(q, orderBy("submittedAt", "desc"), limit(limitCount));
        
        const snapshot = await getDocs(q);
        const results = [];
        let totalNilai = 0, countNilai = 0, maxNilai = -1, minNilai = 101, lulusCount = 0;
        
        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            const item = {
                id: docSnap.id,
                ...data,
                submittedAt: data.submittedAt instanceof Timestamp ? data.submittedAt.toDate() : data.submittedAt
            };
            
            // Ambil data tambahan: nama siswa, kelas, ujian (opsional, bisa di-lazy load)
            if (data.siswaId) {
                const userSnap = await getDoc(doc(db, "users", data.siswaId));
                if (userSnap.exists()) {
                    item.namaSiswa = userSnap.data().nama;
                }
            }
            if (data.kelasId) {
                const kelasSnap = await getDoc(doc(db, "kelas", data.kelasId));
                if (kelasSnap.exists()) {
                    item.namaKelas = kelasSnap.data().nama;
                }
            }
            if (data.ujianId) {
                const ujianSnap = await getDoc(doc(db, "ujian", data.ujianId));
                if (ujianSnap.exists()) {
                    item.namaUjian = ujianSnap.data().judul;
                }
            }
            
            results.push(item);
            
            // Hitung summary
            if (typeof data.nilai === 'number') {
                totalNilai += data.nilai;
                countNilai++;
                maxNilai = Math.max(maxNilai, data.nilai);
                minNilai = Math.min(minNilai, data.nilai);
                if (data.nilai >= 75) lulusCount++; // Threshold kelulusan default
            }
        }
        
        return {
            success: true,
            data: results,
            summary: countNilai > 0 ? {
                avg: totalNilai / countNilai,
                max: maxNilai,
                min: minNilai,
                total: countNilai,
                lulus: lulusCount
            } : null
        };
    } catch (error) {
        console.error("Error getting grade recap:", error);
        return { success: false, error: error.message };
    }
};

// --- 🏫 KELAS MANAGEMENT ---

/**
 * ✅ ADDITIVE: Ambil semua kelas
 */
export const getClasses = async () => {
    try {
        const q = query(collection(db, "kelas"), orderBy("nama", "asc"));
        const snapshot = await getDocs(q);
        const classes = [];
        
        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            // Hitung jumlah siswa di kelas ini (opsional, bisa di-cache)
            if (data.id) {
                const siswaQ = query(collection(db, "users"), 
                    where("role", "==", "siswa"),
                    where("kelas", "==", data.id)
                );
                const siswaSnap = await getDocs(siswaQ);
                data.jumlahSiswa = siswaSnap.size;
            }
            // Ambil nama wali kelas
            if (data.waliKelasId) {
                const waliSnap = await getDoc(doc(db, "users", data.waliKelasId));
                if (waliSnap.exists()) {
                    data.namaWali = waliSnap.data().nama;
                }
            }
            classes.push({ id: docSnap.id, ...data });
        }
        
        return { success: true, data: classes };
    } catch (error) {
        console.error("Error getting classes:", error);
        return { success: false, error: error.message };
    }
};

/**
 * ✅ ADDITIVE: Ambil detail kelas by ID
 */
export const getClassById = async (kelasId) => {
    try {
        const docRef = doc(db, "kelas", kelasId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            return { success: false, error: "Kelas tidak ditemukan" };
        }
        
        const data = docSnap.data();
        // Ambil nama wali kelas
        if (data.waliKelasId) {
            const waliSnap = await getDoc(doc(db, "users", data.waliKelasId));
            if (waliSnap.exists()) {
                data.namaWali = waliSnap.data().nama;
            }
        }
        // Hitung jumlah siswa
        const siswaQ = query(collection(db, "users"), 
            where("role", "==", "siswa"),
            where("kelas", "==", kelasId)
        );
        const siswaSnap = await getDocs(siswaQ);
        data.jumlahSiswa = siswaSnap.size;
        
        return { success: true, data: { id: docSnap.id, ...data } };
    } catch (error) {
        console.error("Error getting class by ID:", error);
        return { success: false, error: error.message };
    }
};

/**
 * ✅ ADDITIVE: Tambah kelas baru
 */
export const addClass = async (classData) => {
    try {
        const docRef = await addDoc(collection(db, "kelas"), {
            ...classData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error("Error adding class:", error);
        return { success: false, error: error.message };
    }
};

/**
 * ✅ ADDITIVE: Update kelas
 */
export const updateClass = async (kelasId, classData) => {
    try {
        await updateDoc(doc(db, "kelas", kelasId), {
            ...classData,
            updatedAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error("Error updating class:", error);
        return { success: false, error: error.message };
    }
};

/**
 * ✅ ADDITIVE: Hapus kelas
 */
export const deleteClass = async (kelasId) => {
    try {
        // ⚠️ Opsional: Cek apakah ada siswa di kelas ini sebelum hapus
        // const siswaQ = query(collection(db, "users"), where("kelas", "==", kelasId));
        // const siswaSnap = await getDocs(siswaQ);
        // if (siswaSnap.size > 0) {
        //     return { success: false, error: "Tidak bisa hapus kelas yang masih memiliki siswa" };
        // }
        
        await deleteDoc(doc(db, "kelas", kelasId));
        return { success: true };
    } catch (error) {
        console.error("Error deleting class:", error);
        return { success: false, error: error.message };
    }
};

// ============================================
// 📦 EXPORT
// ============================================
export { db, auth, serverTimestamp };
