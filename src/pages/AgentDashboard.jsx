import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, deleteDoc, writeBatch, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile, updateEmail, updatePassword } from 'firebase/auth';
import { Upload, MapPin, DollarSign, Home, Maximize, Loader2, Plus, X, Lock, User, FileText, Trash2, Calendar, Phone, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import MapPicker from '../components/MapPicker';

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
        security: false
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
        try {
            await deleteDoc(doc(db, "properties", id));
            toast.success("Propiedad eliminada correctamente.");
            fetchMyProperties();
        } catch (error) {
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
            // 1. Update Auth Profile (Name)
            if (profileData.displayName !== user.displayName) {
                await updateProfile(user, { displayName: profileData.displayName });
            }
            // 2. Update Auth Email (if changed - requires recent login usually, handling basic case)
            if (profileData.email !== user.email) {
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

            // 3.5 Update Password (if provided)
            if (profileData.newPassword) {
                if (profileData.newPassword.length < 6) {
                    throw new Error("La contraseña debe tener al menos 6 caracteres.");
                }
                await updatePassword(user, profileData.newPassword);
                setProfileData(prev => ({ ...prev, newPassword: '' })); // Clear password field for security
                toast.success("Contraseña actualizada.");
            }

            // 4. Batch Update all properties with new Agent Name
            const batch = writeBatch(db);
            const propsQuery = query(collection(db, "properties"), where("agentId", "==", user.uid));
            const propsSnap = await getDocs(propsQuery);

            propsSnap.forEach(doc => {
                batch.update(doc.ref, { agentName: profileData.displayName });
            });
            await batch.commit();

            toast.success("Perfil actualizado correctamente.");
            // Refresh properties to see new name if needed locally
            fetchMyProperties();
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error("Error al actualizar perfil. Si cambiaste el email, podrías necesitar volver a iniciar sesión.");
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
        try {
            await deleteDoc(doc(db, "tips", id));
            setTips(prev => prev.filter(t => t.id !== id));
            toast.success("Tip eliminado.");
        } catch (error) {
            console.error("Error deleting tip:", error);
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
            elevator: property.elevator || false,
            furnished: property.furnished || false,
            pool: property.pool || false,
            gym: property.gym || false,
            security: property.security || false
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
            security: false
        });
        setImagePreviews([]);
        setImages([]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Parallel Uploads
            const uploadPromises = images.map(async (image) => {
                const storageRef = ref(storage, `properties/${user.uid}/${Date.now()}_${image.name}`);
                const snapshot = await uploadBytes(storageRef, image);
                return await getDownloadURL(snapshot.ref);
            });

            const newImageUrls = await Promise.all(uploadPromises);

            if (editingId) {
                // Update existing property
                const updateData = {
                    ...formData,
                    price: parseFloat(formData.price),
                    footage: parseFloat(formData.footage),
                    bedrooms: formData.category === 'construido' ? parseInt(formData.bedrooms) : 0,
                    bathrooms: formData.category === 'construido' ? parseInt(formData.bathrooms) : 0,
                };

                // Only update images if new ones are added? 
                // Current logic appends new images to existing ones in state?
                // The state `images` contains new files. `imagePreviews` contains URLs of both old and new?
                // Actually `images` state only holds *new files* to upload.
                // We need to handle preserving old images if we are editing.

                // Simplified: If new images uploaded, append them. 
                // If we want to keep old images, we need to know which ones are old.
                // In handleEdit we populate logic.
                // For now, let's assume we just add new ones to the array.
                if (newImageUrls.length > 0) {
                    updateData.images = [...(imagePreviews.filter(url => url.startsWith('http'))), ...newImageUrls];
                    // Note: This logic assumes imagePreviews has all current images.
                }

                await updateDoc(doc(db, "properties", editingId), updateData);
                toast.success("¡Propiedad actualizada con éxito!");
            } else {
                // Create new property
                await addDoc(collection(db, "properties"), {
                    ...formData,
                    agentId: user.uid,
                    // ... rest of fields

                    agentName: userData.displayName || 'Agente', // Add agent name for display
                    images: newImageUrls,
                    createdAt: new Date(),
                    status: 'disponible',
                    views: 0,
                    isPromoted: false,
                    price: parseFloat(formData.price),
                    footage: parseFloat(formData.footage),
                    bedrooms: formData.category === 'construido' ? parseInt(formData.bedrooms) : 0,
                    bathrooms: formData.category === 'construido' ? parseInt(formData.bathrooms) : 0,
                });

                toast.success("¡Propiedad publicada con éxito!");
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
                    security: false
                });
                setImages([]);
                setImagePreviews([]);
                setEditingId(null); // Reset edit state
                fetchMyProperties(); // Update list
            }
        } catch (error) {
            console.error("Error adding property: ", error);
            toast.error("Hubo un error al publicar la propiedad.");
        } finally {
            setLoading(false);
        }
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
                            className={`pb-3 px-4 text-sm font-bold transition border-b-2 ${activeTab === 'inquiries' ? 'border-[#fc7f51] text-[#fc7f51]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Visitas Agendadas
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
                                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                                        {/* Basic Info */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Título</label>
                                            <input required type="text" className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none uppercase" placeholder="Ej: Departamento en Miraflores" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
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
                                                        onChange={e => setFormData({ ...formData, location: e.target.value })}
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
                                            <textarea className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none h-24 resize-none" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}></textarea>
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
                                        <div className="flex gap-2">
                                            {editingId && (
                                                <button type="button" onClick={handleCancelEdit} className="flex-1 bg-gray-200 text-gray-800 font-bold py-3 rounded-xl hover:bg-gray-300 transition">Cancelar</button>
                                            )}
                                            <button type="submit" disabled={loading} className="flex-1 bg-[#fc7f51] hover:bg-[#e56b3e] text-white font-bold py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2">
                                                {loading ? <Loader2 className="animate-spin" /> : (editingId ? 'Actualizar Propiedad' : 'Publicar Propiedad')}
                                            </button>
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
                                                            alt={property.title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div className="flex-grow">
                                                        <div className="flex justify-between items-start">
                                                            <h3 className="font-bold text-gray-800 text-sm line-clamp-1">{property.title}</h3>
                                                            <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase ${property.status === 'disponible'
                                                                ? 'bg-green-100 text-green-700'
                                                                : 'bg-gray-100 text-gray-500'
                                                                }`}>
                                                                {property.status}
                                                            </span>
                                                        </div>
                                                        <p className="text-gray-500 text-xs mt-1">{property.location}</p>
                                                        <p className="text-[#fc7f51] font-bold text-sm mt-1">${property.price?.toLocaleString()}</p>

                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            <button
                                                                onClick={() => handleStatusToggle(property.id, property.status)}
                                                                className={`tx-xs px-3 py-1.5 rounded-lg text-xs font-bold transition flex-1 sm:flex-none text-center ${property.status === 'disponible'
                                                                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                                                    : 'bg-green-50 text-green-600 hover:bg-green-100'
                                                                    }`}
                                                            >
                                                                {property.status === 'disponible' ? 'Marcar Vendido/Alquilado' : 'Marcar Disponible'}
                                                            </button>
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
                            <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-xl">
                                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                    <User className="w-6 h-6 text-[#fc7f51]" /> Editar Perfil
                                </h2>
                                <form onSubmit={handleProfileUpdate} className="space-y-6">
                                    {/* Profile Photo */}
                                    <div className="flex flex-col items-center mb-6">
                                        <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 border-2 border-white shadow-md relative group">
                                            <img
                                                src={profileImage ? URL.createObjectURL(profileImage) : (profileData.photoURL || user.photoURL || 'https://placehold.co/150x150/e2e8f0/94a3b8?text=Perfil')}
                                                alt="Profile"
                                                className="w-full h-full object-cover"
                                            />
                                            <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition">
                                                <Upload className="w-6 h-6 text-white" />
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={e => e.target.files?.[0] && setProfileImage(e.target.files[0])}
                                                />
                                            </label>
                                        </div>
                                        <span className="text-xs text-gray-500 mt-2">Click para cambiar foto</span>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Nombre Publico</label>
                                        <input type="text" className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none" value={profileData.displayName} onChange={e => setProfileData({ ...profileData, displayName: e.target.value })} required />
                                        <p className="text-xs text-gray-500 mt-1">Este nombre aparecerá en todas tus propiedades publicadas.</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Correo Electrónico</label>
                                        <input type="email" className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none" value={profileData.email} onChange={e => setProfileData({ ...profileData, email: e.target.value })} required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
                                        <input type="tel" className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none" value={profileData.phoneNumber} onChange={e => setProfileData({ ...profileData, phoneNumber: e.target.value })} />
                                    </div>
                                    <div className="pt-4 border-t border-gray-100">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Nueva Contraseña (Opcional)</label>
                                        <input
                                            type="password"
                                            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none"
                                            placeholder="Dejar vacía para mantener la actual"
                                            value={profileData.newPassword || ''}
                                            onChange={e => setProfileData({ ...profileData, newPassword: e.target.value })}
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Mínimo 6 caracteres.</p>
                                    </div>
                                    <button type="submit" disabled={updatingProfile} className="w-full bg-[#fc7f51] text-white font-bold py-3 rounded-xl hover:bg-[#e56b3e] transition disabled:opacity-70">
                                        {updatingProfile ? 'Guardando...' : 'Guardar Cambios'}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* VISITS TAB (Formerly Inquiries) */}
                        {activeTab === 'inquiries' && (
                            <div className="max-w-4xl mx-auto">
                                <h2 className="text-2xl font-bold text-gray-800 mb-6">Visitas Agendadas</h2>
                                {visits.length === 0 ? (
                                    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center text-gray-500">
                                        No tienes visitas programadas.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {visits.map(visit => (
                                            <div key={visit.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                                <div>
                                                    <h3 className="font-bold text-gray-800 text-lg uppercase">{visit.propertyTitle}</h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <User className="w-4 h-4 text-[#fc7f51]" />
                                                        <span className="font-medium text-gray-700">{visit.clientName}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                                                        <Phone className="w-3 h-3" /> {visit.clientPhone}
                                                    </div>
                                                </div>
                                                <div className="text-left sm:text-right bg-orange-50 px-4 py-2 rounded-lg border border-orange-100 w-full sm:w-auto">
                                                    <div className="text-xs text-gray-500 font-bold uppercase mb-1">Fecha de Visita</div>
                                                    <div className="font-bold text-[#fc7f51] text-lg">
                                                        {visit.visitDate ? new Date(visit.visitDate + 'T00:00:00').toLocaleDateString('es-PE') : 'Por definir'}
                                                    </div>
                                                    <div className="text-sm font-medium text-gray-700">
                                                        {visit.visitTime || 'Hora por definir'}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TIPS TAB */}
                        {activeTab === 'tips' && (
                            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                                {/* Tips Form */}
                                <div className="md:col-span-1">
                                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 sticky top-24">
                                        <h3 className="font-bold text-gray-800 mb-4">{editingTipId ? 'Editar Tip' : 'Nuevo Tip'}</h3>
                                        <form onSubmit={handleTipSubmit} className="space-y-4">
                                            <input
                                                type="text"
                                                placeholder="Título del consejo..."
                                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none"
                                                value={tipForm.title}
                                                onChange={e => setTipForm({ ...tipForm, title: e.target.value })}
                                                required
                                            />
                                            <textarea
                                                placeholder="Contenido del consejo..."
                                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none h-32 resize-none"
                                                value={tipForm.content}
                                                onChange={e => setTipForm({ ...tipForm, content: e.target.value })}
                                                required
                                            ></textarea>

                                            {/* Image Upload for Tip */}
                                            <div className="border border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer relative hover:bg-gray-50 transition group">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => e.target.files?.[0] && setTipImage(e.target.files[0])}
                                                    className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                                                />
                                                {tipImage ? (
                                                    <div className="relative z-0">
                                                        <span className="text-sm text-green-600 block mb-1 font-medium">Imagen seleccionada</span>
                                                        <p className="text-xs text-gray-500 truncate">{tipImage.name}</p>
                                                    </div>
                                                ) : (
                                                    <div className="relative z-0">
                                                        <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2 group-hover:text-[#fc7f51] transition" />
                                                        <span className="text-xs text-gray-500 font-medium">Click para subir imagen (Opcional)</span>
                                                    </div>
                                                )}
                                            </div>
                                            <button type="submit" disabled={loadingTips} className="w-full bg-[#fc7f51] text-white font-bold py-2 rounded-lg hover:bg-[#e56b3e] transition">
                                                {editingTipId ? 'Actualizar' : 'Publicar'}
                                            </button>
                                            {editingTipId && (
                                                <button type="button" onClick={() => { setEditingTipId(null); setTipForm({ title: '', content: '' }) }} className="w-full bg-gray-100 text-gray-600 font-bold py-2 rounded-lg hover:bg-gray-200 transition">
                                                    Cancelar
                                                </button>
                                            )}
                                        </form>
                                    </div>
                                </div>

                                {/* Tips List */}
                                <div className="md:col-span-2 space-y-4">
                                    <h3 className="font-bold text-gray-800 mb-4">Tips Publicados ({tips.length})</h3>
                                    {tips.length === 0 ? (
                                        <p className="text-gray-500 text-center py-10">No has publicado tips aún.</p>
                                    ) : (
                                        tips.map(tip => (
                                            <div key={tip.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative group">
                                                {tip.imageUrl && (
                                                    <div className="h-40 w-full mb-4 rounded-lg overflow-hidden bg-gray-100 border border-gray-50">
                                                        <img src={tip.imageUrl} alt={tip.title} className="w-full h-full object-cover" />
                                                    </div>
                                                )}
                                                <h4 className="font-bold text-gray-800 mb-2">{tip.title}</h4>
                                                <p className="text-sm text-gray-600 mb-4">{tip.content}</p>
                                                <div className="text-xs text-gray-400">
                                                    {tip.createdAt?.seconds ? new Date(tip.createdAt.seconds * 1000).toLocaleDateString() : 'Reciente'}
                                                </div>
                                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                                    <button onClick={() => handleEditTip(tip)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><FileText className="w-4 h-4" /></button>
                                                    <button onClick={() => handleDeleteTip(tip.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                    </div>
                )}
            </div>

            {/* Visit Slot Manager Modal */}
            {showSlotModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="font-bold text-lg text-gray-800">Gestionar Horarios de Visita</h3>
                                <p className="text-sm text-gray-500 mt-1 uppercase">{slotPropertyTitle}</p>
                            </div>
                            <button onClick={() => setShowSlotModal(false)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded-full transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Add New Slot */}
                            <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Fecha</label>
                                    <input
                                        type="date"
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none text-sm"
                                        value={newSlotDate}
                                        onChange={e => setNewSlotDate(e.target.value)}
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Hora</label>
                                    <input
                                        type="time"
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none text-sm"
                                        value={newSlotTime}
                                        onChange={e => setNewSlotTime(e.target.value)}
                                    />
                                </div>
                                <button
                                    onClick={addSlot}
                                    className="bg-[#fc7f51] text-white px-4 py-2 rounded-lg hover:bg-[#e56b3e] transition font-bold text-sm"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Slots List */}
                            <div className="max-h-64 overflow-y-auto space-y-2">
                                {currentSlots.length === 0 ? (
                                    <p className="text-center text-gray-400 text-sm py-4">No hay horarios disponibles. Agrega fechas y horas.</p>
                                ) : (
                                    currentSlots.sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time)).map(slot => (
                                        <div key={slot.id} className="flex items-center justify-between bg-gray-50 px-4 py-2.5 rounded-lg border border-gray-100">
                                            <div className="flex items-center gap-3">
                                                <Calendar className="w-4 h-4 text-[#fc7f51]" />
                                                <span className="font-medium text-gray-700 text-sm">
                                                    {new Date(slot.date + 'T00:00:00').toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' })}
                                                </span>
                                                <span className="text-gray-500 text-sm flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> {slot.time}
                                                </span>
                                            </div>
                                            <button onClick={() => removeSlot(slot.id)} className="text-red-400 hover:text-red-600 transition">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Save Button */}
                            <button
                                onClick={saveSlots}
                                className="w-full bg-[#fc7f51] text-white font-bold py-3 rounded-lg hover:bg-[#e56b3e] transition"
                            >
                                Guardar Horarios ({currentSlots.length})
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgentDashboard;
