import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, CheckCircle, Home, MapPin, MessageCircle } from 'lucide-react';
import PropertyCard from '../components/PropertyCard';
import Loader from '../components/Loader';
import { SEO_LANDING_PAGES } from '../data/seoLandingPages';

const AREQUIPA_LOCATIONS = [
  'arequipa', 'cayma', 'yanahuara', 'cerro colorado', 'sachaca',
  'jose luis bustamante', 'paucarpata', 'socabaya', 'miraflores',
  'alto selva alegre', 'mariano melgar', 'tiabaya', 'characato',
  'la joya', 'yura', 'uchumayo', 'mollebaya', 'jacobo hunter'
];

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export default function SeoLandingPage() {
  const { pathname } = useLocation();
  const page = SEO_LANDING_PAGES[pathname];
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadProperties() {
      try {
        const [{ db }, { collection, getDocs }] = await Promise.all([
          import('../lib/firebase'),
          import('firebase/firestore')
        ]);
        const snapshot = await getDocs(collection(db, 'properties'));
        const results = snapshot.docs
          .map((document) => ({ id: document.id, ...document.data() }))
          .filter((property) => property.status === 'disponible');

        if (!cancelled) setProperties(results);
      } catch (error) {
        console.error('Error loading SEO landing properties:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProperties();
    return () => { cancelled = true; };
  }, []);

  const filteredProperties = useMemo(() => {
    if (!page) return [];

    return properties.filter((property) => {
      const operationMatches = !page.operation || normalize(property.type) === normalize(page.operation);
      const category = normalize(property.category);
      const categoryMatches = !page.categories || page.categories.some((item) => category.includes(normalize(item)));
      const locationText = normalize(`${property.location || ''} ${property.address || ''}`);
      const locationMatches = AREQUIPA_LOCATIONS.some((location) => locationText.includes(location));
      return operationMatches && categoryMatches && locationMatches;
    });
  }, [page, properties]);

  if (!page) return null;

  const relatedPages = Object.entries(SEO_LANDING_PAGES)
    .filter(([path]) => path !== pathname)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-white text-[#262626]">
      <header className="bg-[#16151a] text-white pt-32 pb-16">
        <div className="container mx-auto px-6">
          <nav aria-label="Migas de pan" className="flex items-center gap-2 text-sm text-gray-300 mb-8">
            <Link to="/" className="hover:text-white">Inicio</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{page.title}</span>
          </nav>
          <span className="text-[#fc7f51] font-black uppercase tracking-widest text-xs">{page.eyebrow}</span>
          <h1 className="text-4xl md:text-6xl font-black mt-3 max-w-4xl leading-tight">{page.title}</h1>
          <p className="text-gray-200 text-lg md:text-xl mt-6 max-w-3xl leading-relaxed">{page.intro}</p>
          <div className="flex flex-wrap gap-3 mt-8 text-sm font-bold">
            <span className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full"><MapPin className="w-4 h-4 text-[#fc7f51]" /> Arequipa, Perú</span>
            <span className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full"><CheckCircle className="w-4 h-4 text-[#fc7f51]" /> Propiedades disponibles</span>
          </div>
        </div>
      </header>

      <div>
        <section aria-labelledby="available-properties" className="container mx-auto px-6 py-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <span className="text-[#fc7f51] text-xs font-black uppercase tracking-widest">Inventario actualizado</span>
              <h2 id="available-properties" className="text-3xl md:text-4xl font-black mt-2">Propiedades disponibles</h2>
            </div>
            <Link to="/properties" className="inline-flex items-center gap-2 font-bold text-[#fc7f51] hover:underline">
              Ver todas las propiedades <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <Loader />
          ) : filteredProperties.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {filteredProperties.slice(0, 12).map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          ) : (
            <div className="bg-orange-50 border border-orange-100 rounded-3xl p-8 md:p-12 text-center">
              <Home className="w-12 h-12 text-[#fc7f51] mx-auto mb-4" />
              <h2 className="text-2xl font-black">Estamos incorporando nuevas opciones</h2>
              <p className="text-gray-600 mt-3 max-w-2xl mx-auto">Cuéntanos qué inmueble buscas y te avisaremos cuando tengamos una alternativa que coincida con tus necesidades.</p>
              <Link to="/contact" className="inline-flex items-center gap-2 mt-6 bg-[#fc7f51] text-white px-6 py-3 rounded-xl font-black">
                <MessageCircle className="w-5 h-5" /> Solicitar asesoría
              </Link>
            </div>
          )}
        </section>

        <section aria-labelledby="local-guide" className="bg-gray-50 py-16">
          <div className="container mx-auto px-6 grid lg:grid-cols-2 gap-12">
            <div>
              <span className="text-[#fc7f51] text-xs font-black uppercase tracking-widest">Guía local</span>
              <h2 id="local-guide" className="text-3xl font-black mt-2 mb-6">Cómo elegir una propiedad en Arequipa</h2>
              <p className="text-gray-700 leading-relaxed">{page.details}</p>
              <Link to="/contact" className="inline-flex items-center gap-2 mt-8 text-[#fc7f51] font-black hover:underline">
                Hablar con un asesor <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-4">
              {page.faq.map(([question, answer]) => (
                <article key={question} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                  <h3 className="font-black text-lg">{question}</h3>
                  <p className="text-gray-600 leading-relaxed mt-2">{answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="related-searches" className="container mx-auto px-6 py-16">
          <h2 id="related-searches" className="text-2xl font-black mb-6">Otras búsquedas de inmuebles en Arequipa</h2>
          <div className="flex flex-wrap gap-3">
            {relatedPages.map(([path, related]) => (
              <Link key={path} to={path} className="border border-gray-200 rounded-full px-5 py-3 font-bold text-sm hover:border-[#fc7f51] hover:text-[#fc7f51] transition">
                {related.title}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
