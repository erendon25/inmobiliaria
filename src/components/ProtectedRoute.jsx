
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

    if (allowedRoles && userData && !allowedRoles.includes(userData.role)) {
        // Redirect to their appropriate dashboard if they try to access a route they shouldn't
        return userData.role === 'agente'
            ? <Navigate to="/agent-dashboard" />
            : <Navigate to="/client-dashboard" />;
    }

    return children;
};

export default ProtectedRoute;
