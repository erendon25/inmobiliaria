import { Target, Eye, ShieldCheck, HeartHandshake, Users } from 'lucide-react';
import logo from '../assets/logo.png';

const About = () => {
    return (
        <div className="min-h-screen bg-white font-sans text-[#262626]">
            {/* Hero Section */}
            <div className="relative h-[400px] flex items-center justify-center">
                <div className="absolute inset-0 bg-[#262626]">
                    {/* Optional: Add background image with opacity here */}
                    <img src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop" className="w-full h-full object-cover opacity-20" alt="About Hero" />
                </div>
                <div className="relative z-10 text-center px-6">
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                        Más que una <span className="text-[#fc7f51]">inmobiliaria</span>
                    </h1>
                    <p className="text-xl text-gray-300 max-w-2xl mx-auto font-light">
                        Inspiramos movimiento. Impulsamos a las personas a dar el paso hacia nuevas etapas de su vida.
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-6 py-20">

                {/* Concepto de Marca */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center mb-24">
                    <div>
                        <span className="text-[#fc7f51] font-bold tracking-widest uppercase text-sm mb-2 block">Quiénes Somos</span>
                        {/* Always show full logo here as requested */}
                        <img src={logo} alt="Inmuévete" className="h-16 mb-6 object-contain" />
                        <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-tight">Concepto de Marca</h2>
                        <p className="text-[#878787] text-lg leading-relaxed mb-6">
                            Más que vender inmuebles, inspiramos movimiento. <strong className="text-[#262626]">Inmuévete</strong> es la inmobiliaria que impulsa a las personas a dar el paso hacia nuevas etapas de su vida: un nuevo hogar, una inversión segura o un espacio para crecer.
                        </p>
                        <p className="text-[#878787] text-lg leading-relaxed">
                            Nuestro enfoque combina confianza, transparencia y dinamismo, convirtiendo cada transacción en una experiencia cercana, ágil y motivadora.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <img src="https://images.unsplash.com/photo-1600596542815-e3287135f5cf?q=80&w=2072&auto=format&fit=crop" className="rounded-tl-[40px] rounded-br-[40px] w-full h-64 object-cover shadow-card" alt="Concept 1" />
                        <img src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2053&auto=format&fit=crop" className="rounded-tr-[40px] rounded-bl-[40px] w-full h-64 object-cover shadow-card mt-8" alt="Concept 2" />
                    </div>
                </div>

                {/* Mision & Vision */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-24">
                    {/* Mision */}
                    <div className="bg-[#f9f9f9] p-10 rounded-2xl hover:shadow-lg transition border-l-4 border-[#fc7f51] group">
                        <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm group-hover:bg-[#fc7f51] group-hover:text-white transition">
                            <Target className="w-7 h-7" />
                        </div>
                        <h3 className="text-2xl font-bold mb-4">Misión</h3>
                        <p className="text-[#878787] leading-relaxed">
                            "En Inmuevete trabajamos para conectar a las personas con el espacio ideal para vivir, invertir o crecer. Brindamos soluciones inmobiliarias confiables, transparentes y accesibles, ofreciendo un servicio cercano que transforma cada proceso en una experiencia sencilla y segura."
                        </p>
                    </div>

                    {/* Vision */}
                    <div className="bg-[#262626] p-10 rounded-2xl text-white shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#fc7f51] rounded-full blur-3xl opacity-20 -mr-10 -mt-10"></div>
                        <div className="w-14 h-14 bg-[#333] rounded-full flex items-center justify-center mb-6 shadow-sm group-hover:bg-[#fc7f51] transition">
                            <Eye className="w-7 h-7" />
                        </div>
                        <h3 className="text-2xl font-bold mb-4">Visión</h3>
                        <p className="text-gray-300 leading-relaxed">
                            "Ser la inmobiliaria de referencia en la región, reconocida por la confianza, innovación y cercanía con nuestros clientes, ofreciendo experiencias inmobiliarias que impulsen el desarrollo personal, familiar y empresarial."
                        </p>
                    </div>
                </div>

                {/* Valores */}
                <div className="text-center max-w-4xl mx-auto">
                    <span className="text-[#fc7f51] font-bold tracking-widest uppercase text-sm mb-2 block">Nuestra Esencia</span>
                    <h2 className="text-3xl md:text-4xl font-bold mb-12">Nuestros Valores</h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="flex flex-col items-center">
                            <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-6 text-[#fc7f51]">
                                <ShieldCheck className="w-10 h-10" />
                            </div>
                            <h4 className="text-xl font-bold mb-3">Integridad</h4>
                            <p className="text-[#878787] text-sm">Actuamos con honestidad y transparencia en cada paso.</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-6 text-[#fc7f51]">
                                <HeartHandshake className="w-10 h-10" />
                            </div>
                            <h4 className="text-xl font-bold mb-3">Compromiso</h4>
                            <p className="text-[#878787] text-sm">Nos dedicamos a cumplir y superar las expectativas.</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-6 text-[#fc7f51]">
                                <Users className="w-10 h-10" />
                            </div>
                            <h4 className="text-xl font-bold mb-3">Confianza</h4>
                            <p className="text-[#878787] text-sm">Construimos relaciones duraderas basadas en la seguridad.</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default About;
