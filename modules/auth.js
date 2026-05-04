// modules/auth.js (contoh integrasi)
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { auth, db } from './firebase-config.js';

export async function loginUser(username, password, role) {
  try {
    // 1. Format username jadi email untuk Firebase Auth
    const email = `${username}@examshield.id`;
    
    // 2. Login via Firebase Auth
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCred.user.uid;
    
    // 3. Ambil role & profil dari Firestore
    const userDoc = await getDoc(doc(db, "users", uid));
    if (!userDoc.exists()) throw new Error("User tidak ditemukan di Firestore");
    
    const userData = userDoc.data();
    
    // 4. Validasi role yang dipilih di UI
    if (userData.role !== role) {
      await auth.signOut();
      throw new Error("Role tidak sesuai. Silakan pilih tab yang benar.");
    }
    
    return { success: true, uid, userData };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
