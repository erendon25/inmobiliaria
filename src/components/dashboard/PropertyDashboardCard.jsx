
import { motion } from "framer-motion";
import { MapPin, Edit, Calendar, Trash2, Rocket, ToggleLeft, ToggleRight, Star, Layers, Eye, Share2, Facebook } from "lucide-react";

const PropertyDashboardCard = ({ 
    property, 
    onEdit, 
    onDelete, 
    onStatusToggle, 
    onPublish, 
    onOpenSlotManager,
    onPromote,
    onToggleDuplex,
    onToggleExclusive,
    onShareMarketplace
}) => {
    const statusStyles = {
        disponible: "bg-green-100 text-green-700 border-green-200",
        borrador: "bg-amber-100 text-amber-700 border-amber-200",
        tomada: "bg-red-100 text-red-700 border-red-200"
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-gray-100 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:shadow-orange-900/10 transition-all group overflow-hidden relative"
        >
            <div className="flex flex-col sm:flex-row h-full">
                {/* Image Section */}
                <div className="w-full sm:w-48 md:w-56 h-48 sm:h-auto relative flex-shrink-0 group-hover:scale-105 transition-transform duration-700">
                    <img
                        src={property.images?.[0] || 'https://placehold.co/400x400/e2e8f0/94a3b8?text=Sin+Img'}
                        alt={property.title}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                        {property.isPromoted && (
                            <motion.div initial={{ x: -10 }} animate={{ x: 0 }} className="bg-[#fc7f51] text-white p-2 rounded-xl shadow-lg border border-white/20">
                                <Rocket className="w-4 h-4" />
                            </motion.div>
                        )}
                        {property.isExclusive && (
                            <motion.div initial={{ x: -10 }} animate={{ x: 0 }} className="bg-amber-500 text-white p-2 rounded-xl shadow-lg border border-white/20">
                                <Star className="w-4 h-4 fill-white" />
                            </motion.div>
                        )}
                    </div>

                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-widest border border-white/10">
                            <Eye className="w-3 h-3 text-[#fc7f51]" />
                            {property.views || 0} Vistas
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="flex-grow p-6 md:p-8 flex flex-col">
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                        <div className="flex-grow min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${statusStyles[property.status] || statusStyles.disponible}`}>
                                    {property.status === 'borrador' ? '✏️ Borrador' : property.status}
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    IDs: {property.id?.slice(-6)}
                                </span>
                            </div>
                            <h3 className="text-lg md:text-xl font-black text-gray-900 group-hover:text-[#fc7f51] transition-colors truncate">
                                {property.title}
                            </h3>
                            <p className="flex items-center gap-1.5 text-gray-400 text-sm font-bold mt-1 truncate">
                                <MapPin className="w-4 h-4 text-gray-300 transform -translate-y-0.5" />
                                {property.location}
                            </p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                            <p className="text-xl md:text-2xl font-black text-[#fc7f51] tracking-tight">
                                {property.currency === 'USD' ? '$' : 'S/.'} {property.price?.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                            </p>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Precio Actual</p>
                        </div>
                    </div>

                    {/* Features Row */}
                    <div className="flex flex-wrap gap-4 mb-6 py-4 border-y border-gray-50">
                        <FeatureToggle icon={Rocket} label="Promover" active={property.isPromoted} onClick={() => onPromote(property.id, property.isPromoted)} activeColor="#fc7f51" />
                        <FeatureToggle icon={Star} label="Exclusivo" active={property.isExclusive} onClick={() => onToggleExclusive(property.id, property.isExclusive)} activeColor="#f59e0b" />
                        <FeatureToggle icon={Layers} label="Dúplex" active={property.isDuplex === 'si' || property.isDuplex === true} onClick={() => onToggleDuplex(property.id, property.isDuplex)} activeColor="#8b5cf6" />
                    </div>

                    {/* Actions Row */}
                    <div className="flex flex-wrap gap-2 md:gap-3 mt-auto">
                        {property.status === 'borrador' ? (
                            <motion.button
                                whileHover={{ scale: 1.02, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => onPublish(property.id)}
                                className="flex-grow md:flex-none px-6 py-3 rounded-2xl bg-[#fc7f51] text-white text-xs font-black uppercase tracking-widest hover:bg-[#e56b3e] shadow-xl shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                <Rocket className="w-4 h-4" /> Publicar
                            </motion.button>
                        ) : (
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => onStatusToggle(property.id, property.status)}
                                className={`flex-grow md:flex-none px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-2 ${
                                    property.status === 'disponible' 
                                    ? 'bg-red-50 text-red-500 border-red-100 hover:bg-red-100' 
                                    : 'bg-green-50 text-green-500 border-green-100 hover:bg-green-100'
                                }`}
                            >
                                {property.status === 'disponible' ? '¿Vendido / Alquilado?' : 'Volver a Vender'}
                            </motion.button>
                        )}
                        
                        <div className="flex gap-2">
                            <ActionButton icon={Edit} onClick={() => onEdit(property)} variant="blue" title="Editar" />
                            <ActionButton icon={Calendar} onClick={() => onOpenSlotManager(property)} variant="purple" title="Visitas" />
                            <ActionButton icon={Facebook} onClick={() => onShareMarketplace(property)} variant="fb" title="Marketplace" />
                            <ActionButton icon={Trash2} onClick={() => onDelete(property.id)} variant="red" title="Eliminar" />
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

const FeatureToggle = ({ icon: Icon, label, active, onClick, activeColor }) => (
    <button 
        onClick={onClick}
        className={`flex items-center gap-2 p-1.5 pr-3 rounded-xl transition-all border-2 ${
            active 
            ? `bg-white border-transparent shadow-lg text-gray-900` 
            : 'bg-gray-50 border-gray-50 text-gray-400 grayscale hover:grayscale-0'
        }`}
    >
        <div className={`p-1.5 rounded-lg ${active ? 'bg-white shadow-sm' : 'bg-transparent'}`}>
            <Icon className="w-3.5 h-3.5" style={{ color: active ? activeColor : 'inherit' }} />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
        {active ? <ToggleRight className="w-4 h-4" style={{ color: activeColor }} /> : <ToggleLeft className="w-4 h-4" />}
    </button>
);

const ActionButton = ({ icon: Icon, onClick, variant, title }) => {
    const variants = {
        blue: "bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white border-blue-100",
        purple: "bg-purple-50 text-purple-500 hover:bg-purple-500 hover:text-white border-purple-100",
        red: "bg-red-50 text-red-500 hover:bg-red-500 hover:text-white border-red-100",
        fb: "bg-blue-50 text-[#1877F2] hover:bg-[#1877F2] hover:text-white border-blue-100"
    };

    return (
        <motion.button
            whileHover={{ y: -4, scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            title={title}
            className={`p-3.5 rounded-2xl transition-all border shadow-sm ${variants[variant]}`}
        >
            <Icon className="w-5 h-5" />
        </motion.button>
    );
};

export default PropertyDashboardCard;
