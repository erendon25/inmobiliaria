
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, userData, loading } = useAuth();

    if (loading) {
        return <div className="flex justify-center items-center h-screen">Cargando...</div>;
    }

    if (!user) {
        return <Navigate to="/login" />;
    }

    if (userData && userData.disabled) {
        return (
            <div className="flex flex-col justify-center items-center h-screen bg-gray-50 px-6">
                <div className="bg-white p-8 rounded-2xl shadow-lg border border-red-100 max-w-md text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-red-500 text-3xl">⚠️</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Acceso Suspendido</h2>
                    <p className="text-gray-500">Tu cuenta ha sido bloqueada temporalmente por la administración.</p>
                </div>
            </div>
        );
    }

    if (allowedRoles && userData && !allowedRoles.includes(userData.role)) {
        // Redirect to their appropriate dashboard if they try to access a route they shouldn't
        return userData.role === 'agente'
            ? <Navigate to="/agent-dashboard" />
            : <Navigate to="/client-dashboard" />;
    }

    return children;
};

export default ProtectedRoute;
