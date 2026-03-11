import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuración real del proyecto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAc9Tpl_UMzN2KIqjP7B__bzEe2VZPJ32s",
  authDomain: "shiftcalculator-44abd.firebaseapp.com",
  projectId: "shiftcalculator-44abd",
  storageBucket: "shiftcalculator-44abd.firebasestorage.app",
  messagingSenderId: "813930840921",
  appId: "1:813930840921:web:96b95192d86d1ff663c248",
  measurementId: "G-EQTQDELMCV"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Servicios que usare
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
