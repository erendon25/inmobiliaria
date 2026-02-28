import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { Heart, Search, Clock, Bell, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import PropertyCard from '../components/PropertyCard';

const ClientDashboard = () => {
    const { user, userData, saveAlerts } = useAuth();
    const [activeTab, setActiveTab] = useState('favoritos');
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savingAlert, setSavingAlert] = useState(false);

    const [alertForm, setAlertForm] = useState({
        location: '',
        type: '',
        category: '',
        minPrice: '',
        maxPrice: ''
    });

    useEffect(() => {
        if (userData?.alerts) {
            setAlertForm(userData.alerts);
        }
    }, [userData?.alerts]);

    useEffect(() => {
        const fetchProperties = async () => {
            try {
                const q = query(collection(db, "properties"));
                const snapshot = await getDocs(q);
                const props = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(p => p.status === 'disponible' || p.status === 'tomada');
                setProperties(props);
            } catch (error) {
                console.error("Error fetching properties", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProperties();
    }, []);

    const favoritesList = useMemo(() => {
        const favIds = userData?.favorites || [];
        return properties.filter(p => favIds.includes(p.id));
    }, [properties, userData?.favorites]);

    const viewedList = useMemo(() => {
        const viewedIds = userData?.recentlyViewed || [];
        // Keep order of most recent first
        return viewedIds.map(id => properties.find(p => p.id === id)).filter(Boolean);
    }, [properties, userData?.recentlyViewed]);

    const alertMatches = useMemo(() => {
        if (!userData?.alerts) return [];
        const a = userData.alerts;
        // If everything is empty, don't show all properties, show none because alert isn't configured
        if (!a.type && !a.category && !a.minPrice && !a.maxPrice && !a.location) return [];

        return properties.filter(p => {
            if (a.type && a.type !== p.type) return false;
            if (a.category && a.category !== p.category) return false;
            if (a.minPrice && Number(p.price) < Number(a.minPrice)) return false;
            if (a.maxPrice && Number(p.price) > Number(a.maxPrice)) return false;
            if (a.location && p.location && !p.location.toLowerCase().includes(a.location.toLowerCase())) return false;
            return true;
        });
    }, [properties, userData?.alerts]);

    const handleSaveAlerts = async (e) => {
        e.preventDefault();
        setSavingAlert(true);
        await saveAlerts(alertForm);
        setSavingAlert(false);
    };

    const renderEmptyState = (title, description, IconSVG, actionLink = "/") => (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
            <div className="bg-orange-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <IconSVG className="w-8 h-8 text-[#fc7f51]" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">{description}</p>
            <Link to={actionLink} className="inline-flex items-center gap-2 bg-[#fc7f51] text-white px-8 py-3 rounded-full font-bold hover:bg-[#e56b3e] transition shadow-lg shadow-orange-500/30">
                <Search className="w-5 h-5" />
                Explorar Propiedades
            </Link>
        </div>
    );

    const renderGrid = (list) => (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {list.map(prop => <PropertyCard key={prop.id} property={prop} />)}
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-6">
            <div className="container mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 font-[Montserrat]">Hola, {user?.displayName || 'Usuario'}</h1>
                    <p className="text-gray-500 mt-2">Bienvenido a tu panel personal. Aquí encontrarás las propiedades que te interesan y sugerencias automáticas basándose en tus configuraciones.</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-8 border-b border-gray-200 pb-1 overflow-x-auto whitespace-nowrap">
                    <button
                        onClick={() => setActiveTab('favoritos')}
                        className={`px-4 py-2 font-bold transition flex items-center gap-2 ${activeTab === 'favoritos' ? 'text-[#fc7f51] border-b-2 border-[#fc7f51]' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                        <Heart className="w-4 h-4" /> Mis Favoritos
                    </button>
                    <button
                        onClick={() => setActiveTab('vistos')}
                        className={`px-4 py-2 font-bold transition flex items-center gap-2 ${activeTab === 'vistos' ? 'text-[#fc7f51] border-b-2 border-[#fc7f51]' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                        <Clock className="w-4 h-4" /> Vistos Recientemente
                    </button>
                    <button
                        onClick={() => setActiveTab('alertas')}
                        className={`px-4 py-2 font-bold transition flex items-center gap-2 ${activeTab === 'alertas' ? 'text-[#fc7f51] border-b-2 border-[#fc7f51]' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                        <Bell className="w-4 h-4" /> Mis Alertas Inteligentes
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#fc7f51]"></div>
                    </div>
                ) : (
                    <>
                        {activeTab === 'favoritos' && (
                            favoritesList.length > 0
                                ? renderGrid(favoritesList)
                                : renderEmptyState("Aún no tienes favoritos", "Explora nuestro catálogo y guarda las propiedades que más te gusten para verlas aquí en cualquier momento.", Heart)
                        )}

                        {activeTab === 'vistos' && (
                            viewedList.length > 0
                                ? renderGrid(viewedList)
                                : renderEmptyState("No hay historial reciente", "Las propiedades que visites en la plataforma aparecerán automáticamente en esta sección para que no las pierdas de vista.", Clock)
                        )}

                        {activeTab === 'alertas' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                                {/* Alertas Form Sidebar */}
                                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 lg:col-span-1 sticky top-32">
                                    <div className="flex gap-3 mb-4 items-center border-b pb-4">
                                        <div className="bg-orange-50 p-2 rounded-xl text-[#fc7f51]">
                                            <Bell className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-800 text-lg leading-tight">Configurar Alertas</h3>
                                            <p className="text-xs text-gray-500">¿Qué propiedad estás buscando?</p>
                                        </div>
                                    </div>

                                    <form onSubmit={handleSaveAlerts} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Ubicación (Distrito/Ciudad)</label>
                                            <input
                                                type="text"
                                                placeholder="Ej. Cayma, Arequipa"
                                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#fc7f51] outline-none transition text-sm"
                                                value={alertForm.location}
                                                onChange={e => setAlertForm({ ...alertForm, location: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Tipo de Operación</label>
                                            <select
                                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#fc7f51] outline-none transition text-sm"
                                                value={alertForm.type}
                                                onChange={e => setAlertForm({ ...alertForm, type: e.target.value })}
                                            >
                                                <option value="">Cualquiera</option>
                                                <option value="Venta">Venta</option>
                                                <option value="Alquiler">Alquiler</option>
                                                <option value="Anticresis">Anticresis</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Categoría</label>
                                            <select
                                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#fc7f51] outline-none transition text-sm"
                                                value={alertForm.category}
                                                onChange={e => setAlertForm({ ...alertForm, category: e.target.value })}
                                            >
                                                <option value="">Cualquiera</option>
                                                <option value="construido">Inmueble Construido (Casa/Dpto)</option>
                                                <option value="terreno">Terreno</option>
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-1">Precio Min.</label>
                                                <input
                                                    type="number"
                                                    placeholder="Ej. 1000"
                                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#fc7f51] outline-none transition text-sm"
                                                    value={alertForm.minPrice}
                                                    onChange={e => setAlertForm({ ...alertForm, minPrice: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-1">Precio Max.</label>
                                                <input
                                                    type="number"
                                                    placeholder="Ej. 50000"
                                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#fc7f51] outline-none transition text-sm"
                                                    value={alertForm.maxPrice}
                                                    onChange={e => setAlertForm({ ...alertForm, maxPrice: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={savingAlert}
                                            className="w-full py-3 mt-2 bg-[#fc7f51] hover:bg-[#e56b3e] text-white font-bold rounded-xl transition flex items-center justify-center gap-2"
                                        >
                                            {savingAlert ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Guardar Filtros</>}
                                        </button>
                                    </form>
                                </div>

                                {/* Results Grid */}
                                <div className="lg:col-span-2">
                                    <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                        Resultados de tu búsqueda ({alertMatches.length})
                                    </h3>
                                    {(!userData?.alerts || (!userData.alerts.type && !userData.alerts.category && !userData.alerts.location && !userData.alerts.minPrice && !userData.alerts.maxPrice)) ? (
                                        <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200 h-full flex flex-col items-center justify-center">
                                            <Bell className="w-12 h-12 text-gray-300 mb-4" />
                                            <h4 className="font-bold text-gray-600">Configura tu filtro a la izquierda</h4>
                                            <p className="text-gray-400 text-sm mt-2 max-w-sm">Dinos qué propiedad buscas usando el menú lateral y nuestro radar te listará inmediatamente todas las opciones que coincidan.</p>
                                        </div>
                                    ) : alertMatches.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {alertMatches.map(prop => <PropertyCard key={prop.id} property={prop} />)}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
                                            <Search className="w-12 h-12 text-gray-300 mb-4 mx-auto" />
                                            <h4 className="font-bold text-gray-600">No hay coincidencias exactas</h4>
                                            <p className="text-gray-400 text-sm mt-2 max-w-sm mx-auto">Actualmente no tenemos propiedades públicas que crucen todos tus filtros al 100%. Intenta ampliar tu búsqueda reduciendo condiciones.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default ClientDashboard;
