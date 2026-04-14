
import { motion } from "framer-motion";

const StatCard = ({ title, value, icon: Icon, color = "orange" }) => {
    const colors = {
        orange: "from-orange-500 to-orange-400 bg-orange-50 text-orange-600 shadow-orange-500/10",
        blue: "from-blue-500 to-blue-400 bg-blue-50 text-blue-600 shadow-blue-500/10",
        green: "from-green-500 to-green-400 bg-green-50 text-green-600 shadow-green-500/10",
        purple: "from-purple-500 to-purple-400 bg-purple-50 text-purple-600 shadow-purple-500/10"
    };

    const selectedColor = colors[color] || colors.orange;

    return (
        <motion.div
            whileHover={{ y: -4 }}
            className={`bg-white p-6 rounded-[2rem] shadow-xl ${selectedColor.split(' ').pop()} border border-gray-100 flex flex-col justify-between h-full relative overflow-hidden`}
        >
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${selectedColor} opacity-5 rounded-full -mr-8 -mt-8`} />
            
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-2xl ${selectedColor.split(' ')[2]} ${selectedColor.split(' ')[3]}`}>
                    <Icon className="w-6 h-6" />
                </div>
                <span className="text-2xl font-black">{value}</span>
            </div>
            
            <div>
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">{title}</h4>
            </div>
        </motion.div>
    );
};

export default StatCard;
