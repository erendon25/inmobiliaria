import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, googleProvider, appleProvider } from '../lib/firebase';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    signInWithPopup,
    sendPasswordResetEmail,
    updateProfile,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Toaster, toast } from 'react-hot-toast';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [roleOverride, setRoleOverride] = useState(null);

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

    const login = async (email, password, remember = true) => {
        try {
            await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
            return await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            throw translateError(error);
        }
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
        let unsubscribeUserDoc = null;

        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                const docRef = doc(db, "users", currentUser.uid);
                // Listen to live changes
                unsubscribeUserDoc = onSnapshot(docRef, (docSnap) => {
                    if (docSnap.exists()) {
                        setUserData(docSnap.data());
                    }
                });
            } else {
                setUserData(null);
                if (unsubscribeUserDoc) {
                    unsubscribeUserDoc();
                    unsubscribeUserDoc = null;
                }
            }
            setLoading(false);
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeUserDoc) {
                unsubscribeUserDoc();
            }
        };
    }, []);

    const toggleFavorite = async (propertyId) => {
        if (!user) {
            toast.error("Debes iniciar sesión para guardar propiedades.");
            return;
        }
        try {
            const userRef = doc(db, "users", user.uid);

            // Re-read document to ensure we have the most accurate, zero-stale-closure state
            const snap = await getDoc(userRef);
            if (!snap.exists()) return;

            const currentData = snap.data();
            const isFavorite = currentData?.favorites?.includes(propertyId);

            if (isFavorite) {
                await updateDoc(userRef, {
                    favorites: arrayRemove(propertyId)
                });
                toast.success("Propiedad eliminada de favoritos");
            } else {
                await updateDoc(userRef, {
                    favorites: arrayUnion(propertyId)
                });
                toast.success("Propiedad guardada en favoritos");
            }
        } catch (error) {
            console.error("Error toggling favorite:", error);
            toast.error("Error al actualizar favoritos.");
        }
    };

    const addRecentlyViewed = async (propertyId) => {
        if (!user) return;
        try {
            const userRef = doc(db, "users", user.uid);

            // Re-read document to prevent any stale state array overwrites
            const snap = await getDoc(userRef);
            if (!snap.exists()) return;

            const currentData = snap.data();
            const currentViewed = currentData?.recentlyViewed || [];

            // Re-order to push to front
            const updated = [propertyId, ...currentViewed.filter(id => id !== propertyId)].slice(0, 20); // Keep last 20

            await updateDoc(userRef, {
                recentlyViewed: updated
            });
        } catch (error) {
            console.error("Error adding to recently viewed:", error);
        }
    };

    const saveAlerts = async (alerts) => {
        if (!user) return;
        try {
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                alerts: alerts
            });
            toast.success("Alertas actualizadas exitosamente.");
        } catch (error) {
            console.error("Error saving alerts:", error);
            toast.error("Error al actualizar alertas.");
        }
    };

    const effectiveUserData = userData ? { ...userData, role: roleOverride || userData.role } : null;

    const value = {
        user,
        userData: effectiveUserData,
        realUserData: userData,
        roleOverride,
        setRoleOverride,
        signup,
        login,
        loginWithGoogle,
        loginWithApple,
        logout,
        resetPassword,
        toggleFavorite,
        addRecentlyViewed,
        saveAlerts
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
            <Toaster position="top-center" />
        </AuthContext.Provider>
    );
}
