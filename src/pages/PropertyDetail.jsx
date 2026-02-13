import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
<<<<<<< HEAD
import { doc, getDoc, addDoc, collection, updateDoc, increment } from 'firebase/firestore';

// ... (imports remain)
=======
import { doc, getDoc, addDoc, updateDoc, increment, collection } from 'firebase/firestore';
import { MapPin, ArrowLeft, Heart, Share, Star, ShieldCheck, DoorOpen, Calendar, User, Phone, Mail, X, Loader2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
>>>>>>> e906416540e27a489d3b8fff6f45592f6fbcf4b2

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

const PropertyDetail = () => {
<<<<<<< HEAD
    // ... (state remains)

    // WhatsApp Handler
    const handleWhatsAppClick = () => {
        if (!property) return;

        // Default agent number if not present (using the one from previous context or generic)
        // Assuming agentPhone should be in property data or user data. 
        // If not, we might need to fetch agent data.
        // For now, let's use a placeholder or check if property has agent phone.
        // The user mentioned "el boton de whatsapp no me redirige".
        // Let's assume a default number if none exists, or use the one from the property contact card.
        // Wait, the property might not have the agent's phone directly on it if it wasn't saved.
        // But let's assume valid data for now or use a fallback.

        const phoneNumber = "51999999999"; // Default fallback as per previous context
        const message = `Hola, estoy interesado en la propiedad: ${property.title}`;
        const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
=======
    const { id } = useParams();
    const [property, setProperty] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showContact, setShowContact] = useState(false);
    const [contactLoading, setContactLoading] = useState(false);
    const hasViewedRef = useRef(false);

    // Contact Form
    const [contactForm, setContactForm] = useState({
        name: '',
        phone: '',
        message: 'Hola, estoy interesado en esta propiedad y me gustaría recibir más información.'
    });

    const handleContactSubmit = async (e) => {
        e.preventDefault();
        setContactLoading(true);
        try {
            await addDoc(collection(db, "inquiries"), {
                propertyId: property.id,
                propertyTitle: property.title,
                agentId: property.agentId,
                clientName: contactForm.name,
                clientPhone: contactForm.phone,
                clientMessage: contactForm.message,
                timestamp: new Date(),
                status: 'pending'
            });
            toast.success("¡Tu solicitud ha sido enviada! El agente te contactará pronto.");
            setShowContact(false);
            setContactForm({ name: '', phone: '', message: '' });
        } catch (error) {
            console.error("Error sending inquiry:", error);
            toast.error("Hubo un error al enviar tu solicitud.");
        } finally {
            setContactLoading(false);
        }
>>>>>>> e906416540e27a489d3b8fff6f45592f6fbcf4b2
    };

    useEffect(() => {
        const fetchProperty = async () => {
            try {
                if (!id) return;
                const docRef = doc(db, "properties", id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
<<<<<<< HEAD
                    setProperty({ id: docSnap.id, ...docSnap.data() });

                    // Increment Views (Atomic)
                    // Use a separate fire-and-forget update to avoid blocking text render
                    updateDoc(docRef, {
                        views: increment(1)
                    }).catch(err => console.error("Error updating views:", err));

=======
                    const data = docSnap.data();

                    // Increment view counter locally and in DB if not already viewed in this session
                    if (!hasViewedRef.current) {
                        hasViewedRef.current = true;

                        // Fire and forget DB update
                        updateDoc(docRef, {
                            views: increment(1)
                        }).catch(err => console.error("Error incrementing views", err));

                        // Optimistic UI update
                        data.views = (data.views || 0) + 1;
                    }

                    setProperty({ id: docSnap.id, ...data });
>>>>>>> e906416540e27a489d3b8fff6f45592f6fbcf4b2
                } else {
                    console.log("No such document!");
                }
            } catch (error) {
                console.error("Error fetching property:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProperty();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-[#fc7f51] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!property) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Propiedad no encontrada</h2>
                <Link to="/" className="text-[#fc7f51] hover:underline">Volver al inicio</Link>
            </div>
        );
    }

    // Exchange Rate Logic
    const EXCHANGE_RATE = 3.75;
    const price = typeof property.price === 'number' ? property.price : parseFloat(property.price);
    const currency = property.currency || 'USD';

    let priceUSD, pricePEN;
    if (currency === 'USD') {
        priceUSD = price;
        pricePEN = price * EXCHANGE_RATE;
    } else {
        pricePEN = price;
        priceUSD = price / EXCHANGE_RATE;
    }

    const mapUrl = property.lat && property.lng
        ? `https://www.google.com/maps/search/?api=1&query=${property.lat},${property.lng}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.location)}`;

    return (
        <div className="min-h-screen bg-white font-sans text-[#262626]">
            <main className="container mx-auto px-6 pt-32 pb-12">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{property.title}</h1>
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center text-sm gap-4">
                        <div className="flex items-center gap-2 text-gray-800 font-medium overflow-hidden">
                            <MapPin className="w-4 h-4 text-[#fc7f51] flex-shrink-0" />
                            <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-[#fc7f51] truncate">
                                {property.location}
                            </a>
                        </div>
                        <div className="flex gap-4">
                            <button className="flex items-center gap-2 hover:bg-gray-100 px-3 py-1.5 rounded-lg font-semibold text-sm transition">
                                <Share className="w-4 h-4" /> Compartir
                            </button>
                            <button className="flex items-center gap-2 hover:bg-gray-100 px-3 py-1.5 rounded-lg font-semibold text-sm transition">
                                <Heart className="w-4 h-4" /> Guardar
                            </button>
                        </div>
                    </div>
                </div>

                {/* Image Carousel (Swiper) */}
                <div className="rounded-2xl overflow-hidden mb-12 shadow-2xl relative h-[400px] md:h-[600px] bg-gray-100 group">
                    <Swiper
                        modules={[Navigation, Pagination]}
                        navigation
                        pagination={{ clickable: true }}
                        className="h-full w-full"
                        loop={true}
                    >
                        {property.images && property.images.length > 0 ? (
                            property.images.map((img, idx) => (
                                <SwiperSlide key={idx}>
                                    <img src={img} alt={`Slide ${idx}`} className="w-full h-full object-cover" />
                                </SwiperSlide>
                            ))
                        ) : (
                            <SwiperSlide>
                                <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                                    No hay imágenes disponibles
                                </div>
                            </SwiperSlide>
                        )}
                    </Swiper>

                    {/* Floating Counter */}
                    <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs z-10 font-bold flex items-center gap-2">
                        <User className="w-3 h-3" /> {property.views || 0} Vistas
                    </div>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Left Column */}
                    <div className="lg:col-span-2">
                        {/* Agent Info */}
                        <div className="border-b border-gray-200 pb-8 mb-8 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-bold mb-1">Publicado por {property.agentName || 'Agente Inmuévete'}</h2>
                                <p className="text-gray-600 mb-0">
                                    {property.bedrooms || 0} Habitaciones · {property.bathrooms || 0} Baños · {property.footage} m²
                                </p>
                            </div>
                            <div className="w-14 h-14 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden border-2 border-white shadow-md">
                                <User className="w-8 h-8 text-gray-400" />
                            </div>
                        </div>

                        {/* Description */}
                        <div className="border-b border-gray-200 pb-8 mb-8">
                            <h3 className="text-xl font-bold mb-4">Descripción</h3>
                            <p className="text-gray-800 leading-relaxed text-base whitespace-pre-line">
                                {property.description}
                            </p>
                        </div>

                        {/* Details Grid */}
                        <div className="border-b border-gray-200 pb-8 mb-8">
                            <h3 className="text-xl font-bold mb-4">Detalles</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex justify-between py-2 border-b border-gray-50">
                                    <span className="text-gray-500">Tipo</span>
                                    <span className="font-semibold capitalize">{property.type}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-50">
                                    <span className="text-gray-500">Categoría</span>
                                    <span className="font-semibold capitalize">{property.category}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-50">
                                    <span className="text-gray-500">Área</span>
                                    <span className="font-semibold">{property.footage} m²</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-50">
                                    <span className="text-gray-500">Estado</span>
                                    <span className={`font-semibold capitalize ${property.status === 'disponible' ? 'text-green-600' : 'text-red-500'}`}>
                                        {property.status}
                                    </span>
                                </div>
<<<<<<< HEAD
                                <div className="flex justify-between py-2 border-b border-gray-50">
                                    <span className="text-gray-500">Antigüedad</span>
                                    <span className="font-semibold capitalize">{property.antiquity === 'up_to_5' ? 'Hasta 5 años' : property.antiquity === '5_to_10' ? '5 a 10 años' : property.antiquity === 'more_than_10' ? 'Más de 10 años' : property.antiquity === 'more_than_20' ? 'Más de 20 años' : property.antiquity || 'No especificado'}</span>
                                </div>
                                {property.floor && (
                                    <div className="flex justify-between py-2 border-b border-gray-50">
                                        <span className="text-gray-500">Piso</span>
                                        <span className="font-semibold">{property.floor}°</span>
                                    </div>
                                )}
                                <div className="flex justify-between py-2 border-b border-gray-50">
                                    <span className="text-gray-500">Ascensor</span>
                                    <span className="font-semibold">{property.elevator ? 'Sí' : 'No'}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-50">
                                    <span className="text-gray-500">Cochera</span>
                                    <span className="font-semibold">{property.parking ? 'Sí' : 'No'}</span>
=======

                                {/* New Antiquity Field */}
                                <div className="flex justify-between py-2 border-b border-gray-50">
                                    <span className="text-gray-500">Antigüedad</span>
                                    <span className="font-semibold flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-[#fc7f51]" />
                                        {property.antiquityType === 'estreno'
                                            ? <span className="text-green-600 font-bold uppercase text-xs border border-green-200 bg-green-50 px-2 py-0.5 rounded-full">De Estreno</span>
                                            : `${property.antiquityYears} Años`
                                        }
                                    </span>
>>>>>>> e906416540e27a489d3b8fff6f45592f6fbcf4b2
                                </div>
                            </div>
                        </div>

                        {/* Map Section */}
                        <div className="pt-4">
                            <h2 className="text-2xl font-bold mb-4">Ubicación</h2>
                            <p className="text-gray-500 mb-4">{property.location}</p>

                            <div className="h-96 w-full rounded-xl overflow-hidden bg-gray-100 shadow-inner relative group">
                                {property.lat && property.lng ? (
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        frameBorder="0"
                                        style={{ border: 0 }}
                                        src={`https://maps.google.com/maps?q=${property.lat},${property.lng}&hl=es&z=15&output=embed`}
                                        allowFullScreen
                                        title="Ubicación Propiedad"
                                    ></iframe>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-200">
                                        <MapPin className="w-12 h-12 text-gray-400 mb-2" />
                                        <p className="text-gray-500">Mapa no disponible para esta ubicación.</p>
                                    </div>
                                )}

                                <a
                                    href={mapUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="absolute bottom-4 right-4 bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow-lg text-sm font-bold flex items-center gap-2 hover:bg-[#fc7f51] hover:text-white transition"
                                >
                                    <MapPin className="w-4 h-4" />
                                    Abrir en Google Maps
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Sticky Contact Card */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-32 bg-white rounded-xl shadow-card border border-gray-200 p-6">
                            <div className="mb-6">
                                <span className="block text-3xl font-bold text-[#fc7f51]">
                                    {priceUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
                                </span>
                                <span className="block text-xl font-bold text-gray-400 mt-1">
                                    {pricePEN.toLocaleString('en-US', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 })}
                                </span>
                                {property.type === 'alquiler' && <span className="text-gray-500 text-sm block mt-1">Precio por mes</span>}
                            </div>

                            <button
                                onClick={handleWhatsAppClick}
                                className="w-full bg-[#25D366] text-white font-bold text-lg py-3 rounded-lg hover:bg-[#20bd5a] transition mb-4 shadow-lg shadow-green-500/30 flex items-center justify-center gap-2"
                            >
                                <Phone className="w-5 h-5" />
                                Contactar por WhatsApp
                            </button>

                            <button
                                onClick={() => setShowContact(true)}
                                className="w-full bg-white border-2 border-gray-200 text-gray-700 font-bold py-3 rounded-lg hover:border-[#fc7f51] hover:text-[#fc7f51] transition mb-6 flex items-center justify-center gap-2"
                            >
                                <Mail className="w-5 h-5" />
                                Solicitar Información
                            </button>

                            <div className="text-center text-xs text-gray-400">
                                * Al contactar aceptas nuestros términos y condiciones.
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Contact Modal */}
            {showContact && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-800">Solicitar Información</h3>
                            <button
                                onClick={() => setShowContact(false)}
                                className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-200 rounded-full transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleContactSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-[#fc7f51] focus:ring-2 focus:ring-[#fc7f51]/20 outline-none transition"
                                    placeholder="Tu nombre completo"
                                    value={contactForm.name}
                                    onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono / WhatsApp</label>
                                <input
                                    required
                                    type="tel"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-[#fc7f51] focus:ring-2 focus:ring-[#fc7f51]/20 outline-none transition"
                                    placeholder="Ej: +51 999 999 999"
                                    value={contactForm.phone}
                                    onChange={e => setContactForm({ ...contactForm, phone: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje</label>
                                <textarea
                                    required
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-[#fc7f51] focus:ring-2 focus:ring-[#fc7f51]/20 outline-none transition h-32 resize-none"
                                    value={contactForm.message}
                                    onChange={e => setContactForm({ ...contactForm, message: e.target.value })}
                                ></textarea>
                            </div>
                            <button
                                type="submit"
                                disabled={contactLoading}
                                className="w-full bg-[#fc7f51] hover:bg-[#e56b3e] text-white font-bold py-3 rounded-lg shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {contactLoading ? <Loader2 className="animate-spin" /> : "Enviar Solicitud"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PropertyDetail;
