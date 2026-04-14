
import { auth, googleProvider, db } from "../lib/firebase";
import { doc, getDoc } from 'firebase/firestore';
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, Chrome, Apple, CheckCircle2 } from "lucide-react";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const { login, loginWithGoogle, loginWithApple } = useAuth();
    const navigate = useNavigate();

    const fetchUserRoleAndRedirect = async (uid) => {
        try {
            const userDoc = await getDoc(doc(db, "users", uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.role === 'agente') {
                    navigate("/agent-dashboard");
                } else if (userData.role === 'superadmin') {
                    navigate("/superadmin");
                } else {
                    navigate("/client-dashboard");
                }
            } else {
                navigate("/");
            }
        } catch (error) {
            console.error("Error redirecting:", error);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const credential = await login(email, password, rememberMe);
            toast.success("¡Bienvenido de nuevo!");
            fetchUserRoleAndRedirect(credential.user.uid);
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            const result = await loginWithGoogle();
            toast.success("¡Bienvenido!");
            fetchUserRoleAndRedirect(result.user.uid);
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleAppleLogin = async () => {
        try {
            const result = await loginWithApple();
            toast.success("¡Bienvenido!");
            fetchUserRoleAndRedirect(result.user.uid);
        } catch (error) {
            toast.error(error.message);
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#fafafa] p-6 pt-24 md:pt-6">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ 
                        opacity: 0.4, 
                        scale: 1,
                        x: [0, 50, 0],
                        y: [0, 30, 0]
                    }}
                    transition={{ 
                        duration: 10, 
                        repeat: Infinity,
                        ease: "easeInOut" 
                    }}
                    className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-[#fc7f51]/40 to-transparent blur-[80px]"
                />
                <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ 
                        opacity: 0.3, 
                        scale: 1.2,
                        x: [0, -40, 0],
                        y: [0, 60, 0]
                    }}
                    transition={{ 
                        duration: 15, 
                        repeat: Infinity,
                        ease: "easeInOut" 
                    }}
                    className="absolute -bottom-[10%] -right-[10%] w-[60%] h-[60%] rounded-full bg-gradient-to-tl from-orange-200/50 to-transparent blur-[100px]"
                />
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="relative z-10 w-full max-w-md"
            >
                <div className="bg-white/80 backdrop-blur-2xl p-8 md:p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-white/50 w-full overflow-hidden relative">
                    {/* Top Accent Line */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-[#fc7f51] to-transparent opacity-50" />
                    
                    <div className="text-center mb-10">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#fc7f51] to-[#e56b3e] text-white shadow-lg shadow-orange-500/20 mb-6"
                        >
                            <Lock className="w-8 h-8" />
                        </motion.div>
                        <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-2">
                            Iniciar Sesión
                        </h2>
                        <p className="text-gray-500 font-medium">
                            Bienvenido de nuevo a Inmuévete
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                                Correo Electrónico
                            </label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#fc7f51] transition-colors">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <input
                                    type="email"
                                    name="email"
                                    autoComplete="username"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-gray-50/50 border border-gray-200 pl-12 pr-4 py-4 rounded-2xl focus:bg-white focus:border-[#fc7f51] focus:ring-4 focus:ring-[#fc7f51]/10 outline-none transition-all duration-300 placeholder:text-gray-300 font-medium"
                                    placeholder="nombre@correo.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                                Contraseña
                            </label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#fc7f51] transition-colors">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <input
                                    type="password"
                                    name="password"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-gray-50/50 border border-gray-200 pl-12 pr-4 py-4 rounded-2xl focus:bg-white focus:border-[#fc7f51] focus:ring-4 focus:ring-[#fc7f51]/10 outline-none transition-all duration-300 placeholder:text-gray-300 font-medium"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between px-1">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <div className="relative flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="peer sr-only"
                                    />
                                    <div className="w-5 h-5 border-2 border-gray-300 rounded-md bg-white peer-checked:bg-[#fc7f51] peer-checked:border-[#fc7f51] transition-all flex items-center justify-center">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                    </div>
                                </div>
                                <span className="text-sm font-semibold text-gray-500 group-hover:text-gray-700 transition-colors">Recordarme</span>
                            </label>
                            <Link to="/forgot-password" title="Recuperar acceso" className="text-sm font-bold text-[#fc7f51] hover:text-[#e56b3e] transition-colors underline decoration-2 underline-offset-4 decoration-[#fc7f51]/20 hover:decoration-[#e56b3e]/40">
                                ¿Olvidaste tu contraseña?
                            </Link>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={isLoading}
                            className="w-full relative overflow-hidden group bg-gradient-to-r from-[#fc7f51] to-[#ff9d7d] text-white py-4 rounded-2xl font-extrabold text-lg shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40 transition-all flex items-center justify-center gap-3 disabled:opacity-70"
                        >
                            {isLoading ? (
                                <motion.div 
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full"
                                />
                            ) : (
                                <>
                                    <span>Ingresar</span>
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </motion.button>
                    </form>

                    <div className="relative my-10 py-1">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t border-gray-100"></div>
                        </div>
                        <div className="relative flex justify-center text-sm font-bold uppercase tracking-widest">
                            <span className="bg-white px-4 text-gray-300 rounded-full">O accede con</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <motion.button
                            whileHover={{ y: -2, backgroundColor: "#f9fafb" }}
                            whileTap={{ y: 0 }}
                            onClick={handleGoogleLogin}
                            type="button"
                            className="flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 py-4 rounded-2xl font-bold transition-all shadow-sm group"
                        >
                            <Chrome className="w-5 h-5 text-[#4285F4]" />
                            <span>Google</span>
                        </motion.button>
                        <motion.button
                            whileHover={{ y: -2, backgroundColor: "#000" }}
                            whileTap={{ y: 0 }}
                            onClick={handleAppleLogin}
                            type="button"
                            className="flex items-center justify-center gap-3 bg-[#1a1a1a] text-white py-4 rounded-2xl font-bold transition-all shadow-sm"
                        >
                            <Apple className="w-5 h-5" />
                            <span>Apple</span>
                        </motion.button>
                    </div>

                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="mt-10 text-center"
                    >
                        <p className="text-gray-500 font-medium">
                            ¿Aún no tienes cuenta?{" "}
                            <Link to="/register" className="text-[#fc7f51] font-extrabold hover:text-[#e56b3e] transition-colors relative inline-block">
                                Regístrate ahora
                                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#fc7f51]/20 group-hover:bg-[#e56b3e]/40 transition-colors" />
                            </Link>
                        </p>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
