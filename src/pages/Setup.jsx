import { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Setup = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    // 1. Create Default Categories (just an example, normally static)
    const createDemoProperties = async () => {
        setLoading(true);
        try {
            const demoProps = [
                {
                    title: "Modern Apartment in Downtown",
                    price: 250000,
                    location: "Downtown City Center",
                    type: "venta",
                    category: "construido",
                    bedrooms: 2,
                    bathrooms: 2,
                    footage: 85,
                    description: "Stunning view of the city.",
                    status: "disponible",
                    agentId: user?.uid || "demo-agent",
                    agentName: user?.displayName || "Demo Agent",
                    createdAt: new Date(),
                    images: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267"]
                },
                {
                    title: "Cozy Family Home",
                    price: 1500,
                    location: "Suburban Area",
                    type: "alquiler",
                    category: "construido",
                    bedrooms: 3,
                    bathrooms: 2,
                    footage: 120,
                    description: "Ideal for a small family.",
                    status: "disponible",
                    agentId: user?.uid || "demo-agent",
                    agentName: user?.displayName || "Demo Agent",
                    createdAt: new Date(),
                    images: ["https://images.unsplash.com/photo-1560184897-ae75f418493e"]
                }
            ];

            for (const prop of demoProps) {
                await addDoc(collection(db, "properties"), prop);
            }
            toast.success("Propiedades de demostración creadas!");
        } catch (error) {
            console.error("Error creating demo props:", error);
            toast.error("Error al crear propiedades demo");
        } finally {
            setLoading(false);
        }
    };

    // 2. Make Current User SuperAdmin
    const makeMeSuperAdmin = async () => {
        if (!user) {
            toast.error("Debes iniciar sesión primero.");
            return;
        }
        setLoading(true);
        try {
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                role: "superadmin",
                isActivated: true // auto-activate admin
            });
            toast.success(`¡Rol actualizado! Ahora eres Super Admin: ${user.email}`);
            setTimeout(() => window.location.reload(), 1500); // Reload to reflect changes
        } catch (error) {
            console.error("Error making superadmin:", error);
            toast.error("Error al actualizar rol");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 space-y-8">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg border border-gray-100 text-center">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Configuración Inicial</h1>
                <p className="text-gray-500 mb-8">
                    Usa estas herramientas para inicializar tu base de datos.
                </p>

                <div className="space-y-4">
                    <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                        <h3 className="font-bold text-gray-800 mb-2">1. Configurar Admin</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Convierte tu usuario actual ({user?.email || "No logueado"}) en Super Admin.
                        </p>
                        <button
                            onClick={makeMeSuperAdmin}
                            disabled={loading || !user}
                            className="w-full bg-[#fc7f51] hover:bg-[#e56b3e] text-white font-bold py-3 rounded-lg shadow-lg transition disabled:opacity-50"
                        >
                            Hacerme Super Admin
                        </button>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <h3 className="font-bold text-gray-800 mb-2">2. Datos de Prueba</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Crea propiedades de ejemplo para ver cómo luce el dashboard.
                        </p>
                        <button
                            onClick={createDemoProperties}
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg transition disabled:opacity-50"
                        >
                            Crear Propiedades Demo
                        </button>
                    </div>
                </div>

                <p className="mt-8 text-xs text-gray-400">
                    Nota: Esta página debe ser eliminada o asegurada antes de producción.
                </p>
            </div>
        </div>
    );
};

export default Setup;
