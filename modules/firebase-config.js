/**
 * ExamShield - Firebase Configuration
 * File ini mengatur koneksi ke Firebase (Authentication & Firestore)
 * 
 * PENTING: Ganti konfigurasi di bawah dengan kredensial dari proyek Firebase Anda
 */

// Import Firebase SDK (menggunakan CDN untuk kemudahan)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
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
    addDoc
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
// 📊 FUNGSI FIRESTORE - USERS
// ============================================

/**
 * Ambil data user berdasarkan UID
 */
export const getUserData = async (uid) => {
    try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { success: true, data: docSnap.data() };
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

// ============================================
// 📝 FUNGSI FIRESTORE - UJIAN
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
 */
export const getActiveUjian = async () => {
    try {
        const q = query(collection(db, "ujian"), where("status", "==", "active"));
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
// 📈 FUNGSI FIRESTORE - STATISTIK
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
 */
export const getDashboardStats = async () => {
    try {
        const [guruCount, siswaCount, ujianCount] = await Promise.all([
            countDocuments("users").then(r => r.success ? 
                (await getAllGuru()).data.length : 0,
            countDocuments("users").then(r => r.success ? 
                (await getAllSiswa()).data.length : 0,
            countDocuments("ujian")
        ]);
        
        return {
            success: true,
            data: {
                totalGuru: guruCount,
                totalSiswa: siswaCount,
                totalUjian: ujianCount.count
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// ============================================
// 🔧 FUNGSI UMUM
// ============================================

/**
 * Tambah dokumen baru
 */
export const addDocument = async (collectionName, data) => {
    try {
        const docRef = await addDoc(collection(db, collectionName), data);
        return { success: true, id: docRef.id };
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
        await updateDoc(docRef, data);
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

// Export db dan auth untuk kebutuhan khusus
export { db, auth };
