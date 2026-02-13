import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, storage, auth } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, writeBatch, deleteDoc, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile, updateEmail, updatePassword } from 'firebase/auth';
import { Upload, MapPin, DollarSign, Home, Maximize, Loader2, Plus, X, Lock, User, FileText, Star, Lightbulb, Trash2 } from 'lucide-react';
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
        // New fields
        antiquity: 'estreno', // estreno, preventa, up_to_5, 5_to_10, 10_to_20, more_than_20
        floor: '',
        elevator: false,
        parking: false,
        isExclusive: false
    });

    // Property List State
    const [myProperties, setMyProperties] = useState([]);
    const [inquiries, setInquiries] = useState([]);
    const [loadingProps, setLoadingProps] = useState(true);

    // Fetch Properties
    const fetchMyProperties = async () => {
        if (!user) return;
        try {
            const q = query(collection(db, "properties"), where("agentId", "==", user.uid));
            const querySnapshot = await getDocs(q);
            const props = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMyProperties(props);
        } catch (error) {
            console.error("Error fetching properties:", error);
        } finally {
            setLoadingProps(false);
        }
    };

    // Load properties on mount if user is activated
    useEffect(() => {
        if (userData?.isActivated) {
            fetchMyProperties();

            // Set profile data
            setProfileData({
                displayName: user.displayName || '',
                email: user.email || '',
                phoneNumber: userData.phoneNumber || ''
            });

            // Fetch Inquiries
            const fetchInquiries = async () => {
                try {
                    const q = query(collection(db, "inquiries"), where("agentId", "==", user.uid));
                    const snap = await getDocs(q);
                    setInquiries(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                } catch (error) {
                    console.error("Error fetching inquiries:", error);
                }
            };
            fetchInquiries();

            // Fetch Tips
            const fetchTips = async () => {
                try {
                    const q = query(collection(db, "tips"), where("agentId", "==", user.uid), orderBy("createdAt", "desc"));
                    const snap = await getDocs(q);
                    setTips(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                } catch (error) {
                    console.error("Error fetching tips:", error);
                }
            };
            fetchTips();
        }
    }, [user, userData]);

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

            // 3. Update Firestore User Doc
            await updateDoc(doc(db, "users", user.uid), {
                displayName: profileData.displayName,
                email: profileData.email,
                phoneNumber: profileData.phoneNumber
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
    const handleTipSubmit = async (e) => {
        e.preventDefault();
        setLoadingTips(true);
        try {
            if (editingTipId) {
                await updateDoc(doc(db, "tips", editingTipId), {
                    ...tipForm,
                    updatedAt: new Date()
                });
                toast.success("Tip actualizado.");
            } else {
                await addDoc(collection(db, "tips"), {
                    ...tipForm,
                    agentId: user.uid,
                    agentName: user.displayName || 'Agente',
                    createdAt: new Date(),
                    likes: 0
                });
                toast.success("Tip publicado.");
            }
            setTipForm({ title: '', content: '' });
            setEditingTipId(null);

            // Refresh Tips
            const q = query(collection(db, "tips"), where("agentId", "==", user.uid), orderBy("createdAt", "desc"));
            const snap = await getDocs(q);
            setTips(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error("Error saving tip:", error);
            toast.error("Error al guardar el tip.");
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
        setTipForm({ title: tip.title, content: tip.content });
        setEditingTipId(tip.id);
        setActiveTab('tips'); // Ensure tab is active
    };

    const handleStatusToggle = async (propertyId, currentStatus) => {
        const newStatus = currentStatus === 'disponible' ? 'tomada' : 'disponible';
        try {
            await updateDoc(doc(db, "properties", propertyId), {
                status: newStatus
            });
            toast.success(`Estado actualizado a: ${newStatus === 'disponible' ? 'Disponible' : 'No Disponible'}`);
            fetchMyProperties(); // Refresh list
        } catch (error) {
            console.error("Error updating status:", error);
            toast.error("No se pudo actualizar el estado.");
        }
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        const newPreviews = files.map(file => URL.createObjectURL(file));
        setImagePreviews(prev => [...prev, ...newPreviews]);
        setImages(prev => [...prev, ...files]);
    };

    const removeImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
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
            lat: property.lat || '',
            lng: property.lng || '',
            // New fields
            antiquity: property.antiquity || 'estreno',
            floor: property.floor || '',
            elevator: property.elevator || false,
            parking: property.parking || false,
            isExclusive: property.isExclusive || false
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
            floor: '',
            elevator: false,
            parking: false,
            isExclusive: false
        });
        setImagePreviews([]);
        setImages([]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const imageUrls = [];
            for (const image of images) {
                const storageRef = ref(storage, `properties/${user.uid}/${Date.now()}_${image.name}`);
                const snapshot = await uploadBytes(storageRef, image);
                const url = await getDownloadURL(snapshot.ref);
                imageUrls.push(url);
            }

            if (editingId) {
                // Update existing property
                const updateData = {
                    ...formData,
                    price: parseFloat(formData.price),
                    footage: parseFloat(formData.footage),
                    bedrooms: formData.category === 'construido' ? parseInt(formData.bedrooms) : 0,
                    bathrooms: formData.category === 'construido' ? parseInt(formData.bathrooms) : 0,
                    floor: formData.category === 'construido' && formData.floor ? parseInt(formData.floor) : null,
                };

                if (imageUrls.length > 0) {
                    updateData.images = [...(imagePreviews.filter(url => url.startsWith('http'))), ...imageUrls];
                }

                await updateDoc(doc(db, "properties", editingId), updateData);
                toast.success("¡Propiedad actualizada con éxito!");
            } else {
                // Create new property
                await addDoc(collection(db, "properties"), {
                    ...formData,
                    agentId: user.uid,
                    agentName: userData.displayName || 'Agente', // Add agent name for display
                    images: imageUrls,
                    createdAt: new Date(),
                    status: 'disponible', // Default status
                    price: parseFloat(formData.price),
                    footage: parseFloat(formData.footage),
                    bedrooms: formData.category === 'construido' ? parseInt(formData.bedrooms) : 0,
                    bathrooms: formData.category === 'construido' ? parseInt(formData.bathrooms) : 0,
                    floor: formData.category === 'construido' && formData.floor ? parseInt(formData.floor) : null,
                    views: 0 // Initialize views
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
                    floor: '',
                    elevator: false,
                    parking: false,
                    isExclusive: false
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

    // Dev Helper: Ensure an activation code exists
    // Dev Helper: Ensure an activation code exists
    useEffect(() => {
        const ensureCode = async () => {
            // Check if AGENT2024 exists
            const q = query(collection(db, "activation_codes"), where("code", "==", "AGENT2024"));
            const snapshot = await getDocs(q);
            if (snapshot.empty) {
                await addDoc(collection(db, "activation_codes"), {
                    code: "AGENT2024",
                    used: false,
                    createdAt: new Date(),
                    type: 'standard'
                });
                console.log("Created default activation code: AGENT2024");
            }
        };
        ensureCode();
    }, []);

    // REFACTOR: Don't return early. Render the dashboard, but block the form.
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
                            Solicitudes
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
                                            <input required type="text" className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none" placeholder="Ej: Departamento en Miraflores" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
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
                                            <div className="flex items-center pt-8">
                                                <label className="flex items-center cursor-pointer gap-2">
                                                    <input type="checkbox" className="w-5 h-5 accent-[#fc7f51]" checked={formData.isExclusive} onChange={e => setFormData({ ...formData, isExclusive: e.target.checked })} />
                                                    <span className="font-bold text-[#fc7f51]">¿Es Exclusiva?</span>
                                                </label>
                                            </div>
                                        </div>

                                        {formData.category === 'construido' && (
                                            <>
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">Habitaciones</label>
                                                        <input required type="number" className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none" value={formData.bedrooms} onChange={e => setFormData({ ...formData, bedrooms: e.target.value })} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">Baños</label>
                                                        <input required type="number" className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none" value={formData.bathrooms} onChange={e => setFormData({ ...formData, bathrooms: e.target.value })} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">Piso</label>
                                                        <input type="number" className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none" placeholder="Ej: 3" value={formData.floor} onChange={e => setFormData({ ...formData, floor: e.target.value })} />
                                                    </div>
                                                </div>
                                                <div className="flex gap-6">
                                                    <label className="flex items-center cursor-pointer gap-2">
                                                        <input type="checkbox" className="w-5 h-5 accent-[#fc7f51]" checked={formData.elevator} onChange={e => setFormData({ ...formData, elevator: e.target.checked })} />
                                                        <span className="text-sm font-medium text-gray-700">Ascensor</span>
                                                    </label>
                                                    <label className="flex items-center cursor-pointer gap-2">
                                                        <input type="checkbox" className="w-5 h-5 accent-[#fc7f51]" checked={formData.parking} onChange={e => setFormData({ ...formData, parking: e.target.checked })} />
                                                        <span className="text-sm font-medium text-gray-700">Cochera</span>
                                                    </label>
                                                </div>
                                            </>
                                        )}

                                        {/* Location & Map */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Ubicación</label>
                                            <div className="flex gap-2">
                                                <div className="relative flex-grow">
                                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                    <input required type="text" className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none" placeholder="Dirección o Distrito" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
                                                </div>
                                                <button type="button" onClick={() => setShowMap(true)} className="bg-[#262626] text-white px-4 rounded-lg hover:bg-black transition"><MapPin className="w-5 h-5" /></button>
                                            </div>
                                        </div>

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

                                    {/* Map Modal Reuse */}
                                    {showMap && (
                                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl h-[600px] flex flex-col overflow-hidden relative">
                                                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                                    <h3 className="font-bold text-lg text-gray-800">Seleccionar Ubicación</h3>
                                                    <button onClick={() => setShowMap(false)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded-full transition"><X className="w-5 h-5" /></button>
                                                </div>
                                                <div className="flex-grow p-0">
                                                    <MapPicker onConfirm={(loc) => { setFormData({ ...formData, location: loc.address || `${loc.lat}, ${loc.lng}`, lat: loc.lat, lng: loc.lng }); setShowMap(false); }} />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* List */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-xl font-bold text-gray-800">Mis Propiedades</h2>
                                        <span className="bg-orange-100 text-[#fc7f51] px-3 py-1 rounded-full text-sm font-bold">{myProperties.length} Total</span>
                                    </div>
                                    <div className="grid gap-4">
                                        {myProperties.map(property => (
                                            <div key={property.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4">
                                                <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 relative">
                                                    <img src={property.images?.[0]} alt={property.title} className="w-full h-full object-cover" />
                                                    {property.isExclusive && <div className="absolute top-0 left-0 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5">EXCLUSIVA</div>}
                                                </div>
                                                <div className="flex-grow">
                                                    <h3 className="font-bold text-gray-800 text-sm line-clamp-1">{property.title}</h3>
                                                    <p className="text-[#fc7f51] font-bold text-sm mt-1">{property.price?.toLocaleString()} {property.currency}</p>
                                                    <div className="mt-2 flex gap-2">
                                                        <button onClick={() => handleStatusToggle(property.id, property.status)} className={`px-2 py-1 rounded text-xs font-bold ${property.status === 'disponible' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                                            {property.status === 'disponible' ? 'Ocultar' : 'Activar'}
                                                        </button>
                                                        <button onClick={() => handleEdit(property)} className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs font-bold">Editar</button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* INQUIRIES TAB */}
                        {activeTab === 'inquiries' && (
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800 mb-6">Solicitudes de Clientes</h2>
                                <div className="grid gap-4">
                                    {inquiries.length === 0 ? <p className="text-gray-500">No hay solicitudes.</p> : inquiries.map(inq => (
                                        <div key={inq.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                            <h3 className="font-bold mb-1">{inq.propertyTitle}</h3>
                                            <p className="text-sm text-gray-600">De: {inq.clientName} ({inq.clientPhone})</p>
                                            <p className="mt-2 bg-gray-50 p-3 rounded-lg text-sm text-gray-700">"{inq.clientMessage}"</p>
                                        </div>
                                    ))}
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

                        {/* TIPS TAB */}
                        {activeTab === 'tips' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-white p-8 rounded-2xl shadow-xl h-fit">
                                    <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                        <Lightbulb className="w-6 h-6 text-[#fc7f51]" /> {editingTipId ? 'Editar Tip' : 'Nuevo Tip'}
                                    </h2>
                                    <form onSubmit={handleTipSubmit} className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Título</label>
                                            <input type="text" required className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none" placeholder="Ej: Cómo invertir seguro" value={tipForm.title} onChange={e => setTipForm({ ...tipForm, title: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Contenido</label>
                                            <textarea required className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none h-40 resize-none" placeholder="Escribe tu consejo aquí..." value={tipForm.content} onChange={e => setTipForm({ ...tipForm, content: e.target.value })}></textarea>
                                        </div>
                                        <button type="submit" disabled={loadingTips} className="w-full bg-[#fc7f51] text-white font-bold py-3 rounded-xl hover:bg-[#e56b3e] transition disabled:opacity-70">
                                            {loadingTips ? 'Guardando...' : (editingTipId ? 'Actualizar Tip' : 'Publicar Tip')}
                                        </button>
                                        {editingTipId && (
                                            <button type="button" onClick={() => { setEditingTipId(null); setTipForm({ title: '', content: '' }); }} className="w-full bg-gray-200 text-gray-800 font-bold py-3 rounded-xl mt-2">Cancelar Edición</button>
                                        )}
                                    </form>
                                </div>
                                <div className="space-y-4">
                                    <h2 className="text-xl font-bold text-gray-800">Tips Publicados ({tips.length})</h2>
                                    {tips.length === 0 ? <p className="text-gray-500">No has publicado tips aún.</p> : tips.map(tip => (
                                        <div key={tip.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative group">
                                            <h3 className="font-bold text-gray-800 mb-2">{tip.title}</h3>
                                            <p className="text-sm text-gray-600 line-clamp-3">{tip.content}</p>
                                            <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4">
                                                <button onClick={() => handleEditTip(tip)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><FileText className="w-4 h-4" /></button>
                                                <button onClick={() => handleDeleteTip(tip.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AgentDashboard;
