const firebaseConfig = {
    apiKey: "AIzaSyDWPVO1Fl9kU0BSwnGfb_rJVnoxPhQLdLI",
    authDomain: "nexacore-733c9.firebaseapp.com",
    projectId: "nexacore-733c9",
    storageBucket: "nexacore-733c9.firebasestorage.app",
    messagingSenderId: "695132076215",
    appId: "1:695132076215:web:ccc891cfa18e3a859d3532",
    measurementId: "G-31E16WZNVM"
};

// Importar los módulos necesarios de Firebase desde el CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, query, orderBy, limit, increment, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Exportar instancias para usar en otras partes
export { db, storage, doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, query, orderBy, limit, increment, onSnapshot, ref, uploadBytes, getDownloadURL };
