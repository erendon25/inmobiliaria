
import { Bell, Search, Menu } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";

const DashboardHeader = ({ onMenuClick, activeTabLabel }) => {
    const { userData, user } = useAuth();
    
    return (
        <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between px-6 py-4 md:px-10 h-20">
            <div className="flex items-center gap-4">
                <button 
                    onClick={onMenuClick}
                    className="p-3 rounded-2xl bg-gray-50 text-gray-400 hover:text-[#fc7f51] hover:bg-orange-50 transition lg:hidden"
                >
                    <Menu className="w-6 h-6" />
                </button>
                <div className="flex flex-col">
                    <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                        {activeTabLabel}
                    </h1>
                    <p className="hidden md:block text-xs font-bold text-gray-400 uppercase tracking-widest">
                        Panel de Agente • Inmuévete
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-3 md:gap-6">
                <div className="hidden lg:flex items-center relative group">
                    <Search className="absolute left-4 w-5 h-5 text-gray-300 group-focus-within:text-[#fc7f51] transition" />
                    <input 
                        type="text" 
                        placeholder="Buscar..."
                        className="bg-gray-50 border-transparent border-2 px-12 py-2.5 rounded-[1.25rem] w-64 focus:bg-white focus:border-[#fc7f51]/20 outline-none transition-all font-medium text-sm"
                    />
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="relative p-3 rounded-2xl bg-gray-50 text-gray-400 hover:text-[#fc7f51] hover:bg-orange-50 transition"
                    >
                        <Bell className="w-6 h-6" />
                        <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-[#fc7f51] border-2 border-white rounded-full shadow-lg shadow-orange-500/30" />
                    </motion.button>
                    
                    <div className="flex items-center gap-3 pl-2 md:pl-4 border-l border-gray-100 h-10">
                        <div className="hidden md:block text-right">
                            <p className="text-sm font-black text-gray-900 truncate max-w-[120px]">
                                {userData?.displayName || user?.displayName || 'Agente'}
                            </p>
                            <p className="text-[10px] font-black text-[#fc7f51] uppercase tracking-widest">Premium</p>
                        </div>
                        <img 
                            src={userData?.photoURL || user?.photoURL || "https://placehold.co/100x100?text=A"} 
                            alt="User" 
                            className="w-11 h-11 rounded-2xl object-cover shadow-lg shadow-orange-900/5"
                        />
                    </div>
                </div>
            </div>
        </header>
    );
};

export default DashboardHeader;
