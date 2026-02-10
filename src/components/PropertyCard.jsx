import { Link } from 'react-router-dom';
import { Heart, Star } from 'lucide-react';

const PropertyCard = ({ property }) => {
    return (
        <Link
            to={`/property/${property.id}`}
            className="group block"
        >
            <div className="relative aspect-[20/19] overflow-hidden rounded-xl bg-gray-200 mb-3">
                <img
                    src={property.images[0]}
                    alt={property.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <button className="absolute top-3 right-3 text-white/70 hover:scale-110 transition">
                    <Heart className="w-6 h-6 fill-black/50 text-white stroke-[2px]" />
                </button>
            </div>

            <div className="flex justify-between items-start">
                <h3 className="font-bold text-gray-900 truncate pr-4">{property.location}</h3>
                <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-black text-black" />
                    <span className="text-sm font-light">4.9</span>
                </div>
            </div>

            <p className="text-gray-500 text-sm">Hosted by Agent Smith</p>
            <p className="text-gray-500 text-sm mb-1">Nov 15 - 20</p>

            <div className="flex items-baseline gap-1 mt-1">
                <span className="font-semibold text-gray-900">{property.price}</span>
                <span className="text-gray-900 font-light"> total</span>
            </div>
        </Link>
    );
};

export default PropertyCard;
