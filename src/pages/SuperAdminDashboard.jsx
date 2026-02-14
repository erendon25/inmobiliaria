import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, orderBy, getCountFromServer, getDoc } from 'firebase/firestore';
import { Users, Home, Key, Copy, Check, RefreshCw, Eye, Trash2, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const SuperAdminDashboard = () => {
    const [stats, setStats] = useState({
        totalAgents: 0,
        totalProperties: 0,
        activeCodes: 0
    });
    const [codes, setCodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    // Modal State
    const [selectedUser, setSelectedUser] = useState(null);
    const [userProperties, setUserProperties] = useState([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [showModal, setShowModal] = useState(false);

    const fetchStats = async () => {
        try {
            // Count Agents
            const agentsQuery = query(collection(db, "users"), where("role", "==", "agente"));
            const agentsSnapshot = await getCountFromServer(agentsQuery);

            // Count Properties
            const propsSnapshot = await getCountFromServer(collection(db, "properties"));

            // Get Codes
            const codesQuery = query(collection(db, "activation_codes"), orderBy("createdAt", "desc"));
            const codesSnapshot = await getDocs(codesQuery);
            const codesList = codesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            setCodes(codesList);
            setStats({
                totalAgents: agentsSnapshot.data().count,
                totalProperties: propsSnapshot.data().count,
                activeCodes: codesList.filter(c => !c.used).length
            });
        } catch (error) {
            console.error("Error fetching admin stats:", error);
            toast.error("Error al cargar estadísticas");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const generateCode = async () => {
        setGenerating(true);
        try {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let code = '';
            for (let i = 0; i < 8; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }

            await addDoc(collection(db, "activation_codes"), {
                code,
                used: false,
                createdAt: new Date(),
                usedBy: null,
                usedAt: null
            });

            toast.success("¡Código generado correctamente!");
            fetchStats();
        } catch (error) {
            console.error("Error generating code:", error);
            toast.error("No se pudo generar el código");
        } finally {
            setGenerating(false);
        }
    };

    const copyToClipboard = (code) => {
        navigator.clipboard.writeText(code);
        toast.success("Código copiado al portapapeles");
    };

    const handleViewDetails = async (userId) => {
        if (!userId) return;
        setLoadingDetails(true);
        setShowModal(true);
        setUserProperties([]); // Reset

        try {
            // 1. Get User Data
            const userDoc = await getDoc(doc(db, "users", userId));
            if (userDoc.exists()) {
                setSelectedUser({ id: userDoc.id, ...userDoc.data() });
            } else {
                setSelectedUser(null);
                toast.error("Usuario no encontrado (probablemente ya eliminado).");
                return;
            }

            // 2. Get User Properties
            const q = query(collection(db, "properties"), where("agentId", "==", userId));
            const querySnapshot = await getDocs(q);
            const props = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUserProperties(props);

        } catch (error) {
            console.error("Error details:", error);
            toast.error("Error al cargar detalles");
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!selectedUser || !window.confirm(`¿Estás seguro de que quieres eliminar a ${selectedUser.displayName || 'este usuario'} y todas sus propiedades? Esta acción no se puede deshacer.`)) {
            return;
        }

        try {
            // Delete all user properties
            const deletePromises = userProperties.map(prop => deleteDoc(doc(db, "properties", prop.id)));
            await Promise.all(deletePromises);

            // Delete user document
            await deleteDoc(doc(db, "users", selectedUser.id));

            toast.success("Usuario y sus propiedades eliminados.");
            setShowModal(false);
            fetchStats(); // Refresh main list
        } catch (error) {
            console.error("Error deleting user:", error);
            toast.error("Error al eliminar usuario.");
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-[#fc7f51]" />
        </div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-6">
            <div className="container mx-auto max-w-6xl">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 font-[Montserrat]">Panel Super Admin</h1>
                        <p className="text-gray-500 mt-2">Gestión general de la plataforma</p>
                    </div>
                    <button
                        onClick={fetchStats}
                        className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition shadow-sm"
                    >
                        <RefreshCw className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className="bg-orange-50 p-4 rounded-xl">
                            <Users className="w-8 h-8 text-[#fc7f51]" />
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm font-medium">Agentes Registrados</p>
                            <h3 className="text-3xl font-bold text-gray-800">{stats.totalAgents}</h3>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className="bg-blue-50 p-4 rounded-xl">
                            <Home className="w-8 h-8 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm font-medium">Inmuebles Publicados</p>
                            <h3 className="text-3xl font-bold text-gray-800">{stats.totalProperties}</h3>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className="bg-green-50 p-4 rounded-xl">
                            <Key className="w-8 h-8 text-green-500" />
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm font-medium">Códigos Disponibles</p>
                            <h3 className="text-3xl font-bold text-gray-800">{stats.activeCodes}</h3>
                        </div>
                    </div>
                </div>

                {/* Code Generation Section */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">Códigos de Activación</h3>
                            <p className="text-gray-500 text-sm mt-1">Genera códigos únicos para activar cuentas de agentes.</p>
                        </div>
                        <button
                            onClick={generateCode}
                            disabled={generating}
                            className="bg-[#fc7f51] hover:bg-[#e56b3e] text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-orange-500/20 transition flex items-center gap-2 disabled:opacity-70"
                        >
                            {generating ? (
                                <RefreshCw className="w-5 h-5 animate-spin" />
                            ) : (
                                <Key className="w-5 h-5" />
                            )}
                            Generar Nuevo Código
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-8 py-4 text-sm font-semibold text-gray-500">CÓDIGO</th>
                                    <th className="px-8 py-4 text-sm font-semibold text-gray-500">ESTADO</th>
                                    <th className="px-8 py-4 text-sm font-semibold text-gray-500">CREADO EL</th>
                                    <th className="px-8 py-4 text-sm font-semibold text-gray-500">USADO POR</th>
                                    <th className="px-8 py-4 text-sm font-semibold text-gray-500">ACCIONES</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {codes.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-8 py-8 text-center text-gray-400">
                                            No hay códigos generados aún.
                                        </td>
                                    </tr>
                                ) : (
                                    codes.map((code) => (
                                        <tr key={code.id} className="hover:bg-gray-50/50 transition">
                                            <td className="px-8 py-4">
                                                <span className="font-mono font-bold text-lg text-gray-700 tracking-wider">
                                                    {code.code}
                                                </span>
                                            </td>
                                            <td className="px-8 py-4">
                                                {code.used ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                        Usado
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        Disponible
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-8 py-4 text-sm text-gray-500">
                                                {code.createdAt?.toDate().toLocaleDateString()}
                                            </td>
                                            <td className="px-8 py-4 text-sm text-gray-500 relative group cursor-pointer" onClick={() => code.usedBy && handleViewDetails(code.usedBy)}>
                                                {code.usedBy ? (
                                                    <div className="flex items-center gap-2 hover:text-[#fc7f51] transition">
                                                        <span>{code.usedBy}</span>
                                                        <Eye className="w-4 h-4 opacity-0 group-hover:opacity-100" />
                                                    </div>
                                                ) : '-'}
                                            </td>
                                            <td className="px-8 py-4">
                                                {!code.used ? (
                                                    <button
                                                        onClick={() => copyToClipboard(code.code)}
                                                        className="text-[#fc7f51] hover:text-[#e56b3e] p-2 hover:bg-orange-50 rounded-lg transition"
                                                        title="Copiar código"
                                                    >
                                                        <Copy className="w-5 h-5" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleViewDetails(code.usedBy)}
                                                        className="text-blue-500 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition"
                                                        title="Ver Detalles"
                                                    >
                                                        <Eye className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* User Details Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">

                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-xl font-bold text-gray-800">Detalles del Agente</h3>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto flex-1">
                            {loadingDetails ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-[#fc7f51]" />
                                </div>
                            ) : selectedUser ? (
                                <div className="space-y-8">
                                    {/* User Info */}
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h4 className="text-lg font-bold text-gray-800">{selectedUser.displayName || 'Sin Nombre'}</h4>
                                            <p className="text-gray-500">{selectedUser.email}</p>
                                            <p className="text-gray-500 text-sm mt-1">{selectedUser.phoneNumber || 'Sin Teléfono'}</p>
                                            <span className="inline-block mt-2 px-2 py-1 bg-orange-100 text-[#fc7f51] text-xs font-bold rounded-lg uppercase">
                                                {selectedUser.role}
                                            </span>
                                        </div>
                                        <button
                                            onClick={handleDeleteUser}
                                            className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Eliminar Usuario
                                        </button>
                                    </div>

                                    {/* User Properties */}
                                    <div>
                                        <h4 className="font-bold text-gray-800 mb-4 border-b pb-2">Propiedades Publicadas ({userProperties.length})</h4>
                                        {userProperties.length === 0 ? (
                                            <p className="text-gray-400 text-sm text-center py-4">Este usuario no tiene propiedades.</p>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-4">
                                                {userProperties.map(prop => (
                                                    <div key={prop.id} className="border border-gray-100 rounded-lg p-3 flex gap-3 hover:bg-gray-50 transition">
                                                        <div className="w-16 h-16 bg-gray-200 rounded-md overflow-hidden flex-shrink-0">
                                                            {prop.images?.[0] && <img src={prop.images[0]} className="w-full h-full object-cover" />}
                                                        </div>
                                                        <div className="overflow-hidden">
                                                            <p className="font-bold text-sm text-gray-800 truncate">{prop.title}</p>
                                                            <p className="text-xs text-gray-500 truncate">{prop.location}</p>
                                                            <p className="text-[#fc7f51] font-bold text-xs mt-1">${prop.price?.toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-center text-red-500">No se pudo cargar la información.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuperAdminDashboard;
