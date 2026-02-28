import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, UserCircle, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png'; // Import the logo image
import { PERU_LOCATIONS } from '../data/locations';
import { MapPin } from 'lucide-react';

import ExchangeRate from './ExchangeRate';

const Navbar = () => {
    const { user, userData, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Suggestions state
    const [filteredLocations, setFilteredLocations] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const isAboutPage = location.pathname === '/about';

    const handleSearch = (term = searchTerm) => {
        if (term.trim()) {
            navigate(`/search?location=${encodeURIComponent(term)}`);
            setShowSuggestions(false);
        }
    };

    const handleLocationChange = (val) => {
        setSearchTerm(val);
        if (val.length > 0) {
            const filtered = PERU_LOCATIONS.filter(loc =>
                loc.name.toLowerCase().includes(val.toLowerCase()) ||
                loc.label.toLowerCase().includes(val.toLowerCase())
            ).slice(0, 5);
            setFilteredLocations(filtered);
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    };

    const selectLocation = (loc) => {
        setSearchTerm(loc.label);
        setShowSuggestions(false);
        handleSearch(loc.label);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    return (
        <nav className="fixed w-full z-50 bg-[#16151a] border-b border-gray-800 shadow-lg">
            <div className="container mx-auto px-6 h-24 flex justify-between items-center">
                {/* Brand Logo */}
                <Link to="/" className="flex items-center gap-2 group">
                    <img
                        src={logo}
                        alt="Inmuévete"
                        className="h-10 md:h-12 w-auto object-contain"
                    />
                    <span className="text-2xl font-bold text-[#fc7f51] tracking-tight hidden md:block">
                        Inmuévete
                    </span>
                </Link>

                {/* Search Bar (Desktop) */}
                <div className="hidden lg:relative lg:flex items-center bg-white rounded-full flex-1 mx-4 max-w-[420px] py-1.5 pl-4 pr-1.5 shadow-xl hover:shadow-orange-500/5 transition cursor-pointer gap-2">
                    <input
                        type="text"
                        placeholder="Buscar por zona, ciudad o tipo..."
                        className="bg-transparent border-none outline-none text-[#262626] placeholder-gray-400 flex-1 font-medium text-sm"
                        value={searchTerm}
                        onChange={(e) => handleLocationChange(e.target.value)}
                        onFocus={() => searchTerm && setShowSuggestions(true)}
                        onKeyDown={handleKeyDown}
                    />
                    <div
                        className="bg-[#fc7f51] p-2.5 rounded-full text-white hover:bg-[#e56b3e] transition shadow-md"
                        onClick={() => handleSearch()}
                    >
                        <Search className="w-5 h-5" strokeWidth={2.5} />
                    </div>

                    {/* Suggestions Dropdown */}
                    {showSuggestions && filteredLocations.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[60] overflow-hidden py-2 animate-fadeIn">
                            {filteredLocations.map((loc, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => selectLocation(loc)}
                                    className="px-6 py-3 hover:bg-orange-50 cursor-pointer flex items-center gap-3 text-gray-700 font-medium text-sm transition"
                                >
                                    <MapPin className="w-4 h-4 text-[#fc7f51]" />
                                    {loc.label}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Actions (Desktop) */}
                <div className="hidden lg:flex items-center gap-2 xl:gap-4 whitespace-nowrap">
                    <ExchangeRate />
                    <div className="flex items-center gap-3 xl:gap-6">
                        <Link to="/" className="text-sm font-bold text-gray-200 hover:text-[#fc7f51] transition uppercase tracking-wide">Propiedades</Link>
                        {userData?.role !== 'agente' && (
                            <>
                                <Link to="/tips" className="text-sm font-bold text-gray-200 hover:text-[#fc7f51] transition uppercase tracking-wide">Blog</Link>
                                <Link to="/about" className="text-sm font-bold text-gray-200 hover:text-[#fc7f51] transition uppercase tracking-wide">Nosotros</Link>
                                <Link to="/contact" className="text-sm font-bold text-gray-200 hover:text-[#fc7f51] transition uppercase tracking-wide">Contacto</Link>
                            </>
                        )}
                    </div>

                    {user ? (
                        <div className="flex items-center gap-4">
                            <Link
                                to={userData?.role === 'agente' ? '/agent-dashboard' : '/client-dashboard'}
                                className="text-white hover:text-[#fc7f51] transition font-medium mr-2"
                            >
                                Hola, {user.displayName ? user.displayName.split(' ')[0] : (userData?.role === 'agente' ? 'Agente' : 'Usuario')}
                            </Link>
                            <button
                                onClick={logout}
                                className="bg-[#262626] border border-gray-600 text-white px-4 py-2 rounded-full text-sm hover:bg-gray-800 transition"
                            >
                                Salir
                            </button>
                            <Link to={userData?.role === 'agente' ? '/agent-dashboard' : '/client-dashboard'}>
                                <div className="bg-gray-600 rounded-full p-0.5 cursor-pointer">
                                    <UserCircle className="w-8 h-8 text-white fill-gray-600" />
                                </div>
                            </Link>
                        </div>
                    ) : (
                        <Link
                            to="/login"
                            className="bg-[#fc7f51] hover:bg-[#e56b3e] text-white px-6 py-2 rounded-full font-bold transition shadow-lg shadow-orange-500/20"
                        >
                            Ingresar
                        </Link>
                    )}
                </div>

                {/* Mobile Menu Button */}
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="lg:hidden text-white p-2 hover:bg-gray-800 rounded-lg transition"
                >
                    {isMobileMenuOpen ? <X className="w-8 h-8" /> : <Menu className="w-8 h-8" />}
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="lg:hidden bg-[#16151a] border-t border-gray-800 absolute w-full left-0 top-24 min-h-[calc(100vh-96px)] p-6 animate-fadeIn">
                    <div className="flex flex-col gap-6">
                        {/* Mobile Search */}
                        <div className="flex items-center bg-white rounded-full py-2 pl-4 pr-2 shadow-lg mb-4">
                            <input
                                type="text"
                                placeholder="Buscar..."
                                className="bg-transparent border-none outline-none text-[#262626] placeholder-gray-400 flex-1 font-medium text-sm w-full"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleSearch();
                                        setIsMobileMenuOpen(false);
                                    }
                                }}
                            />
                            <div
                                className="bg-[#fc7f51] p-2 rounded-full text-white"
                                onClick={() => {
                                    handleSearch();
                                    setIsMobileMenuOpen(false);
                                }}
                            >
                                <Search className="w-4 h-4" strokeWidth={2.5} />
                            </div>
                        </div>

                        {/* Navigation Links */}
                        <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-bold text-gray-200 hover:text-[#fc7f51] py-2 border-b border-gray-800">Propiedades</Link>
                        <Link to="/tips" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-bold text-gray-200 hover:text-[#fc7f51] py-2 border-b border-gray-800">Blog</Link>
                        {userData?.role !== 'agente' && (
                            <>
                                <Link to="/about" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-bold text-gray-200 hover:text-[#fc7f51] py-2 border-b border-gray-800">Nosotros</Link>
                                <Link to="/contact" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-bold text-gray-200 hover:text-[#fc7f51] py-2 border-b border-gray-800">Contacto</Link>
                            </>
                        )}

                        {/* User Actions */}
                        {user ? (
                            <div className="flex flex-col gap-4 mt-4">
                                <Link
                                    to={userData?.role === 'agente' ? '/agent-dashboard' : '/client-dashboard'}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="text-white hover:text-[#fc7f51] font-medium flex items-center gap-2"
                                >
                                    <UserCircle className="w-6 h-6" />
                                    Hola, {user.displayName || (userData?.role === 'agente' ? 'Agente' : 'Usuario')}
                                </Link>
                                <button
                                    onClick={() => {
                                        logout();
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className="bg-[#262626] border border-gray-600 text-white w-full py-3 rounded-xl font-bold hover:bg-gray-800 transition"
                                >
                                    Cerrar Sesión
                                </button>
                            </div>
                        ) : (
                            <Link
                                to="/login"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="bg-[#fc7f51] text-white w-full py-3 rounded-xl font-bold text-center mt-4 shadow-lg shadow-orange-500/20"
                            >
                                Ingresar
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
