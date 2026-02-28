import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import PropertyDetail from './pages/PropertyDetail';
import About from './pages/About';
import Contact from './pages/Contact';
import SearchResults from './pages/SearchResults';
import Tips from './pages/Tips';
import TipDetail from './pages/TipDetail';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import AgentDashboard from './pages/AgentDashboard';
import ClientDashboard from './pages/ClientDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import Setup from './pages/Setup';

import Navbar from './components/Navbar';
import Footer from './components/Footer';

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { realUserData, roleOverride, setRoleOverride } = useAuth();

  const isSuperAdminRoute = location.pathname === '/superadmin';
  const isImpersonating = realUserData?.role === 'superadmin' && roleOverride;

  return (
    <div className={`flex flex-col min-h-screen ${isImpersonating ? 'pt-10' : ''}`}>
      {isImpersonating && (
        <div className="fixed top-0 left-0 w-full z-[100] bg-red-600 text-white text-xs font-bold px-4 py-2 flex justify-center items-center gap-4 shadow-xl">
          <span>⚠️ Modo de Prueba: Viendo como {roleOverride.toUpperCase()}</span>
          <button
            onClick={() => {
              setRoleOverride(null);
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
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/properties" element={<SearchResults />} />
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
