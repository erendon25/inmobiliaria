import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, addDoc, updateDoc, increment, collection } from 'firebase/firestore';
import { MapPin, ArrowLeft, Heart, Share, Star, ShieldCheck, DoorOpen, Calendar, User, Phone, Mail, X, Loader2, Clock, Car, Building2, ArrowUpFromLine, Layers, Waves, Dumbbell, Armchair, ArrowUpDown, Maximize, Bath, BedDouble, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';


// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { addWatermark, downloadImage } from '../lib/watermark';
import logo from '../assets/logo.png';
import { Download } from 'lucide-react';

const PropertyDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, userData } = useAuth();
    const [property, setProperty] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showContact, setShowContact] = useState(false);
    const [contactLoading, setContactLoading] = useState(false);
    const hasViewedRef = useRef(false);

    // Visit State
    const [showVisitModal, setShowVisitModal] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [visitLoading, setVisitLoading] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [confirmedVisit, setConfirmedVisit] = useState(null);
    const [activeImage, setActiveImage] = useState(0);
    const [showLightbox, setShowLightbox] = useState(false);

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
    };

    const handleScheduleVisit = () => {
        if (!user) {
            toast.error("Debes iniciar sesión para agendar una visita.");
            navigate('/login', { state: { from: location.pathname } });
            return;
        }
        const slots = property?.availableVisitSlots || [];
        if (slots.length === 0) {
            toast.error("El agente aún no ha definido horarios de visita para esta propiedad.");
            return;
        }
        setSelectedSlot(null);
        setShowVisitModal(true);
    };

    const submitVisit = async () => {
        if (!selectedSlot) {
            toast.error("Selecciona un horario.");
            return;
        }
        setVisitLoading(true);
        try {
            const visitData = {
                propertyId: property.id,
                propertyTitle: property.title,
                agentId: property.agentId,
                clientId: user.uid,
                clientName: userData?.displayName || user.displayName || 'Cliente',
                clientPhone: userData?.phoneNumber || 'No especificado',
                clientEmail: user.email,
                visitDate: selectedSlot.date,
                visitTime: selectedSlot.time,
                status: 'pending',
                timestamp: new Date()
            };

            await addDoc(collection(db, "visits"), visitData);

            // Remove the booked slot from the property's available slots
            const propertyRef = doc(db, "properties", property.id);
            const newSlots = property.availableVisitSlots.filter(slot => slot.id !== selectedSlot.id);

            await updateDoc(propertyRef, {
                availableVisitSlots: newSlots
            });

            // Update local state to reflect change immediately
            setProperty(prev => ({
                ...prev,
                availableVisitSlots: newSlots
            }));

            setConfirmedVisit(visitData);
            setShowVisitModal(false);
            setShowSuccessModal(true);
            setSelectedSlot(null);
        } catch (error) {
            console.error("Error scheduling visit:", error);
            toast.error("Error al agendar la visita.");
        } finally {
            setVisitLoading(false);
        }
    };

    // Calendar Utilities
    const addToGoogleCalendar = () => {
        if (!confirmedVisit) return;
        const startTime = new Date(`${confirmedVisit.visitDate}T${confirmedVisit.visitTime}`).toISOString().replace(/-|:|\.\d\d\d/g, "");
        const endTime = new Date(new Date(`${confirmedVisit.visitDate}T${confirmedVisit.visitTime}`).getTime() + 60 * 60 * 1000).toISOString().replace(/-|:|\.\d\d\d/g, "");

        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Visita: ${confirmedVisit.propertyTitle}`)}&dates=${startTime}/${endTime}&details=${encodeURIComponent(`Visita agendada con Inmuévete.\nPropiedad: ${confirmedVisit.propertyTitle}\nCliente: ${confirmedVisit.clientName}`)}&location=${encodeURIComponent(property.location || '')}`;
        window.open(url, '_blank');
    };

    const addToOutlookCalendar = () => {
        if (!confirmedVisit) return;
        const startTime = new Date(`${confirmedVisit.visitDate}T${confirmedVisit.visitTime}`).toISOString();
        const endTime = new Date(new Date(`${confirmedVisit.visitDate}T${confirmedVisit.visitTime}`).getTime() + 60 * 60 * 1000).toISOString();

        const url = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(`Visita: ${confirmedVisit.propertyTitle}`)}&startdt=${startTime}&enddt=${endTime}&body=${encodeURIComponent(`Visita agendada con Inmuévete.\nPropiedad: ${confirmedVisit.propertyTitle}`)}&location=${encodeURIComponent(property.location || '')}`;
        window.open(url, '_blank');
    };

    const downloadICS = () => {
        if (!confirmedVisit) return;
        const startTime = new Date(`${confirmedVisit.visitDate}T${confirmedVisit.visitTime}`).toISOString().replace(/-|:|\.\d\d\d/g, "");
        const endTime = new Date(new Date(`${confirmedVisit.visitDate}T${confirmedVisit.visitTime}`).getTime() + 60 * 60 * 1000).toISOString().replace(/-|:|\.\d\d\d/g, "");

        const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
URL:${window.location.href}
DTSTART:${startTime}
DTEND:${endTime}
SUMMARY:Visita: ${confirmedVisit.propertyTitle}
DESCRIPTION:Visita agendada con Inmuévete para ver la propiedad ${confirmedVisit.propertyTitle}.
LOCATION:${property.location || ''}
END:VEVENT
END:VCALENDAR`;

        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.setAttribute('download', 'visita.ics');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const notifyAgentWhatsApp = () => {
        // We'll use the same logic as handleWhatsAppClick to try to get agent phone, or fallback
        // Since we are inside the component we can reuse handleWhatsAppClick logic or simplify:
        // For simplicity, let's just trigger a generic message to the main line or agent if available
        // But better reuse the property agent info.

        // Re-using the logic from handleWhatsAppClick slightly modified for this context
        let phoneNumber = '51965355700'; // Default Main Number
        // Ideally we would fetch the agent phone again or store it in property state. 
        // Assuming property.agentPhone might exist or we just use main support for now to ensure delivery.

        const message = `Hola, acabo de agendar una visita para la propiedad: ${confirmedVisit.propertyTitle}\nFecha: ${confirmedVisit.visitDate}\nHora: ${confirmedVisit.visitTime}\nSoy: ${confirmedVisit.clientName}`;
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    // WhatsApp Handler - fetches agent phone from Firestore
    const handleWhatsAppClick = async () => {
        if (!property) return;

        let phoneNumber = property.agentPhone || '51999999999'; // Use stored phone or fallback

        // If stored phone is missing but we have ID, try fetching (fallback logic)
        if (!property.agentPhone && property.agentId) {
            try {
                const agentDoc = await getDoc(doc(db, 'users', property.agentId));
                if (agentDoc.exists()) {
                    const agentData = agentDoc.data();
                    if (agentData.phoneNumber) {
                        phoneNumber = agentData.phoneNumber;
                    }
                }
            } catch (err) {
                console.error('Error fetching agent phone:', err);
            }
        }

        // Clean phone number: remove spaces, dashes, plus sign
        phoneNumber = phoneNumber.replace(/[\s\-\+]/g, '');
        // Ensure it starts with country code
        if (!phoneNumber.startsWith('51') && phoneNumber.length === 9) {
            phoneNumber = '51' + phoneNumber;
        }

        const message = `Hola, estoy interesado en la propiedad: ${property.title}\n📍 ${property.location}`;
        const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    // Share Handler
    const handleShare = async () => {
        const shareData = {
            title: property?.title || 'Propiedad en Inmuévete',
            text: `Mira esta propiedad: ${property?.title} - ${property?.location}`,
            url: window.location.href,
        };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(window.location.href);
                toast.success('¡Enlace copiado al portapapeles!');
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                await navigator.clipboard.writeText(window.location.href);
                toast.success('¡Enlace copiado al portapapeles!');
            }
        }
    };

    // Save Handler
    const handleSave = () => {
        toast.success('¡Propiedad guardada en favoritos!');
    };

    const handleDownloadImage = async (e) => {
        e.stopPropagation();
        const imageUrl = property.images[activeImage];
        const toastId = toast.loading("Preparando descarga...");

        try {
            // Create a temporary image to get dimensions if needed, or let addWatermark handle it
            // We pass the logo URL and fallback text
            const watermarkedDataUrl = await addWatermark(imageUrl, logo, "Inmuévete");

            // Create a filename
            const filename = `propiedad-${property.title.substring(0, 20).replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${activeImage + 1}.jpg`;

            downloadImage(watermarkedDataUrl, filename);
            toast.success("Imagen descargada con marca de agua", { id: toastId });
        } catch (error) {
            console.error("Error downloading image:", error);
            toast.error("No se pudo descargar la imagen. Intente nuevamente.", { id: toastId });
        }
    };

    useEffect(() => {
        const fetchProperty = async () => {
            try {
                if (!id) return;
                const docRef = doc(db, "properties", id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();

                    // Block access to draft properties for non-owners
                    if (data.status === 'borrador' && (!user || data.agentId !== user.uid)) {
                        setProperty(null);
                        setLoading(false);
                        return;
                    }

                    // Increment view counter only for published properties
                    if (!hasViewedRef.current && data.status !== 'borrador') {
                        hasViewedRef.current = true;

                        // Fire and forget DB update
                        updateDoc(docRef, {
                            views: increment(1)
                        }).catch(err => console.error("Error incrementing views", err));

                        // Optimistic UI update
                        data.views = (data.views || 0) + 1;
                    }

                    setProperty({ id: docSnap.id, ...data });
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
    const exchangeRate = property.exchangeRate || 3.80;
    const price = typeof property.price === 'number' ? property.price : parseFloat(property.price);
    const currency = property.currency || 'USD';

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

    const mapUrl = property.lat && property.lng
        ? `https://www.google.com/maps/search/?api=1&query=${property.lat},${property.lng}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.location)}`;

    return (
        <div className="min-h-screen bg-white font-sans text-[#262626]">
            <main className="container mx-auto px-4 md:px-6 pt-28 md:pt-32 pb-12">
                {property.status === 'draft' && (
                    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
                        <p className="font-bold">Modo Vista Previa (Borrador)</p>
                        <p>Esta propiedad aún no es visible para el público.</p>
                    </div>
                )}
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
                        <div className="flex flex-wrap gap-2">
                            <button onClick={handleShare} className="flex items-center gap-2 hover:bg-gray-100 px-3 py-1.5 rounded-lg font-semibold text-sm transition">
                                <Share className="w-4 h-4" /> Compartir
                            </button>
                            <button onClick={handleSave} className="flex items-center gap-2 hover:bg-gray-100 px-3 py-1.5 rounded-lg font-semibold text-sm transition">
                                <Heart className="w-4 h-4" /> Guardar
                            </button>
                        </div>
                    </div>
                </div>

                {/* Image Carousel (Swiper) */}
                {/* Image Gallery */}
                <div className="flex flex-col gap-4 mb-12">
                    {/* Main Image */}
                    <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-gray-900 shadow-xl group">
                        {property.images && property.images.length > 0 ? (
                            <>
                                <img
                                    src={property.images[activeImage]}
                                    className="w-full h-full object-contain cursor-pointer transition-transform duration-500 hover:scale-105"
                                    onClick={() => setShowLightbox(true)}
                                    onContextMenu={(e) => e.preventDefault()}
                                />

                                <button
                                    onClick={() => setShowLightbox(true)}
                                    className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-black/70 z-10"
                                >
                                    <Maximize className="w-5 h-5" />
                                </button>

                                {/* Navigation Arrows */}
                                <button onClick={(e) => { e.stopPropagation(); setActiveImage(prev => prev === 0 ? property.images.length - 1 : prev - 1); }} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 p-2 rounded-full hover:bg-white/30 backdrop-blur-sm text-white shadow-lg opacity-0 group-hover:opacity-100 transition z-10">
                                    <ChevronLeft className="w-6 h-6" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setActiveImage(prev => prev === property.images.length - 1 ? 0 : prev + 1); }} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 p-2 rounded-full hover:bg-white/30 backdrop-blur-sm text-white shadow-lg opacity-0 group-hover:opacity-100 transition z-10">
                                    <ChevronRight className="w-6 h-6" />
                                </button>

                                <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
                                    {activeImage + 1} / {property.images.length}
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400">Sin imágenes</div>
                        )}
                    </div>

                    {/* Thumbnails */}
                    {property.images && property.images.length > 1 && (
                        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                            {property.images.map((img, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => setActiveImage(idx)}
                                    className={`aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition relative ${activeImage === idx ? 'border-[#fc7f51] ring-2 ring-orange-100' : 'border-transparent opacity-70 hover:opacity-100 hover:border-gray-300'}`}
                                >
                                    <img src={img} className="w-full h-full object-cover" onContextMenu={(e) => e.preventDefault()} />
                                </div>
                            ))}
                        </div>
                    )}
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
                                {property.agentPhotoURL ? (
                                    <img src={property.agentPhotoURL} alt={property.agentName} className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-8 h-8 text-gray-400" />
                                )}
                            </div>
                        </div>

                        {/* Features Grid */}
                        <div className="border-b border-gray-200 pb-8 mb-8">
                            <h3 className="text-lg font-bold mb-4">Características</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6">
                                <div className="flex items-center gap-3 text-gray-700">
                                    <Maximize className="w-5 h-5 text-[#fc7f51]" />
                                    <span>{property.footage} m²</span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-700">
                                    <BedDouble className="w-5 h-5 text-[#fc7f51]" />
                                    <span>{property.bedrooms || 0} Habitaciones</span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-700">
                                    <Bath className="w-5 h-5 text-[#fc7f51]" />
                                    <span>{property.bathrooms || 0} Baños</span>
                                </div>
                                {property.parking && (
                                    <div className="flex items-center gap-3 text-gray-700">
                                        <Car className="w-5 h-5 text-[#fc7f51]" />
                                        <span>Cochera</span>
                                    </div>
                                )}
                                {property.isDuplex && (
                                    <div className="flex items-center gap-3 text-gray-700">
                                        <Layers className="w-5 h-5 text-[#fc7f51]" />
                                        <span>Dúplex</span>
                                    </div>
                                )}
                                {property.floor && (
                                    <div className="flex items-center gap-3 text-gray-700">
                                        <ArrowUpFromLine className="w-5 h-5 text-[#fc7f51]" />
                                        <span>Piso {property.floor}</span>
                                    </div>
                                )}
                                {property.isInBuilding && (
                                    <div className="flex items-center gap-3 text-gray-700">
                                        <Building2 className="w-5 h-5 text-[#fc7f51]" />
                                        <span>En Edificio</span>
                                    </div>
                                )}
                                {property.elevator && (
                                    <div className="flex items-center gap-3 text-gray-700">
                                        <ArrowUpDown className="w-5 h-5 text-[#fc7f51]" />
                                        <span>Ascensor</span>
                                    </div>
                                )}
                                {property.disabilityAccess && (
                                    <div className="flex items-center gap-3 text-gray-700">
                                        <ArrowUpDown className="w-5 h-5 text-[#fc7f51]" />
                                        <span>Acceso Discapacitados (Ascensor)</span>
                                    </div>
                                )}
                                {property.ramp && (
                                    <div className="flex items-center gap-3 text-gray-700">
                                        <ArrowUpFromLine className="w-5 h-5 text-[#fc7f51]" />
                                        <span>Rampa Sillas de Ruedas</span>
                                    </div>
                                )}
                                {property.mortgageEligible && (
                                    <div className="flex items-center gap-3 text-gray-700">
                                        <CheckCircle className="w-5 h-5 text-[#fc7f51]" />
                                        <span>Apto Crédito Hipotecario</span>
                                    </div>
                                )}
                                {property.furnished && (
                                    <div className="flex items-center gap-3 text-gray-700">
                                        <Armchair className="w-5 h-5 text-[#fc7f51]" />
                                        <span>Amoblado</span>
                                    </div>
                                )}
                                {property.pool && (
                                    <div className="flex items-center gap-3 text-gray-700">
                                        <Waves className="w-5 h-5 text-[#fc7f51]" />
                                        <span>Piscina</span>
                                    </div>
                                )}
                                {property.gym && (
                                    <div className="flex items-center gap-3 text-gray-700">
                                        <Dumbbell className="w-5 h-5 text-[#fc7f51]" />
                                        <span>Gimnasio</span>
                                    </div>
                                )}
                                {property.security && (
                                    <div className="flex items-center gap-3 text-gray-700">
                                        <ShieldCheck className="w-5 h-5 text-[#fc7f51]" />
                                        <span>Seguridad 24/7</span>
                                    </div>
                                )}
                                {property.isExclusive && (
                                    <div className="flex items-center gap-3 text-gray-700">
                                        <Star className="w-5 h-5 text-[#fc7f51]" />
                                        <span>Exclusivo</span>
                                    </div>
                                )}
                                {property.antiquity && (
                                    <div className="flex items-center gap-3 text-gray-700">
                                        <Clock className="w-5 h-5 text-[#fc7f51]" />
                                        <span>{property.antiquity === 'estreno' ? 'Estreno' : property.antiquity}</span>
                                    </div>
                                )}
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
                                <div className="flex justify-between py-2 border-b border-gray-50">
                                    <span className="text-gray-500">Antigüedad</span>
                                    <span className="font-semibold capitalize">
                                        {property.antiquity === 'estreno' ? 'A estrenar' :
                                            property.antiquity === 'preventa' ? 'En Preventa' :
                                                property.antiquity === 'up_to_5' ? 'Hasta 5 años' :
                                                    property.antiquity === '5_to_10' ? '5 a 10 años' :
                                                        property.antiquity === '10_to_20' ? '10 a 20 años' :
                                                            property.antiquity === 'more_than_20' ? 'Más de 20 años' :
                                                                property.antiquity || 'No especificado'}
                                    </span>
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
                                ) : property.location ? (
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        frameBorder="0"
                                        style={{ border: 0 }}
                                        src={`https://maps.google.com/maps?q=${encodeURIComponent(property.location)}&hl=es&z=15&output=embed`}
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
                                    {mainCurrency === 'USD' ? `$ ${mainPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : `S/. ${mainPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
                                </span>
                                <span className="block text-xl font-bold text-gray-400 mt-1">
                                    {secondaryCurrency === 'USD' ? `$ ${secondaryPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : `S/. ${secondaryPrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
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
                                onClick={handleScheduleVisit}
                                className="w-full bg-[#fc7f51] text-white font-bold py-3 rounded-lg hover:bg-[#e56b3e] transition mb-6 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30"
                            >
                                <Calendar className="w-5 h-5" />
                                Agendar Visita
                            </button>

                            <button
                                onClick={handleScheduleVisit}
                                className="w-full bg-[#fc7f51] text-white font-bold py-3 rounded-lg hover:bg-[#e56b3e] transition mb-6 flex items-center justify-center gap-2 shadow-lg"
                            >
                                <Calendar className="w-5 h-5" />
                                Agendar Visita
                            </button>

                            <div className="text-center text-xs text-gray-400">
                                * Al contactar aceptas nuestros términos y condiciones.
                            </div>
                        </div>
                    </div>
                </div >
            </main >

            {/* Contact Modal */}
            {
                showContact && (
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
                )
            }
            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative p-8 text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                            <CheckCircle className="w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">¡Visita Agendada!</h3>
                        <p className="text-gray-600 mb-6">
                            Tu visita para <strong>{confirmedVisit?.propertyTitle}</strong> ha sido registrada.
                        </p>

                        <div className="space-y-3 mb-8">
                            <button onClick={addToGoogleCalendar} className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-50 transition">
                                <Calendar className="w-5 h-5 text-blue-500" /> Agregar a Google Calendar
                            </button>
                            <button onClick={addToOutlookCalendar} className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-50 transition">
                                <Mail className="w-5 h-5 text-blue-700" /> Agregar a Outlook
                            </button>
                            <button onClick={downloadICS} className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-50 transition">
                                <ArrowUpFromLine className="w-5 h-5 text-gray-500" /> Descargar .ics
                            </button>
                        </div>

                        <div className="p-4 bg-orange-50 rounded-xl mb-6">
                            <p className="text-sm text-[#fc7f51] font-bold mb-2">¿Quieres avisar al agente ahora mismo?</p>
                            <button onClick={notifyAgentWhatsApp} className="w-full bg-[#25D366] text-white font-bold py-2 rounded-lg hover:bg-[#20bd5a] transition flex items-center justify-center gap-2 shadow-sm">
                                <Phone className="w-4 h-4" /> Notificar por WhatsApp
                            </button>
                        </div>

                        <button
                            onClick={() => setShowSuccessModal(false)}
                            className="text-gray-400 hover:text-gray-600 font-medium text-sm underline"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}
            {/* Visit Modal - Slot Picker */}
            {showVisitModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative p-8">
                        <button
                            onClick={() => setShowVisitModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Agendar Visita</h3>
                        <p className="text-sm text-gray-500 mb-6">Selecciona uno de los horarios disponibles del agente.</p>

                        <div className="space-y-2 max-h-72 overflow-y-auto mb-6">
                            {(property?.availableVisitSlots || []).sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time)).map(slot => (
                                <button
                                    key={slot.id}
                                    type="button"
                                    onClick={() => setSelectedSlot(slot)}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 transition ${selectedSlot?.id === slot.id
                                        ? 'border-[#fc7f51] bg-orange-50'
                                        : 'border-gray-100 hover:border-gray-300 bg-gray-50'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Calendar className="w-4 h-4 text-[#fc7f51]" />
                                        <span className="font-medium text-gray-700 text-sm">
                                            {new Date(slot.date + 'T00:00:00').toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-3 h-3 text-gray-400" />
                                        <span className="text-sm font-bold text-gray-600">{slot.time}</span>
                                        {selectedSlot?.id === slot.id && <CheckCircle className="w-5 h-5 text-[#fc7f51]" />}
                                    </div>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={submitVisit}
                            disabled={visitLoading || !selectedSlot}
                            className="w-full bg-[#fc7f51] text-white font-bold py-3 rounded-lg hover:bg-[#e56b3e] transition disabled:opacity-50"
                        >
                            {visitLoading ? 'Agendando...' : 'Confirmar Visita'}
                        </button>
                    </div>
                </div>
            )}

            {/* Lightbox Modal */}
            {showLightbox && (
                <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center" onClick={() => setShowLightbox(false)}>
                    <button
                        onClick={() => setShowLightbox(false)}
                        className="absolute top-4 right-4 text-white hover:text-gray-300 transition z-50 bg-black/50 p-2 rounded-full"
                    >
                        <X className="w-8 h-8" />
                    </button>

                    <button
                        onClick={handleDownloadImage}
                        className="absolute top-4 right-20 text-white hover:text-gray-300 transition z-50 bg-black/50 p-2 rounded-full flex items-center gap-2 px-4"
                        title="Descargar con marca de agua"
                    >
                        <Download className="w-6 h-6" />
                        <span className="hidden md:inline font-medium">Descargar</span>
                    </button>

                    <button
                        onClick={(e) => { e.stopPropagation(); setActiveImage(prev => prev === 0 ? property.images.length - 1 : prev - 1); }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition p-4 bg-black/20 hover:bg-black/50 rounded-full"
                    >
                        <ChevronLeft className="w-10 h-10" />
                    </button>

                    <button
                        onClick={(e) => { e.stopPropagation(); setActiveImage(prev => prev === property.images.length - 1 ? 0 : prev + 1); }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition p-4 bg-black/20 hover:bg-black/50 rounded-full"
                    >
                        <ChevronRight className="w-10 h-10" />
                    </button>

                    <div className="w-full h-full p-4 md:p-10 flex items-center justify-center">
                        <img
                            src={property.images[activeImage]}
                            className="max-w-full max-h-full object-contain select-none"
                            onClick={(e) => e.stopPropagation()} // Prevent close on image click
                            onContextMenu={(e) => e.preventDefault()}
                        />
                    </div>
                </div>
            )}
        </div >
    );
};

export default PropertyDetail;
