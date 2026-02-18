
import { useState, useEffect } from 'react';
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

const MapPicker = ({ onConfirm, initialLocation }) => {
    const [position, setPosition] = useState(initialLocation ? { lat: initialLocation.lat, lng: initialLocation.lng } : null);
    const [address, setAddress] = useState(initialLocation?.address || '');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    // Default center: Lima, Peru
    const defaultCenter = [-12.0464, -77.0428];

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery) return;
        setIsSearching(true);

        try {
            // Append context to search query for better results in Peru if not specified
            let query = searchQuery;
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
            } else {
                // Toast or error: location not found
                console.log("No location found");
            }
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setIsSearching(false);
        }
    };

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
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
                            placeholder="Buscar ciudad, calle o lugar..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:border-[#fc7f51] focus:ring-1 focus:ring-[#fc7f51] outline-none text-sm"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
