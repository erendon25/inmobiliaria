import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { Lightbulb, Calendar, User, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Tips = () => {
    const [tips, setTips] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTips = async () => {
            try {
                const q = query(collection(db, "tips"), orderBy("createdAt", "desc"));
                const querySnapshot = await getDocs(q);
                const fetchedTips = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setTips(fetchedTips);
            } catch (error) {
                console.error("Error fetching tips:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTips();
    }, []);

    return (
        <div className="min-h-screen bg-white font-sans text-[#262626]">
            {/* Hero Section */}
            <div className="relative h-[400px] flex items-center justify-center">
                <div className="absolute inset-0 bg-[#262626]">
                    <img src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop" className="w-full h-full object-cover opacity-20" alt="Blog Hero" />
                </div>
                <div className="relative z-10 text-center px-6">
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                        Blog Inmobiliario
                    </h1>
                    <p className="text-xl text-gray-300 max-w-2xl mx-auto font-light">
                        Consejos, tendencias y guías para comprar, vender o invertir en propiedades.
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-6 py-20">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="inline-block w-12 h-12 border-4 border-[#fc7f51] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : tips.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                        <Lightbulb className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-600 mb-2">Aún no hay publicaciones</h3>
                        <p className="text-gray-500">Pronto nuestros agentes compartirán contenido valioso para ti.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {tips.map((tip) => (
                            <Link to={`/tips/${tip.id}`} key={tip.id} className="bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition duration-300 flex flex-col h-full border border-gray-100 group block focus:outline-none focus:ring-4 focus:ring-orange-200">
                                {/* Image Container */}
                                <div className="h-64 overflow-hidden relative bg-gray-100">
                                    {tip.imageUrl ? (
                                        <img
                                            src={tip.imageUrl}
                                            alt={tip.title}
                                            className="w-full h-full object-cover transform group-hover:scale-110 transition duration-700"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-orange-50 text-[#fc7f51]">
                                            <Lightbulb className="w-16 h-16 opacity-50" />
                                        </div>
                                    )}
                                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-[#fc7f51] shadow-sm">
                                        TIP
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-8 flex flex-col flex-grow">
                                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-4 font-medium uppercase tracking-wide">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {tip.createdAt?.seconds ? new Date(tip.createdAt.seconds * 1000).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Reciente'}
                                        </div>
                                        {tip.agentName && (
                                            <div className="flex items-center gap-1">
                                                <User className="w-3 h-3" />
                                                {tip.agentName}
                                            </div>
                                        )}
                                    </div>

                                    <h3 className="text-2xl font-bold text-gray-800 mb-4 leading-tight group-hover:text-[#fc7f51] transition">
                                        {tip.title}
                                    </h3>

                                    <p className="text-gray-600 leading-relaxed mb-6 line-clamp-4 flex-grow">
                                        {tip.content}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Tips;
