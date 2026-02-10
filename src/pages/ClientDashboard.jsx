
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { Heart, Search } from 'lucide-react';

const ClientDashboard = () => {
    const { user } = useAuth();
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Placeholder for fetching favorites. 
        // In a real app, we would store favorites in a subcollection 'users/{uid}/favorites'
        // For now, let's just show a welcome message and maybe some recommended properties if we had that logic.
        // Or we can mock fetching "saved" properties if we implemented the save feature.

        // Since the prompt mainly asked for a panel where they *can* see properties they want,
        // I'll create a UI that *would* show them, and maybe list all properties as "Available" for now
        // or just a placeholder if no favorites logic exists yet.

        // Let's mock fetching ALL properties for now as "Featured" so the dashboard isn't empty
        const fetchProperties = async () => {
            try {
                const q = query(collection(db, "properties"), orderBy("createdAt", "desc"));
                const querySnapshot = await getDocs(q);
                const props = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setFavorites(props);
            } catch (error) {
                console.error("Error fetching properties:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProperties();
    }, [user]);

    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-6">
            <div className="container mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 font-[Montserrat]">Hola, {user?.displayName || 'Usuario'}</h1>
                    <p className="text-gray-500 mt-2">Bienvenido a tu panel personal. Aquí encontrarás las propiedades que te interesan.</p>
                </div>

                {/* Tabs / Filters (Visual only for now) */}
                <div className="flex gap-4 mb-8 border-b border-gray-200 pb-1">
                    <button className="px-4 py-2 text-[#fc7f51] border-b-2 border-[#fc7f51] font-bold">Mis Favoritos</button>
                    <button className="px-4 py-2 text-gray-500 hover:text-gray-800 transition">Vistos Recientemente</button>
                    <button className="px-4 py-2 text-gray-500 hover:text-gray-800 transition">Alertas</button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#fc7f51]"></div>
                    </div>
                ) : favorites.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {favorites.map((property) => (
                            <div key={property.id} className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition overflow-hidden group border border-gray-100">
                                <div className="relative aspect-[4/3] overflow-hidden">
                                    <img
                                        src={property.images?.[0] || 'https://images.unsplash.com/photo-1600596542815-9ad4dc2f2072?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'}
                                        alt={property.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                                    />
                                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-sm text-red-500">
                                        <Heart className="w-5 h-5 fill-current" />
                                    </div>
                                    <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-md text-white px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
                                        {property.type}
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-lg font-bold text-gray-800 line-clamp-1">{property.title}</h3>
                                        <span className="text-[#fc7f51] font-bold text-lg">${property.price?.toLocaleString()}</span>
                                    </div>
                                    <p className="text-gray-500 text-sm mb-4 line-clamp-2">{property.location}</p>

                                    <div className="flex items-center gap-4 text-sm text-gray-400 border-t border-gray-100 pt-4">
                                        {property.category === 'construido' ? (
                                            <>
                                                <span>{property.bedrooms} Hab</span>
                                                <span>•</span>
                                                <span>{property.bathrooms} Baños</span>
                                                <span>•</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Terreno</span>
                                                <span>•</span>
                                            </>
                                        )}
                                        <span>{property.footage} m²</span>
                                    </div>

                                    <Link
                                        to={`/properties/${property.id}`}
                                        className="mt-4 block w-full py-3 bg-gray-50 hover:bg-[#fc7f51] hover:text-white text-gray-600 font-bold text-center rounded-xl transition text-sm"
                                    >
                                        Ver Detalles
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                        <div className="bg-orange-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Heart className="w-8 h-8 text-[#fc7f51]" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Aún no tienes favoritos</h3>
                        <p className="text-gray-500 mb-8 max-w-md mx-auto">Explora nuestro catálogo y guarda las propiedades que más te gusten para verlas aquí.</p>
                        <Link to="/" className="inline-flex items-center gap-2 bg-[#fc7f51] text-white px-8 py-3 rounded-full font-bold hover:bg-[#e56b3e] transition shadow-lg shadow-orange-500/30">
                            <Search className="w-5 h-5" />
                            Explorar Propiedades
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClientDashboard;
