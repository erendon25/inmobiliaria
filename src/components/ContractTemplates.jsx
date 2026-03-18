import { useState, useEffect } from 'react';
import { db, storage } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FileText, Plus, Edit2, Trash2, Loader2, Save, X, Upload, Download } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ContractTemplates({ userId }) {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        id: null,
        title: '',
        operationType: 'venta',
        documentType: 'reserva',
        content: `CONTRATO DE [TIPO DE DOCUMENTO]

Conste por el presente documento, el contrato que celebran de una parte [AGENTE_NOMBRE], a quien en adelante se le denominará EL PROPIETARIO/AGENTE; y de la otra parte [CLIENTE_NOMBRE] identificado(a) con DNI/CE N° [CLIENTE_DNI], a quien en adelante se le denominará EL CLIENTE.

PRIMERO: El inmueble materia del presente contrato es [INMUEBLE_TITULO] ubicado en [INMUEBLE_DIRECCION].
SEGUNDO: El precio pactado es de [PRECIO] [MONEDA].

(Edite todas las cláusulas libremente...)`
    });
    const [fileTemplate, setFileTemplate] = useState(null);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchTemplates();
    }, [userId]);

    const fetchTemplates = async () => {
        try {
            const q = query(collection(db, "contract_templates"), where("agentId", "==", userId));
            const snapshot = await getDocs(q);
            const loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTemplates(loaded);
        } catch (error) {
            console.error(error);
            toast.error("Error al cargar plantillas");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            let fileUrl = formData.templateFileUrl || null;
            let fileName = formData.templateFileName || null;

            if (fileTemplate) {
                setUploadingFile(true);
                const storageRef = ref(storage, `contract_templates/${userId}/${Date.now()}_${fileTemplate.name}`);
                await uploadBytes(storageRef, fileTemplate);
                fileUrl = await getDownloadURL(storageRef);
                fileName = fileTemplate.name;
                setUploadingFile(false);
            }

            const templateData = {
                title: formData.title,
                operationType: formData.operationType,
                documentType: formData.documentType,
                content: fileUrl ? '' : formData.content, // If it's a file, content is empty
                templateFileUrl: fileUrl,
                templateFileName: fileName,
                agentId: userId,
                updatedAt: new Date().toISOString()
            };

            if (formData.id) {
                await updateDoc(doc(db, "contract_templates", formData.id), templateData);
                toast.success("Plantilla actualizada");
            } else {
                templateData.createdAt = new Date().toISOString();
                await addDoc(collection(db, "contract_templates"), templateData);
                toast.success("Plantilla creada");
            }
            setIsEditing(false);
            fetchTemplates();
        } catch (error) {
            console.error(error);
            toast.error("Error al guardar plantilla");
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (template) => {
        setFormData({
            ...template,
            content: template.content || ''
        });
        setFileTemplate(null);
        setIsEditing(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Eliminar esta plantilla?")) return;
        try {
            await deleteDoc(doc(db, "contract_templates", id));
            toast.success("Plantilla eliminada");
            fetchTemplates();
        } catch (error) {
            console.error(error);
            toast.error("Error al eliminar");
        }
    };

    const getDocumentOptions = () => {
        const { operationType } = formData;
        if (operationType === 'venta') return ['reserva', 'arras', 'contrato final'];
        if (operationType === 'alquiler') return ['reserva', 'contrato final'];
        if (operationType === 'anticresis') return ['reserva', 'contrato final'];
        return ['reserva', 'contrato final'];
    };

    if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-[#fc7f51]" /></div>;

    if (isEditing) {
        return (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 p-8">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h2 className="text-xl font-bold">{formData.id ? 'Editar Plantilla' : 'Nueva Plantilla'}</h2>
                    <button onClick={() => setIsEditing(false)} className="text-gray-500 hover:text-gray-700">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Título de la Plantilla</label>
                            <input required type="text" className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Ej: Contrato de Arras Estandar" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Operación</label>
                            <select className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none bg-white" value={formData.operationType} onChange={e => setFormData({ ...formData, operationType: e.target.value, documentType: 'reserva' })}>
                                <option value="venta">Venta</option>
                                <option value="alquiler">Alquiler</option>
                                <option value="anticresis">Anticresis</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Documento</label>
                            <select className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#fc7f51] outline-none bg-white uppercase text-sm" value={formData.documentType} onChange={e => setFormData({ ...formData, documentType: e.target.value })}>
                                {getDocumentOptions().map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <label className="block text-sm font-medium text-gray-700">Contenido del Contrato</label>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded max-w-[60%] overflow-auto">
                                Variables soportadas: <br /><strong>{'[AGENTE_NOMBRE], [CLIENTE_NOMBRE]/[COMPRADOR_NOMBRE], [CLIENTE_DNI]/[COMPRADOR_DNI], [PROPIETARIO_NOMBRES], [PROPIETARIO_DNI], [CONYUGE_NOMBRES], [CONYUGE_DNI], [CLIENTE_TELEFONO], [CLIENTE_CORREO], [INMUEBLE_TITULO], [INMUEBLE_DIRECCION], [PRECIO], [MONEDA], [DIA], [MES], [AÑO]'}</strong>
                                <br /> <em>(Use las mismas variables si sube un archivo Word)</em>
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                            {/* Text Editor */}
                            <div className={`border-2 rounded-xl transition-all ${formData.templateFileUrl || fileTemplate ? 'opacity-50 pointer-events-none border-gray-100' : 'border-[#fc7f51]/30'}`}>
                                <div className="bg-orange-50 p-3 rounded-t-xl border-b border-[#fc7f51]/20 font-bold text-sm text-[#fc7f51]">
                                    Opción 1: Plantilla de Texto
                                </div>
                                <textarea
                                    className="w-full px-4 py-3 rounded-b-xl border-none outline-none font-mono text-sm h-64 resize-y leading-relaxed bg-transparent"
                                    value={formData.content}
                                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                                    placeholder="Escribe tu contrato aquí..."
                                    disabled={!!(formData.templateFileUrl || fileTemplate)}
                                />
                            </div>

                            {/* Word File Upload */}
                            <div className={`border-2 rounded-xl transition-all flex flex-col ${!formData.content && (formData.templateFileUrl || fileTemplate) ? 'border-[#fc7f51]/30' : 'border-gray-200'}`}>
                                <div className="bg-blue-50 p-3 rounded-t-xl border-b border-blue-200 font-bold text-sm text-blue-700">
                                    Opción 2: Subir Plantilla Word (.docx)
                                </div>
                                <div className="p-6 flex-1 flex flex-col items-center justify-center text-center">
                                    <FileText className="w-12 h-12 text-blue-300 mb-3" />
                                    {formData.templateFileName ? (
                                        <div className="mb-4">
                                            <p className="font-bold text-gray-800 text-sm line-clamp-1">{formData.templateFileName}</p>
                                            <p className="text-xs text-green-600 mt-1 font-medium">Archivo actual cargado</p>
                                        </div>
                                    ) : fileTemplate ? (
                                        <div className="mb-4">
                                            <p className="font-bold text-gray-800 text-sm line-clamp-1">{fileTemplate.name}</p>
                                            <p className="text-xs text-orange-600 mt-1 font-medium">Listo para guardar</p>
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-sm mb-4">Sube un archivo Word con las variables entre corchetes para usarlo de plantilla.</p>
                                    )}

                                    <label className="cursor-pointer bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 shadow-sm">
                                        <Upload className="w-4 h-4" /> {formData.templateFileName || fileTemplate ? 'Reemplazar Archivo' : 'Seleccionar .docx'}
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept=".docx"
                                            onChange={(e) => {
                                                if (e.target.files[0]) {
                                                    setFileTemplate(e.target.files[0]);
                                                    setFormData({ ...formData, content: '' }); // Clear text if using file
                                                }
                                            }}
                                        />
                                    </label>

                                    {(formData.templateFileUrl || fileTemplate) && (
                                        <button
                                            type="button"
                                            onClick={() => { setFileTemplate(null); setFormData({ ...formData, templateFileUrl: null, templateFileName: null, content: 'CONTRATO DE [TIPO DE DOCUMENTO]\n\n...' }) }}
                                            className="mt-4 text-xs font-bold text-red-500 hover:underline"
                                        >
                                            Remover Archivo y usar Texto
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition">Cancelar</button>
                        <button type="submit" disabled={saving} className="px-6 py-3 bg-[#fc7f51] text-white font-bold rounded-xl hover:bg-[#e56b3e] transition flex items-center gap-2">
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Guardar Plantilla
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 p-8">
            <div className="flex justify-between items-center mb-6 pb-4 border-b">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2"><FileText className="w-6 h-6 text-[#fc7f51]" /> Plantillas de Contrato</h2>
                    <p className="text-sm text-gray-500 mt-1">Configura borradores y machotes de contrato (texto o archivos Word).</p>
                </div>
                <button
                    onClick={() => {
                        setFileTemplate(null);
                        setFormData({ id: null, title: '', operationType: 'venta', documentType: 'reserva', content: 'CONTRATO DE [TIPO DE DOCUMENTO]\n\n...' });
                        setIsEditing(true);
                    }}
                    className="bg-[#fc7f51] text-white px-4 py-2 rounded-xl font-bold hover:bg-[#e56b3e] transition flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" /> Nueva Plantilla
                </button>
            </div>

            {templates.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No tienes ninguna plantilla creada.</p>
                    <p className="text-gray-400 text-sm mt-1">Crea una plantilla para usarla automáticamente al cerrar un trato.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map(tpl => (
                        <div key={tpl.id} className="border border-gray-100 p-5 rounded-xl hover:shadow-md transition bg-gray-50 flex flex-col justify-between group">
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-orange-100 text-[#fc7f51]">{tpl.operationType}</span>
                                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-blue-100 text-blue-600">{tpl.documentType}</span>
                                </div>
                                <h3 className="font-bold text-gray-900 mt-2 line-clamp-2">{tpl.title}</h3>
                                {tpl.templateFileName && (
                                    <div className="flex flex-col gap-2 mt-2">
                                        <div className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 w-fit px-2 py-1 rounded">
                                            <FileText className="w-3 h-3" /> Plantilla Word (.docx)
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2 justify-end mt-4 opacity-0 group-hover:opacity-100 transition">
                                {tpl.templateFileUrl && (
                                    <a href={tpl.templateFileUrl} download target="_blank" rel="noopener noreferrer" className="p-2 bg-white text-green-600 hover:bg-green-50 rounded-lg shadow-sm" title="Descargar Word">
                                        <Download className="w-4 h-4" />
                                    </a>
                                )}
                                <button onClick={() => handleEdit(tpl)} className="p-2 bg-white text-blue-600 hover:bg-blue-50 rounded-lg shadow-sm" title="Editar">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(tpl.id)} className="p-2 bg-white text-red-600 hover:bg-red-50 rounded-lg shadow-sm" title="Eliminar">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
