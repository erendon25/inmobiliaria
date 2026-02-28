import { Link, useNavigate } from 'react-router-dom';
import { Heart, Star, Eye } from 'lucide-react';
import { useState, useEffect } from 'react';
import logo from '../assets/logo.png';
import { fetchSunatExchangeRate } from '../lib/exchangeRate';
import { useAuth } from '../context/AuthContext';

const PropertyCard = ({ property }) => {
    const { user, userData, toggleFavorite } = useAuth();
    const navigate = useNavigate();
    // Image cycling state
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isHovering, setIsHovering] = useState(false);

    // Exchange Rate
    const [liveRate, setLiveRate] = useState(property.exchangeRate || 3.36); // Default exchange rate

    useEffect(() => {
        let isMounted = true;
        fetchSunatExchangeRate().then(rate => {
            if (rate && isMounted) setLiveRate(rate);
        });
        return () => { isMounted = false; };
    }, []);

    const exchangeRate = liveRate;

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

    // Format Price Custom Function
    const formatCustomPrice = (amount, currencyCode) => {
        if (!amount && amount !== 0) return '0';

        // Ensure 2 decimal places if needed, or 0 if whole number looks better
        // The user wants maximumFractionDigits: 0 based on previous code usage
        const formattedAmount = amount.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });

        if (currencyCode === 'USD') {
            return `$ ${formattedAmount}`;
        } else {
            return `S/. ${formattedAmount}`;
        }
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
    // Ensure displayImage is always defined to prevent ReferenceError during HMR updates

    return (
        <Link
            to={`/properties/${property.id}`}
            className="group block relative"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            <div className="relative aspect-[20/19] overflow-hidden rounded-xl bg-gray-200 mb-3">
                <img
                    src={displayImage || 'https://placehold.co/400x300/e2e8f0/94a3b8?text=Sin+Imagen'}
                    alt={property.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {/* Watermark Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-15 pointer-events-none select-none z-0 gap-1">
                    <img src={logo} alt="" className="w-1/3 h-auto object-contain filter drop-shadow-md brightness-0 invert" />
                    <span className="text-white text-[10px] sm:text-xs font-bold tracking-widest uppercase drop-shadow-md text-center" style={{ textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>
                        Inmuevete Inmobiliaria
                    </span>
                </div>

                <div className="absolute top-3 left-3 flex flex-col gap-2 z-10 items-start">
                    {/* Promote Badge */}
                    {property.isPromoted && (
                        <div className="bg-[#fc7f51] text-white px-2 py-1 rounded-md text-xs font-bold shadow-md">
                            DESTACADO
                        </div>
                    )}

                    {/* Exclusive Badge */}
                    {property.isExclusive && (
                        <div className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white px-2 py-1 rounded-md text-xs font-bold shadow-md flex items-center gap-1">
                            <Star className="w-3 h-3 fill-white" /> EXCLUSIVO
                        </div>
                    )}

                    {/* Duplex Badge */}
                    {(property.isDuplex === 'si' || property.isDuplex === true) && (
                        <div className="bg-[#fc7f51] text-white px-2 py-1 rounded-md text-xs font-bold shadow-md border border-white/20">
                            DÚPLEX
                        </div>
                    )}
                </div>

                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!user) {
                            navigate('/login');
                            return;
                        }
                        toggleFavorite(property.id);
                    }}
                    className={`absolute top-3 right-3 transition z-10 p-2 hover:scale-110 active:scale-95`}
                >
                    <Heart className={`w-6 h-6 stroke-[2px] transition ${userData?.favorites?.includes(property.id) ? 'fill-red-500 text-red-500 stroke-red-500' : 'fill-black/50 text-white'}`} />
                </button>

                <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg text-white text-xs font-bold uppercase z-10">
                    {property.type}
                </div>

                {/* Tomada Overlay */}
                {property.status === 'tomada' && (
                    <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-20 flex items-center justify-center pointer-events-none">
                        <div className="bg-red-600/95 text-white font-black text-xl px-6 py-2 rounded-xl transform -rotate-12 border-4 border-white shadow-2xl tracking-widest uppercase">
                            {property.type?.toLowerCase() === 'alquiler' ? 'Alquilado' : (property.type?.toLowerCase() === 'anticresis' ? 'Tomada' : 'Vendido')}
                        </div>
                    </div>
                )}
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
                <span className="font-bold text-[#fc7f51] text-lg">{formatCustomPrice(mainPrice, mainCurrency)}</span>
                <span className="text-xs text-gray-400 font-medium">{formatCustomPrice(secondaryPrice, secondaryCurrency)}</span>
            </div>
        </Link>
    );
};

export default PropertyCard;
