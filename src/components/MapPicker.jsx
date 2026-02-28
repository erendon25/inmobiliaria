
import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { Search, MapPin, Loader2 } from 'lucide-react';
import L from 'leaflet';

// Fix for default marker icon missing in Leaflet + Webpack/Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to handle map clicks
function LocationMarker({ position, setPosition, setAddress }) {
    const map = useMapEvents({
        click(e) {
            setPosition(e.latlng);
            // Reverse Geocode
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}`)
                .then(res => res.json())
                .then(data => {
                    if (data && data.display_name) {
                        // Simplify address?
                        // Nominatim returns a very long string.
                        // Let's try to extract relevant parts or just use the whole line.
                        setAddress(data.display_name);
                    }
                })
                .catch(err => console.error("Error reverse geocoding", err));
        },
    });

    // Fly to position when it changes via search
    useEffect(() => {
        if (position) {
            map.flyTo(position, 16);
        }
    }, [position, map]);

    return position === null ? null : (
        <Marker position={position}></Marker>
    );
}

// Component to update map center dynamically
function MapUpdater({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.setView(center, 13);
        }
    }, [center, map]);
    return null;
}

const MapPicker = ({ onConfirm, initialLocation, initialSearchQuery }) => {
    const [position, setPosition] = useState(initialLocation ? { lat: initialLocation.lat, lng: initialLocation.lng } : null);
    const [address, setAddress] = useState(initialLocation?.address || '');
    const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '');
    const [isSearching, setIsSearching] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const debounceRef = useRef(null);

    // Default center: Lima, Peru
    const defaultCenter = [-12.0464, -77.0428];

    const performSearch = async (queryToSearch) => {
        if (!queryToSearch) return;
        setIsSearching(true);

        try {
            // Append context to search query for better results in Peru if not specified
            let query = queryToSearch;
            if (!query.toLowerCase().includes('peru') && !query.toLowerCase().includes('perú')) {
                query += ', Perú';
            }
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
            const data = await response.json();

            if (data && data.length > 0) {
                const firstResult = data[0];
                const newPos = { lat: parseFloat(firstResult.lat), lng: parseFloat(firstResult.lon) };
                setPosition(newPos);
                setAddress(firstResult.display_name);
                setSuggestions([]);
                setShowSuggestions(false);
            } else {
                console.log("No location found");
            }
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setIsSearching(false);
        }
    };

    const fetchSuggestions = async (queryToSearch) => {
        if (!queryToSearch || queryToSearch.length < 3) {
            setSuggestions([]);
            return;
        }
        try {
            let query = queryToSearch;
            if (!query.toLowerCase().includes('peru') && !query.toLowerCase().includes('perú')) {
                query += ', Perú';
            }
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
            const data = await response.json();
            setSuggestions(data || []);
            setShowSuggestions(true);
        } catch (error) {
            console.error("Suggestion error:", error);
        }
    };

    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearchQuery(val);

        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (val.length < 3) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        debounceRef.current = setTimeout(() => {
            fetchSuggestions(val);
        }, 500);
    };

    const selectSuggestion = (sug) => {
        setSearchQuery(sug.display_name);
        setAddress(sug.display_name);
        setPosition({ lat: parseFloat(sug.lat), lng: parseFloat(sug.lon) });
        setSuggestions([]);
        setShowSuggestions(false);
    };

    const handleSearch = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        performSearch(searchQuery);
    };

    useEffect(() => {
        if (initialSearchQuery && !initialLocation?.lat) {
            performSearch(initialSearchQuery);
        }
    }, []);

    const confirmSelection = () => {
        if (position) {
            onConfirm({
                lat: position.lat,
                lng: position.lng,
                address: address
            });
        }
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
            {/* Search Bar */}
            <div className="p-4 bg-gray-50 border-b border-gray-200">
                <div className="relative flex gap-2">
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={handleSearchChange}
                            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                            onBlur={() => { setTimeout(() => setShowSuggestions(false), 200); }}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
                            placeholder="Buscar ciudad, calle o lugar..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-[#fc7f51] focus:ring-1 focus:ring-[#fc7f51] outline-none text-sm"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

                        {/* Suggestions Dropdown */}
                        {showSuggestions && suggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-10 max-h-60 overflow-y-auto">
                                {suggestions.map((sug, idx) => (
                                    <div
                                        key={idx}
                                        className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-700 border-b border-gray-100 last:border-0"
                                        onMouseDown={() => selectSuggestion(sug)}
                                    >
                                        {sug.display_name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={handleSearch}
                        disabled={isSearching}
                        className="bg-[#262626] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-black transition disabled:opacity-70"
                    >
                        {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buscar"}
                    </button>
                </div>
                {address && (
                    <div className="mt-2 text-xs text-gray-500 flex items-start gap-1">
                        <MapPin className="w-3 h-3 mt-0.5 text-[#fc7f51]" />
                        <span className="line-clamp-2">{address}</span>
                    </div>
                )}
            </div>

            {/* Map Container */}
            <div className="flex-grow min-h-[300px] relative z-0">
                <MapContainer
                    center={defaultCenter}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={true}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker position={position} setPosition={setPosition} setAddress={setAddress} />
                </MapContainer>
            </div>

            {/* Confirm Button */}
            <div className="p-4 bg-white border-t border-gray-200 flex justify-end">
                <button
                    type="button"
                    onClick={confirmSelection}
                    disabled={!position}
                    className="bg-[#fc7f51] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#e56b3e] transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Confirmar Ubicación
                </button>
            </div>
        </div>
    );
};

export default MapPicker;
