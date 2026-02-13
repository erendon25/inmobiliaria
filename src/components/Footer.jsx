import logo from '../assets/logo.png';
import { Facebook, Instagram } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="bg-[#16151a] text-white py-16">
            <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12">
                {/* Brand & Mission */}
                <div>
                    <div className="flex items-center gap-3 mb-6">
                        <img src={logo} alt="Inmuévete" className="h-12" />
                        <span className="text-2xl font-bold font-[Montserrat] text-white">Inmu<span className="text-[#fc7f51]">évete</span></span>
                    </div>
                    <p className="text-[#878787] text-sm leading-relaxed mb-6">
                        En Inmuevete trabajamos para conectar a las personas con el espacio ideal para vivir, invertir o crecer.
                        Brindamos soluciones inmobiliarias confiables, transparentes y accesibles.
                    </p>
                    <div className="flex gap-4">
                        <a
                            href="https://www.tiktok.com/@inmuevete?_r=1&_t=ZS-93tNDmlipvg"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 bg-[#262626] rounded-full flex items-center justify-center text-[#fc7f51] hover:bg-[#fc7f51] hover:text-white transition-colors duration-300"
                            aria-label="TikTok"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
                            </svg>
                        </a>
                        <a
                            href="https://www.instagram.com/inmuevete.inmobiliaria?igsh=ZDBmc244MnYyOHZ1&utm_source=qr"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 bg-[#262626] rounded-full flex items-center justify-center text-[#fc7f51] hover:bg-[#fc7f51] hover:text-white transition-colors duration-300"
                            aria-label="Instagram"
                        >
                            <Instagram size={18} />
                        </a>
                        <a
                            href="https://www.facebook.com/share/1AYe1Qtnwd/?mibextid=wwXIfr"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 bg-[#262626] rounded-full flex items-center justify-center text-[#fc7f51] hover:bg-[#fc7f51] hover:text-white transition-colors duration-300"
                            aria-label="Facebook"
                        >
                            <Facebook size={18} />
                        </a>
                    </div>
                </div>

                {/* Values / Links */}
                <div>
                    <h4 className="font-bold mb-6 text-white text-lg">Nuestros Valores</h4>
                    <ul className="space-y-4 text-sm text-[#878787]">
                        <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-[#fc7f51] rounded-full"></span> Integridad
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-[#fc7f51] rounded-full"></span> Compromiso
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-[#fc7f51] rounded-full"></span> Confianza
                        </li>
                    </ul>
                </div>

                {/* Contact */}
                <div>
                    <h4 className="font-bold mb-6 text-white text-lg">Contacto</h4>
                    <p className="text-[#878787] text-sm mb-3">Oficina Central, Ciudad</p>
                    <p className="text-[#878787] text-sm mb-3">contacto@inmuevete.com</p>
                    <p className="text-[#878787] text-sm">+51 123 456 789</p>
                </div>
            </div>

            <div className="border-t border-[#262626] mt-12 pt-8 text-center text-[#878787] text-xs">
                © 2024 Inmuévete. Todos los derechos reservados.
            </div>
        </footer>
    );
};

export default Footer;
