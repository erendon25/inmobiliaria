
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const ForgotPassword = () => {
    const [email, setEmail] = useState("");
    const { resetPassword } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await resetPassword(email);
            toast.success("Te hemos enviado un correo para restablecer tu contraseña.");
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
                <h2 className="text-3xl font-bold mb-2 text-center text-gray-800">
                    Recuperar Contraseña
                </h2>
                <p className="text-center text-gray-500 mb-8">
                    Ingresa tu correo y te enviaremos las instrucciones
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
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

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#fc7f51] text-white py-3 rounded-lg font-bold hover:bg-[#e56b3e] transition shadow-lg shadow-orange-500/30 disabled:opacity-70"
                    >
                        {loading ? "Enviando..." : "Enviar Instrucciones"}
                    </button>
                </form>

                <p className="mt-8 text-center text-gray-500 text-sm">
                    ¿Te acordaste?{" "}
                    <Link to="/login" className="text-[#fc7f51] font-bold hover:underline">
                        Volver a Iniciar Sesión
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default ForgotPassword;
