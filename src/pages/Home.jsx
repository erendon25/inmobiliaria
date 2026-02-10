import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import PropertyCard from '../components/PropertyCard';
import { Palmtree, Mountain, Waves, Building, Warehouse, ArrowRight, Search, MapPin, ListFilter, Home as HomeIcon, Key, Briefcase, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const categories = [
    { icon: Building, label: 'Departamentos' },
    { icon: Warehouse, label: 'Casas' },
    { icon: Palmtree, label: 'Terrenos' },
    { icon: Mountain, label: 'Campestres' },
    { icon: Waves, label: 'Playa' },
];

const Home = () => {
    // Search State
    const [operation, setOperation] = useState('venta'); // venta, alquiler, anticresis
    const [location, setLocation] = useState('');
    const [propertyType, setPropertyType] = useState('departamento');
    const [currency, setCurrency] = useState('USD');
    const [priceMin, setPriceMin] = useState('');
    const [priceMax, setPriceMax] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Modal State
    const [showSellModal, setShowSellModal] = useState(false);
    const [sellFormData, setSellFormData] = useState({
        location: '',
        footage: '',
        price: ''
    });

    const handleSellSubmit = () => {
        const message = `Hola, quiero vender mi propiedad.\n\n📍 Ubicación: ${sellFormData.location}\n📐 Metraje: ${sellFormData.footage} m²\n💰 Precio Estimado: $${sellFormData.price}\n\nSolicito más información.`;
        const whatsappUrl = `https://wa.me/51999999999?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        setShowSellModal(false);
        setSellFormData({ location: '', footage: '', price: '' });
    };

    // Simple mock for city autocomplete
    const cities = ["Lima", "Arequipa", "Cusco", "Trujillo", "Piura", "Ica", "Tacna"];
    const [filteredCities, setFilteredCities] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const handleLocationChange = (e) => {
        const val = e.target.value;
        setLocation(val);
        if (val.length > 0) {
            const filtered = cities.filter(city => city.toLowerCase().includes(val.toLowerCase()));
            setFilteredCities(filtered);
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    };

    const selectCity = (city) => {
        setLocation(city);
        setShowSuggestions(false);
    };

    // Fetch Properties from Firestore
    const [properties, setProperties] = useState([]);
    const [loadingProperties, setLoadingProperties] = useState(true);

    useEffect(() => {
        const fetchProperties = async () => {
            try {
                // Basic query: Get all available properties
                // Note: Complex queries like filtering by multiple fields will need Firestore Indexes.
                // For now, we fetch 'disponible' properties.
                const q = query(
                    collection(db, "properties")
                    // where("status", "==", "disponible")
                    // orderBy("createdAt", "desc") // May require index, commenting out for safety 
                );

                const querySnapshot = await getDocs(q);
                const props = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setProperties(props);
            } catch (error) {
                console.error("Error fetching properties:", error);
            } finally {
                setLoadingProperties(false);
            }
        };

        fetchProperties();
    }, []);

    return (
        <div className="min-h-screen bg-white font-sans text-[#262626]">
            {/* Navbar rendering is handled in App.jsx. 
                However, to ensure text visibility on all backgrounds, 
                we rely on the solid/transparent updates in Navbar.jsx or App.jsx. 
            */}

            {/* Hero Section */}
            <div className="relative h-[85vh] min-h-[700px] flex items-center pt-20">
                {/* Background Image */}
                <div className="absolute inset-0 z-0">
                    <img src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop" alt="Hero" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/20"></div>
                </div>

                <div className="relative z-10 container mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

                    {/* Left Side: Search Card (Airbnb/Remax Style) */}
                    <div className="lg:col-span-5 bg-white rounded-3xl shadow-2xl overflow-hidden animate-fadeIn">
                        {/* Header Text - Using Dark BG with White Text for visibility */}
                        <div className="p-8 pb-4 bg-[#262626] text-white">
                            <h1 className="text-3xl font-bold mb-2">Encuentra tu próximo hogar</h1>
                            <p className="text-gray-300 text-sm">Explora propiedades únicas para vivir o invertir.</p>
                        </div>

                        <div className="p-6 md:p-8 space-y-6">

                            {/* Tabs: Operation Type */}
                            <div className="flex bg-gray-100 p-1 rounded-xl">
                                {['venta', 'alquiler', 'anticresis'].map((op) => (
                                    <button
                                        key={op}
                                        onClick={() => setOperation(op)}
                                        className={`flex-1 py-2 text-sm font-bold capitalize rounded-lg transition-all ${operation === op
                                            ? 'bg-white text-[#fc7f51] shadow-sm transform scale-105'
                                            : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        {op}
                                    </button>
                                ))}
                            </div>

                            {/* Location Input with Autocomplete */}
                            <div className="relative">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">¿En dónde buscas?</label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input
                                        type="text"
                                        value={location}
                                        onChange={handleLocationChange}
                                        onFocus={() => location && setShowSuggestions(true)}
                                        placeholder="Ciudad, distrito o zona..."
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#fc7f51] focus:ring-2 focus:ring-[#fc7f51]/20 outline-none transition font-medium"
                                    />
                                    {/* Suggestions Dropdown */}
                                    {showSuggestions && filteredCities.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                                            {filteredCities.map((city) => (
                                                <div
                                                    key={city}
                                                    onClick={() => selectCity(city)}
                                                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-center gap-2 text-gray-700 font-medium"
                                                >
                                                    <MapPin className="w-4 h-4 text-[#fc7f51]" />
                                                    {city}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Property Type Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo de Inmueble</label>
                                    <div className="relative">
                                        <HomeIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                        <select
                                            value={propertyType}
                                            onChange={(e) => setPropertyType(e.target.value)}
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#fc7f51] outline-none appearance-none font-medium cursor-pointer"
                                        >
                                            <option value="departamento">Departamento</option>
                                            <option value="casa">Casa</option>
                                            <option value="terreno">Terreno</option>
                                            <option value="oficina">Oficina</option>
                                            <option value="local">Local Comercial</option>
                                            <option value="otro">Otro</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Moneda</label>
                                    <div className="relative">
                                        <div className="flex bg-gray-50 rounded-xl border border-gray-200 p-1 h-[58px] items-center">
                                            <button
                                                onClick={() => setCurrency('USD')}
                                                className={`flex-1 h-full rounded-lg text-sm font-bold transition flex items-center justify-center gap-1 ${currency === 'USD' ? 'bg-[#fc7f51] text-white shadow-sm' : 'text-gray-500'}`}
                                            >
                                                $ USD
                                            </button>
                                            <button
                                                onClick={() => setCurrency('PEN')}
                                                className={`flex-1 h-full rounded-lg text-sm font-bold transition flex items-center justify-center gap-1 ${currency === 'PEN' ? 'bg-[#fc7f51] text-white shadow-sm' : 'text-gray-500'}`}
                                            >
                                                S/ PEN
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Price Range */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rango de Precio</label>
                                <div className="flex gap-4">
                                    <input
                                        type="number"
                                        placeholder="Mínimo"
                                        value={priceMin}
                                        onChange={(e) => setPriceMin(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#fc7f51] outline-none transition"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Máximo"
                                        value={priceMax}
                                        onChange={(e) => setPriceMax(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#fc7f51] outline-none transition"
                                    />
                                </div>
                            </div>

                            {/* Advanced Filters Toggle */}
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="flex items-center gap-2 text-[#fc7f51] font-bold text-sm hover:underline"
                            >
                                <ListFilter className="w-4 h-4" />
                                {showFilters ? "Menos filtros" : "Más filtros (Habitaciones, Baños, Área...)"}
                            </button>

                            {/* Extra Filters */}
                            {showFilters && (
                                <div className="grid grid-cols-2 gap-4 animate-fadeIn">
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Habitaciones</label>
                                        <select className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#fc7f51] outline-none">
                                            <option value="">Cualquiera</option>
                                            <option value="1">1+</option>
                                            <option value="2">2+</option>
                                            <option value="3">3+</option>
                                            <option value="4">4+</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Baños</label>
                                        <select className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#fc7f51] outline-none">
                                            <option value="">Cualquiera</option>
                                            <option value="1">1+</option>
                                            <option value="2">2+</option>
                                            <option value="3">3+</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Área Mínima (m²)</label>
                                        <input type="number" placeholder="Ej: 80" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#fc7f51] outline-none" />
                                    </div>
                                </div>
                            )}

                            {/* Search Button */}
                            <button className="w-full bg-[#fc7f51] hover:bg-[#e56b3e] text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-orange-500/30 transition flex items-center justify-center gap-2">
                                <Search className="w-6 h-6" />
                                BUSCAR PROPIEDADES
                            </button>

                        </div>
                    </div>

                    {/* Right Side: Owner CTA (Floating) */}
                    <div className="hidden lg:block lg:col-span-7">
                        {/* Floating elements styling */}
                        <div className="flex flex-col items-end space-y-4">
                            <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-xl max-w-sm border-l-4 border-[#fc7f51] transform hover:-translate-x-2 transition cursor-pointer">
                                <div className="flex items-center gap-4">
                                    <div className="bg-orange-100 p-3 rounded-full">
                                        <Briefcase className="w-6 h-6 text-[#fc7f51]" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800 text-lg">¿Eres Propietario?</h3>
                                        <p className="text-gray-600 text-sm">Publica tu propiedad con nosotros y véndela más rápido.</p>
                                    </div>
                                </div>
                                <Link to="/contact" className="mt-4 block text-center bg-[#262626] text-white py-2 rounded-lg font-bold text-sm hover:bg-black transition">
                                    Contactar a un Agente
                                </Link>
                            </div>

                            <button
                                onClick={() => setShowSellModal(true)}
                                className="block w-full text-left bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-xl max-w-sm border-l-4 border-blue-500 transform hover:-translate-x-2 transition cursor-pointer delay-100"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="bg-blue-100 p-3 rounded-full">
                                        <Key className="w-6 h-6 text-blue-500" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800 text-lg">¿Vendes tu Propiedad?</h3>
                                        <p className="text-gray-600 text-sm">Contáctanos para vender rápido y seguro al mejor precio.</p>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>

                </div>
            </div>

            {/* Sell Property Modal */}
            {showSellModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden animate-fadeIn">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-800">Vende con nosotros</h3>
                            <button
                                onClick={() => setShowSellModal(false)}
                                className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded-full transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-gray-600 mb-2">Ingresa los datos de tu propiedad para enviarlos a un agente.</p>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación / Distrito</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-[#fc7f51] focus:ring-2 focus:ring-[#fc7f51]/20 outline-none transition"
                                    placeholder="Ej: Miraflores, Lima"
                                    value={sellFormData.location}
                                    onChange={e => setSellFormData({ ...sellFormData, location: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Metraje Aprox. (m²)</label>
                                <input
                                    type="number"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-[#fc7f51] focus:ring-2 focus:ring-[#fc7f51]/20 outline-none transition"
                                    placeholder="Ej: 120"
                                    value={sellFormData.footage}
                                    onChange={e => setSellFormData({ ...sellFormData, footage: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Monto Estimado de Venta</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                    <input
                                        type="number"
                                        className="w-full pl-8 pr-4 py-2 rounded-lg border border-gray-200 focus:border-[#fc7f51] focus:ring-2 focus:ring-[#fc7f51]/20 outline-none transition"
                                        placeholder="Ej: 150000"
                                        value={sellFormData.price}
                                        onChange={e => setSellFormData({ ...sellFormData, price: e.target.value })}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleSellSubmit}
                                disabled={!sellFormData.location || !sellFormData.footage || !sellFormData.price}
                                className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-green-500/30 transition flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Key className="w-5 h-5" />
                                Enviar por WhatsApp
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Categories Section */}
            <div className="bg-gray-50 py-10 border-b border-gray-200">
                <div className="container mx-auto px-6">
                    <div className="flex gap-4 md:gap-12 overflow-x-auto no-scrollbar items-center justify-start md:justify-center py-2">
                        {categories.map((cat, idx) => (
                            <div key={idx} className="flex flex-col items-center gap-3 min-w-[100px] cursor-pointer group opacity-60 hover:opacity-100 transition-all duration-300 hover:-translate-y-1">
                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:shadow-md border border-gray-100 group-hover:border-[#fc7f51]/30 transition">
                                    <cat.icon className="w-7 h-7 text-[#262626] group-hover:text-[#fc7f51] transition" strokeWidth={1.5} />
                                </div>
                                <span className="text-sm font-semibold text-[#262626] group-hover:text-[#fc7f51] whitespace-nowrap transition">{cat.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Properties Grid */}
            <main id="properties" className="container mx-auto px-6 py-20">
                <div className="flex justify-between items-end mb-12">
                    <div>
                        <span className="text-[#fc7f51] font-bold text-sm tracking-widest uppercase mb-2 block">Oportunidades</span>
                        <h2 className="text-3xl font-bold text-[#262626]">Propiedades Destacadas</h2>
                    </div>
                    <Link to="/properties" className="hidden md:flex items-center gap-2 text-[#262626] font-semibold hover:text-[#fc7f51] transition group">
                        Ver todo <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                    {loadingProperties ? (
                        <div className="col-span-full py-20 text-center">
                            <div className="inline-block w-8 h-8 border-4 border-[#fc7f51] border-t-transparent rounded-full animate-spin"></div>
                            <p className="mt-2 text-gray-500">Cargando propiedades...</p>
                        </div>
                    ) : properties.length === 0 ? (
                        <div className="col-span-full py-20 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <p className="text-gray-500 text-lg">No hay propiedades disponibles en este momento.</p>
                        </div>
                    ) : (
                        properties.map((property) => (
                            <PropertyCard key={property.id} property={property} />
                        ))
                    )}
                </div>

                <div className="mt-12 text-center md:hidden">
                    <button className="bg-white border border-gray-300 text-[#262626] px-8 py-3 rounded-full font-bold shadow-sm hover:bg-gray-50 transition">
                        Ver todas las propiedades
                    </button>
                </div>
            </main>

            {/* CTA Section - Note: Removed Footer from here */}
            <section className="py-24 bg-[#16151a] text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#fc7f51] rounded-full opacity-10 blur-[100px] translate-x-1/3 -translate-y-1/3"></div>
                <div className="container mx-auto px-6 relative z-10 text-center">
                    <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">¿Listo para dar el siguiente paso?</h2>
                    <p className="text-gray-400 text-lg mb-10 max-w-2xl mx-auto">
                        Ya sea que busques comprar, vender o invertir, en Inmuévete tenemos el equipo y la experiencia para hacerlo posible.
                    </p>
                    <div className="flex flex-col md:flex-row gap-4 justify-center">
                        <Link to="/contact" className="bg-[#fc7f51] text-white px-8 py-4 rounded-xl font-bold hover:bg-[#e56b3e] transition shadow-lg hover:shadow-orange-500/20">
                            Contáctanos Ahora
                        </Link>
                        <Link to="/about" className="bg-transparent border border-gray-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-[#262626] hover:border-white transition">
                            Conoce Más
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
