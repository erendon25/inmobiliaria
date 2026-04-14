
import { motion, AnimatePresence } from "framer-motion";
import { Home, Calendar, User, Lightbulb, FileText, X, ChevronRight, LogOut, BarChart2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

const Sidebar = ({ activeTab, setActiveTab, isOpen, setIsOpen }) => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();

    const menuItems = [
        { id: 'properties', label: 'Propiedades', icon: Home },
        { id: 'inquiries', label: 'Visitas', icon: Calendar },
        { id: 'stats', label: 'Estadísticas', icon: BarChart2 },
        { id: 'tips', label: 'Tips & Blogs', icon: Lightbulb },
        { id: 'templates', label: 'Plantillas', icon: FileText },
        { id: 'profile', label: 'Perfil', icon: User }
    ];

    const handleLogout = async () => {
        if (window.confirm("¿Seguro que deseas salir?")) {
            await logout();
            navigate('/login');
        }
    };

    return (
        <>
            {/* Mobile Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] lg:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Main Sidebar */}
            <motion.aside
                initial={false}
                animate={{ x: isOpen ? 0 : -320, width: isOpen ? 280 : 0 }}
                transition={{ type: "spring", damping: 20, stiffness: 100 }}
                className={`fixed lg:sticky top-0 left-0 h-screen bg-[#16151a] shadow-2xl z-[100] overflow-hidden flex flex-col border-r border-white/5`}
            >
                {/* Logo & Close (Mobile) */}
                <div className="p-8 flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#fc7f51] to-[#ff9d7d] flex items-center justify-center shadow-lg shadow-orange-500/20">
                            <Home className="text-white w-6 h-6" />
                        </div>
                        <span className="text-xl font-black text-white tracking-tighter">INMUÉVETE</span>
                    </div>
                    <button 
                        onClick={() => setIsOpen(false)}
                        className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white transition lg:hidden"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Nav Items */}
                <nav className="flex-grow px-4 space-y-2 overflow-y-auto custom-scrollbar">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => {
                                setActiveTab(item.id);
                                if (window.innerWidth < 1024) setIsOpen(false);
                            }}
                            className={`w-full group flex items-center justify-between p-4 rounded-2xl transition-all duration-300 ${
                                activeTab === item.id 
                                ? 'bg-gradient-to-r from-[#fc7f51] to-[#ff9d7d] text-white shadow-xl shadow-orange-500/20' 
                                : 'text-gray-400 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            <div className="flex items-center gap-4">
                                <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110`} />
                                <span className="font-bold tracking-wide">{item.label}</span>
                            </div>
                            {activeTab === item.id && (
                                <motion.div layoutId="activeTabIcon" transition={{ type: "spring", stiffness: 300, damping: 30 }}>
                                    <ChevronRight className="w-4 h-4" />
                                </motion.div>
                            )}
                        </button>
                    ))}
                </nav>

                {/* Footer / User Profile Small */}
                <div className="p-8 space-y-6">
                    <div className="h-px bg-white/5" />
                    <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl text-red-400 hover:bg-red-500/10 transition group"
                    >
                        <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                        <span className="font-bold">Cerrar Sesión</span>
                    </button>
                    
                    <div className="flex items-center gap-4 px-2">
                        <div className="w-10 h-10 rounded-full border-2 border-[#fc7f51]/50 overflow-hidden shadow-lg shadow-black/20">
                            {user?.photoURL ? (
                                <img src={user.photoURL} alt="Agent" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gray-700 flex items-center justify-center text-gray-300">
                                    <User className="w-6 h-6" />
                                </div>
                            )}
                        </div>
                        <div className="flex-grow overflow-hidden">
                            <p className="text-white text-sm font-bold truncate">{user?.displayName || 'Agente'}</p>
                            <p className="text-gray-500 text-xs truncate uppercase tracking-widest font-black">Online</p>
                        </div>
                    </div>
                </div>
            </motion.aside>
        </>
    );
};

export default Sidebar;
