import React, { useMemo, useState } from 'react';
import { MapContainer, TileLayer, Circle, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { motion } from 'framer-motion';
import { Map as MapIcon, Layers, TrendingUp, CheckCircle } from 'lucide-react';

// Coordenadas aproximadas para los distritos más comunes en Perú
const LOCATION_COORDINATES = {
    // Cusco
    "Cusco": [-13.5319, -71.9675],
    "San Jerónimo": [-13.5414, -71.8856],
    "San Sebastián": [-13.5228, -71.9211],
    "Santiago": [-13.5377, -71.9806],
    "Wanchaq": [-13.5222, -71.9567],
    
    // Arequipa
    "Arequipa": [-16.4090, -71.5375],
    "Cayma": [-16.3817, -71.5456],
    "Yanahuara": [-16.3875, -71.5422],
    "Cerro Colorado": [-16.3768, -71.5647],
    "José Luis Bustamante y Rivero": [-16.4258, -71.5186],
    "Paucarpata": [-16.4200, -71.4781],
    "Socabaya": [-16.4528, -71.5175],
    "Alto Selva Alegre": [-16.3794, -71.5164],
    "Jacobo Hunter": [-16.4422, -71.5514],
    "Sachaca": [-16.4264, -71.5639],
    "Tiabaya": [-16.4286, -71.5833],
    "Lambramani": [-16.4111, -71.5222],

    // Lima
    "Lima": [-12.0464, -77.0428],
    "Miraflores": [-12.1208, -77.0289],
    "San Isidro": [-12.0972, -77.0353],
    "Santiago de Surco": [-12.1292, -76.9961],
    "Surco": [-12.1292, -76.9961],
    "La Molina": [-12.0778, -76.9111],
    "San Borja": [-12.0975, -76.9953],
    "Chorrillos": [-12.1764, -77.0303],
    "Barranco": [-12.1489, -77.0211],
    "San Miguel": [-12.0781, -77.0911],
    "Magdalena del Mar": [-12.0914, -77.0700],
    "Jesús María": [-12.0750, -77.0480],
    "Pueblo Libre": [-12.0740, -77.0650],
    "Ate": [-12.0250, -76.9180],
    "San Juan de Lurigancho": [-11.9700, -77.0000],
    
    // Trujillo
    "Trujillo": [-8.1160, -79.0300],
    "Huanchaco": [-8.0761, -79.1172],
    
    // Piura
    "Piura": [-5.1945, -80.6328]
};

// Componente para reajustar la vista del mapa cuando cambian los datos
function ChangeView({ center, zoom }) {
    const map = useMap();
    map.setView(center, zoom);
    return null;
}

const PropertyHeatMap = ({ properties }) => {
    const [viewType, setViewType] = useState('uploaded'); // 'uploaded' o 'closed'

    // Procesar datos para el mapa con mayor exactitud
    const heatPoints = useMemo(() => {
        const points = [];
        
        properties.forEach(prop => {
            let lat = prop.lat;
            let lng = prop.lng;
            let isExact = true;

            // Si no hay coordenadas exactas, intentar por distrito
            if (!lat || !lng) {
                const parts = prop.location?.split(',') || [];
                let districtName = parts[0]?.trim();
                
                // Buscar en el diccionario
                let coords = LOCATION_COORDINATES[districtName];
                
                // Si no se encuentra por nombre directo, buscar contenido
                if (!coords && prop.location) {
                    const found = Object.keys(LOCATION_COORDINATES).find(key => 
                        prop.location.includes(key)
                    );
                    if (found) {
                        coords = LOCATION_COORDINATES[found];
                        districtName = found;
                    }
                }

                if (coords) {
                    // Añadir un pequeño "jitter" (desplazamiento aleatorio) 
                    // para que no todas las del mismo distrito se encimen exactamente
                    const jitter = 0.005; 
                    lat = coords[0] + (Math.random() - 0.5) * jitter;
                    lng = coords[1] + (Math.random() - 0.5) * jitter;
                    isExact = false;
                }
            }

            if (!lat || !lng) return;

            // Filtrar por tipo de vista
            const isClosed = prop.status === 'tomada' || prop.status === 'vendido' || prop.status === 'alquilado';
            
            if (viewType === 'closed' && !isClosed) return;
            // Si vemos 'uploaded', mostramos todas las que NO son borradores? 
            // O todas las que el agente tenga (subidas)
            if (viewType === 'uploaded' && prop.status === 'draft') return;

            points.push({
                id: prop.id,
                lat: parseFloat(lat),
                lng: parseFloat(lng),
                title: prop.title,
                isExact,
                status: prop.status
            });
        });

        return points;
    }, [properties, viewType]);

    // Calcular el centro promedio
    const mapCenter = useMemo(() => {
        if (heatPoints.length === 0) return [-13.5319, -71.9675]; // Cusco default
        const lat = heatPoints.reduce((acc, curr) => acc + curr.lat, 0) / heatPoints.length;
        const lng = heatPoints.reduce((acc, curr) => acc + curr.lng, 0) / heatPoints.length;
        return [lat, lng];
    }, [heatPoints]);

    return (
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            {/* Cabecera del Mapa */}
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg text-[#fc7f51]">
                        <MapIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Mapa de Actividad Geográfica</h3>
                        <p className="text-xs text-gray-500">
                            {viewType === 'uploaded' 
                                ? 'Frecuencia de captaciones por zona' 
                                : 'Zonas con mayor efectividad de cierres'}
                        </p>
                    </div>
                </div>

                {/* Selector de Fichas (Tabs) */}
                <div className="flex bg-gray-100 p-1.5 rounded-2xl border border-gray-200 shadow-inner self-stretch md:self-auto min-w-[320px]">
                    <button
                        onClick={() => setViewType('uploaded')}
                        className={`flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all duration-300 ${
                            viewType === 'uploaded' 
                            ? 'bg-white text-[#fc7f51] shadow-md border border-gray-100' 
                            : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                        }`}
                    >
                        <TrendingUp className={`w-4 h-4 ${viewType === 'uploaded' ? 'text-[#fc7f51]' : 'text-gray-400'}`} />
                        Propiedades Subidas
                    </button>
                    <button
                        onClick={() => setViewType('closed')}
                        className={`flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all duration-300 ${
                            viewType === 'closed' 
                            ? 'bg-white text-emerald-600 shadow-md border border-gray-100' 
                            : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                        }`}
                    >
                        <CheckCircle className={`w-4 h-4 ${viewType === 'closed' ? 'text-emerald-600' : 'text-gray-400'}`} />
                        Cierres Exitosos
                    </button>
                </div>
            </div>

            {/* Contenedor del Mapa */}
            <div className="h-[550px] w-full relative z-10">
                <MapContainer 
                    center={mapCenter} 
                    zoom={12} 
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={false}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    
                    <ChangeView center={mapCenter} zoom={12} />

                    {heatPoints.map((point) => {
                        // Colores Premium
                        const color = viewType === 'uploaded' ? '#fc7f51' : '#10b981';
                        
                        return (
                            <Circle
                                key={point.id}
                                center={[point.lat, point.lng]}
                                radius={400} // Radio fijo para efecto de calor por superposición
                                pathOptions={{
                                    color: color,
                                    fillColor: color,
                                    fillOpacity: 0.25,
                                    weight: 1
                                }}
                            >
                                <Popup>
                                    <div className="p-2">
                                        <h4 className="font-bold text-sm mb-1">{point.title}</h4>
                                        <p className="text-xs text-gray-500">
                                            {point.isExact ? '📍 Ubicación Exacta' : '🏢 Ubicación Referencial'}
                                        </p>
                                        <div className="mt-2 text-xs font-bold uppercase" style={{ color: color }}>
                                            {point.status === 'tomada' ? 'Cerrada' : 'Activa'}
                                        </div>
                                    </div>
                                </Popup>
                            </Circle>
                        );
                    })}

                    {/* Leyenda Flotante */}
                    <div className="absolute bottom-6 right-6 z-[1000] bg-white/90 backdrop-blur px-4 py-3 rounded-2xl shadow-2xl border border-gray-200">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-[#fc7f51] opacity-60"></div>
                                <span className="text-xs font-bold text-gray-700">Captación / Inventario</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-emerald-500 opacity-60"></div>
                                <span className="text-xs font-bold text-gray-700">Vendido / Alquilado</span>
                            </div>
                            <div className="mt-2 pt-2 border-t border-gray-100">
                                <span className="text-[10px] text-gray-400">Intensidad de color = Densidad de zona</span>
                            </div>
                        </div>
                    </div>
                </MapContainer>
            </div>
        </div>
    );
};

export default PropertyHeatMap;
