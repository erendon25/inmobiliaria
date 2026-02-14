import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, googleProvider, appleProvider } from '../lib/firebase';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    signInWithPopup,
    sendPasswordResetEmail,
    updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Toaster, toast } from 'react-hot-toast';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    const signup = async (email, password, role = 'cliente', name = '', phone = '', dni = '') => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            // Update Auth Profile with Name
            await updateProfile(userCredential.user, { displayName: name });

            // Save user data to Firestore
            await setDoc(doc(db, "users", userCredential.user.uid), {
                email,
                role,
                displayName: name,
                phoneNumber: phone,
                dni: dni,
                createdAt: new Date()
            });
            return userCredential;
        } catch (error) {
            console.error("Signup error", error);
            throw translateError(error);
        }
    };

    const login = (email, password) => {
        return signInWithEmailAndPassword(auth, email, password)
            .catch((error) => {
                throw translateError(error);
            });
    };

    const loginWithGoogle = async (role = 'cliente') => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            // Check if user exists in Firestore, if not create default with selected role
            const userDoc = await getDoc(doc(db, "users", result.user.uid));
            if (!userDoc.exists()) {
                await setDoc(doc(db, "users", result.user.uid), {
                    email: result.user.email,
                    displayName: result.user.displayName,
                    phoneNumber: result.user.phoneNumber || '',
                    role: role,
                    createdAt: new Date()
                });
            }
            return result;
        } catch (error) {
            throw translateError(error);
        }
    };

    const loginWithApple = async (role = 'cliente') => {
        try {
            const result = await signInWithPopup(auth, appleProvider);
            const userDoc = await getDoc(doc(db, "users", result.user.uid));
            if (!userDoc.exists()) {
                await setDoc(doc(db, "users", result.user.uid), {
                    email: result.user.email,
                    displayName: result.user.displayName,
                    phoneNumber: result.user.phoneNumber || '',
                    role: role,
                    createdAt: new Date()
                });
            }
            return result;
        } catch (error) {
            throw translateError(error);
        }
    };

    const logout = () => {
        return signOut(auth);
    };

    const resetPassword = (email) => {
        return sendPasswordResetEmail(auth, email)
            .catch((error) => {
                throw translateError(error);
            });
    };

    // Helper to translate Firebase errors to user-friendly Spanish messages
    const translateError = (error) => {
        let message = "Ocurrió un error inesperado. Por favor intenta de nuevo.";
        if (error.code === 'auth/email-already-in-use') message = "Este correo ya está registrado.";
        if (error.code === 'auth/invalid-email') message = "El correo no es válido.";
        if (error.code === 'auth/user-not-found') message = "No encontramos una cuenta con este correo.";
        if (error.code === 'auth/wrong-password') message = "La contraseña es incorrecta.";
        if (error.code === 'auth/weak-password') message = "La contraseña debe tener al menos 6 caracteres.";
        return new Error(message);
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                // Fetch user data (role) from Firestore
                const userDoc = await getDoc(doc(db, "users", currentUser.uid));
                if (userDoc.exists()) {
                    setUserData(userDoc.data());
                }
            } else {
                setUserData(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        user,
        userData,
        signup,
        login,
        loginWithGoogle,
        loginWithApple,
        logout,
        resetPassword
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
            <Toaster position="top-center" />
        </AuthContext.Provider>
    );
}
