
import { motion } from "framer-motion";
import { User, Mail, Phone, Calendar, Clock, FileText, Upload, Check, X, AlertCircle } from "lucide-react";

const VisitCard = ({ visit, onApprove, onDeny, onGenerateContract, onUploadDraft, onOpenEditor }) => {
    const statusStyles = {
        pending: "bg-amber-100 text-amber-700 border-amber-200",
        confirmed: "bg-green-100 text-green-700 border-green-200",
        cancelled: "bg-red-100 text-red-700 border-red-200"
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-gray-100 p-6 rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-orange-900/5 transition-all group relative overflow-hidden"
        >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-grow space-y-4">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="font-black text-gray-900 text-lg group-hover:text-[#fc7f51] transition-colors line-clamp-1">
                                {visit.propertyTitle}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${statusStyles[visit.status] || statusStyles.pending}`}>
                                    {visit.status === 'pending' ? 'Pendiente' : visit.status === 'confirmed' ? 'Aprobada' : 'Denegada'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3 text-gray-600">
                                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-orange-50 group-hover:text-[#fc7f51] transition-colors">
                                    <User className="w-4 h-4" />
                                </div>
                                <span className="font-bold text-sm">{visit.clientName}</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-500 pl-11">
                                <Mail className="w-3.5 h-3.5" />
                                <span className="text-xs font-medium">{visit.clientEmail}</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-500 pl-11">
                                <Phone className="w-3.5 h-3.5" />
                                <span className="text-xs font-medium">{visit.clientPhone}</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-3 text-[#fc7f51]">
                                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                                    <Calendar className="w-4 h-4" />
                                </div>
                                <span className="font-black text-sm">{visit.visitDate}</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-500 pl-11">
                                <Clock className="w-3.5 h-3.5" />
                                <span className="text-xs font-bold">{visit.visitTime}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-row md:flex-col gap-2 items-center md:items-end justify-end border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 min-w-[180px]">
                    {visit.status === 'pending' ? (
                        <div className="flex flex-wrap gap-2 justify-end w-full">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => onApprove(visit.id)}
                                className="flex-1 md:w-full bg-green-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-green-600 shadow-lg shadow-green-500/20 transition flex items-center justify-center gap-2"
                            >
                                <Check className="w-4 h-4" /> Aprobar
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => onDeny(visit.id)}
                                className="flex-1 md:w-full bg-white border border-red-200 text-red-500 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-red-50 transition flex items-center justify-center gap-2"
                            >
                                <X className="w-4 h-4" /> Denegar
                            </motion.button>
                        </div>
                    ) : visit.status === 'confirmed' ? (
                        <div className="flex flex-col gap-2 w-full">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => onGenerateContract(visit)}
                                className="w-full bg-[#16151a] text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-black shadow-lg transition flex items-center justify-center gap-2"
                            >
                                <FileText className="w-4 h-4 text-[#fc7f51]" /> Generar Contrato
                            </motion.button>
                            
                            <div className="grid grid-cols-2 gap-2">
                                <label className="cursor-pointer bg-orange-50 text-[#fc7f51] hover:bg-orange-100 px-3 py-2 rounded-xl text-[10px] font-black uppercase text-center transition flex items-center justify-center gap-1.5 border border-orange-100">
                                    <Upload className="w-3.5 h-3.5" /> Subir
                                    <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => onUploadDraft(visit, e.target.files[0])} />
                                </label>
                                <button
                                    onClick={() => onOpenEditor(visit)}
                                    className="bg-gray-50 text-gray-500 hover:bg-gray-100 px-3 py-2 rounded-xl text-[10px] font-black uppercase text-center transition flex items-center justify-center gap-1.5 border border-gray-200"
                                >
                                    <FileText className="w-3.5 h-3.5" /> Editor
                                </button>
                            </div>

                            {visit.contractDraftUrl && (
                                <a 
                                    href={visit.contractDraftUrl} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="text-[10px] font-black text-green-600 uppercase tracking-widest text-center mt-1 p-2 bg-green-50 rounded-lg hover:bg-green-100 transition truncate"
                                >
                                    Documento Listo
                                </a>
                            )}
                        </div>
                    ) : (
                        <div className="text-center w-full py-2 px-4 bg-gray-50 rounded-xl">
                            <AlertCircle className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sin acciones</span>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default VisitCard;
