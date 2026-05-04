/**
 * ExamShield - Firebase Configuration
 * File ini mengatur koneksi ke Firebase (Authentication & Firestore)
 * 
 * ✅ UPDATE: Perbaikan syntax & penambahan fungsi CRUD user terintegrasi
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
    serverTimestamp
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
    return onAuthStateChanged(auth, callback);
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
// 📦 EXPORT
// ============================================
export { db, auth, serverTimestamp };
