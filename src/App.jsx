import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import Loader from './components/Loader';

import Home from './pages/Home';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { getCanonicalUrl, setCanonicalUrl, setMetaName, setMetaProperty, setPageTitle } from './lib/seo';
import { SEO_LANDING_META, SEO_LANDING_PATHS } from './data/seoPageMeta';

const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const SearchResults = lazy(() => import('./pages/SearchResults'));
const PropertyDetail = lazy(() => import('./pages/PropertyDetail'));
const Tips = lazy(() => import('./pages/Tips'));
const TipDetail = lazy(() => import('./pages/TipDetail'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Setup = lazy(() => import('./pages/Setup'));
const AgentDashboard = lazy(() => import('./pages/AgentDashboard'));
const ClientDashboard = lazy(() => import('./pages/ClientDashboard'));
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard'));
const SeoLandingPage = lazy(() => import('./pages/SeoLandingPage'));
const NotFound = lazy(() => import('./pages/NotFound'));

const STATIC_PAGE_META = {
  '/': {
    title: 'Inmobiliaria en Arequipa | Casas y departamentos | Inmuévete',
    description: 'Compra, vende o alquila casas, departamentos y terrenos en Arequipa con asesoría inmobiliaria especializada y propiedades verificadas.'
  },
  '/properties': {
    title: 'Propiedades en venta y alquiler en Arequipa | Inmuévete',
    description: 'Explora casas, departamentos, terrenos y locales disponibles en Arequipa. Compara precios, ubicación y características en una sola plataforma.'
  },
  '/about': {
    title: 'Inmuévete: inmobiliaria y asesoría en Arequipa',
    description: 'Conoce a Inmuévete Inmobiliaria y nuestro servicio de asesoría para comprar, vender, alquilar e invertir en propiedades en Arequipa.'
  },
  '/contact': {
    title: 'Contacta una inmobiliaria en Arequipa | Inmuévete',
    description: 'Habla con un asesor inmobiliario en Arequipa para comprar, vender o alquilar una propiedad. Atención personalizada por WhatsApp.'
  },
  '/tips': {
    title: 'Blog inmobiliario de Arequipa | Guías y consejos',
    description: 'Guías para comprar, vender, alquilar e invertir en propiedades en Arequipa. Consejos inmobiliarios claros del equipo de Inmuévete.'
  }
};

const NOINDEX_PATHS = new Set([
  '/search', '/login', '/register', '/forgot-password', '/setup',
  '/agent-dashboard', '/client-dashboard', '/superadmin'
]);

function RouteCanonicalMeta() {
  const { pathname } = useLocation();
  const isPropertyDetail = /^\/properties?\/[^/]+\/?$/.test(pathname);
  const isTipDetail = /^\/tips\/[^/]+\/?$/.test(pathname);

  useEffect(() => {
    if (isPropertyDetail || isTipDetail) return;

    const canonicalUrl = getCanonicalUrl(pathname);
    const pageMeta = SEO_LANDING_META[pathname] || STATIC_PAGE_META[pathname];
    const shouldNoindex = NOINDEX_PATHS.has(pathname) || !pageMeta;

    setCanonicalUrl(canonicalUrl);
    setMetaName('robots', shouldNoindex ? 'noindex, follow' : 'index, follow, max-image-preview:large');
    setMetaProperty('og:type', 'website');
    setMetaProperty('og:url', canonicalUrl);
    setMetaProperty('twitter:url', canonicalUrl);

    if (pageMeta) {
      const title = pageMeta.metaTitle || pageMeta.title;
      setPageTitle(title);
      setMetaName('description', pageMeta.description);
      setMetaProperty('og:title', title);
      setMetaProperty('og:description', pageMeta.description);
      setMetaProperty('og:image', 'https://inmueveteinmobiliaria.com/hero-bg.webp');
      setMetaProperty('twitter:title', title);
      setMetaProperty('twitter:description', pageMeta.description);
      setMetaProperty('twitter:image', 'https://inmueveteinmobiliaria.com/hero-bg.webp');
    } else if (NOINDEX_PATHS.has(pathname)) {
      setPageTitle('Acceso | Inmuévete Inmobiliaria');
      setMetaName('description', 'Acceso a las herramientas de Inmuévete Inmobiliaria.');
    } else {
      setPageTitle('Página no encontrada | Inmuévete');
      setMetaName('description', 'La página solicitada no está disponible.');
    }
  }, [isPropertyDetail, isTipDetail, pathname]);

  return null;
}

// Page transition loader - shows on every route change
function PageLoader() {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    const showTimer = setTimeout(() => setIsLoading(true), 0);
    const hideTimer = setTimeout(() => setIsLoading(false), 600);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [location.pathname]);

  if (!isLoading) return null;
  return <Loader fullScreen />;
}

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  
  return null;
}

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { realUserData, roleOverride, setRoleOverride, impersonatedUser, setImpersonatedUser, userData } = useAuth();

  const isSuperAdminRoute = location.pathname === '/superadmin';
  const isImpersonating = realUserData?.role === 'superadmin' && (roleOverride || impersonatedUser);

  return (
    <div className={`flex flex-col min-h-screen ${isImpersonating ? 'pt-10' : ''}`}>
      <RouteCanonicalMeta />
      <ScrollToTop />
      <PageLoader />

      {isImpersonating && (
        <div className="fixed top-0 left-0 w-full z-[100] bg-red-600 text-white text-xs font-bold px-4 py-2 flex justify-center items-center gap-4 shadow-xl">
          <span>⚠️ Modo de Prueba: Viendo como {roleOverride?.toUpperCase()} {impersonatedUser ? `(${userData?.displayName || userData?.email})` : ''}</span>
          <button
            onClick={() => {
              setRoleOverride(null);
              setImpersonatedUser(null);
              navigate('/superadmin');
            }}
            className="bg-white text-red-600 px-3 py-1 rounded-full hover:bg-red-50 transition"
          >
            Volver a SuperAdmin
          </button>
        </div>
      )}

      {!isSuperAdminRoute && <Navbar />}
      <main className="flex-grow">
          <div key={location.pathname}>
            <Suspense fallback={<Loader fullScreen />}>
              <Routes location={location}>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/properties" element={<SearchResults />} />
                <Route path="/property/:id" element={<PropertyDetail />} />
                <Route path="/properties/:id" element={<PropertyDetail />} />
                <Route path="/search" element={<SearchResults />} />
                <Route path="/tips" element={<Tips />} />
                <Route path="/tips/:id" element={<TipDetail />} />
                {SEO_LANDING_PATHS.map((path) => (
                  <Route key={path} path={path} element={<SeoLandingPage />} />
                ))}

                {/* Authentication Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/setup" element={<Setup />} />

                {/* Protected Routes */}
                <Route
                  path="/agent-dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['agente']}>
                      <AgentDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/client-dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['cliente']}>
                      <ClientDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/superadmin"
                  element={
                    <ProtectedRoute allowedRoles={['superadmin']}>
                      <SuperAdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </div>
      </main>
      {!isSuperAdminRoute && <Footer />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
