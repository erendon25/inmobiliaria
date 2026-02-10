import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Upload, MapPin, DollarSign, Home, Maximize, Loader2, Plus, X, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import MapPicker from '../components/MapPicker';

const AgentDashboard = () => {
    const { user, userData } = useAuth();
    const [loading, setLoading] = useState(false);
    const [showMap, setShowMap] = useState(false);

    // Activation State
    const [activationCode, setActivationCode] = useState('');
    const [activating, setActivating] = useState(false);

    // Property Form State
    const [images, setImages] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'venta',
        price: '',
        category: 'construido',
        location: '',
        footage: '',
        bedrooms: '',
        bathrooms: ''
    });

    // Property List State
    const [myProperties, setMyProperties] = useState([]);
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const imageUrls = await Promise.all(
                images.map(async (image) => {
                    const storageRef = ref(storage, `properties/${user.uid}/${Date.now()}_${image.name}`);
                    const snapshot = await uploadBytes(storageRef, image);
                    return await getDownloadURL(snapshot.ref);
                })
            );

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
            });

            toast.success("¡Propiedad publicada con éxito!");
            setFormData({
                title: '',
                description: '',
                type: 'venta',
                price: '',
                category: 'construido',
                location: '',
                footage: '',
                bedrooms: '',
                bathrooms: ''
            });
            setImages([]);
            setImagePreviews([]);
            fetchMyProperties(); // Update list

        } catch (error) {
            console.error("Error adding property: ", error);
            toast.error("Hubo un error al publicar la propiedad.");
        } finally {
            setLoading(false);
        }
    };

    // Dev Helper: Ensure an activation code exists
    useEffect(() => {
        const ensureCode = async () => {
            // Check if AGENT2024 exists
            const q = query(collection(db, "activation_codes"), where("code", "==", "AGENT2024"));
            const snapshot = await getDocs(q);
            if (snapshot.empty) {
                await addDoc(collection(db, "activation_codes"), {
                    code: "AGENT2024",
                    used: false, // In this case, we might want a reusable code or just infinite?
                    // For this specific request "si no hay uno crealo", let's make a reusable one or unique.
                    // Let's make a "Master Code" that doesn't get consumed, or just a standard one.
                    // The current logic consumes the code (used: true).
                    // So let's create a code that is intended for single use but we create it if missing.
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
        <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-6">
            <div className="container mx-auto max-w-6xl">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column: Create Property OR Activation */}
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 h-fit relative">
                        <div className="bg-[#16151a] p-8 text-white">
                            <h1 className="text-2xl font-bold font-[Montserrat]">Nueva Propiedad</h1>
                            <p className="text-gray-400 mt-1 text-sm">
                                {isActivated ? "Publica un nuevo inmueble" : "Activa tu cuenta para publicar"}
                            </p>
                        </div>

                        {!isActivated ? (
                            <div className="p-8 flex flex-col items-center text-center">
                                <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mb-6">
                                    <Lock className="w-8 h-8 text-[#fc7f51]" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-800 mb-2">Panel Bloqueado</h3>
                                <p className="text-gray-500 mb-6 text-sm">
                                    Para comenzar a publicar propiedades, debes activar tu cuenta de agente ingresando tu código único.
                                </p>
                                <form onSubmit={handleActivation} className="w-full space-y-4">
                                    <input
                                        type="text"
                                        value={activationCode}
                                        onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] focus:ring-2 focus:ring-[#fc7f51]/20 outline-none transition text-center font-mono text-lg tracking-widest uppercase placeholder:font-sans placeholder:tracking-normal placeholder:text-sm"
                                        placeholder="CÓDIGO: AGENT2024"
                                        required
                                    />
                                    <button
                                        type="submit"
                                        disabled={activating}
                                        className="w-full bg-[#fc7f51] text-white py-3 rounded-lg font-bold hover:bg-[#e56b3e] transition shadow-lg shadow-orange-500/30 disabled:opacity-70"
                                    >
                                        {activating ? "Verificando..." : "Activar Cuenta"}
                                    </button>
                                </form>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="p-8 space-y-6">
                                {/* Form Content - Only shown if activated */}

                                {/* Shortened Form Sections for Layout - Logic remains same */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Título</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] focus:ring-2 focus:ring-[#fc7f51]/20 outline-none transition"
                                        placeholder="Ej: Casa en San Isidro"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Precio</label>
                                        <input
                                            required
                                            type="number"
                                            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] focus:ring-2 focus:ring-[#fc7f51]/20 outline-none transition"
                                            placeholder="0.00"
                                            value={formData.price}
                                            onChange={e => setFormData({ ...formData, price: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Operación</label>
                                        <select
                                            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] focus:ring-2 focus:ring-[#fc7f51]/20 outline-none transition bg-white"
                                            value={formData.type}
                                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                                        >
                                            <option value="venta">Venta</option>
                                            <option value="alquiler">Alquiler</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
                                        <select
                                            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] focus:ring-2 focus:ring-[#fc7f51]/20 outline-none transition bg-white"
                                            value={formData.category}
                                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        >
                                            <option value="construido">Construido</option>
                                            <option value="terreno">Terreno</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Metraje (m²)</label>
                                        <input
                                            required
                                            type="number"
                                            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] focus:ring-2 focus:ring-[#fc7f51]/20 outline-none transition"
                                            placeholder="120"
                                            value={formData.footage}
                                            onChange={e => setFormData({ ...formData, footage: e.target.value })}
                                        />
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

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Ubicación</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-grow">
                                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input
                                                required
                                                type="text"
                                                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] focus:ring-2 focus:ring-[#fc7f51]/20 outline-none transition"
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

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                                    <textarea
                                        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] focus:ring-2 focus:ring-[#fc7f51]/20 outline-none transition h-24 resize-none"
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    ></textarea>
                                </div>

                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition cursor-pointer relative">
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <Upload className="h-6 w-6 text-[#fc7f51] mx-auto mb-2" />
                                    <p className="text-gray-500 text-sm">Subir fotos</p>
                                </div>

                                {imagePreviews.length > 0 && (
                                    <div className="grid grid-cols-4 gap-2">
                                        {imagePreviews.map((url, idx) => (
                                            <div key={idx} className="aspect-square relative rounded-lg overflow-hidden">
                                                <img src={url} alt="" className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => removeImage(idx)}
                                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-[#fc7f51] hover:bg-[#e56b3e] text-white font-bold py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : 'Publicar Propiedad'}
                                </button>
                            </form>
                        )}
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
                                    <div key={property.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4">
                                        <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                                            <img
                                                src={property.images?.[0] || 'https://via.placeholder.com/150'}
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

                                            <div className="mt-3 flex gap-2">
                                                <button
                                                    onClick={() => handleStatusToggle(property.id, property.status)}
                                                    className={`tx-xs px-3 py-1.5 rounded-lg text-xs font-bold transition flex-1 text-center ${property.status === 'disponible'
                                                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                                                        }`}
                                                >
                                                    {property.status === 'disponible' ? 'Marcar Vendido/Alquilado' : 'Marcar Disponible'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AgentDashboard;
