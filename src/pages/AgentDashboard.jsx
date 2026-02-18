import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, deleteDoc, writeBatch, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { Upload, MapPin, DollarSign, Home, Maximize, Loader2, Plus, X, Lock, User, FileText, Trash2, Calendar, Phone, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import MapPicker from '../components/MapPicker';
import logo from '../assets/logo.png';

const AgentDashboard = () => {
    const { user, userData } = useAuth();
    const [loading, setLoading] = useState(false);
    const [showMap, setShowMap] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [activeTab, setActiveTab] = useState('properties'); // properties, inquiries, profile, tips

    // Activation State
    const [activationCode, setActivationCode] = useState('');
    const [activating, setActivating] = useState(false);

    // Profile State
    const [profileData, setProfileData] = useState({
        displayName: '',
        email: '',
        phoneNumber: '',
        newPassword: ''
    });
    const [updatingProfile, setUpdatingProfile] = useState(false);

    // Tips State
    const [tips, setTips] = useState([]);
    const [tipForm, setTipForm] = useState({ title: '', content: '' });
    const [tipImage, setTipImage] = useState(null);
    const [editingTipId, setEditingTipId] = useState(null);
    const [loadingTips, setLoadingTips] = useState(false);

    // Property Form State
    const [images, setImages] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'venta',
        currency: 'USD',
        price: '',
        category: 'construido',
        location: '',
        footage: '',
        bedrooms: '',
        bathrooms: '',
        // Details
        antiquity: 'estreno',
        isExclusive: false,
        isInBuilding: false,
        floor: '',
        isDuplex: false,
        parking: false,
        elevator: false,
        furnished: false,
        pool: false,
        gym: false,
        security: false,
        // Accessibility & Financial
        disabilityAccess: false,
        ramp: false,
        mortgageEligible: false,
        // Publish Status
        status: 'draft', // draft or disponible
        exchangeRate: 3.80
    });

    // Property List State
    const [myProperties, setMyProperties] = useState([]);
    const [visits, setVisits] = useState([]); // Replaces inquiries
    const [loadingProps, setLoadingProps] = useState(true);
    const [profileImage, setProfileImage] = useState(null);

    // Visit Slot Management
    const [showSlotModal, setShowSlotModal] = useState(false);
    const [slotPropertyId, setSlotPropertyId] = useState(null);
    const [slotPropertyTitle, setSlotPropertyTitle] = useState('');
    const [currentSlots, setCurrentSlots] = useState([]);
    const [newSlotDate, setNewSlotDate] = useState('');
    const [newSlotTime, setNewSlotTime] = useState('');

    // Fetch my properties function
    const fetchMyProperties = async () => {
        if (!user) return;
        setLoadingProps(true);
        try {
            const q = query(collection(db, "properties"), where("agentId", "==", user.uid));
            const snap = await getDocs(q);
            const props = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            props.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setMyProperties(props);
        } catch (error) {
            console.error("Error fetching properties:", error);
        } finally {
            setLoadingProps(false);
        }
    };

    // Fetch my tips function
    const fetchMyTips = async () => {
        if (!user) return;
        setLoadingTips(true);
        try {
            // Note: This query requires a composite index on agentId (ASC) + createdAt (DESC)
            const q = query(collection(db, "tips"), where("agentId", "==", user.uid), orderBy("createdAt", "desc"));
            const snap = await getDocs(q);
            setTips(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error("Error fetching tips:", error);
            // Don't show toast on initial load error, maybe index is building
        } finally {
            setLoadingTips(false);
        }
    };

    // Load data on mount/tab change if user is activated
    useEffect(() => {
        if (userData?.isActivated) {
            fetchMyProperties();

            // Also fetch visits
            const fetchVisits = async () => {
                try {
                    const q = query(collection(db, "visits"), where("agentId", "==", user.uid));
                    const snap = await getDocs(q);
                    setVisits(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                } catch (error) {
                    console.error("Error fetching visits:", error);
                }
            };
            fetchVisits();

            // Fetch tips if active tab or first load
            fetchMyTips();

            // Fetch Exchange Rate to pre-fill form
            const fetchExchangeRate = async () => {
                try {
                    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
                    if (response.ok) {
                        const data = await response.json();
                        // This API returns a base and rates. We want USD -> PEN
                        const rate = data.rates.PEN;
                        if (rate) {
                            setFormData(prev => ({ ...prev, exchangeRate: rate }));
                        }
                    }
                } catch (error) {
                    console.error("Error fetching initial exchange rate:", error);
                    // Keep default 3.80 if fails
                }
            };
            fetchExchangeRate();
        }

        // Initialize profile form with current user data
        setProfileData({
            displayName: userData?.displayName || user?.displayName || '',
            email: userData?.email || user?.email || '',
            phoneNumber: userData?.phoneNumber || '',
            newPassword: '',
            photoURL: userData?.photoURL || user?.photoURL || ''
        });
    }, [user, userData]);

    const handleDelete = async (id) => {
        if (!window.confirm("¿Estás seguro de que deseas eliminar esta propiedad?")) return;
        // Optimistic: remove immediately from UI
        const backup = myProperties;
        setMyProperties(prev => prev.filter(p => p.id !== id));
        toast.success("Propiedad eliminada correctamente.");
        try {
            await deleteDoc(doc(db, "properties", id));
        } catch (error) {
            // Revert on error
            setMyProperties(backup);
            console.error("Error deleting property:", error);
            toast.error("Error al eliminar la propiedad.");
        }
    };

    const handleActivation = async (e) => {
        e.preventDefault();
        setActivating(true);

        try {
            // Find code
            const q = query(collection(db, "activation_codes"), where("code", "==", activationCode), where("used", "==", false));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                toast.error("Código inválido o ya usado.");
                setActivating(false);
                return;
            }

            const codeDoc = querySnapshot.docs[0];

            // Mark code as used
            await updateDoc(doc(db, "activation_codes", codeDoc.id), {
                used: true,
                usedBy: user.uid,
                usedAt: new Date()
            });

            // Activate User and link code
            await updateDoc(doc(db, "users", user.uid), {
                isActivated: true,
                activationCode: activationCode
            });

            toast.success("¡Cuenta activada con éxito! Recargando...");
            setTimeout(() => window.location.reload(), 1500);

        } catch (error) {
            console.error("Error activating account:", error);
            toast.error("Error al activar la cuenta.");
        } finally {
            setActivating(false);
        }
    };

    // Profile Update Handler
    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setUpdatingProfile(true);
        try {
            // Determine if sensitive operations are needed
            const isChangingEmail = profileData.email !== user.email;
            const isChangingPassword = profileData.newPassword && profileData.newPassword.length > 0;

            // Re-authenticate FIRST if any sensitive operation is needed
            if (isChangingEmail || isChangingPassword) {
                if (!profileData.currentPassword) {
                    throw new Error("Debes ingresar tu contraseña actual para cambiar el email o la contraseña.");
                }
                if (isChangingPassword && profileData.newPassword.length < 6) {
                    throw new Error("La nueva contraseña debe tener al menos 6 caracteres.");
                }
                const credential = EmailAuthProvider.credential(user.email, profileData.currentPassword);
                await reauthenticateWithCredential(user, credential);
            }

            // 1. Update Auth Profile (Name)
            if (profileData.displayName !== user.displayName) {
                await updateProfile(user, { displayName: profileData.displayName });
            }
            // 2. Update Auth Email (if changed - now safe because we re-authenticated above)
            if (isChangingEmail) {
                await updateEmail(user, profileData.email);
            }

            let photoURL = user.photoURL;

            // 0. Update Profile Photo if selected
            if (profileImage) {
                const storageRef = ref(storage, `profile_photos/${user.uid}/${Date.now()}_${profileImage.name}`);
                const snapshot = await uploadBytes(storageRef, profileImage);
                photoURL = await getDownloadURL(snapshot.ref);
                await updateProfile(user, { photoURL });
            }

            // 3. Update Firestore User Doc
            await updateDoc(doc(db, "users", user.uid), {
                displayName: profileData.displayName,
                email: profileData.email,
                phoneNumber: profileData.phoneNumber,
                photoURL: photoURL
            });

            // 3.5 Update Password (now safe because we re-authenticated above)
            if (isChangingPassword) {
                await updatePassword(user, profileData.newPassword);
                setProfileData(prev => ({ ...prev, newPassword: '', currentPassword: '' }));
                toast.success("Contraseña actualizada.");
            }

            // 4. Batch Update all properties with new Agent Name
            const batch = writeBatch(db);
            const propsQuery = query(collection(db, "properties"), where("agentId", "==", user.uid));
            const propsSnap = await getDocs(propsQuery);

            propsSnap.forEach(doc => {
                batch.update(doc.ref, {
                    agentName: profileData.displayName,
                    agentPhone: profileData.phoneNumber || '',
                    agentPhotoURL: photoURL
                });
            });
            await batch.commit();

            toast.success("Perfil actualizado correctamente.");
            // Refresh properties to see new name if needed locally
            fetchMyProperties();
        } catch (error) {
            console.error("Error updating profile:", error);
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                toast.error("La contraseña actual es incorrecta.");
            } else if (error.code === 'auth/requires-recent-login') {
                toast.error("Tu sesión ha expirado. Por favor, cierra sesión e inicia de nuevo.");
            } else {
                toast.error(error.message || "Error al actualizar perfil.");
            }
        } finally {
            setUpdatingProfile(false);
        }
    };

    // Tips Handlers
    // Tips Handlers
    const handleTipSubmit = async (e) => {
        e.preventDefault();
        setLoadingTips(true);
        try {
            let imageUrl = '';

            // Upload Image if exists
            if (tipImage) {
                const storageRef = ref(storage, `tip_images/${user.uid}/${Date.now()}_${tipImage.name}`);
                const snapshot = await uploadBytes(storageRef, tipImage);
                imageUrl = await getDownloadURL(snapshot.ref);
            }

            if (editingTipId) {
                const updateData = {
                    ...tipForm,
                    updatedAt: new Date()
                };
                if (imageUrl) {
                    updateData.imageUrl = imageUrl;
                }
                await updateDoc(doc(db, "tips", editingTipId), updateData);
                toast.success("Tip actualizado.");
            } else {
                await addDoc(collection(db, "tips"), {
                    ...tipForm,
                    agentId: user.uid,
                    agentName: user.displayName || 'Agente',
                    createdAt: new Date(),
                    likes: 0,
                    imageUrl: imageUrl || null
                });
                toast.success("Tip publicado.");
            }

            setTipForm({ title: '', content: '' });
            setTipImage(null);
            setEditingTipId(null);

            // Refresh Tips using helper function
            if (typeof fetchMyTips === 'function') {
                fetchMyTips();
            } else {
                // Fallback if fetchMyTips is not defined in scope (though it should be)
                // This prevents crashes if the function name changed.
                // Assuming logic to refresh tips is handled elsewhere or by a listener? 
                // Actually fetchMyTips is likely defined below or I missed it. I'll assume it exists as per previous code.
            }
        } catch (error) {
            console.error("Error saving tip:", error);
            if (error.code === 'failed-precondition') {
                toast.error("El índice de base de datos se está creando. Intenta de nuevo en unos minutos.");
            } else {
                toast.error("Error al guardar el tip.");
            }
        } finally {
            setLoadingTips(false);
        }
    };

    const handleDeleteTip = async (id) => {
        if (!window.confirm("¿Seguro que quieres eliminar este tip?")) return;
        const backup = tips;
        setTips(prev => prev.filter(t => t.id !== id));
        toast.success("Tip eliminado.");
        try {
            await deleteDoc(doc(db, "tips", id));
        } catch (error) {
            setTips(backup);
            console.error("Error deleting tip:", error);
            toast.error("Error al eliminar el tip.");
        }
    };

    const handleEditTip = (tip) => {
        setTipForm({
            title: tip.title || '',
            content: tip.content || ''
        });
        setEditingTipId(tip.id);
        setActiveTab('tips'); // Ensure tab is active
    };

    const handleStatusToggle = async (propertyId, currentStatus) => {
        const newStatus = currentStatus === 'disponible' ? 'tomada' : 'disponible';
        // Optimistic update: update local state immediately
        setMyProperties(prev => prev.map(p => p.id === propertyId ? { ...p, status: newStatus } : p));
        toast.success(`Estado actualizado a: ${newStatus === 'disponible' ? 'Disponible' : 'No Disponible'}`);
        try {
            await updateDoc(doc(db, "properties", propertyId), {
                status: newStatus
            });
        } catch (error) {
            // Revert on error
            setMyProperties(prev => prev.map(p => p.id === propertyId ? { ...p, status: currentStatus } : p));
            console.error("Error updating status:", error);
            toast.error("No se pudo actualizar el estado.");
        }
    };

    const handlePublish = async (propertyId) => {
        setMyProperties(prev => prev.map(p => p.id === propertyId ? { ...p, status: 'disponible' } : p));
        toast.success('¡Propiedad publicada con éxito!');
        try {
            await updateDoc(doc(db, "properties", propertyId), {
                status: 'disponible',
                publishedAt: new Date()
            });
        } catch (error) {
            setMyProperties(prev => prev.map(p => p.id === propertyId ? { ...p, status: 'borrador' } : p));
            console.error("Error publishing property:", error);
            toast.error("No se pudo publicar la propiedad.");
        }
    };

    // Visit Slot Management
    const openSlotManager = (property) => {
        setSlotPropertyId(property.id);
        setSlotPropertyTitle(property.title);
        setCurrentSlots(property.availableVisitSlots || []);
        setNewSlotDate('');
        setNewSlotTime('');
        setShowSlotModal(true);
    };

    const addSlot = () => {
        if (!newSlotDate || !newSlotTime) {
            toast.error('Selecciona fecha y hora.');
            return;
        }
        const newSlot = { date: newSlotDate, time: newSlotTime, id: Date.now().toString() };
        setCurrentSlots(prev => [...prev, newSlot]);
        setNewSlotDate('');
        setNewSlotTime('');
    };

    const removeSlot = (slotId) => {
        setCurrentSlots(prev => prev.filter(s => s.id !== slotId));
    };

    const saveSlots = async () => {
        try {
            await updateDoc(doc(db, "properties", slotPropertyId), {
                availableVisitSlots: currentSlots
            });
            // Optimistic: update local
            setMyProperties(prev => prev.map(p => p.id === slotPropertyId ? { ...p, availableVisitSlots: currentSlots } : p));
            toast.success('Horarios de visita guardados.');
            setShowSlotModal(false);
        } catch (error) {
            console.error('Error saving slots:', error);
            toast.error('Error al guardar horarios.');
        }
    };

    const handlePromoteToggle = async (propertyId, currentPromoted) => {
        try {
            await updateDoc(doc(db, "properties", propertyId), {
                isPromoted: !currentPromoted
            });
            toast.success(!currentPromoted ? "¡Propiedad destacada!" : "Propiedad ya no está destacada");
            // Listener handles update
        } catch (error) {
            console.error("Error updating promotion:", error);
            toast.error("Error al destacar propiedad");
        }
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const newPreviews = files.map(file => URL.createObjectURL(file));
        setImagePreviews(prev => [...prev, ...newPreviews]);
        setImages(prev => [...prev, ...files]);
    };

    const removeImage = (index) => {
        const previewToRemove = imagePreviews[index];

        if (previewToRemove.startsWith('blob:')) {
            // It's a new file.
            const blobsBefore = imagePreviews.slice(0, index).filter(url => url.startsWith('blob:')).length;
            setImages(prev => prev.filter((_, i) => i !== blobsBefore));
        }

        setImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleEdit = (property) => {
        setEditingId(property.id);
        setFormData({
            title: property.title,
            description: property.description,
            type: property.type,
            currency: property.currency || 'USD',
            price: property.price,
            category: property.category,
            location: property.location,
            footage: property.footage,
            bedrooms: property.bedrooms || '',
            bathrooms: property.bathrooms || '',
            antiquityType: property.antiquityType || 'estreno',
            antiquityYears: property.antiquityYears || '',
            lat: property.lat || '',
            lng: property.lng || '',
            // New fields
            antiquity: property.antiquity || 'estreno',
            floor: property.floor || '',
            elevator: property.elevator || false,
            parking: property.parking || false,
            isExclusive: property.isExclusive || false,
            isInBuilding: property.isInBuilding || false,
            isDuplex: property.isDuplex || false,
            furnished: property.furnished || false,
            pool: property.pool || false,
            gym: property.gym || false,
            security: property.security || false,
            disabilityAccess: property.disabilityAccess || false,
            ramp: property.ramp || false,
            mortgageEligible: property.mortgageEligible || false,
            status: property.status || 'draft',
            exchangeRate: property.exchangeRate || 3.80
        });
        setImagePreviews(property.images || []);
        setImages([]); // Clear new files queue
        setActiveTab('properties'); // Ensure properties tab is active

        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setFormData({
            title: '',
            description: '',
            type: 'venta',
            currency: 'USD',
            price: '',
            category: 'construido',
            location: '',
            footage: '',
            bedrooms: '',
            bathrooms: '',
            antiquity: 'estreno',
            isExclusive: false,
            isInBuilding: false,
            floor: '',
            isDuplex: false,
            parking: false,
            elevator: false,
            furnished: false,
            pool: false,
            gym: false,
            security: false,
            disabilityAccess: false,
            ramp: false,
            mortgageEligible: false,
            status: 'draft',
            exchangeRate: 3.80
        });
        setImagePreviews([]);
        setImages([]);
    };

    const saveProperty = async (statusOverride = null) => {
        setLoading(true);

        try {
            // Parallel Uploads
            const uploadPromises = images.map(async (image) => {
                const storageRef = ref(storage, `properties/${user.uid}/${Date.now()}_${image.name}`);
                const snapshot = await uploadBytes(storageRef, image);
                return await getDownloadURL(snapshot.ref);
            });

            const newImageUrls = await Promise.all(uploadPromises);
            const statusToUse = statusOverride || formData.status || 'draft';

            if (editingId) {
                // Update existing property
                const updateData = {
                    ...formData,
                    status: statusToUse,
                    price: parseFloat(formData.price),
                    footage: parseFloat(formData.footage),
                    bedrooms: formData.category === 'construido' ? parseInt(formData.bedrooms) : 0,
                    bathrooms: formData.category === 'construido' ? parseInt(formData.bathrooms) : 0,
                    agentPhone: userData.phoneNumber || '',
                    agentPhotoURL: userData.photoURL || ''
                };

                if (newImageUrls.length > 0) {
                    updateData.images = [...(imagePreviews.filter(url => url.startsWith('http'))), ...newImageUrls];
                }

                await updateDoc(doc(db, "properties", editingId), updateData);
                toast.success(statusToUse === 'draft' ? "Borrador guardado" : "¡Propiedad actualizada!");
            } else {
                // Create new property
                const newPropertyData = {
                    ...formData,
                    status: statusToUse, // Use override or form data
                    agentId: user.uid,
                    agentName: userData.displayName || 'Agente',
                    agentPhone: userData.phoneNumber || '',
                    agentPhotoURL: userData.photoURL || '',
                    images: newImageUrls,
                    createdAt: new Date(),
                    views: 0,
                    isPromoted: false,
                    price: parseFloat(formData.price),
                    footage: parseFloat(formData.footage),
                    bedrooms: formData.category === 'construido' ? parseInt(formData.bedrooms) : 0,
                    bathrooms: formData.category === 'construido' ? parseInt(formData.bathrooms) : 0,
                };

                await addDoc(collection(db, "properties"), newPropertyData);
                toast.success(statusToUse === 'draft' ? "Borrador guardado" : "¡Propiedad publicada!");

                // Reset form
                handleCancelEdit();
                fetchMyProperties();
            }
        } catch (error) {
            console.error("Error adding property: ", error);
            toast.error("Hubo un error al guardar.");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        saveProperty();
    };

    // Dev Helper - only attempt if user is superadmin to avoid permission errors
    useEffect(() => {
        if (userData?.role !== 'superadmin') return;
        const ensureCode = async () => {
            try {
                const q = query(collection(db, "activation_codes"), where("code", "==", "AGENT2024"));
                const snapshot = await getDocs(q);
                if (snapshot.empty) {
                    await addDoc(collection(db, "activation_codes"), {
                        code: "AGENT2024",
                        used: false,
                        createdAt: new Date(),
                        type: 'standard'
                    });
                }
            } catch (error) {
                // Silently ignore - only superadmins can create codes
                console.debug("Skipping code creation (not authorized)");
            }
        };
        ensureCode();
    }, [userData]);

    const isActivated = userData?.isActivated;

    return (
        <div className="min-h-screen bg-gray-50 pt-28 pb-12 px-6">
            <div className="container mx-auto max-w-6xl">
                {/* Header & Tabs */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold font-[Montserrat] text-gray-800 mb-6">Panel de Agente</h1>
                    <div className="flex flex-wrap gap-4 border-b border-gray-200">
                        <button
                            onClick={() => setActiveTab('properties')}
                            className={`pb-3 px-4 text-sm font-bold transition border-b-2 ${activeTab === 'properties' ? 'border-[#fc7f51] text-[#fc7f51]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Mis Propiedades
                        </button>
                        <button
                            onClick={() => setActiveTab('inquiries')}
                            className={`pb-3 px-4 text-sm font-bold transition border-b-2 relative ${activeTab === 'inquiries' ? 'border-[#fc7f51] text-[#fc7f51]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Visitas Agendadas
                            {visits.filter(v => v.status === 'pending').length > 0 && (
                                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm animate-pulse">
                                    {visits.filter(v => v.status === 'pending').length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('tips')}
                            className={`pb-3 px-4 text-sm font-bold transition border-b-2 ${activeTab === 'tips' ? 'border-[#fc7f51] text-[#fc7f51]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Tips Inmobiliarios
                        </button>
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`pb-3 px-4 text-sm font-bold transition border-b-2 ${activeTab === 'profile' ? 'border-[#fc7f51] text-[#fc7f51]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Mi Perfil
                        </button>
                    </div>
                </div>

                {!isActivated ? (
                    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mb-6">
                            <Lock className="w-8 h-8 text-[#fc7f51]" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Cuenta Inactiva</h3>
                        <p className="text-gray-500 mb-6 text-sm">
                            Ingresa tu código de activación para acceder al panel.
                        </p>
                        <form onSubmit={handleActivation} className="w-full space-y-4">
                            <input
                                type="text"
                                value={activationCode}
                                onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] focus:ring-2 focus:ring-[#fc7f51]/20 outline-none transition text-center font-mono text-lg tracking-widest uppercase"
                                placeholder="CÓDIGO"
                                required
                            />
                            <button
                                type="submit"
                                disabled={activating}
                                className="w-full bg-[#fc7f51] text-white py-3 rounded-lg font-bold hover:bg-[#e56b3e] transition disabled:opacity-70"
                            >
                                {activating ? "Verificando..." : "Activar Cuenta"}
                            </button>
                        </form>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-8">
                        {/* PROPERTIES TAB */}
                        {activeTab === 'properties' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Form */}
                                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 h-fit">
                                    <div className="bg-[#16151a] p-6 text-white">
                                        <h2 className="text-xl font-bold">{editingId ? "Editar Propiedad" : "Nueva Propiedad"}</h2>
                                    </div>
                                    <form onSubmit={(e) => handleSubmit(e)} className="p-8 space-y-6">
                                        {/* Basic Info */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Título</label>
                                            <input required type="text" className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none uppercase" placeholder="Ej: Departamento en Miraflores" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value.toUpperCase() })} />
                                        </div>

                                        {/* Global Details: Price, Type, Category */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Precio</label>
                                                <div className="flex">
                                                    <select className="w-24 px-2 py-3 rounded-l-lg border border-r-0 border-gray-200 bg-gray-50 text-sm font-bold" value={formData.currency} onChange={e => setFormData({ ...formData, currency: e.target.value })}>
                                                        <option value="USD">USD</option>
                                                        <option value="PEN">PEN</option>
                                                    </select>
                                                    <input required type="number" className="w-full px-4 py-3 rounded-r-lg border border-gray-200 focus:border-[#fc7f51] outline-none" placeholder="0.00" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Operación</label>
                                                <select className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none bg-white" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                                    <option value="venta">Venta</option>
                                                    <option value="alquiler">Alquiler</option>
                                                    <option value="alquiler">Anticresis</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
                                                <select className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none bg-white" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                                    <option value="construido">Construido</option>
                                                    <option value="terreno">Terreno</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Metraje (m²)</label>
                                                <input required type="number" className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none" placeholder="120" value={formData.footage} onChange={e => setFormData({ ...formData, footage: e.target.value })} />
                                            </div>
                                        </div>

                                        {/* Specific Details */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Antigüedad</label>
                                                <select className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none bg-white" value={formData.antiquity} onChange={e => setFormData({ ...formData, antiquity: e.target.value })}>
                                                    <option value="estreno">Estreno</option>
                                                    <option value="preventa">Pre-Venta</option>
                                                    <option value="up_to_5">Hasta 5 años</option>
                                                    <option value="5_to_10">5 a 10 años</option>
                                                    <option value="more_than_10">Más de 10 años</option>
                                                    <option value="more_than_20">Más de 20 años</option>
                                                </select>
                                            </div>
                                            <div className="flex flex-col gap-3 pt-8">
                                                <label className="flex items-center cursor-pointer gap-2">
                                                    <input type="checkbox" className="w-5 h-5 accent-[#fc7f51]" checked={formData.isExclusive} onChange={e => setFormData({ ...formData, isExclusive: e.target.checked })} />
                                                    <span className="font-bold text-[#fc7f51]">¿Es Exclusiva?</span>
                                                </label>
                                                <label className="flex items-center cursor-pointer gap-2">
                                                    <input type="checkbox" className="w-5 h-5 accent-[#fc7f51]" checked={formData.parking} onChange={e => setFormData({ ...formData, parking: e.target.checked })} />
                                                    <span className="font-medium text-gray-700">Tiene Cochera</span>
                                                </label>
                                                {formData.category === 'construido' && (
                                                    <label className="flex items-center cursor-pointer gap-2">
                                                        <input type="checkbox" className="w-5 h-5 accent-[#fc7f51]" checked={formData.isInBuilding} onChange={e => setFormData({ ...formData, isInBuilding: e.target.checked })} />
                                                        <span className="font-medium text-gray-700">Es Edificio / Departamento</span>
                                                    </label>
                                                )}
                                            </div>
                                        </div>

                                        {/* Additional Features */}
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                            <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Características Adicionales</h3>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                <label className="flex items-center cursor-pointer gap-2">
                                                    <input type="checkbox" className="w-4 h-4 accent-[#fc7f51]" checked={formData.elevator} onChange={e => setFormData({ ...formData, elevator: e.target.checked })} />
                                                    <span className="text-sm font-medium text-gray-600">Ascensor</span>
                                                </label>
                                                <label className="flex items-center cursor-pointer gap-2">
                                                    <input type="checkbox" className="w-4 h-4 accent-[#fc7f51]" checked={formData.furnished} onChange={e => setFormData({ ...formData, furnished: e.target.checked })} />
                                                    <span className="text-sm font-medium text-gray-600">Amoblado</span>
                                                </label>
                                                <label className="flex items-center cursor-pointer gap-2">
                                                    <input type="checkbox" className="w-4 h-4 accent-[#fc7f51]" checked={formData.pool} onChange={e => setFormData({ ...formData, pool: e.target.checked })} />
                                                    <span className="text-sm font-medium text-gray-600">Piscina</span>
                                                </label>
                                                <label className="flex items-center cursor-pointer gap-2">
                                                    <input type="checkbox" className="w-4 h-4 accent-[#fc7f51]" checked={formData.gym} onChange={e => setFormData({ ...formData, gym: e.target.checked })} />
                                                    <span className="text-sm font-medium text-gray-600">Gimnasio</span>
                                                </label>
                                                <label className="flex items-center cursor-pointer gap-2">
                                                    <input type="checkbox" className="w-4 h-4 accent-[#fc7f51]" checked={formData.security} onChange={e => setFormData({ ...formData, security: e.target.checked })} />
                                                    <span className="text-sm font-medium text-gray-600">Seguridad 24/7</span>
                                                </label>
                                                <label className="flex items-center cursor-pointer gap-2">
                                                    <input type="checkbox" className="w-4 h-4 accent-[#fc7f51]" checked={formData.disabilityAccess} onChange={e => setFormData({ ...formData, disabilityAccess: e.target.checked })} />
                                                    <span className="text-sm font-medium text-gray-600">Acceso Discapacitados</span>
                                                </label>
                                                <label className="flex items-center cursor-pointer gap-2">
                                                    <input type="checkbox" className="w-4 h-4 accent-[#fc7f51]" checked={formData.ramp} onChange={e => setFormData({ ...formData, ramp: e.target.checked })} />
                                                    <span className="text-sm font-medium text-gray-600">Rampa</span>
                                                </label>
                                                <label className="flex items-center cursor-pointer gap-2">
                                                    <input type="checkbox" className="w-4 h-4 accent-[#fc7f51]" checked={formData.mortgageEligible} onChange={e => setFormData({ ...formData, mortgageEligible: e.target.checked })} />
                                                    <span className="text-sm font-medium text-gray-600 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Crédito Hipotecario</span>
                                                </label>
                                            </div>
                                        </div>

                                        {formData.category === 'construido' && (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Habitaciones</label>
                                                    <input
                                                        required
                                                        type="number"
                                                        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] focus:ring-2 focus:ring-[#fc7f51]/20 outline-none transition"
                                                        value={formData.bedrooms}
                                                        onChange={e => setFormData({ ...formData, bedrooms: e.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Baños</label>
                                                    <input
                                                        required
                                                        type="number"
                                                        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] focus:ring-2 focus:ring-[#fc7f51]/20 outline-none transition"
                                                        value={formData.bathrooms}
                                                        onChange={e => setFormData({ ...formData, bathrooms: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Building Specifics - only if constructed and "Es Edificio" is checked */}
                                        {formData.category === 'construido' && formData.isInBuilding && (
                                            <div className="grid grid-cols-2 gap-4 bg-orange-50 p-4 rounded-xl border border-orange-100">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Piso</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Ej. 5"
                                                        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none bg-white"
                                                        value={formData.floor}
                                                        onChange={e => setFormData({ ...formData, floor: e.target.value })}
                                                    />
                                                </div>
                                                <div className="flex items-center pt-8">
                                                    <label className="flex items-center cursor-pointer gap-2">
                                                        <input type="checkbox" className="w-5 h-5 accent-[#fc7f51]" checked={formData.isDuplex} onChange={e => setFormData({ ...formData, isDuplex: e.target.checked })} />
                                                        <span className="font-medium text-gray-700">¿Es Dúplex?</span>
                                                    </label>
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Ubicación</label>
                                            <div className="flex gap-2">
                                                <div className="relative flex-grow">
                                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                    <input
                                                        required
                                                        type="text"
                                                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] focus:ring-2 focus:ring-[#fc7f51]/20 outline-none transition uppercase"
                                                        placeholder="Dirección o Link Maps"
                                                        value={formData.location}
                                                        onChange={async (e) => {
                                                            const value = e.target.value;
                                                            // Check if value is a Google Maps link and try to extract coordinates
                                                            let lat = null, lng = null;

                                                            // Regex for various Google Maps URL formats
                                                            // 1. @lat,lng
                                                            const atMatch = value.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
                                                            if (atMatch) {
                                                                lat = parseFloat(atMatch[1]);
                                                                lng = parseFloat(atMatch[2]);
                                                            } else {
                                                                // 2. q=lat,lng or query=lat,lng
                                                                const qMatch = value.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
                                                                if (qMatch) {
                                                                    lat = parseFloat(qMatch[1]);
                                                                    lng = parseFloat(qMatch[2]);
                                                                } else {
                                                                    // 3. /place/lat,lng or just lat,lng in path (less common but possible)
                                                                    // Or simple lat,lng string
                                                                    const simpleMatch = value.match(/^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/);
                                                                    if (simpleMatch) {
                                                                        lat = parseFloat(simpleMatch[1]);
                                                                        lng = parseFloat(simpleMatch[2]);
                                                                    }
                                                                }
                                                            }

                                                            setFormData(prev => ({
                                                                ...prev,
                                                                location: value,
                                                                ...(lat && lng ? { lat, lng } : {})
                                                            }));

                                                            if (lat && lng) {
                                                                try {
                                                                    // Reverse geocode to get clean address
                                                                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                                                                    const data = await response.json();
                                                                    if (data && data.display_name) {
                                                                        setFormData(prev => ({
                                                                            ...prev,
                                                                            location: data.display_name,
                                                                            lat: lat,
                                                                            lng: lng
                                                                        }));
                                                                        toast.success("Dirección detectada automáticamente.");
                                                                    } else {
                                                                        toast.success("¡Coordenadas detectadas del enlace!");
                                                                    }
                                                                } catch (error) {
                                                                    console.error("Geocoding error:", error);
                                                                    toast.success("¡Coordenadas detectadas del enlace!");
                                                                }
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowMap(true)}
                                                    className="bg-[#262626] text-white px-4 rounded-lg hover:bg-black transition flex items-center justify-center"
                                                    title="Buscar en Mapa"
                                                >
                                                    <MapPin className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Map Modal */}
                                        {showMap && (
                                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                                                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl h-[600px] flex flex-col overflow-hidden relative">
                                                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                                        <h3 className="font-bold text-lg text-gray-800">Seleccionar Ubicación</h3>
                                                        <button
                                                            onClick={() => setShowMap(false)}
                                                            className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded-full transition"
                                                        >
                                                            <X className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                    <div className="flex-grow p-0">
                                                        <MapPicker
                                                            onConfirm={(loc) => {
                                                                setFormData({
                                                                    ...formData,
                                                                    location: loc.address || `${loc.lat}, ${loc.lng}`,
                                                                    lat: loc.lat,
                                                                    lng: loc.lng
                                                                });
                                                                setShowMap(false);
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Description */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                                            <textarea
                                                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none h-64 resize-y text-sm md:text-base leading-relaxed"
                                                value={formData.description}
                                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                                placeholder="Describe detalladamente la propiedad..."
                                            ></textarea>
                                        </div>

                                        {/* Images */}
                                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition cursor-pointer relative">
                                            <input type="file" multiple accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                            <Upload className="h-6 w-6 text-[#fc7f51] mx-auto mb-2" />
                                            <p className="text-gray-500 text-sm">Subir fotos</p>
                                        </div>
                                        {imagePreviews.length > 0 && (
                                            <div className="grid grid-cols-4 gap-2">
                                                {imagePreviews.map((url, idx) => (
                                                    <div key={idx} className="aspect-square relative rounded-lg overflow-hidden">
                                                        <img src={url} alt="" className="w-full h-full object-cover" />
                                                        <button type="button" onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"><X className="w-3 h-3" /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex flex-col gap-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => saveProperty('draft')}
                                                    disabled={loading}
                                                    className="w-full bg-white border-2 border-dashed border-gray-300 text-gray-500 font-bold py-3 rounded-xl hover:bg-gray-50 hover:border-gray-400 hover:text-gray-700 transition flex items-center justify-center gap-2"
                                                >
                                                    <FileText className="w-5 h-5" />
                                                    {loading ? 'Guardando...' : 'Guardar Borrador'}
                                                </button>

                                                <button
                                                    type="button"
                                                    disabled={loading}
                                                    onClick={() => saveProperty('disponible')} // For now, direct publish until preview is ready
                                                    className="w-full bg-[#fc7f51] text-white font-bold py-3 rounded-xl hover:bg-[#e56b3e] shadow-lg shadow-orange-500/20 transition flex items-center justify-center gap-2"
                                                >
                                                    {loading ? <Loader2 className="animate-spin" /> : 'Publicar Ahora'}
                                                </button>
                                            </div>

                                            {editingId && (
                                                <button
                                                    type="button"
                                                    onClick={handleCancelEdit}
                                                    className="w-full bg-red-50 text-red-600 font-bold py-3 rounded-xl hover:bg-red-100 transition"
                                                >
                                                    Cancelar Edición
                                                </button>
                                            )}

                                        </div>
                                    </form>
                                </div>
                                {/* Right Column: My Properties List */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-2xl font-bold text-gray-800">Mis Propiedades</h2>
                                        <span className="bg-orange-100 text-[#fc7f51] px-3 py-1 rounded-full text-sm font-bold">
                                            {myProperties.length} Total
                                        </span>
                                    </div>

                                    {loadingProps ? (
                                        <div className="flex justify-center py-12">
                                            <Loader2 className="w-8 h-8 animate-spin text-[#fc7f51]" />
                                        </div>
                                    ) : myProperties.length === 0 ? (
                                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center text-gray-500">
                                            No has publicado ninguna propiedad aún.
                                        </div>
                                    ) : (
                                        <div className="grid gap-4">
                                            {myProperties.map(property => (
                                                <div key={property.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4">
                                                    <div className="w-full sm:w-24 h-48 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                                                        <img
                                                            src={property.images?.[0] || 'https://placehold.co/150x150/e2e8f0/94a3b8?text=Sin+Img'}
                                                            loading="lazy"
                                                            alt={property.title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div className="flex-grow">
                                                        <div className="flex justify-between items-start">
                                                            <h3 className="font-bold text-gray-800 text-sm line-clamp-1">{property.title}</h3>
                                                            <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase ${property.status === 'disponible' ? 'bg-green-100 text-green-700'
                                                                : property.status === 'borrador' ? 'bg-amber-100 text-amber-700'
                                                                    : 'bg-gray-100 text-gray-500'
                                                                }`}>
                                                                {property.status === 'borrador' ? '✏️ Borrador' : property.status}
                                                            </span>
                                                        </div>
                                                        <p className="text-gray-500 text-xs mt-1">{property.location}</p>
                                                        <p className="text-[#fc7f51] font-bold text-sm mt-1">
                                                            {property.currency === 'USD' ? '$' : 'S/.'} {property.price?.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                                        </p>

                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            {property.status === 'borrador' ? (
                                                                <button
                                                                    onClick={() => handlePublish(property.id)}
                                                                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition flex-1 sm:flex-none text-center bg-[#fc7f51] text-white hover:bg-[#e56b3e] shadow-sm"
                                                                >
                                                                    🚀 Publicar
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleStatusToggle(property.id, property.status)}
                                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex-1 sm:flex-none text-center ${property.status === 'disponible'
                                                                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                                                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                                                                        }`}
                                                                >
                                                                    {property.status === 'disponible' ? 'Marcar Vendido/Alquilado' : 'Marcar Disponible'}
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleEdit(property)}
                                                                className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-100 transition flex-1 sm:flex-none"
                                                            >
                                                                Editar
                                                            </button>
                                                            <button
                                                                onClick={() => openSlotManager(property)}
                                                                className="bg-purple-50 text-purple-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-purple-100 transition flex-1 sm:flex-none"
                                                                title="Gestionar horarios de visita"
                                                            >
                                                                <Calendar className="w-4 h-4 mx-auto" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(property.id)}
                                                                className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100 transition flex-1 sm:flex-none"
                                                            >
                                                                <Trash2 className="w-4 h-4 mx-auto" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {/* PROFILE TAB */}
                        {activeTab === 'profile' && (
                            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 max-w-2xl mx-auto">
                                <div className="bg-[#16151a] p-6 text-white text-center">
                                    <h2 className="text-xl font-bold">Mi Perfil</h2>
                                    <p className="text-gray-400 text-sm mt-1">Administra tu información personal</p>
                                </div>

                                <div className="p-8 space-y-8">
                                    {/* Profile Photo */}
                                    <div className="flex flex-col items-center">
                                        <div className="relative group cursor-pointer">
                                            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-100">
                                                {imagePreview ? (
                                                    <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                        <User className="w-12 h-12" />
                                                    </div>
                                                )}
                                            </div>
                                            <label className="absolute bottom-0 right-0 bg-[#fc7f51] text-white p-2 rounded-full shadow-lg cursor-pointer hover:bg-[#e56b3e] transition transform hover:scale-105">
                                                <Camera className="w-4 h-4" />
                                                <input type="file" accept="image/*" className="hidden" onChange={handleProfileImageChange} />
                                            </label>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-3">Click en la cámara para cambiar foto</p>
                                    </div>

                                    <form onSubmit={handleProfileUpdate} className="space-y-6">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                                                <div className="relative">
                                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        required
                                                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none"
                                                        value={profileData.displayName}
                                                        onChange={e => setProfileData({ ...profileData, displayName: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                                <div className="relative">
                                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                    <input
                                                        type="email"
                                                        required
                                                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none"
                                                        value={profileData.email}
                                                        onChange={e => setProfileData({ ...profileData, email: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                                                <div className="relative">
                                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                    <input
                                                        type="tel"
                                                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none"
                                                        value={profileData.phoneNumber}
                                                        onChange={e => setProfileData({ ...profileData, phoneNumber: e.target.value })}
                                                        placeholder="+51 999 999 999"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-gray-100">
                                            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                                <Lock className="w-4 h-4 text-[#fc7f51]" />
                                                Seguridad (Opcional)
                                            </h3>
                                            <div className="space-y-4 bg-gray-50 p-4 rounded-xl">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña Actual <span className="text-gray-400 text-xs font-normal">(Requerido para cambios sensibles)</span></label>
                                                    <input
                                                        type="password"
                                                        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none bg-white"
                                                        value={profileData.currentPassword}
                                                        onChange={e => setProfileData({ ...profileData, currentPassword: e.target.value })}
                                                        placeholder="••••••••"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña</label>
                                                    <input
                                                        type="password"
                                                        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none bg-white"
                                                        value={profileData.newPassword}
                                                        onChange={e => setProfileData({ ...profileData, newPassword: e.target.value })}
                                                        placeholder="Dejar en blanco para no cambiar"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={updatingProfile}
                                            className="w-full bg-[#fc7f51] text-white font-bold py-4 rounded-xl hover:bg-[#e56b3e] shadow-lg shadow-orange-500/20 transition flex items-center justify-center gap-2"
                                        >
                                            {updatingProfile ? <Loader2 className="animate-spin" /> : 'Guardar Cambios'}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}
                        {/* VISITS TAB */}
                        {activeTab === 'inquiries' && (
                            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 p-8">
                                <h2 className="text-xl font-bold mb-6">Visitas Agendadas</h2>
                                {visits.length === 0 ? (
                                    <p className="text-gray-500 text-center py-8">No tienes visitas agendadas aún.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {visits.map(visit => (
                                            <div key={visit.id} className="border border-gray-100 p-4 rounded-xl flex items-center justify-between hover:bg-gray-50 transition">
                                                <div>
                                                    <h3 className="font-bold text-gray-800">{visit.propertyTitle}</h3>
                                                    <p className="text-sm text-gray-500 flex items-center gap-1"><User className="w-3 h-3" /> {visit.userName} ({visit.userEmail})</p>
                                                    <p className="text-sm text-[#fc7f51] font-bold mt-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> {visit.date} - {visit.time}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    {visit.status === 'pending' && (
                                                        <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold animate-pulse">Pendiente</span>
                                                    )}
                                                    {visit.status === 'confirmed' && (
                                                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">Confirmada</span>
                                                    )}
                                                    {visit.status === 'cancelled' && (
                                                        <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">Cancelada</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        {/* TIPS TAB */}
                        {activeTab === 'tips' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Create Tip Form */}
                                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 h-fit">
                                    <div className="bg-[#16151a] p-6 text-white">
                                        <h2 className="text-xl font-bold">{editingTipId ? 'Editar Tip' : 'Nuevo Tip'}</h2>
                                    </div>
                                    <form onSubmit={handleTipSubmit} className="p-8 space-y-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Título del Tip</label>
                                            <input required type="text" className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none" value={tipForm.title} onChange={e => setTipForm({ ...tipForm, title: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Contenido</label>
                                            <textarea required className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none h-40 resize-none" value={tipForm.content} onChange={e => setTipForm({ ...tipForm, content: e.target.value })}></textarea>
                                        </div>

                                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition cursor-pointer relative">
                                            <input type="file" accept="image/*" onChange={(e) => setTipImage(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                            <p className="text-sm text-gray-500">{tipImage ? tipImage.name : 'Subir Imagen (Opcional)'}</p>
                                        </div>

                                        <div className="flex gap-3">
                                            <button type="submit" disabled={loadingTips} className="flex-1 bg-[#fc7f51] text-white font-bold py-3 rounded-xl hover:bg-[#e56b3e] transition">
                                                {loadingTips ? <Loader2 className="animate-spin mx-auto" /> : (editingTipId ? 'Actualizar Tip' : 'Publicar Tip')}
                                            </button>
                                            {editingTipId && (
                                                <button type="button" onClick={() => { setEditingTipId(null); setTipForm({ title: '', content: '' }); setTipImage(null); }} className="px-4 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition">
                                                    Cancelar
                                                </button>
                                            )}
                                        </div>
                                    </form>
                                </div>

                                {/* My Tips List */}
                                <div className="space-y-6">
                                    <h2 className="text-2xl font-bold text-gray-800">Mis Tips Publicados</h2>
                                    {tips.length === 0 ? (
                                        <p className="text-gray-500">No has publicado tips aún.</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {tips.map(tip => (
                                                <div key={tip.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4">
                                                    {tip.imageUrl && (
                                                        <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                                                            <img src={tip.imageUrl} alt="" className="w-full h-full object-cover" />
                                                        </div>
                                                    )}
                                                    <div className="flex-grow">
                                                        <h3 className="font-bold text-gray-800">{tip.title}</h3>
                                                        <p className="text-sm text-gray-500 line-clamp-2">{tip.content}</p>
                                                        <p className="text-xs text-gray-400 mt-2">Publicado: {tip.createdAt?.toDate ? tip.createdAt.toDate().toLocaleDateString() : 'Reciente'}</p>
                                                        <div className="mt-2 flex gap-2">
                                                            <button onClick={() => handleEditTip(tip)} className="text-blue-500 text-xs font-bold hover:underline">Editar</button>
                                                            <button onClick={() => handleDeleteTip(tip.id)} className="text-red-500 text-xs font-bold hover:underline">Eliminar</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )
                }
            </div >

            {/* Visit Slot Manager Modal */}
            {showSlotModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="bg-[#16151a] p-4 text-white flex justify-between items-center">
                            <h3 className="font-bold">Gestionar Horarios: {slotPropertyTitle}</h3>
                            <button onClick={() => setShowSlotModal(false)} className="hover:bg-gray-700 p-1 rounded-full"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6">
                            <div className="flex gap-2 mb-4">
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Fecha</label>
                                    <input type="date" className="w-full border p-2 rounded-lg" value={newSlotDate} onChange={e => setNewSlotDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Hora</label>
                                    <input type="time" className="w-full border p-2 rounded-lg" value={newSlotTime} onChange={e => setNewSlotTime(e.target.value)} />
                                </div>
                                <div className="flex items-end">
                                    <button onClick={addSlot} className="bg-[#fc7f51] text-white p-2 rounded-lg font-bold hover:bg-[#e56b3e]">Agg</button>
                                </div>
                            </div>

                            <div className="space-y-2 max-h-60 overflow-y-auto mb-4 custom-scrollbar">
                                {currentSlots.length === 0 ? (
                                    <p className="text-gray-400 text-sm text-center italic">No hay horarios disponibles.</p>
                                ) : (
                                    currentSlots.map(slot => (
                                        <div key={slot.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                                            <span className="text-sm font-bold text-gray-700">{slot.date} - {slot.time}</span>
                                            <button onClick={() => removeSlot(slot.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    ))
                                )}
                            </div>

                            <button onClick={saveSlots} className="w-full bg-[#16151a] text-white font-bold py-3 rounded-xl hover:bg-black transition">Guardar Horarios</button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default AgentDashboard;
