import { ArrowLeft, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-gray-50 px-6 pt-28 pb-16 text-center">
      <div className="max-w-xl">
        <span className="text-[#fc7f51] text-sm font-black uppercase tracking-widest">Error 404</span>
        <h1 className="text-4xl md:text-5xl font-black mt-3">Esta página no está disponible</h1>
        <p className="text-gray-600 mt-5 leading-relaxed">La dirección puede haber cambiado o el contenido ya no existe. Puedes volver al inicio o revisar las propiedades disponibles.</p>
        <div className="flex flex-col sm:flex-row justify-center gap-3 mt-8">
          <Link to="/" className="inline-flex items-center justify-center gap-2 bg-[#16151a] text-white px-6 py-3 rounded-xl font-black">
            <Home className="w-4 h-4" /> Ir al inicio
          </Link>
          <Link to="/properties" className="inline-flex items-center justify-center gap-2 border border-gray-300 px-6 py-3 rounded-xl font-black">
            <ArrowLeft className="w-4 h-4" /> Ver propiedades
          </Link>
        </div>
      </div>
    </div>
  );
}
