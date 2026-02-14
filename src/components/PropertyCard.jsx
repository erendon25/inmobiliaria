import { Link } from 'react-router-dom';
import { Heart, Star, Eye } from 'lucide-react';
import { useState, useEffect } from 'react';

const PropertyCard = ({ property }) => {
    // Exchange Rate
    const exchangeRate = property.exchangeRate || 3.80; // Default exchange rate
    // Image cycling state
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isHovering, setIsHovering] = useState(false);

    // Determine currencies
    const currency = property.currency || 'USD';
    const price = typeof property.price === 'number' ? property.price : parseFloat(property.price);

    let mainPrice, secondaryPrice;
    let mainCurrency, secondaryCurrency;

    if (currency === 'USD') {
        mainPrice = price;
        mainCurrency = 'USD';
        secondaryPrice = price * exchangeRate;
        secondaryCurrency = 'PEN';
    } else {
        mainPrice = price;
        mainCurrency = 'PEN';
        secondaryPrice = price / exchangeRate;
        secondaryCurrency = 'USD';
    }

    const formatPrice = (amount, curr) => {
        if (!amount && amount !== 0) return '0';
        return amount.toLocaleString('en-US', {
            style: 'currency',
            currency: curr,
            maximumFractionDigits: 0
        });
    };

    // Cycle images on hover
    useEffect(() => {
        let interval;
        if (isHovering && property.images && property.images.length > 1) {
            interval = setInterval(() => {
                setCurrentImageIndex((prev) => (prev + 1) % property.images.length);
            }, 1000);
        } else {
            setCurrentImageIndex(0);
        }
        return () => clearInterval(interval);
    }, [isHovering, property.images]);

    const displayImage = property.images?.[currentImageIndex] || property.images?.[0] || 'https://placehold.co/400x300/e2e8f0/94a3b8?text=Sin+Imagen';

    return (
        <Link
            to={`/properties/${property.id}`}
            className="group block relative"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            <div className="relative aspect-[20/19] overflow-hidden rounded-xl bg-gray-200 mb-3">
                <img
                    src={displayImage}
                    alt={property.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {/* Promote Badge */}
                {property.isPromoted && (
                    <div className="absolute top-3 left-3 bg-[#fc7f51] text-white px-2 py-1 rounded-md text-xs font-bold shadow-md z-10">
                        DESTACADO
                    </div>
                )}

                <button className="absolute top-3 right-3 text-white/70 hover:scale-110 transition z-10">
                    <Heart className="w-6 h-6 fill-black/50 text-white stroke-[2px]" />
                </button>

                <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg text-white text-xs font-bold uppercase">
                    {property.type}
                </div>
            </div>

            <div className="flex justify-between items-center mb-1">
                <h3 className="font-semibold text-gray-500 truncate pr-2 text-xs uppercase tracking-wide">{property.location || property.address}</h3>
                <div className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full" title="Vistas">
                    <Eye className="w-3 h-3 text-[#fc7f51]" />
                    <span className="text-xs font-bold text-gray-700">{property.views || 0}</span>
                </div>
            </div>

            <p className="text-gray-500 text-xs mt-1">Agente: {property.agentName || 'Inmuévete'}</p>
            <p className="text-gray-800 text-sm font-semibold mb-1 line-clamp-1">{property.title}</p>

            <div className="flex items-baseline gap-2 mt-1">
                <span className="font-bold text-[#fc7f51] text-lg">{formatPrice(mainPrice, mainCurrency)}</span>
                <span className="text-xs text-gray-400 font-medium">{formatPrice(secondaryPrice, secondaryCurrency)}</span>
            </div>
        </Link>
    );
};

export default PropertyCard;
