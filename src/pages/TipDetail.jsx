import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowLeft, User, Calendar, Clock } from 'lucide-react';

const TipDetail = () => {
    const { id } = useParams();
    const [tip, setTip] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTip = async () => {
            try {
                const docRef = doc(db, "tips", id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setTip({ id: docSnap.id, ...docSnap.data() });
                } else {
                    console.log("No such document!");
                }
            } catch (error) {
                console.error("Error fetching tip:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTip();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex justify-center items-center bg-white">
                <div className="inline-block w-12 h-12 border-4 border-[#fc7f51] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!tip) {
        return (
            <div className="min-h-screen flex flex-col justify-center items-center bg-white text-center px-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Tip no encontrado</h2>
                <Link to="/tips" className="text-[#fc7f51] font-bold hover:underline flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Volver al Blog
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white font-sans text-[#262626] pb-20">
            {/* Header / Image */}
            <div className="relative h-[60vh] md:h-[500px] w-full bg-gray-900">
                {tip.imageUrl ? (
                    <>
                        <img
                            src={tip.imageUrl}
                            alt={tip.title}
                            className="w-full h-full object-cover opacity-60"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-600">
                        <span className="text-xl">Sin imagen de portada</span>
                    </div>
                )}

                <div className="absolute top-6 left-6 z-20">
                    <Link to="/tips" className="bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full font-bold text-sm hover:bg-white/30 transition flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" /> Volver
                    </Link>
                </div>

                <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 z-20 text-white">
                    <div className="container mx-auto">
                        <div className="max-w-4xl">
                            <span className="inline-block bg-[#fc7f51] text-white text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
                                Blog Inmobiliario
                            </span>
                            <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
                                {tip.title}
                            </h1>
                            <div className="flex flex-wrap items-center gap-6 text-sm md:text-base font-medium text-gray-200">
                                <div className="flex items-center gap-2">
                                    <User className="w-5 h-5 text-[#fc7f51]" />
                                    <span>Por {tip.agentName || 'Equipo Inmuévete'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-[#fc7f51]" />
                                    <span>{tip.createdAt?.seconds ? new Date(tip.createdAt.seconds * 1000).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Reciente'}</span>
                                </div>
                                {tip.readTime && (
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-[#fc7f51]" />
                                        <span>{tip.readTime} min de lectura</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Body */}
            <article className="container mx-auto px-6 -mt-10 relative z-30">
                <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl max-w-4xl border border-gray-100 mb-12">
                    <div className="prose prose-lg prose-orange max-w-none text-gray-600 leading-relaxed whitespace-pre-wrap">
                        {tip.content}
                    </div>
                </div>

                {/* Share / CTA Area */}
                <div className="max-w-4xl border-t border-gray-200 pt-10 mt-10">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">¿Te fue útil este artículo?</h3>
                    <p className="text-gray-500 mb-6">Comparte este contenido o contáctanos si necesitas asesoría personalizada.</p>
                    <div className="flex gap-4">
                        <Link to="/contact" className="bg-[#fc7f51] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#e56b3e] transition shadow-lg shadow-orange-500/20">
                            Contactar Agente
                        </Link>
                    </div>
                </div>
            </article>
        </div>
    );
};

export default TipDetail;
