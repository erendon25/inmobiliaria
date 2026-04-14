import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, googleProvider, appleProvider } from '../lib/firebase';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    signInWithRedirect,
    getRedirectResult,
    signInWithCredential,
    GoogleAuthProvider,
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
    const [impersonatedUser, setImpersonatedUserInternal] = useState(null);
    const [impersonatedUserData, setImpersonatedUserData] = useState(null);

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
            // Check if running in Android Native bridge
            if (window.Android && window.Android.loginWithGoogle) {
                localStorage.setItem('pending_google_role', role);
                window.Android.loginWithGoogle();
                return;
            }
            
            // Standard Web flow
            localStorage.setItem('pending_google_role', role);
            await signInWithRedirect(auth, googleProvider);
        } catch (error) {
            throw translateError(error);
        }
    };

    const loginWithApple = async (role = 'cliente') => {
        try {
            localStorage.setItem('pending_apple_role', role);
            await signInWithRedirect(auth, appleProvider);
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

    // Handle Auth Redirect Result & Native Bridge
    useEffect(() => {
        // Global callback for Android bridge
        window.onAndroidLoginSuccess = async (idToken) => {
            try {
                const credential = GoogleAuthProvider.credential(idToken);
                const result = await signInWithCredential(auth, credential);
                
                const role = localStorage.getItem('pending_google_role') || 'cliente';
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
                localStorage.removeItem('pending_google_role');
                toast.success("¡Bienvenido!");
            } catch (error) {
                console.error("Native login error", error);
                toast.error("Error al iniciar sesión con Google nativo");
            }
        };

        window.onAndroidLoginError = (error) => {
            console.error("Native login error", error);
            toast.error("Error en el inicio de sesión nativo");
        };

        const checkRedirect = async () => {
            try {
                const result = await getRedirectResult(auth);
                if (result) {
                    const role = localStorage.getItem('pending_google_role') || localStorage.getItem('pending_apple_role') || 'cliente';
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
                    localStorage.removeItem('pending_google_role');
                    localStorage.removeItem('pending_apple_role');
                }
            } catch (error) {
                console.error("Error processing redirect result", error);
            }
        };
        checkRedirect();
    }, []);

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
                        
                        // Bridge: Register FCM Token if running in Android app
                        if (window.Android && window.Android.getFCMToken) {
                            const token = window.Android.getFCMToken();
                            if (token && token.length > 10) {
                                const currentTokens = docSnap.data().fcmTokens || [];
                                if (!currentTokens.includes(token)) {
                                    updateDoc(docRef, {
                                        fcmTokens: arrayUnion(token)
                                    }).catch(e => console.error("Error saving FCM token", e));
                                }
                            }
                        }
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

    const setImpersonatedUser = async (uid) => {
        if (!uid) {
            setImpersonatedUserInternal(null);
            setImpersonatedUserData(null);
            setRoleOverride(null);
            localStorage.removeItem('impersonated_uid');
            return;
        }
        
        try {
            const userDoc = await getDoc(doc(db, "users", uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                setImpersonatedUserInternal({ uid: uid, email: data.email, displayName: data.displayName, isImpersonated: true });
                setImpersonatedUserData({ ...data, id: uid });
                setRoleOverride(data.role);
                localStorage.setItem('impersonated_uid', uid);
                toast.success(`Actuando como: ${data.displayName || data.email}`);
            } else {
                toast.error("Usuario no encontrado para suplantación");
                localStorage.removeItem('impersonated_uid');
            }
        } catch (error) {
            console.error("Error setting impersonated user:", error);
            toast.error("Error al iniciar suplantación");
        }
    };

    // Restore impersonation on load
    useEffect(() => {
        const storedUid = localStorage.getItem('impersonated_uid');
        if (storedUid && userData?.role === 'superadmin') {
            setImpersonatedUser(storedUid);
        } else if (userData && userData.role !== 'superadmin') {
            // Security: clear impersonation if real user is no longer superadmin
            localStorage.removeItem('impersonated_uid');
        }
    }, [userData?.role]); // Re-run when user data/role is available

    const effectiveUser = impersonatedUser || user;
    const effectiveUserData = impersonatedUserData || (userData ? { ...userData, role: roleOverride || userData.role } : null);

    const value = {
        user: effectiveUser,
        userData: effectiveUserData,
        realUser: user,
        realUserData: userData,
        impersonatedUser,
        setImpersonatedUser,
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
