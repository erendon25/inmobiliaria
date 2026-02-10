import { Link } from 'react-router-dom';
import { Heart, Star } from 'lucide-react';

const PropertyCard = ({ property }) => {
    // Format price if it's a number
    const formattedPrice = typeof property.price === 'number'
        ? `$${property.price.toLocaleString()}`
        : property.price;

    return (
        <Link
            to={`/properties/${property.id}`} // Updated path to match App.jsx route
            className="group block"
        >
            <div className="relative aspect-[20/19] overflow-hidden rounded-xl bg-gray-200 mb-3">
                <img
                    src={property.images?.[0] || 'https://via.placeholder.com/400x300?text=No+Image'}
                    alt={property.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <button className="absolute top-3 right-3 text-white/70 hover:scale-110 transition">
                    <Heart className="w-6 h-6 fill-black/50 text-white stroke-[2px]" />
                </button>
            </div>

            <div className="flex justify-between items-start">
                <h3 className="font-bold text-gray-900 truncate pr-4">{property.location || property.address}</h3>
                <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-black text-black" />
                    <span className="text-sm font-light">New</span>
                </div>
            </div>

            <p className="text-gray-500 text-sm">Agente: {property.agentName || 'Inmuévete'}</p>
            <p className="text-gray-500 text-sm mb-1 line-clamp-1">{property.title}</p>

            <div className="flex items-baseline gap-1 mt-1">
                <span className="font-semibold text-gray-900">{formattedPrice}</span>
                {property.type === 'alquiler' && <span className="text-gray-900 font-light"> / mes</span>}
            </div>
        </Link>
    );
};

export default PropertyCard;
