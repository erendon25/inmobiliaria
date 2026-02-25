import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, orderBy, getCountFromServer, getDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Users, Home, Key, Copy, Check, RefreshCw, Eye, Trash2, X, Loader2, MailWarning, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const SuperAdminDashboard = () => {
    const [stats, setStats] = useState({
        totalAgents: 0,
        totalProperties: 0,
        activeCodes: 0,
        orphanedCount: 0
    });
    const [codes, setCodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    // Orphans State
    const [orphanedProperties, setOrphanedProperties] = useState([]);

    // Modal State
    const [selectedUser, setSelectedUser] = useState(null);
    const [userProperties, setUserProperties] = useState([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [showModal, setShowModal] = useState(false);

    // Migration State
    const [agents, setAgents] = useState([]);
    const [targetAgentId, setTargetAgentId] = useState('');
    const [migrating, setMigrating] = useState(false);

    const fetchStats = async () => {
        try {
            // Count Agents
            const agentsQuery = query(collection(db, "users"), where("role", "==", "agente"));
            const agentsSnapshot = await getCountFromServer(agentsQuery);

            // Count Properties (Fast count)
            const propsSnapshot = await getCountFromServer(collection(db, "properties"));

            // Get Codes
            const codesQuery = query(collection(db, "activation_codes"), orderBy("createdAt", "desc"));
            const codesSnapshot = await getDocs(codesQuery);
            const codesList = codesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            setCodes(codesList);

            // Get all agents for the migration dropdown
            const agentsList = [];
            const agentDocs = await getDocs(query(collection(db, "users")));
            agentDocs.forEach(doc => {
                agentsList.push({ id: doc.id, ...doc.data() });
            });
            const validAgents = agentsList.filter(a => a.id);
            validAgents.sort((a, b) => {
                if (a.role === 'superadmin') return -1;
                if (b.role === 'superadmin') return 1;
                if (a.role === 'agente') return -1;
                if (b.role === 'agente') return 1;
                return 0;
            });
            setAgents(validAgents);

            // Fetch ALL properties to find any orphans (properties belonging to a deleted agent)
            const allPropsDocs = await getDocs(collection(db, "properties"));
            const allPropsList = allPropsDocs.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // An orphan is a property whose agentId doesn't exist in our active users list
            const currentOrphans = allPropsList.filter(p => !validAgents.find(a => a.id === p.agentId));
            setOrphanedProperties(currentOrphans);

            setStats({
                totalAgents: agentsSnapshot.data().count,
                totalProperties: propsSnapshot.data().count,
                activeCodes: codesList.filter(c => !c.used).length,
                orphanedCount: currentOrphans.length
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
        if (!selectedUser || !window.confirm(`¿Estás seguro de que quieres eliminar a ${selectedUser.displayName || 'este usuario'} y todas sus propiedades/tips? Esta acción no se puede deshacer.`)) {
            return;
        }

        try {
            // Delete all user properties
            const deletePromises = userProperties.map(prop => deleteDoc(doc(db, "properties", prop.id)));

            // Delete all user tips
            const tipsQuery = query(collection(db, "tips"), where("agentId", "==", selectedUser.id));
            const tipsSnapshot = await getDocs(tipsQuery);
            tipsSnapshot.forEach(tipDoc => {
                deletePromises.push(deleteDoc(doc(db, "tips", tipDoc.id)));
            });

            await Promise.all(deletePromises);

            // Delete user document
            await deleteDoc(doc(db, "users", selectedUser.id));

            toast.success("Usuario, propiedades y tips eliminados.");
            setShowModal(false);
            fetchStats(); // Refresh main list
        } catch (error) {
            console.error("Error deleting user:", error);
            toast.error("Error al eliminar usuario.");
        }
    };

    const handleMigrateProperties = async (propertyId = null) => {
        const propsToMigrate = typeof propertyId === 'string'
            ? userProperties.filter(p => p.id === propertyId)
            : userProperties;

        if (!selectedUser || !targetAgentId || propsToMigrate.length === 0) return;

        const countText = typeof propertyId === 'string' ? "esta propiedad" : `las ${propsToMigrate.length} propiedades`;
        if (!window.confirm(`¿Estás seguro de que quieres mudar ${countText} al nuevo asesor?`)) {
            return;
        }

        setMigrating(true);
        try {
            const targetAgent = agents.find(a => a.id === targetAgentId);
            const batchPromises = propsToMigrate.map(prop => {
                const propRef = doc(db, "properties", prop.id);
                return updateDoc(propRef, {
                    agentId: targetAgentId,
                    agentName: targetAgent?.displayName || 'Agente Inmuévete'
                });
            });

            // Migrate Tips as well if we are migrating all properties
            if (!propertyId) {
                if (selectedUser.id === 'orphans') {
                    // Mover TODAS las tips huérfanas
                    const allTipsQuery = await getDocs(collection(db, "tips"));
                    allTipsQuery.forEach(tipDoc => {
                        const data = tipDoc.data();
                        if (data.agentId && !agents.find(a => a.id === data.agentId)) {
                            batchPromises.push(updateDoc(doc(db, "tips", tipDoc.id), {
                                agentId: targetAgentId,
                                agentName: targetAgent?.displayName || 'Agente Inmuévete'
                            }));
                        }
                    });
                } else {
                    // Mover tips del usuario actual
                    const tipsQuery = query(collection(db, "tips"), where("agentId", "==", selectedUser.id));
                    const tipsSnapshot = await getDocs(tipsQuery);
                    tipsSnapshot.forEach(tipDoc => {
                        batchPromises.push(updateDoc(doc(db, "tips", tipDoc.id), {
                            agentId: targetAgentId,
                            agentName: targetAgent?.displayName || 'Agente Inmuévete'
                        }));
                    });
                }
            }

            await Promise.all(batchPromises);
            toast.success("Propiedad(es) mudada(s) con éxito al nuevo agente.");
            setTargetAgentId('');
            if (selectedUser.id === 'orphans') {
                const updatedOrphans = userProperties.filter(p => !propsToMigrate.find(m => m.id === p.id));
                setUserProperties(updatedOrphans);
                setOrphanedProperties(updatedOrphans);
            } else {
                handleViewDetails(selectedUser.id);
            }
            fetchStats();
        } catch (error) {
            console.error("Error migrating properties:", error);
            toast.error("Hubo un error al mudar las propiedades.");
        } finally {
            setMigrating(false);
        }
    };

    const handleToggleBlockUser = async () => {
        if (!selectedUser || selectedUser.id === 'orphans') return;
        const newStatus = !selectedUser.disabled;
        const actionText = newStatus ? 'bloquear' : 'desbloquear';

        if (!window.confirm(`¿Seguro que deseas ${actionText} a este usuario?`)) return;

        try {
            await updateDoc(doc(db, "users", selectedUser.id), {
                disabled: newStatus
            });
            setSelectedUser({ ...selectedUser, disabled: newStatus });
            toast.success(`Usuario ${newStatus ? 'bloqueado' : 'desbloqueado'} con éxito.`);
        } catch (error) {
            console.error("Error toggling block:", error);
            toast.error("Error al cambiar estado del usuario.");
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

                    <div className={`bg-white p-6 rounded-2xl shadow-sm border ${stats.orphanedCount > 0 ? 'border-red-300 bg-red-50' : 'border-gray-100'} flex items-center justify-between gap-4`}>
                        <div className="flex items-center gap-4">
                            <div className={`${stats.orphanedCount > 0 ? 'bg-red-100' : 'bg-gray-50'} p-4 rounded-xl`}>
                                <AlertTriangle className={`w-8 h-8 ${stats.orphanedCount > 0 ? 'text-red-500' : 'text-gray-400'}`} />
                            </div>
                            <div>
                                <p className={`${stats.orphanedCount > 0 ? 'text-red-600 font-bold' : 'text-gray-500'} text-sm font-medium`}>Propiedades Huérfanas</p>
                                <h3 className={`text-3xl font-bold ${stats.orphanedCount > 0 ? 'text-red-600' : 'text-gray-800'}`}>{stats.orphanedCount}</h3>
                            </div>
                        </div>
                        {stats.orphanedCount > 0 && (
                            <button
                                onClick={() => {
                                    setSelectedUser({ id: 'orphans', displayName: 'Usuario Eliminado (Propiedades Huérfanas)', email: '-', role: 'agente' });
                                    setUserProperties(orphanedProperties);
                                    setShowModal(true);
                                }}
                                className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-bold transition"
                            >
                                Asignar
                            </button>
                        )}
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

                {/* Agents Section */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mt-12">
                    <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">Todos los Usuarios</h3>
                            <p className="text-gray-500 text-sm mt-1">Administra y transfiere propiedades de cualquier usuario.</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-8 py-4 text-sm font-semibold text-gray-500">NOMBRE / EMAIL</th>
                                    <th className="px-8 py-4 text-sm font-semibold text-gray-500">ROL</th>
                                    <th className="px-8 py-4 text-sm font-semibold text-gray-500">ESTADO</th>
                                    <th className="px-8 py-4 text-sm font-semibold text-gray-500">ACCIONES</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {agents.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-8 py-8 text-center text-gray-400">
                                            Cargando usuarios...
                                        </td>
                                    </tr>
                                ) : (
                                    agents.map((agent) => (
                                        <tr key={agent.id} className="hover:bg-gray-50/50 transition">
                                            <td className="px-8 py-4">
                                                <span className="font-bold text-gray-800 block">
                                                    {agent.displayName || 'Sin nombre'}
                                                </span>
                                                <span className="text-sm text-gray-500">
                                                    {agent.email}
                                                </span>
                                            </td>
                                            <td className="px-8 py-4">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-orange-100 text-[#fc7f51]">
                                                    {agent.role}
                                                </span>
                                            </td>
                                            <td className="px-8 py-4 text-sm">
                                                {agent.disabled ? (
                                                    <span className="text-red-500 font-bold bg-red-50 px-2 py-1 rounded">Bloqueado</span>
                                                ) : (
                                                    <span className="text-green-500 font-bold bg-green-50 px-2 py-1 rounded">Activo</span>
                                                )}
                                            </td>
                                            <td className="px-8 py-4">
                                                <button
                                                    onClick={() => handleViewDetails(agent.id)}
                                                    className="flex items-center gap-2 text-blue-500 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition font-bold text-sm"
                                                    title="Ver Detalles y Propiedades"
                                                >
                                                    <Eye className="w-5 h-5" /> Ver Propiedades
                                                </button>
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
                                            <div className="flex items-center gap-3">
                                                <h4 className="text-lg font-bold text-gray-800">{selectedUser.displayName || 'Sin Nombre'}</h4>
                                                {selectedUser.disabled && (
                                                    <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded">BLOQUEADO</span>
                                                )}
                                            </div>
                                            <p className="text-gray-500">{selectedUser.email}</p>
                                            <p className="text-gray-500 text-sm mt-1">{selectedUser.phoneNumber || 'Sin Teléfono'}</p>
                                            <span className="inline-block mt-2 px-2 py-1 bg-orange-100 text-[#fc7f51] text-xs font-bold rounded-lg uppercase">
                                                {selectedUser.role}
                                            </span>
                                            {selectedUser.email !== '-' && (
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            await sendPasswordResetEmail(auth, selectedUser.email);
                                                            toast.success('Correo de restablecimiento enviado exitosamente a ' + selectedUser.email);
                                                        } catch (error) {
                                                            console.error('Error al resetear pass:', error);
                                                            toast.error('Error al enviar correo de restablecimiento.');
                                                        }
                                                    }}
                                                    className="mt-3 block text-blue-600 hover:text-blue-800 text-sm font-bold underline transition"
                                                >
                                                    Enviar Correo para Cambiar Contraseña
                                                </button>
                                            )}
                                        </div>
                                        {selectedUser.id !== 'orphans' && (
                                            <div className="flex flex-col gap-2">
                                                <button
                                                    onClick={handleToggleBlockUser}
                                                    className={`${selectedUser.disabled ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'} px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition`}
                                                >
                                                    {selectedUser.disabled ? 'Desbloquear Acceso' : 'Bloquear Acceso'}
                                                </button>
                                                <button
                                                    onClick={handleDeleteUser}
                                                    className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Eliminar Usuario
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* User Properties & Migration */}
                                    <div>
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 border-b pb-4 gap-4">
                                            <h4 className="font-bold text-gray-800 text-lg">Propiedades ({userProperties.length})</h4>

                                            {/* Migration Dropdown */}
                                            {userProperties.length > 0 && (
                                                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto bg-orange-50 p-2 rounded-lg border border-orange-100">
                                                    <select
                                                        className="px-3 py-2 rounded border border-orange-200 outline-none focus:border-[#fc7f51] text-sm bg-white"
                                                        value={targetAgentId}
                                                        onChange={(e) => setTargetAgentId(e.target.value)}
                                                    >
                                                        <option value="">-- Mudar al Agente --</option>
                                                        {agents.filter(a => a.id !== selectedUser.id).map(agent => (
                                                            <option key={agent.id} value={agent.id}>{agent.displayName || agent.email}</option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        onClick={handleMigrateProperties}
                                                        disabled={!targetAgentId || migrating}
                                                        className="bg-[#fc7f51] hover:bg-[#e56b3e] text-white px-4 py-2 rounded font-bold text-sm transition disabled:opacity-50 flex items-center justify-center"
                                                    >
                                                        {migrating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Mudar Todo'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        {userProperties.length === 0 ? (
                                            <p className="text-gray-400 text-sm text-center py-4">No hay propiedades en esta lista.</p>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {userProperties.map(prop => (
                                                    <div key={prop.id} className="border border-gray-100 rounded-lg p-3 flex gap-3 hover:bg-gray-50 transition relative group">
                                                        <div className="w-16 h-16 bg-gray-200 rounded-md overflow-hidden flex-shrink-0">
                                                            {prop.images?.[0] && <img src={prop.images[0]} className="w-full h-full object-cover" />}
                                                        </div>
                                                        <div className="overflow-hidden flex-1">
                                                            <p className="font-bold text-sm text-gray-800 truncate">{prop.title}</p>
                                                            <p className="text-xs text-gray-500 truncate">{prop.location}</p>
                                                            <p className="text-[#fc7f51] font-bold text-xs mt-1">${prop.price?.toLocaleString()}</p>
                                                            {prop.agentId && selectedUser.id === 'orphans' && (
                                                                <p className="text-red-400 text-[10px] mt-1 break-all">Huérfana (Agente Original: {prop.agentId})</p>
                                                            )}
                                                        </div>

                                                        {/* Individual Migrate Action */}
                                                        {targetAgentId && (
                                                            <button
                                                                onClick={() => handleMigrateProperties(prop.id)}
                                                                className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 bg-[#fc7f51] text-white p-2 rounded shadow transition hover:bg-[#e56b3e]"
                                                                title="Mudar solo esta propiedad"
                                                            >
                                                                <RefreshCw className="w-4 h-4" />
                                                            </button>
                                                        )}
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
