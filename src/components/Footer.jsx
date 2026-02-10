import logo from '../assets/logo.png';

const Footer = () => {
    return (
        <footer className="bg-[#16151a] text-white py-16">
            <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12">
                {/* Brand & Mission */}
                <div>
                    <img src={logo} alt="Inmuévete" className="h-12 mb-6" />
                    <p className="text-[#878787] text-sm leading-relaxed mb-6">
                        En Inmuevete trabajamos para conectar a las personas con el espacio ideal para vivir, invertir o crecer.
                        Brindamos soluciones inmobiliarias confiables, transparentes y accesibles.
                    </p>
                    <div className="flex gap-4">
                        <div className="w-8 h-8 bg-[#262626] rounded-full flex items-center justify-center text-[#fc7f51] font-bold">in</div>
                        <div className="w-8 h-8 bg-[#262626] rounded-full flex items-center justify-center text-[#fc7f51] font-bold">ig</div>
                        <div className="w-8 h-8 bg-[#262626] rounded-full flex items-center justify-center text-[#fc7f51] font-bold">fb</div>
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
