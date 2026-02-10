
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";

const Register = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [role, setRole] = useState("cliente");
    const { signup, loginWithGoogle, loginWithApple } = useAuth();
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            await signup(email, password, role, name, phone);
            toast.success("¡Cuenta creada exitosamente!");
            navigate("/dashboard"); // Redirect to appropriate dashboard
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            await loginWithGoogle(role); // Pass selected role
            toast.success("¡Cuenta creada exitosamente!");
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleAppleLogin = async () => {
        try {
            await loginWithApple(role); // Pass selected role
            toast.success("¡Cuenta creada exitosamente!");
        } catch (error) {
            toast.error(error.message);
        }
    };


    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
                <h2 className="text-3xl font-bold mb-2 text-center text-gray-800">
                    Crear una Cuenta
                </h2>
                <p className="text-center text-gray-500 mb-8">
                    Únete y encuentra tu próximo hogar
                </p>

                <form onSubmit={handleRegister} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nombre Completo
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] focus:ring-2 focus:ring-[#fc7f51]/20 outline-none transition"
                            placeholder="Tu nombre"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Teléfono
                        </label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] focus:ring-2 focus:ring-[#fc7f51]/20 outline-none transition"
                            placeholder="+51 999 999 999"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Correo Electrónico
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] focus:ring-2 focus:ring-[#fc7f51]/20 outline-none transition"
                            placeholder="tu@correo.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Contraseña
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] focus:ring-2 focus:ring-[#fc7f51]/20 outline-none transition"
                            placeholder="Crea una contraseña segura"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            ¿Qué buscas hacer?
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setRole("cliente")}
                                className={`flex flex-col items-center p-4 border rounded-xl transition ${role === 'cliente' ? 'border-[#fc7f51] bg-orange-50 text-[#fc7f51]' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}
                            >
                                <span className="font-bold">Buscar Propiedades</span>
                                <span className="text-xs mt-1">Soy Cliente</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole("agente")}
                                className={`flex flex-col items-center p-4 border rounded-xl transition ${role === 'agente' ? 'border-[#fc7f51] bg-orange-50 text-[#fc7f51]' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}
                            >
                                <span className="font-bold">Publicar Inmuebles</span>
                                <span className="text-xs mt-1">Soy Agente</span>
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-[#fc7f51] text-white py-3 rounded-lg font-bold hover:bg-[#e56b3e] transition shadow-lg shadow-orange-500/30"
                    >
                        Registrarme
                    </button>
                </form>

                <div className="my-6 flex items-center">
                    <div className="flex-grow border-t border-gray-200"></div>
                    <span className="mx-4 text-gray-400 text-sm">O regístrate con</span>
                    <div className="flex-grow border-t border-gray-200"></div>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={handleGoogleLogin}
                        className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition"
                    >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                        Google
                    </button>
                    <button
                        onClick={handleAppleLogin}
                        className="w-full flex items-center justify-center gap-3 bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-900 transition"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
                        </svg>
                        Apple
                    </button>
                </div>

                <p className="mt-8 text-center text-gray-500 text-sm">
                    ¿Ya tienes cuenta?{" "}
                    <Link to="/login" className="text-[#fc7f51] font-bold hover:underline">
                        Inicia Sesión
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Register;
