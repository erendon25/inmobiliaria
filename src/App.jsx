import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import Loader from './components/Loader';
import { motion, AnimatePresence } from 'framer-motion';

import Home from './pages/Home';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { getCanonicalUrl, setCanonicalUrl, setMetaProperty } from './lib/seo';

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

function RouteCanonicalMeta() {
  const { pathname } = useLocation();
  const isPropertyDetail = /^\/properties?\/[^/]+\/?$/.test(pathname);

  useEffect(() => {
    if (isPropertyDetail) return;

    const canonicalUrl = getCanonicalUrl(pathname);
    setCanonicalUrl(canonicalUrl);
    setMetaProperty('og:url', canonicalUrl);
    setMetaProperty('twitter:url', canonicalUrl);
  }, [isPropertyDetail, pathname]);

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
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
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
              </Routes>
            </Suspense>
          </motion.div>
        </AnimatePresence>
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
