import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, query, getDocs, limit } from 'firebase/firestore';
import PropertyCard from '../components/PropertyCard';
import {
    Palmtree, Mountain, Waves, Building, Building2, Warehouse,
    ArrowRight, Search, MapPin, ListFilter, Home as HomeIcon,
    Key, Briefcase, X, Lightbulb, Star, Store, Factory,
    BedDouble, Sparkles, Map, Shield, TrendingUp, Clock
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';
import { PERU_LOCATIONS } from '../data/locations';
import { motion } from 'framer-motion';

const categories = [
    { icon: Building2, label: 'Departamento', value: 'Departamento' },
    { icon: HomeIcon, label: 'Casa', value: 'Casa' },
    { icon: MapPin, label: 'Terreno Urbano', value: 'Terreno Urbano' },
    { icon: Map, label: 'Terreno Rústico', value: 'Terreno Rustico' },
    { icon: Sparkles, label: 'Pre venta', value: 'Pre venta' },
    { icon: Waves, label: 'Casa de playa', value: 'Casa de playa' },
    { icon: Briefcase, label: 'Terreno Comercial', value: 'Terreno Comercial' },
    { icon: Store, label: 'Local Comercial', value: 'Local Comercial' },
    { icon: Palmtree, label: 'Terreno de playa', value: 'Terreno de playa' },
];

const Home = () => {
    const navigate = useNavigate();

    // Drag-to-scroll for exclusive carousel
    const exclusiveRef = useRef(null);
    const dragState = useRef({ isDown: false, startX: 0, scrollLeft: 0 });

    const onMouseDown = (e) => {
        dragState.current = { isDown: true, startX: e.pageX - exclusiveRef.current.offsetLeft, scrollLeft: exclusiveRef.current.scrollLeft };
        exclusiveRef.current.style.cursor = 'grabbing';
    };
    const onMouseLeaveOrUp = () => {
        dragState.current.isDown = false;
        if (exclusiveRef.current) exclusiveRef.current.style.cursor = 'grab';
    };
    const onMouseMove = (e) => {
        if (!dragState.current.isDown) return;
        e.preventDefault();
        const x = e.pageX - exclusiveRef.current.offsetLeft;
        const walk = (x - dragState.current.startX) * 1.5;
        exclusiveRef.current.scrollLeft = dragState.current.scrollLeft - walk;
    };

    // Search State
    const [operation, setOperation] = useState('venta');
    const [location, setLocation] = useState('');
    const [propertyType, setPropertyType] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [priceMin, setPriceMin] = useState('');
    const [priceMax, setPriceMax] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [isDuplex, setIsDuplex] = useState(false);
    const [bedrooms, setBedrooms] = useState('');
    const [bathrooms, setBathrooms] = useState('');
    const [minArea, setMinArea] = useState('');
    const [parking, setParking] = useState(false);
    const [pool, setPool] = useState(false);
    const [seaView, setSeaView] = useState(false);
    const [furnished, setFurnished] = useState(false);
    const [security, setSecurity] = useState(false);

    // Modal State
    const [showSellModal, setShowSellModal] = useState(false);
    const [sellFormData, setSellFormData] = useState({ location: '', footage: '', price: '' });

    // Location Autocomplete
    const [filteredLocations, setFilteredLocations] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Properties
    const [properties, setProperties] = useState([]);
    const [loadingProperties, setLoadingProperties] = useState(true);

    const handleSellSubmit = () => {
        const message = `Hola, quiero vender mi propiedad.\n\n📍 Ubicación: ${sellFormData.location}\n📐 Metraje: ${sellFormData.footage} m²\n💰 Precio Estimado: $${sellFormData.price}\n\nSolicito más información.`;
        window.open(`https://wa.me/51965355700?text=${encodeURIComponent(message)}`, '_blank');
        setShowSellModal(false);
        setSellFormData({ location: '', footage: '', price: '' });
    };

    const handleLocationChange = (e) => {
        const val = e.target.value;
        setLocation(val);
        if (val.length > 0) {
            const filtered = PERU_LOCATIONS.filter(loc =>
                loc.name.toLowerCase().includes(val.toLowerCase()) ||
                loc.label.toLowerCase().includes(val.toLowerCase())
            ).slice(0, 10);
            setFilteredLocations(filtered);
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    };

    const selectLocation = (loc) => {
        setLocation(loc.label);
        setShowSuggestions(false);
    };

    const handleSearch = () => {
        const params = new URLSearchParams();
        if (operation) params.set('operation', operation);
        if (location) params.set('location', location);
        if (propertyType) params.set('propertyType', propertyType);
        // Only pass currency + price if the user actually set a price range
        if (priceMin || priceMax) {
            params.set('currency', currency);
            if (priceMin) params.set('priceMin', priceMin);
            if (priceMax) params.set('priceMax', priceMax);
        }
        if (bedrooms) params.set('bedrooms', bedrooms);
        if (bathrooms) params.set('bathrooms', bathrooms);
        if (minArea) params.set('minArea', minArea);
        if (parking) params.set('parking', 'true');
        if (pool) params.set('pool', 'true');
        if (seaView) params.set('seaView', 'true');
        if (furnished) params.set('furnished', 'true');
        if (security) params.set('security', 'true');
        if (isDuplex) params.set('isDuplex', 'true');
        navigate(`/search?${params.toString()}`);
    };

    useEffect(() => {
        const fetchProperties = async () => {
            setLoadingProperties(true);
            try {
                const q = query(collection(db, "properties"), limit(60));
                const querySnapshot = await getDocs(q);
                const props = querySnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(p => p.status === 'disponible');

                props.sort((a, b) => {
                    if (a.isPromoted && !b.isPromoted) return -1;
                    if (!a.isPromoted && b.isPromoted) return 1;
                    return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
                });

                setProperties(props);
            } catch (error) {
                console.error("Error fetching properties:", error);
            } finally {
                setLoadingProperties(false);
            }
        };
        fetchProperties();
    }, []);

    // SEO JSON-LD
    useEffect(() => {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        const schema = {
            "@context": "https://schema.org",
            "@type": "RealEstateAgent",
            "name": "Inmuévete Inmobiliaria",
            "url": "https://inmueveteperu.com",
            "logo": "https://inmueveteperu.com/logo.png",
            "description": "Encuentra los mejores departamentos, casas y terrenos en venta y alquiler en Perú. Asesoría experta en bienes raíces.",
            "address": {
                "@type": "PostalAddress",
                "addressLocality": "Lima",
                "addressCountry": "PE"
            },
            "sameAs": [
                "https://www.facebook.com/inmueveteinmobiliaria",
                "https://www.instagram.com/inmueveteinmobiliaria"
            ],
            "contactPoint": {
                "@type": "ContactPoint",
                "telephone": "+51 965355700",
                "contactType": "customer service",
                "areaServed": "PE",
                "availableLanguage": "Spanish"
            }
        };
        script.innerHTML = JSON.stringify(schema);
        document.head.appendChild(script);

        const websiteSchema = {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "url": "https://inmueveteperu.com",
            "potentialAction": {
                "@type": "SearchAction",
                "target": "https://inmueveteperu.com/search?location={search_term_string}",
                "query-input": "required name=search_term_string"
            }
        };
        const websiteScript = document.createElement('script');
        websiteScript.type = 'application/ld+json';
        websiteScript.innerHTML = JSON.stringify(websiteSchema);
        document.head.appendChild(websiteScript);

        return () => {
            document.head.removeChild(script);
            document.head.removeChild(websiteScript);
        };
    }, []);

    return (
        <div className="min-h-screen bg-white font-sans text-[#262626]">

            {/* ─────────────────── HERO SECTION ─────────────────── */}
            <div className="relative min-h-[100svh] lg:h-[88vh] lg:min-h-[700px] flex items-start lg:items-center pt-32 pb-16 lg:pt-20 lg:pb-0 overflow-hidden">
                {/* Background */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="/hero-bg.png"
                        alt="Interior de una casa moderna de lujo en Perú - Inmuévete Inmobiliaria"
                        className="w-full h-full object-cover scale-105"
                        style={{ transform: 'scale(1.05)' }}
                        onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop';
                        }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/30 to-white" />
                </div>

                {/* Animated glow orb */}
                <motion.div
                    animate={{ x: [0, 40, 0], y: [0, -25, 0] }}
                    transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute top-20 right-10 w-[500px] h-[500px] bg-[#fc7f51]/15 blur-[120px] rounded-full pointer-events-none z-0"
                />

                <div className="relative z-10 container mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

                    {/* Left: Headline + Quick Stats */}
                    <div className="lg:col-span-6 text-white">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7 }}
                        >
                            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest text-white/90 mb-8">
                                <span className="w-2 h-2 rounded-full bg-[#fc7f51] animate-pulse" />
                                Encuentra tu próximo hogar
                            </div>
                            <h1 className="text-4xl md:text-6xl font-black leading-tight mb-6 drop-shadow-lg">
                                Tu Nuevo Hogar<br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#fc7f51] to-orange-300">
                                    Te Espera
                                </span>
                            </h1>
                            <p className="text-white/75 text-lg leading-relaxed mb-12 max-w-lg">
                                Explora propiedades exclusivas en las mejores ubicaciones del Perú con el mejor equipo de agentes.
                            </p>

                            {/* Quick Stats */}
                            <div className="flex flex-wrap gap-10">
                                {[
                                    { val: '1.2k+', label: 'Propiedades' },
                                    { val: '950+', label: 'Clientes Felices' },
                                    { val: '15 años', label: 'de Experiencia' },
                                ].map((s, i) => (
                                    <div key={i} className="flex flex-col">
                                        <span className="text-3xl font-black text-white leading-none">{s.val}</span>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/50 mt-1">{s.label}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* Right: Search Card */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.7, delay: 0.2 }}
                        className="lg:col-span-6 bg-white rounded-3xl shadow-2xl overflow-hidden"
                    >
                        {/* Card Header */}
                        <div className="p-8 pb-5 bg-[#16151a]">
                            <h2 className="text-2xl font-black text-white mb-1">Buscar Propiedad</h2>
                            <p className="text-gray-400 text-sm">Filtra y encuentra lo que buscas.</p>
                        </div>

                        <div className="p-6 md:p-8 space-y-5">
                            {/* Operation Tabs */}
                            <div className="flex bg-gray-100 p-1 rounded-xl">
                                {['venta', 'alquiler', 'anticresis'].map((op) => (
                                    <button
                                        key={op}
                                        onClick={() => setOperation(op)}
                                        aria-label={`Buscar propiedades en ${op}`}
                                        className={`flex-1 py-2.5 text-sm font-bold capitalize rounded-lg transition-all ${operation === op
                                            ? 'bg-white text-[#fc7f51] shadow-sm scale-105'
                                            : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        {op}
                                    </button>
                                ))}
                            </div>

                            {/* Location  */}
                            <div className="relative">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">¿En dónde buscas?</label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5" />
                                    <input
                                        type="text"
                                        value={location}
                                        onChange={handleLocationChange}
                                        onFocus={() => location && setShowSuggestions(true)}
                                        placeholder="Ciudad, distrito o zona..."
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#fc7f51] focus:ring-2 focus:ring-[#fc7f51]/20 outline-none transition font-medium text-sm"
                                    />
                                    {showSuggestions && filteredLocations.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden max-h-52 overflow-y-auto">
                                            {filteredLocations.map((loc, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => selectLocation(loc)}
                                                    className="px-4 py-3 hover:bg-orange-50 cursor-pointer flex items-center gap-2 text-gray-700 font-medium text-sm transition"
                                                >
                                                    <MapPin className="w-4 h-4 text-[#fc7f51]" />
                                                    {loc.label}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Type & Currency */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Tipo</label>
                                    <div className="relative">
                                        <HomeIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5" />
                                        <select
                                            value={propertyType}
                                            onChange={(e) => setPropertyType(e.target.value)}
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#fc7f51] outline-none appearance-none font-medium text-sm cursor-pointer"
                                        >
                                            <option value="">Todos los tipos</option>
                                            <option value="Casa">Casa</option>
                                            <option value="Departamento">Departamento</option>
                                            <option value="Terreno Urbano">Terreno Urbano</option>
                                            <option value="Terreno Rustico">Terreno Rústico</option>
                                            <option value="Pre venta">Pre venta</option>
                                            <option value="Casa de playa">Casa de playa</option>
                                            <option value="Terreno Comercial">Terreno Comercial</option>
                                            <option value="Local Comercial">Local Comercial</option>
                                            <option value="Terreno de playa">Terreno de playa</option>
                                        </select>
                                    </div>
                                    {propertyType?.toLowerCase() === 'departamento' && (
                                        <label className="mt-2 flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" className="w-4 h-4 accent-[#fc7f51]" checked={isDuplex} onChange={(e) => setIsDuplex(e.target.checked)} />
                                            <span className="text-xs font-bold text-gray-600 uppercase">Dúplex</span>
                                        </label>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Moneda</label>
                                    <div className="flex bg-gray-50 rounded-xl border border-gray-200 p-1 h-[58px] items-center">
                                        {['USD', 'PEN'].map(c => (
                                            <button
                                                key={c}
                                                onClick={() => setCurrency(c)}
                                                className={`flex-1 h-full rounded-lg text-sm font-bold transition ${currency === c ? 'bg-[#fc7f51] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                {c === 'USD' ? '$ USD' : 'S/ PEN'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Price */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Rango de Precio</label>
                                <div className="flex gap-3">
                                    <input type="number" placeholder="Mínimo" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#fc7f51] outline-none transition text-sm" />
                                    <input type="number" placeholder="Máximo" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#fc7f51] outline-none transition text-sm" />
                                </div>
                            </div>

                            {/* Advanced Filters Toggle */}
                            <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 text-[#fc7f51] font-bold text-sm hover:underline">
                                <ListFilter className="w-4 h-4" />
                                {showFilters ? 'Menos filtros' : 'Más filtros (Habitaciones, Baños, Área...)'}
                            </button>

                            {showFilters && (
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 animate-fadeIn">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Habitaciones</label>
                                        <select value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#fc7f51] outline-none text-sm">
                                            <option value="">Cualquiera</option>
                                            <option value="1">1+</option>
                                            <option value="2">2+</option>
                                            <option value="3">3+</option>
                                            <option value="4">4+</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Baños</label>
                                        <select value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#fc7f51] outline-none text-sm">
                                            <option value="">Cualquiera</option>
                                            <option value="1">1+</option>
                                            <option value="2">2+</option>
                                            <option value="3">3+</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2 lg:col-span-1">
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Área Mín. (m²)</label>
                                        <input type="number" placeholder="Ej: 80" value={minArea} onChange={(e) => setMinArea(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#fc7f51] outline-none text-sm" />
                                    </div>
                                    <div className="col-span-2 lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-2 mt-1">
                                        {[
                                            { label: 'Cochera', state: parking, set: setParking },
                                            { label: 'Piscina', state: pool, set: setPool },
                                            { label: 'Vista al mar', state: seaView, set: setSeaView },
                                            { label: 'Amoblado', state: furnished, set: setFurnished },
                                            { label: 'Seguridad 24/7', state: security, set: setSecurity },
                                        ].map((f) => (
                                            <label key={f.label} className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" className="w-4 h-4 accent-[#fc7f51]" checked={f.state} onChange={(e) => f.set(e.target.checked)} />
                                                <span className="text-sm font-medium text-gray-700">{f.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Search Button */}
                            <button
                                onClick={handleSearch}
                                aria-label="Buscar propiedades según filtros seleccionados"
                                className="w-full bg-[#fc7f51] hover:bg-[#e56b3e] text-white py-4 rounded-xl font-black text-base shadow-lg hover:shadow-orange-500/30 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                            >
                                <Search className="w-5 h-5" />
                                BUSCAR PROPIEDADES
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* ─────────────────── CATEGORIES ─────────────────── */}
            <div className="bg-white py-10 border-b border-gray-100 shadow-sm">
                <div className="container mx-auto px-6">
                    <div className="flex gap-6 md:gap-10 overflow-x-auto no-scrollbar items-center justify-start md:justify-center py-2">
                        {categories.map((cat, idx) => (
                            <div
                                key={idx}
                                onClick={() => navigate(`/search?propertyType=${cat.value}`)}
                                className="flex flex-col items-center gap-3 min-w-[90px] cursor-pointer group opacity-60 hover:opacity-100 transition-all duration-300 hover:-translate-y-1"
                            >
                                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center shadow-sm group-hover:shadow-md border border-gray-100 group-hover:border-[#fc7f51]/30 transition">
                                    <cat.icon className="w-6 h-6 text-[#262626] group-hover:text-[#fc7f51] transition" strokeWidth={1.5} />
                                </div>
                                <span className="text-xs font-bold text-[#262626] group-hover:text-[#fc7f51] whitespace-nowrap transition text-center">{cat.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ─────────────────── EXCLUSIVE PROPERTIES ─────────────────── */}
            {!loadingProperties && properties.filter(p => p.isExclusive === true).length > 0 && (
                <section className="relative py-20 overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a1814 0%, #2d2418 50%, #1a1814 100%)' }}>
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-amber-500 rounded-full opacity-[0.05] blur-[120px] translate-x-1/3 -translate-y-1/3" />
                    <div className="container mx-auto px-6 relative z-10">
                        <div className="flex justify-between items-end mb-10">
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="h-px w-8 bg-gradient-to-r from-amber-500 to-yellow-500" />
                                    <span className="text-amber-400 font-bold text-sm tracking-[0.2em] uppercase">Selección Premium</span>
                                    <div className="h-px w-8 bg-gradient-to-l from-amber-500 to-yellow-500" />
                                </div>
                                <h2 className="text-3xl md:text-4xl font-black text-white flex items-center gap-3">
                                    <Star className="w-8 h-8 text-amber-400 fill-amber-400" aria-hidden="true" />
                                    Propiedades Exclusivas en Venta y Alquiler
                                </h2>
                                <p className="text-gray-400 mt-2 text-sm">Oportunidades únicas seleccionadas por nuestro equipo de expertos inmobiliarios.</p>
                            </div>
                            <Link to="/search?exclusive=true" title="Ver todas las propiedades exclusivas" className="hidden md:flex items-center gap-2 text-amber-400 font-semibold hover:text-amber-300 transition group">
                                Ver todas <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                        <div
                            ref={exclusiveRef}
                            className="flex gap-6 overflow-x-auto pb-4 -mx-2 px-2 select-none"
                            style={{ scrollbarWidth: 'none', cursor: 'grab' }}
                            onMouseDown={onMouseDown}
                            onMouseLeave={onMouseLeaveOrUp}
                            onMouseUp={onMouseLeaveOrUp}
                            onMouseMove={onMouseMove}
                        >
                            {properties.filter(p => p.isExclusive === true).map((property) => (
                                <div key={property.id} className="min-w-[310px] max-w-[330px] flex-shrink-0">
                                    <div className="relative rounded-2xl overflow-hidden border border-amber-500/20 bg-gradient-to-b from-amber-500/5 to-transparent p-1">
                                        <div className="rounded-xl overflow-hidden">
                                            <PropertyCard property={property} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 text-center md:hidden">
                            <Link to="/search?exclusive=true" className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-white px-6 py-3 rounded-full font-bold text-sm shadow-lg">
                                <Star className="w-4 h-4 fill-white" /> Ver todas las exclusivas
                            </Link>
                        </div>
                    </div>
                </section>
            )}

            {/* ─────────────────── PROPERTIES GRID ─────────────────── */}
            <main id="properties" className="container mx-auto px-6 py-20">
                <div className="flex justify-between items-end mb-12">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-5 h-5 text-[#fc7f51]" />
                            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Oportunidades</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black text-[#16151a]">Propiedades Destacadas</h2>
                    </div>
                    <Link to="/properties" className="hidden md:flex items-center gap-2 text-[#262626] font-semibold hover:text-[#fc7f51] transition group">
                        Ver todo <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                    {loadingProperties ? (
                        <div className="col-span-full"><Loader /></div>
                    ) : properties.length === 0 ? (
                        <div className="col-span-full py-20 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <p className="text-gray-500 text-lg">No hay propiedades disponibles en este momento.</p>
                        </div>
                    ) : (
                        properties.slice(0, 8).map((property) => (
                            <PropertyCard key={property.id} property={property} />
                        ))
                    )}
                </div>

                <div className="mt-12 text-center md:hidden">
                    <Link to="/properties" className="inline-block bg-white border border-gray-300 text-[#262626] px-8 py-3 rounded-full font-bold shadow-sm hover:bg-gray-50 transition">
                        Ver todas las propiedades
                    </Link>
                </div>
            </main>

            {/* ─────────────────── WHY US ─────────────────── */}
            <section className="bg-gray-50 py-24">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <span className="text-[#fc7f51] font-black text-xs uppercase tracking-widest block mb-3">Nuestra Propuesta</span>
                        <h2 className="text-4xl font-black text-[#16151a]">¿Por qué elegirnos?</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { icon: Shield, color: 'bg-blue-50 text-blue-500', title: 'Seguridad Total', desc: 'Verificamos cada propiedad para garantizar una transacción segura y transparente para ti.' },
                            { icon: Star, color: 'bg-orange-50 text-[#fc7f51]', title: 'Las Mejores Ofertas', desc: 'Accede a oportunidades exclusivas del mercado antes que nadie con nuestras alertas.' },
                            { icon: TrendingUp, color: 'bg-emerald-50 text-emerald-500', title: 'Asesoría Experta', desc: 'Contamos con un equipo de profesionales listos para guiarte en cada paso del proceso.' },
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                whileHover={{ y: -6 }}
                                transition={{ type: 'spring', stiffness: 300 }}
                                className="p-10 bg-white rounded-[2rem] shadow-xl shadow-gray-200/60 border border-gray-100"
                            >
                                <div className={`w-16 h-16 ${item.color} rounded-2xl flex items-center justify-center mb-8`}>
                                    <item.icon className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-black mb-3 text-[#16151a]">{item.title}</h3>
                                <p className="text-gray-500 leading-relaxed font-medium text-sm">{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─────────────────── FEATURE GRID + IMAGE ─────────────────── */}
            <section className="py-24">
                <div className="container mx-auto px-6">
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        <div className="lg:w-1/2">
                            <span className="text-[#fc7f51] font-black text-xs uppercase tracking-widest block mb-3">Cómo Funciona</span>
                            <h2 className="text-4xl font-black text-[#16151a] leading-tight mb-8">Encuentra Tu Lugar Ideal Fácilmente</h2>
                            <p className="text-gray-500 text-base mb-10 leading-relaxed">
                                Nuestra plataforma está diseñada para que la búsqueda de tu próximo hogar sea una experiencia placentera y sin complicaciones.
                            </p>
                            <ul className="space-y-5">
                                {[
                                    'Búsqueda avanzada por zonas específicas',
                                    'Fotos y videos en alta resolución',
                                    'Contacto directo con agentes certificados',
                                    'Notificaciones de nuevas propiedades',
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-4">
                                        <div className="w-7 h-7 rounded-full bg-orange-100 flex-shrink-0 flex items-center justify-center text-[#fc7f51]">
                                            <Star className="w-3.5 h-3.5 fill-current" />
                                        </div>
                                        <span className="text-[#16151a] font-bold text-sm">{item}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="flex gap-4 mt-12">
                                <Link to="/contact" className="bg-[#fc7f51] text-white px-8 py-4 rounded-xl font-black shadow-lg shadow-orange-500/20 hover:bg-[#e56b3e] transition hover:scale-105 active:scale-95">
                                    Contactar Agente
                                </Link>
                                <Link to="/properties" className="bg-white border border-gray-200 text-[#16151a] px-8 py-4 rounded-xl font-bold shadow-sm hover:bg-gray-50 transition">
                                    Ver Propiedades
                                </Link>
                            </div>
                        </div>

                        <div className="lg:w-1/2 grid grid-cols-2 gap-4">
                            <div className="space-y-4 pt-12">
                                <motion.div whileHover={{ scale: 1.03 }} className="h-60 rounded-3xl overflow-hidden shadow-2xl">
                                    <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=600&auto=format&fit=crop" className="w-full h-full object-cover" alt="Sala de estar moderna y elegante con vista panorámica" />
                                </motion.div>
                                <motion.div whileHover={{ scale: 1.03 }} className="h-40 rounded-3xl overflow-hidden shadow-2xl bg-[#fc7f51] flex flex-col justify-end p-8">
                                    <span className="text-3xl font-black text-white leading-none">24/7</span>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/70 mt-1">Soporte Activo</span>
                                </motion.div>
                            </div>
                            <div className="space-y-4">
                                <motion.div whileHover={{ scale: 1.03 }} className="h-40 rounded-3xl overflow-hidden shadow-2xl bg-[#16151a] flex flex-col justify-end p-8">
                                    <span className="text-3xl font-black text-white leading-none">10k+</span>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/50 mt-1">Inmuebles</span>
                                </motion.div>
                                <motion.div whileHover={{ scale: 1.03 }} className="h-60 rounded-3xl overflow-hidden shadow-2xl">
                                    <img src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=600&auto=format&fit=crop" className="w-full h-full object-cover" alt="Interior acogedor de un departamento minimalista" />
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─────────────────── CTA SECTION ─────────────────── */}
            <section className="py-24 bg-[#16151a] text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#fc7f51] rounded-full opacity-10 blur-[100px] translate-x-1/3 -translate-y-1/3" />
                <div className="container mx-auto px-6 relative z-10 text-center">
                    <h2 className="text-3xl md:text-5xl font-black mb-6">¿Listo para dar el siguiente paso?</h2>
                    <p className="text-gray-400 text-lg mb-10 max-w-2xl mx-auto">
                        Ya sea que busques comprar, vender o invertir, nuestro equipo tiene la experiencia para hacerlo posible.
                    </p>
                    <div className="flex flex-col md:flex-row gap-4 justify-center">
                        <Link to="/contact" className="bg-[#fc7f51] text-white px-10 py-4 rounded-xl font-black hover:bg-[#e56b3e] transition shadow-lg hover:shadow-orange-500/30">
                            Contáctanos Ahora
                        </Link>
                        <button
                            onClick={() => setShowSellModal(true)}
                            className="bg-transparent border border-gray-600 text-white px-10 py-4 rounded-xl font-black hover:bg-[#262626] hover:border-white transition"
                        >
                            Vende tu Propiedad
                        </button>
                    </div>
                </div>
            </section>

            {/* ─────────────────── SELL MODAL ─────────────────── */}
            {showSellModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden animate-fadeIn">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-800">Vende con nosotros</h3>
                            <button onClick={() => setShowSellModal(false)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded-full transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-gray-600">Ingresa los datos de tu propiedad para enviarlos a un agente.</p>
                            {[
                                { label: 'Ubicación / Distrito', key: 'location', type: 'text', placeholder: 'Ej: Miraflores, Lima' },
                                { label: 'Metraje Aprox. (m²)', key: 'footage', type: 'number', placeholder: 'Ej: 120' },
                                { label: 'Monto Estimado de Venta', key: 'price', type: 'number', placeholder: 'Ej: 150000' },
                            ].map((f) => (
                                <div key={f.key}>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                                    <input
                                        type={f.type}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-[#fc7f51] focus:ring-2 focus:ring-[#fc7f51]/20 outline-none transition"
                                        placeholder={f.placeholder}
                                        value={sellFormData[f.key]}
                                        onChange={e => setSellFormData({ ...sellFormData, [f.key]: e.target.value })}
                                    />
                                </div>
                            ))}
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
        </div>
    );
};

export default Home;
