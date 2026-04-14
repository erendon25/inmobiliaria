
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Eye, CheckCircle2, MapPin, BarChart3, PieChart, ArrowUpRight } from 'lucide-react';
import PropertyHeatMap from './PropertyHeatMap';
import { PERU_LOCATIONS } from '../../data/locations';

const StatsDashboard = ({ properties }) => {
    // 1. Process Data
    const stats = useMemo(() => {
        if (!properties || properties.length === 0) return null;

        // Total Views
        const totalViews = properties.reduce((acc, p) => acc + (parseInt(p.views) || 0), 0);
        
        // Total Sold/Rented
        const totalClosed = properties.filter(p => p.status === 'tomada').length;

        // 3 Most Viewed Properties
        const topViewed = [...properties]
            .sort((a, b) => (parseInt(b.views) || 0) - (parseInt(a.views) || 0))
            .slice(0, 3);

        // Group by Location (District extraction if possible)
        const locationMap = {};
        const soldByLocationMap = {};

        // Sort locations by name length (descending) to match more specific names first
        // (e.g., "Cerro Colorado" before "Arequipa")
        const sortedDists = [...PERU_LOCATIONS].sort((a, b) => b.name.length - a.name.length);

        properties.forEach(p => {
            const fullLocation = p.location?.toLowerCase() || '';
            const foundLocation = sortedDists.find(loc => 
                fullLocation.includes(loc.name.toLowerCase())
            );

            const cleanDistrict = foundLocation ? foundLocation.name : (p.location?.split(',')[0]?.trim() || 'Otra');

            locationMap[cleanDistrict] = (locationMap[cleanDistrict] || 0) + 1;
            
            if (p.status === 'tomada') {
                soldByLocationMap[cleanDistrict] = (soldByLocationMap[cleanDistrict] || 0) + 1;
            }
        });

        const locationStats = Object.keys(locationMap)
            .map(loc => ({ name: loc, count: locationMap[loc] }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        const soldStats = Object.keys(soldByLocationMap)
            .map(loc => ({ name: loc, count: soldByLocationMap[loc] }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return {
            totalViews,
            totalClosed,
            totalProperties: properties.length,
            topViewed,
            locationStats,
            soldStats
        };
    }, [properties]);

    if (!stats) {
        return (
            <div className="bg-white p-12 rounded-3xl shadow-xl border border-gray-100 text-center">
                <BarChart3 className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-800">Sin datos suficientes</h3>
                <p className="text-gray-500 mt-2">Publica propiedades para ver tus estadísticas de rendimiento.</p>
            </div>
        );
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
        >
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Vistas Totales', value: stats.totalViews, icon: Eye, color: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/20' },
                    { label: 'Propiedades', value: stats.totalProperties, icon: TrendingUp, color: 'from-orange-500 to-[#fc7f51]', shadow: 'shadow-orange-500/20' },
                    { label: 'Cerrados', value: stats.totalClosed, icon: CheckCircle2, color: 'from-emerald-500 to-green-600', shadow: 'shadow-green-500/20' },
                ].map((card, i) => (
                    <motion.div 
                        key={i}
                        variants={itemVariants}
                        className={`bg-white p-6 rounded-3xl shadow-xl border border-gray-50 flex items-center gap-5 group hover:scale-[1.02] transition-transform duration-300`}
                    >
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center text-white ${card.shadow} group-hover:rotate-6 transition-transform`}>
                            <card.icon className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm font-bold uppercase tracking-wider">{card.label}</p>
                            <h3 className="text-3xl font-black text-gray-900">{card.value}</h3>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* TOP 3 PROPERTIES RANKING */}
                <motion.div variants={itemVariants} className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 flex flex-col">
                    <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-orange-500" /> Top 3 Propiedades más Vistas
                        </h3>
                        <div className="px-3 py-1 bg-orange-100 text-[#fc7f51] rounded-full text-[10px] font-black uppercase tracking-wider">
                            Popularidad
                        </div>
                    </div>
                    <div className="p-6 space-y-4">
                        {stats.topViewed.map((prop, idx) => (
                            <div key={prop.id} className="flex items-center gap-4 group p-2 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                                <div className="relative flex-shrink-0">
                                    <div className="w-16 h-16 rounded-xl overflow-hidden shadow-sm">
                                        <img 
                                            src={prop.images?.[0] || 'https://placehold.co/100x100/e2e8f0/94a3b8?text=Prop'} 
                                            alt="" 
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                    </div>
                                    <div className={`absolute -top-2 -left-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shadow-md border-2 border-white ${
                                        idx === 0 ? 'bg-yellow-400 text-yellow-900' : 
                                        idx === 1 ? 'bg-gray-300 text-gray-700' : 
                                        'bg-orange-200 text-orange-800'
                                    }`}>
                                        {idx + 1}°
                                    </div>
                                </div>
                                <div className="flex-grow min-w-0">
                                    <h4 className="font-bold text-gray-900 truncate text-sm">{prop.title}</h4>
                                    <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                                        <MapPin className="w-3 h-3" /> 
                                        {(() => {
                                            const foundLoc = PERU_LOCATIONS.find(l => 
                                                prop.location?.toLowerCase().includes(l.name.toLowerCase())
                                            );
                                            return foundLoc ? foundLoc.name : prop.location?.split(',')[0];
                                        })()}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-1.5 text-[#fc7f51] font-black text-sm">
                                        <Eye className="w-4 h-4" /> {prop.views || 0}
                                    </div>
                                    <span className="text-[9px] text-gray-400 font-bold uppercase">Vistas</span>
                                </div>
                                <div className="ml-2 group-hover:translate-x-1 transition-transform">
                                    <ArrowUpRight className="w-4 h-4 text-gray-300" />
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Distribution by Location Chart */}
                <motion.div variants={itemVariants} className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-8 flex items-center gap-2">
                        <PieChart className="w-5 h-5 text-indigo-500" /> Inventario por Zona
                    </h3>
                    <div className="space-y-6">
                        {stats.locationStats.map((loc, i) => {
                            const percentage = (loc.count / stats.totalProperties) * 100;
                            return (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-bold text-gray-700">{loc.name}</span>
                                        <span className="text-gray-400 font-bold">{loc.count} prop.</span>
                                    </div>
                                    <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${percentage}%` }}
                                            transition={{ duration: 1, delay: 0.5 }}
                                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>
            </div>

            {/* Bottom Section: Efficiency */}
            <motion.div variants={itemVariants} className="bg-[#16151a] rounded-[2.5rem] shadow-2xl p-10 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
                
                <div className="relative z-10 flex flex-col lg:flex-row items-center gap-12">
                    <div className="lg:w-1/3 text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-1 rounded-full text-xs font-black tracking-widest uppercase mb-4">
                            <CheckCircle2 className="w-4 h-4" /> Rendimiento de Cierre
                        </div>
                        <h3 className="text-4xl font-black mb-4">Zonas de Mayor Éxito</h3>
                        <p className="text-gray-400 leading-relaxed">
                            Aquí visualizas en qué áreas estás concretando más ventas o alquileres. Esto te ayuda a decidir dónde enfocar tus esfuerzos de captación.
                        </p>
                    </div>
                    
                    <div className="lg:w-2/3 w-full grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {stats.soldStats.length > 0 ? stats.soldStats.map((loc, i) => (
                            <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-3xl flex items-center justify-between group hover:bg-white/10 transition-colors">
                                <div>
                                    <p className="text-gray-500 text-xs font-black uppercase mb-1">{loc.name}</p>
                                    <h4 className="text-2xl font-black">{loc.count} <span className="text-emerald-400 text-sm">Cerrados</span></h4>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                            </div>
                        )) : (
                            <div className="col-span-full py-8 text-center text-gray-500 italic">
                                Aún no tienes propiedades marcadas como vendidas/alquiladas.
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Heat Map Visualization */}
            <motion.div variants={itemVariants}>
                <PropertyHeatMap properties={properties} />
            </motion.div>
        </motion.div>
    );
};

export default StatsDashboard;
