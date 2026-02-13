import { Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
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

function App() {
  const location = useLocation();
  const isSuperAdminRoute = location.pathname === '/superadmin';

  return (
    <AuthProvider>
      <div className="flex flex-col min-h-screen">
        {!isSuperAdminRoute && <Navbar />}
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
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
    </AuthProvider>
  );
}

export default App;
