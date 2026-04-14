import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';
import ExchangeRate from './ExchangeRate';

const Navbar = () => {
    const { user, userData, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // On pages without a dark hero (anything other than home), use frosted glass from the start
    const isHomePage = location.pathname === '/';
    // transparent → frosted glass when scrolled (home only) | always frosted on other pages
    const solidNav = !isHomePage || isScrolled;
    // Use fully opaque white only after scrolling on home; on other pages use light frosted
    const navBg = isHomePage
        ? isScrolled ? 'bg-white/95 backdrop-blur-lg shadow-lg border border-white/30' : 'bg-transparent'
        : 'bg-white/80 backdrop-blur-md shadow-sm border border-gray-100/80';
    const textDark = solidNav;

    const navLinks = [
        { name: 'Propiedades', path: '/' },
        { name: 'Blog', path: '/tips' },
        { name: 'Nosotros', path: '/about' },
        { name: 'Contacto', path: '/contact' },
    ];

    const isActive = (path) => location.pathname === path;

    const dashboardPath =
        userData?.role === 'agente'
            ? '/agent-dashboard'
            : userData?.role === 'superadmin'
            ? '/superadmin'
            : '/client-dashboard';

    return (
        <nav
            className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
                solidNav ? 'py-2 px-4' : 'py-5 px-6'
            }`}
        >
            <div
                className={`container mx-auto max-w-7xl flex items-center justify-between px-6 py-3 rounded-full transition-all duration-300 ${navBg}`}
            >
                {/* ── LOGO ── */}
                <Link to="/" className="flex items-center gap-2 shrink-0">
                    <img
                        src={logo}
                        alt="Inmuévete"
                        className="h-9 md:h-11 w-auto object-contain"
                    />
                </Link>

                {/* ── CENTRAL PILL MENU (desktop) ── */}
                <div
                    className={`hidden md:flex items-center gap-1 p-1 rounded-full transition-all duration-300 ${
                        solidNav
                            ? 'bg-gray-100/70'
                            : 'bg-white/10 backdrop-blur-md border border-white/10'
                    }`}
                >
                    {navLinks.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={`px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                                isActive(link.path)
                                    ? solidNav
                                        ? 'bg-white text-[#fc7f51] shadow-sm'
                                        : 'bg-white text-gray-900 shadow-lg scale-105'
                                    : solidNav
                                    ? 'text-gray-600 hover:text-[#fc7f51]'
                                    : 'text-white/80 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            {link.name}
                        </Link>
                    ))}
                </div>

                {/* ── RIGHT ACTIONS ── */}
                <div className="flex items-center gap-3">
                    {/* Exchange Rate (desktop only) */}
                    <div>
                        <ExchangeRate isScrolled={solidNav} />
                    </div>

                    {!user ? (
                        <div className="hidden md:flex items-center gap-2">
                            <Link
                                to="/login"
                                className={`px-5 py-2 text-sm font-bold transition rounded-full ${
                                    solidNav
                                        ? 'text-gray-600 hover:text-[#fc7f51]'
                                        : 'text-white/90 hover:text-white hover:bg-white/10'
                                }`}
                            >
                                Ingresar
                            </Link>
                            <Link
                                to="/register"
                                className="bg-[#fc7f51] hover:bg-[#e56b3e] text-white px-6 py-2.5 rounded-full text-sm font-black shadow-lg shadow-orange-500/25 transition-all hover:scale-105 active:scale-95"
                            >
                                Registrarse
                            </Link>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <span
                                className={`hidden lg:block text-sm font-bold ${
                                    solidNav ? 'text-gray-700' : 'text-white/90'
                                }`}
                            >
                                Hola,{' '}
                                {user.displayName
                                    ? user.displayName.split(' ')[0]
                                    : userData?.role === 'agente'
                                    ? 'Agente'
                                    : 'Usuario'}
                            </span>
                            <Link to={dashboardPath} className="group">
                                <div className="w-9 h-9 rounded-full bg-[#fc7f51] flex items-center justify-center text-white shadow-md group-hover:bg-[#e56b3e] transition">
                                    <User className="w-5 h-5" />
                                </div>
                            </Link>
                        </div>
                    )}

                    {/* Mobile hamburger */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className={`md:hidden p-2 rounded-full transition ${
                            solidNav
                                ? 'text-gray-900 bg-gray-100'
                                : 'text-white bg-white/10'
                        }`}
                    >
                        {isMobileMenuOpen ? (
                            <X className="w-6 h-6" />
                        ) : (
                            <Menu className="w-6 h-6" />
                        )}
                    </button>
                </div>
            </div>

            {/* ── MOBILE MENU ── */}
            {isMobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-[60] bg-white flex flex-col animate-fadeIn">
                    <div className="p-6 flex flex-col h-full">
                        {/* Header */}
                        <div className="flex justify-between items-center mb-10">
                            <img src={logo} alt="Inmuévete" className="h-10 w-auto object-contain" />
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="p-2 bg-gray-100 rounded-full"
                            >
                                <X className="w-6 h-6 text-gray-900" />
                            </button>
                        </div>

                        {/* Links */}
                        <div className="flex flex-col gap-6 flex-grow">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`text-2xl font-black ${
                                        isActive(link.path)
                                            ? 'text-[#fc7f51]'
                                            : 'text-gray-400 hover:text-gray-900'
                                    }`}
                                >
                                    {link.name}
                                </Link>
                            ))}
                        </div>

                        {/* Bottom Actions */}
                        {!user ? (
                            <div className="flex flex-col gap-3 pt-6 border-t border-gray-100">
                                <Link
                                    to="/login"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="w-full py-4 text-center font-bold text-gray-600 rounded-2xl border border-gray-200"
                                >
                                    Ingresar
                                </Link>
                                <Link
                                    to="/register"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="w-full py-4 text-center font-black bg-[#fc7f51] text-white rounded-2xl shadow-lg"
                                >
                                    Registrarse
                                </Link>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3 pt-6 border-t border-gray-100">
                                <Link
                                    to={dashboardPath}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="w-full py-4 text-center font-bold text-gray-700 rounded-2xl border border-gray-200"
                                >
                                    Mi Panel
                                </Link>
                                <button
                                    onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                                    className="w-full py-4 text-center font-black text-red-500 rounded-2xl border border-red-100"
                                >
                                    Cerrar Sesión
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
