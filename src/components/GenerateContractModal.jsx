import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, addDoc, getDoc } from 'firebase/firestore';
import { Loader2, X, FileText, CheckCircle2, ChevronRight, Printer, Download, User } from 'lucide-react';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';

export default function GenerateContractModal({ visit, agent, onClose, onContractsUpdated }) {
    const [step, setStep] = useState(1); // 1: Select Type, 2: Select Template, 3: Edit & Save
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [selectedDocType, setSelectedDocType] = useState('reserva'); // reserva, arras, contrato final
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [contractContent, setContractContent] = useState('');
    const [saving, setSaving] = useState(false);
    const [generatingDocx, setGeneratingDocx] = useState(false);

    const [clientData, setClientData] = useState({
        dni: visit.clientDni || '',
        name: visit.clientName || '',
        phone: visit.clientPhone || '',
        email: visit.clientEmail || ''
    });

    const [operationType, setOperationType] = useState('venta');
    const [propertyDetails, setPropertyDetails] = useState(null);

    useEffect(() => {
        const fetchProperty = async () => {
            if (visit.propertyId) {
                try {
                    const docSnap = await getDoc(doc(db, "properties", visit.propertyId));
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setPropertyDetails(data);
                        if (data.operation) {
                            const op = data.operation.toLowerCase();
                            if (['venta', 'alquiler', 'anticresis'].includes(op)) {
                                setOperationType(op);
                            }
                        }
                    }
                } catch (e) {
                    console.error("Error fetching property", e);
                }
            }
        };

        const fetchClientData = async () => {
            if (visit.clientId) {
                try {
                    const docSnap = await getDoc(doc(db, "users", visit.clientId));
                    if (docSnap.exists()) {
                        const cd = docSnap.data();
                        setClientData(prev => ({
                            ...prev,
                            dni: cd.dni || prev.dni,
                            phone: cd.phone || prev.phone,
                            name: cd.name || cd.displayName || prev.name
                        }));
                    }
                } catch (e) { }
            }
        };

        fetchProperty();
        fetchClientData();
    }, [visit]);

    const handleSearchTemplates = async () => {
        setLoadingTemplates(true);
        try {
            const q = query(
                collection(db, "contract_templates"),
                where("agentId", "==", agent.uid),
                where("operationType", "==", operationType),
                where("documentType", "==", selectedDocType)
            );
            const snapshot = await getDocs(q);
            setTemplates(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setStep(2);
        } catch (error) {
            console.error(error);
            toast.error("Error buscando plantillas");
        } finally {
            setLoadingTemplates(false);
        }
    };

    const handleSelectTemplate = (template) => {
        setSelectedTemplate(template);
        if (template.templateFileUrl) {
            setStep(3);
            return;
        }

        // Replace variables
        const now = new Date();
        const currentDay = now.getDate();
        const currentMonth = now.toLocaleString('es-ES', { month: 'long' });
        const currentYear = now.getFullYear();

        let content = template.content;
        content = content.replace(/\[AGENTE_NOMBRE\]/g, agent.displayName || '');
        content = content.replace(/\[(CLIENTE|COMPRADOR)_NOMBRE\]/g, clientData.name || '');
        content = content.replace(/\[(CLIENTE|COMPRADOR)_DNI\]/g, clientData.dni || '_______________');
        content = content.replace(/\[(CLIENTE|COMPRADOR)_TELEFONO\]/g, clientData.phone || '_______________');
        content = content.replace(/\[(CLIENTE|COMPRADOR)_CORREO\]/g, clientData.email || '_______________');
        content = content.replace(/\[INMUEBLE_TITULO\]/g, visit.propertyTitle || '');
        content = content.replace(/\[INMUEBLE_DIRECCION\]/g, propertyDetails?.address || propertyDetails?.location || '_______________');
        content = content.replace(/\[PRECIO\]/g, propertyDetails?.price ? propertyDetails.price.toString() : '_______________');
        content = content.replace(/\[MONEDA\]/g, propertyDetails?.currency || 'USD');
        content = content.replace(/\[PROPIETARIO_NOMBRES\]/g, propertyDetails?.ownerName || '_______________');
        content = content.replace(/\[PROPIETARIO_DNI\]/g, propertyDetails?.ownerDni || '_______________');
        content = content.replace(/\[CONYUGE_NOMBRES\]/g, propertyDetails?.ownerSpouseName || '_______________');
        content = content.replace(/\[CONYUGE_DNI\]/g, propertyDetails?.ownerSpouseDni || '_______________');
        content = content.replace(/\[DIA\]/g, currentDay);
        content = content.replace(/\[MES\]/g, currentMonth);
        content = content.replace(/\[AÑO\]/g, currentYear);

        setContractContent(content);
        setStep(3);
    };

    const handleSaveContract = async () => {
        setSaving(true);
        try {
            // Register outcome in visit
            await updateDoc(doc(db, "visits", visit.id), {
                outcome: 'tomó la propiedad',
                outcomeDetails: {
                    operationType,
                    documentType: selectedDocType
                }
            });

            // Save contract record
            const contractData = {
                visitId: visit.id,
                propertyId: visit.propertyId,
                agentId: agent.uid,
                clientName: clientData.name,
                clientEmail: clientData.email,
                clientPhone: clientData.phone,
                clientDni: clientData.dni,
                operationType,
                documentType: selectedDocType,
                content: contractContent,
                createdAt: new Date().toISOString()
            };

            await addDoc(collection(db, "contracts"), contractData);
            toast.success("Contrato generado y guardado.");
            if (onContractsUpdated) onContractsUpdated();
            setStep(4); // Success step
        } catch (error) {
            console.error(error);
            toast.error("Error al generar contrato");
        } finally {
            setSaving(false);
        }
    };

    const handleGenerateDocx = async () => {
        setGeneratingDocx(true);
        try {
            const response = await fetch(selectedTemplate.templateFileUrl);
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();

            const zip = new PizZip(arrayBuffer);
            const docFile = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
                delimiters: { start: '[', end: ']' },
            });

            const now = new Date();
            const currentDay = now.getDate();
            const currentMonth = now.toLocaleString('es-ES', { month: 'long' });
            const currentYear = now.getFullYear();

            docFile.render({
                AGENTE_NOMBRE: agent.displayName || '',
                CLIENTE_NOMBRE: clientData.name || '',
                COMPRADOR_NOMBRE: clientData.name || '',
                CLIENTE_DNI: clientData.dni || '',
                COMPRADOR_DNI: clientData.dni || '',
                CLIENTE_TELEFONO: clientData.phone || '',
                COMPRADOR_TELEFONO: clientData.phone || '',
                CLIENTE_CORREO: clientData.email || '',
                COMPRADOR_CORREO: clientData.email || '',
                INMUEBLE_TITULO: visit.propertyTitle || '',
                INMUEBLE_DIRECCION: propertyDetails?.address || propertyDetails?.location || '',
                PRECIO: propertyDetails?.price ? propertyDetails.price.toString() : '',
                MONEDA: propertyDetails?.currency || 'USD',
                PROPIETARIO_NOMBRES: propertyDetails?.ownerName || '',
                PROPIETARIO_DNI: propertyDetails?.ownerDni || '',
                CONYUGE_NOMBRES: propertyDetails?.ownerSpouseName || '',
                CONYUGE_DNI: propertyDetails?.ownerSpouseDni || '',
                DIA: currentDay,
                MES: currentMonth,
                AÑO: currentYear
            });

            const generatedDoc = docFile.getZip().generate({
                type: 'blob',
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            });

            const cleanClientName = (clientData.name || 'Cliente').replace(/\s+/g, '_');
            saveAs(generatedDoc, `Contrato_${cleanClientName}_${selectedDocType.replace(' ', '_')}.docx`);

            toast.success("Contrato Word generado y descargado exitosamente");

            await updateDoc(doc(db, "visits", visit.id), {
                outcome: 'tomó la propiedad',
                outcomeDetails: {
                    operationType,
                    documentType: selectedDocType
                }
            });

            const contractData = {
                visitId: visit.id,
                propertyId: visit.propertyId,
                agentId: agent.uid,
                clientName: clientData.name,
                clientEmail: clientData.email,
                clientPhone: clientData.phone,
                clientDni: clientData.dni,
                operationType,
                documentType: selectedDocType,
                templateUsed: selectedTemplate.title,
                isDocx: true,
                createdAt: new Date().toISOString()
            };

            await addDoc(collection(db, "contracts"), contractData);

            if (onContractsUpdated) onContractsUpdated();
            setStep(4);

        } catch (error) {
            console.error("Error generating docx:", error);
            toast.error("Error al generar el documento Word. Verifica las variables de la plantilla.");
        } finally {
            setGeneratingDocx(false);
        }
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Contrato - ${visit.clientName}</title>
                    <style>
                        body { font-family: 'Times New Roman', serif; padding: 40px; line-height: 1.6; white-space: pre-wrap; font-size: 14pt; }
                    </style>
                </head>
                <body>${contractContent}</body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                            <FileText className="w-5 h-5 text-[#fc7f51]" /> Generar Contrato
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">Visita: {visit.propertyTitle} - {visit.clientName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-800 bg-white rounded-full shadow-sm">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {step === 1 && (
                        <div className="max-w-xl mx-auto space-y-8 py-8">
                            <div className="text-center mb-6">
                                <h3 className="text-2xl font-bold text-gray-800 mb-2">Paso 1: Define el Trato</h3>
                                <p className="text-gray-500">Completa o verifica los datos y selecciona la operación.</p>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-white border-2 border-gray-100 p-5 rounded-2xl shadow-sm">
                                    <h4 className="font-bold text-gray-800 mb-3 text-sm flex items-center gap-2"><User className="w-4 h-4 text-[#fc7f51]" /> Datos del Cliente a Autocompletar</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Nombre Completo: [CLIENTE_NOMBRE]</label>
                                            <input type="text" value={clientData.name} onChange={e => setClientData({ ...clientData, name: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm outline-none focus:border-[#fc7f51] focus:bg-white transition" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">DNI / CE: [CLIENTE_DNI]</label>
                                            <input type="text" value={clientData.dni} onChange={e => setClientData({ ...clientData, dni: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-orange-50 border border-orange-200 text-sm outline-none focus:border-[#fc7f51] focus:bg-white transition font-bold" placeholder="Completar DNI" />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Operación del Inmueble</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {['venta', 'alquiler', 'anticresis'].map(op => (
                                            <button
                                                key={op}
                                                onClick={() => setOperationType(op)}
                                                className={`py-3 px-4 rounded-xl border-2 font-bold capitalize transition ${operationType === op ? 'border-[#fc7f51] bg-orange-50 text-[#fc7f51]' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                            >
                                                {op}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Documento a Generar</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <button onClick={() => setSelectedDocType('reserva')} className={`py-3 px-4 rounded-xl border-2 font-bold transition flex items-center justify-center gap-2 ${selectedDocType === 'reserva' ? 'border-[#fc7f51] bg-[#fc7f51] text-white shadow-md' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>Reserva</button>

                                        {operationType === 'venta' && (
                                            <button onClick={() => setSelectedDocType('arras')} className={`py-3 px-4 rounded-xl border-2 font-bold transition flex items-center justify-center gap-2 ${selectedDocType === 'arras' ? 'border-[#fc7f51] bg-[#fc7f51] text-white shadow-md' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>Arras</button>
                                        )}

                                        <button onClick={() => setSelectedDocType('contrato final')} className={`py-3 px-4 rounded-xl border-2 font-bold transition flex items-center justify-center gap-2 ${selectedDocType === 'contrato final' ? 'border-[#fc7f51] bg-[#fc7f51] text-white shadow-md' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>Contrato Final</button>
                                    </div>
                                    {operationType === 'anticresis' && <p className="text-xs text-orange-600 mt-2">* Recuerda que en anticresis solo aplica Reserva o el Contrato Final.</p>}
                                </div>
                            </div>

                            <button
                                onClick={handleSearchTemplates}
                                disabled={loadingTemplates}
                                className="w-full mt-8 bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-black transition flex justify-center items-center gap-2"
                            >
                                {loadingTemplates ? <Loader2 className="animate-spin w-5 h-5" /> : 'Buscar Plantillas'} <ChevronRight className="w-5 h-5" />
                            </button>
                        </div >
                    )
                    }

                    {
                        step === 2 && (
                            <div className="space-y-6">
                                <h3 className="text-xl font-bold text-gray-800">Paso 2: Selecciona una Plantilla</h3>
                                <p className="text-gray-500">Plantillas para <b>{operationType}</b> - <b>{selectedDocType}</b></p>

                                {templates.length === 0 ? (
                                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                        <p className="text-gray-500 font-medium tracking-wide">No se encontraron plantillas para esta configuración.</p>
                                        <p className="text-sm text-gray-400 mt-2">Ve a la pestaña "Contratos" en tu panel para crear una nueva plantilla.</p>
                                        <button onClick={() => setStep(1)} className="mt-4 text-[#fc7f51] font-bold hover:underline">Volver atrás</button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {templates.map(tpl => (
                                            <button
                                                key={tpl.id}
                                                onClick={() => handleSelectTemplate(tpl)}
                                                className="text-left p-6 rounded-xl border-2 border-gray-200 hover:border-[#fc7f51] hover:bg-orange-50 transition group flex flex-col h-full"
                                            >
                                                <span className="bg-white border border-gray-100 shadow-sm text-xs font-bold text-gray-500 px-3 py-1 rounded-full mb-3 w-fit">{tpl.operationType.toUpperCase()} - {tpl.documentType.toUpperCase()}</span>
                                                <h4 className="font-bold text-gray-900 text-lg group-hover:text-[#fc7f51] transition">{tpl.title}</h4>
                                                <p className="text-sm text-gray-500 mt-2 line-clamp-3 leading-relaxed">{tpl.content.substring(0, 100)}...</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    }

                    {
                        step === 3 && (
                            selectedTemplate?.templateFileUrl ? (
                                <div className="text-center py-12 px-6">
                                    <div className="bg-blue-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <FileText className="w-12 h-12 text-blue-500" />
                                    </div>
                                    <h3 className="text-2xl font-bold mb-3 text-gray-800">Plantilla Word Seleccionada</h3>
                                    <p className="text-gray-600 mb-6 font-medium bg-blue-100/50 border border-blue-100 px-5 py-2.5 rounded-xl inline-block text-blue-800 shadow-sm">{selectedTemplate.templateFileName}</p>

                                    <p className="text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">Haz clic abajo para autocompletar todas las variables con los datos del visitante y descargar el archivo Word original listo para firmar o editar libremente.</p>

                                    <button
                                        onClick={handleGenerateDocx}
                                        disabled={generatingDocx}
                                        className="mx-auto bg-[#fc7f51] text-white px-8 py-4 rounded-xl font-bold hover:bg-[#e56b3e] shadow-lg shadow-orange-500/20 transition flex items-center gap-3 text-lg"
                                    >
                                        {generatingDocx ? <Loader2 className="animate-spin w-6 h-6" /> : <Download className="w-6 h-6" />} {generatingDocx ? 'Generando Contrato...' : 'Autocompletar y Descargar Word'}
                                    </button>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col space-y-4">
                                    <h3 className="text-xl font-bold text-gray-800">Paso 3: Verifica y Edita las Cláusulas</h3>
                                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-xl text-sm flex gap-3">
                                        <div><FileText className="w-5 h-5 text-yellow-600" /></div>
                                        <div>Revisa la información autocompletada. Puedes editar cualquier parte del texto antes de generar el documento final. Los espacios con "_______________" deberás llenarlos según el acuerdo.</div>
                                    </div>
                                    <textarea
                                        className="flex-1 w-full bg-white border-2 border-gray-200 focus:border-[#fc7f51] outline-none rounded-xl p-6 font-mono text-sm leading-relaxed resize-none shadow-inner min-h-[400px]"
                                        value={contractContent}
                                        onChange={e => setContractContent(e.target.value)}
                                    />
                                </div>
                            )
                        )
                    }

                    {
                        step === 4 && (
                            <div className="text-center py-16 px-4">
                                <CheckCircle2 className="w-24 h-24 text-green-500 mx-auto mb-6" />
                                <h3 className="text-3xl font-bold text-gray-900 mb-2">¡Trato Cerrado y Contrato Generado!</h3>
                                <p className="text-gray-500 max-w-md mx-auto mb-8">El documento se ha guardado en la base de datos y la visita ha sido marcada como exitosa.</p>

                                <div className="flex justify-center gap-4">
                                    <button onClick={onClose} className="px-6 py-3 font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition">
                                        Cerrar y Volver
                                    </button>
                                    <button onClick={handlePrint} className="px-6 py-3 font-bold text-white bg-[#fc7f51] hover:bg-[#e56b3e] shadow-lg shadow-orange-500/20 rounded-xl transition flex items-center gap-2">
                                        <Printer className="w-5 h-5" /> Imprimir Contrato
                                    </button>
                                </div>
                            </div>
                        )
                    }
                </div >

                {step === 3 && !selectedTemplate?.templateFileUrl && (
                    <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                        <button onClick={() => setStep(2)} className="text-gray-500 font-bold px-4 py-2 hover:bg-gray-200 rounded-lg transition">Volver Atrás</button>
                        <button
                            onClick={handleSaveContract}
                            disabled={saving}
                            className="bg-[#fc7f51] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#e56b3e] shadow-lg shadow-orange-500/20 transition flex items-center gap-2"
                        >
                            {saving ? <Loader2 className="animate-spin w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />} Guardar y Emitir
                        </button>
                    </div>
                )}
                {step === 3 && selectedTemplate?.templateFileUrl && (
                    <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                        <button onClick={() => setStep(2)} className="text-gray-500 font-bold px-4 py-2 hover:bg-gray-200 rounded-lg transition">Volver Atrás</button>
                    </div>
                )}
            </div >
        </div >
    );
}
