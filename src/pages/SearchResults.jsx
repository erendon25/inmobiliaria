import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import PropertyCard from '../components/PropertyCard';
import { Search, MapPin, Home as HomeIcon, ListFilter, ArrowLeft, SlidersHorizontal, X, Loader2 } from 'lucide-react';

const EXCHANGE_RATE = 3.75;

const SearchResults = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    // Read filters from URL
    const [operation, setOperation] = useState(searchParams.get('operation') || 'venta');
    const [location, setLocation] = useState(searchParams.get('location') || '');
    const [propertyType, setPropertyType] = useState(searchParams.get('propertyType') || '');
    const [currency, setCurrency] = useState(searchParams.get('currency') || 'USD');
    const [priceMin, setPriceMin] = useState(searchParams.get('priceMin') || '');
    const [priceMax, setPriceMax] = useState(searchParams.get('priceMax') || '');
    const [bedrooms, setBedrooms] = useState(searchParams.get('bedrooms') || '');
    const [bathrooms, setBathrooms] = useState(searchParams.get('bathrooms') || '');
    // New filters
    const [floor, setFloor] = useState(searchParams.get('floor') || '');
    const [parking, setParking] = useState(searchParams.get('parking') === 'true');
    const [isDuplex, setIsDuplex] = useState(searchParams.get('isDuplex') === 'true');

    const [allProperties, setAllProperties] = useState([]);
    const [filteredProperties, setFilteredProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);
    const [sortBy, setSortBy] = useState('newest');

    // Fetch all properties once
    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                const querySnapshot = await getDocs(collection(db, "properties"));
                const props = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAllProperties(props);
            } catch (error) {
                console.error("Error fetching properties:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    // Apply filters whenever params or allProperties change
    useEffect(() => {
        let results = [...allProperties];

        // Filter by operation (venta/alquiler/anticresis)
        if (operation) {
            results = results.filter(p => p.type?.toLowerCase() === operation.toLowerCase());
        }

        // Filter by location (partial match)
        if (location) {
            const loc = location.toLowerCase();
            results = results.filter(p =>
                p.location?.toLowerCase().includes(loc) ||
                p.address?.toLowerCase().includes(loc) ||
                p.title?.toLowerCase().includes(loc)
            );
        }

        // Filter by property type
        if (propertyType) {
            const pt = propertyType.toLowerCase();
            results = results.filter(p => {
                const pTitle = p.title?.toLowerCase() || '';
                const pCat = p.category?.toLowerCase() || '';
                const pLoc = p.location?.toLowerCase() || '';
                // Map search types to data (handle both singular and plural)
                if (pt === 'departamento' || pt === 'departamentos') return pTitle.includes('departamento') || pTitle.includes('depa');
                if (pt === 'casa' || pt === 'casas') return pTitle.includes('casa');
                if (pt === 'terreno' || pt === 'terrenos') return pCat === 'terreno' || pTitle.includes('terreno') || pTitle.includes('lote');
                if (pt === 'oficina' || pt === 'oficinas') return pTitle.includes('oficina');
                if (pt === 'local' || pt === 'locales') return pTitle.includes('local');
                if (pt === 'campestre' || pt === 'campestres') return pTitle.includes('campestre') || pTitle.includes('campo') || pLoc.includes('campo');
                if (pt === 'playa') return pTitle.includes('playa') || pLoc.includes('playa');
                return true;
            });
        }

        // Filter by price range (convert to same currency for comparison)
        if (priceMin || priceMax) {
            const minVal = priceMin ? parseFloat(priceMin) : 0;
            const maxVal = priceMax ? parseFloat(priceMax) : Infinity;

            results = results.filter(p => {
                const pPrice = typeof p.price === 'number' ? p.price : parseFloat(p.price) || 0;
                const pCurrency = p.currency || 'USD';

                // Convert property price to the filter currency
                let priceInFilterCurrency;
                if (pCurrency === currency) {
                    priceInFilterCurrency = pPrice;
                } else if (currency === 'USD' && pCurrency === 'PEN') {
                    priceInFilterCurrency = pPrice / EXCHANGE_RATE;
                } else if (currency === 'PEN' && pCurrency === 'USD') {
                    priceInFilterCurrency = pPrice * EXCHANGE_RATE;
                } else {
                    priceInFilterCurrency = pPrice;
                }

                return priceInFilterCurrency >= minVal && priceInFilterCurrency <= maxVal;
            });
        }

        // Filter by bedrooms
        if (bedrooms) {
            const minBed = parseInt(bedrooms);
            results = results.filter(p => (parseInt(p.bedrooms) || 0) >= minBed);
        }

        // Filter by bathrooms
        if (bathrooms) {
            const minBath = parseInt(bathrooms);
            results = results.filter(p => (parseInt(p.bathrooms) || 0) >= minBath);
        }

        // Filter by specific features
        if (parking) {
            results = results.filter(p => p.parking === true);
        }
        if (isDuplex) {
            results = results.filter(p => p.isDuplex === true);
        }
        if (floor) {
            // Strict match for floor number/string
            results = results.filter(p => p.floor?.toString().toLowerCase() === floor.toLowerCase());
        }

        // Only show available properties
        results = results.filter(p => p.status === 'disponible');

        // Sort
        if (sortBy === 'newest') {
            results.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        } else if (sortBy === 'price_asc') {
            results.sort((a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0));
        } else if (sortBy === 'price_desc') {
            results.sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0));
        }

        // Promoted properties first
        results.sort((a, b) => {
            if (a.isPromoted && !b.isPromoted) return -1;
            if (!a.isPromoted && b.isPromoted) return 1;
            return 0;
        });

        setFilteredProperties(results);
    }, [allProperties, operation, location, propertyType, currency, priceMin, priceMax, bedrooms, bathrooms, parking, isDuplex, floor, sortBy]);

    // Update URL when filters change
    const handleSearch = () => {
        const params = {};
        if (operation) params.operation = operation;
        if (location) params.location = location;
        if (propertyType) params.propertyType = propertyType;
        if (currency) params.currency = currency;
        if (priceMin) params.priceMin = priceMin;
        if (priceMax) params.priceMax = priceMax;
        if (bedrooms) params.bedrooms = bedrooms;
        if (bathrooms) params.bathrooms = bathrooms;
        if (floor) params.floor = floor;
        if (parking) params.parking = 'true';
        if (isDuplex) params.isDuplex = 'true';
        setSearchParams(params);
    };

    const clearFilters = () => {
        setOperation('venta');
        setLocation('');
        setPropertyType('');
        setCurrency('USD');
        setPriceMin('');
        setPriceMax('');
        setBedrooms('');
        setBathrooms('');
        setFloor('');
        setParking(false);
        setIsDuplex(false);
        setSearchParams({});
    };

};

const activeFilterCount = [operation, location, propertyType, priceMin, priceMax, bedrooms, bathrooms, floor, parking, isDuplex].filter(Boolean).length;

return (
    <div className="min-h-screen bg-gray-50 font-sans text-[#262626]">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 pt-24 pb-6 sticky top-0 z-30">
            <div className="container mx-auto px-6">
                {/* Back Link */}
                <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#fc7f51] transition mb-4">
                    <ArrowLeft className="w-4 h-4" />
                    Volver al inicio
                </Link>

                {/* Search Bar */}
                <div className="flex flex-col md:flex-row gap-3">
                    {/* Operation Tabs */}
                    <div className="flex bg-gray-100 p-1 rounded-xl flex-shrink-0">
                        {['venta', 'alquiler', 'anticresis'].map((op) => (
                            <button
                                key={op}
                                onClick={() => setOperation(op)}
                                className={`px-4 py-2 text-sm font-bold capitalize rounded-lg transition-all ${operation === op
                                    ? 'bg-white text-[#fc7f51] shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {op}
                            </button>
                        ))}
                    </div>

                    {/* Search Input */}
                    <div className="relative flex-grow">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Buscar por ubicación, zona o nombre..."
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#fc7f51] focus:ring-2 focus:ring-[#fc7f51]/20 outline-none transition font-medium"
                        />
                    </div>

                    {/* Filter Toggle */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl border font-bold text-sm transition flex-shrink-0 ${showFilters ? 'bg-[#fc7f51] text-white border-[#fc7f51]' : 'bg-white text-gray-700 border-gray-200 hover:border-[#fc7f51]'}`}
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                        Filtros
                        {activeFilterCount > 1 && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${showFilters ? 'bg-white/20 text-white' : 'bg-[#fc7f51] text-white'}`}>
                                {activeFilterCount}
                            </span>
                        )}
                    </button>

                    {/* Search Button */}
                    <button
                        onClick={handleSearch}
                        className="bg-[#fc7f51] hover:bg-[#e56b3e] text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg hover:shadow-orange-500/30 transition flex items-center justify-center gap-2 flex-shrink-0"
                    >
                        <Search className="w-4 h-4" />
                        Buscar
                    </button>
                </div>

                {/* Expanded Filters */}
                {showFilters && (
                    <div className="mt-4 p-6 bg-gray-50 rounded-2xl border border-gray-200 animate-fadeIn">
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo Inmueble</label>
                                <select
                                    value={propertyType}
                                    onChange={(e) => setPropertyType(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:border-[#fc7f51] outline-none text-sm font-medium"
                                >
                                    <option value="">Todos</option>
                                    <option value="departamento">Departamento</option>
                                    <option value="casa">Casa</option>
                                    <option value="terreno">Terreno</option>
                                    <option value="oficina">Oficina</option>
                                    <option value="local">Local Comercial</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Moneda</label>
                                <div className="flex bg-white rounded-lg border border-gray-200 p-0.5 h-[42px]">
                                    <button
                                        onClick={() => setCurrency('USD')}
                                        className={`flex-1 rounded-md text-xs font-bold transition ${currency === 'USD' ? 'bg-[#fc7f51] text-white' : 'text-gray-500'}`}
                                    >
                                        $ USD
                                    </button>
                                    <button
                                        onClick={() => setCurrency('PEN')}
                                        className={`flex-1 rounded-md text-xs font-bold transition ${currency === 'PEN' ? 'bg-[#fc7f51] text-white' : 'text-gray-500'}`}
                                    >
                                        S/ PEN
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Precio Mín.</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={priceMin}
                                    onChange={(e) => setPriceMin(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:border-[#fc7f51] outline-none text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Precio Máx.</label>
                                <input
                                    type="number"
                                    placeholder="Sin límite"
                                    value={priceMax}
                                    onChange={(e) => setPriceMax(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:border-[#fc7f51] outline-none text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Habitaciones</label>
                                <select
                                    value={bedrooms}
                                    onChange={(e) => setBedrooms(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:border-[#fc7f51] outline-none text-sm font-medium"
                                >
                                    <option value="">Cualquiera</option>
                                    <option value="1">1+</option>
                                    <option value="2">2+</option>
                                    <option value="3">3+</option>
                                    <option value="4">4+</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Baños</label>
                                <select
                                    value={bathrooms}
                                    onChange={(e) => setBathrooms(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:border-[#fc7f51] outline-none text-sm font-medium"
                                >
                                    <option value="">Cualquiera</option>
                                    <option value="1">1+</option>
                                    <option value="2">2+</option>
                                    <option value="3">3+</option>
                                </select>
                            </div>
                        </div>

                        {/* Additional Filters Row */}
                        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 border-t border-gray-100 pt-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Piso</label>
                                <input
                                    type="text"
                                    placeholder="Ej. 1"
                                    value={floor}
                                    onChange={(e) => setFloor(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:border-[#fc7f51] outline-none text-sm"
                                />
                            </div>

                            <div className="flex flex-col gap-2 justify-center h-full pt-1">
                                <label className="flex items-center cursor-pointer gap-2">
                                    <input type="checkbox" className="w-4 h-4 accent-[#fc7f51]" checked={parking} onChange={e => setParking(e.target.checked)} />
                                    <span className="text-sm font-medium text-gray-700">Con Cochera</span>
                                </label>
                                <label className="flex items-center cursor-pointer gap-2">
                                    <input type="checkbox" className="w-4 h-4 accent-[#fc7f51]" checked={isDuplex} onChange={e => setIsDuplex(e.target.checked)} />
                                    <span className="text-sm font-medium text-gray-700">Es Dúplex</span>
                                </label>
                            </div>
                        </div>

                        <div className="mt-4 flex justify-between items-center">
                            <button
                                onClick={clearFilters}
                                className="text-sm text-gray-500 hover:text-red-500 font-medium flex items-center gap-1 transition"
                            >
                                <X className="w-4 h-4" />
                                Limpiar filtros
                            </button>
                            <button
                                onClick={() => { handleSearch(); setShowFilters(false); }}
                                className="bg-[#fc7f51] hover:bg-[#e56b3e] text-white px-6 py-2 rounded-lg font-bold text-sm transition"
                            >
                                Aplicar Filtros
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Results */}
            <div className="container mx-auto px-6 py-8">
                {/* Results Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">
                            {loading ? 'Buscando...' : `${filteredProperties.length} propiedad${filteredProperties.length !== 1 ? 'es' : ''} encontrada${filteredProperties.length !== 1 ? 's' : ''}`}
                        </h2>
                        {(location || propertyType) && (
                            <p className="text-gray-500 text-sm mt-1">
                                {operation && <span className="capitalize">{operation}</span>}
                                {propertyType && <span> · {propertyType}</span>}
                                {location && <span> en <strong>{location}</strong></span>}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-500 font-medium">Ordenar por:</label>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:border-[#fc7f51] outline-none cursor-pointer"
                        >
                            <option value="newest">Más recientes</option>
                            <option value="price_asc">Precio: menor a mayor</option>
                            <option value="price_desc">Precio: mayor a menor</option>
                        </select>
                    </div>
                </div >

                {/* Results Grid */}
                {
                    loading ? (
                        <div className="flex flex-col items-center justify-center py-24">
                            <Loader2 className="w-12 h-12 animate-spin text-[#fc7f51] mb-4" />
                            <p className="text-gray-500 font-medium">Buscando propiedades...</p>
                        </div>
                    ) : filteredProperties.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mb-6">
                                <Search className="w-12 h-12 text-[#fc7f51]/50" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">No encontramos propiedades</h3>
                            <p className="text-gray-500 max-w-md mb-6">
                                No hay propiedades que coincidan con tus criterios de búsqueda. Intenta ajustar los filtros o buscar en otra ubicación.
                            </p>
                            <button
                                onClick={clearFilters}
                                className="bg-[#fc7f51] hover:bg-[#e56b3e] text-white px-6 py-3 rounded-xl font-bold transition"
                            >
                                Limpiar Filtros
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            {filteredProperties.map(property => (
                                <PropertyCard key={property.id} property={property} />
                            ))}
                        </div>
                    )
                }
            </div >
        </div >
        );
};

        export default SearchResults;
