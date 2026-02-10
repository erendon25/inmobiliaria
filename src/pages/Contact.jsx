import { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Mail, Phone, MapPin, Send, Instagram, Facebook, Linkedin, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const Contact = () => {
    const [formData, setFormData] = useState({
        name: '',
        phone: '+51 ',
        email: '',
        subject: 'Información general',
        message: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handlePhoneChange = (e) => {
        // Enforce +51 prefix
        let val = e.target.value;
        if (!val.startsWith('+51 ')) {
            val = '+51 ' + val.replace(/^\+51\s*/, '');
        }
        setFormData({ ...formData, phone: val });
    };

    const generateWhatsAppLink = () => {
        const phoneNumber = "+51965355700"; // Replace with actual business number

        let messageBody = formData.message.trim();

        if (!messageBody) {
            // Default message based on subject
            const action =
                formData.subject === 'Comprar una propiedad' ? 'Comprar' :
                    formData.subject === 'Vender una propiedad' ? 'Vender' :
                        formData.subject === 'Alquileres' ? 'Alquilar' : 'obtener Información general sobre';

            messageBody = `Hola, me gustaría ${action} un inmueble.`;
        }

        // Append user details for context
        messageBody += `\n\n- Nombre: ${formData.name}\n- Teléfono: ${formData.phone}\n- Email: ${formData.email}\n- Asunto: ${formData.subject}`;

        return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(messageBody)}`;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.name || !formData.email) {
            toast.error("Por favor completa nombre y email.");
            return;
        }

        const link = generateWhatsAppLink();

        toast.success("Redirigiendo a WhatsApp...");
        setTimeout(() => {
            window.open(link, '_blank');
        }, 1000);
    };

    return (
        <div className="min-h-screen bg-white font-sans text-[#262626]">
            {/* Navbar is in App.jsx but if we want strictly page level control... App.jsx handles it */}

            <div className="pt-24 pb-20 container mx-auto px-6">

                {/* Header */}
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <span className="text-[#fc7f51] font-bold tracking-widest uppercase text-sm mb-2 block">¿Hablamos?</span>
                    <h1 className="text-4xl md:text-5xl font-bold mb-6 text-[#262626]">Contáctanos</h1>
                    <p className="text-[#878787] text-lg">
                        Estamos aquí para ayudarte a encontrar tu espacio ideal.
                        Escríbenos y un asesor se pondrá en contacto contigo a la brevedad.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">

                    {/* Contact Info Side */}
                    <div className="bg-[#16151a] text-white p-10 rounded-3xl shadow-xl relative overflow-hidden">
                        {/* Decorational Circle */}
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#fc7f51] rounded-full opacity-20 blur-3xl"></div>
                        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-[#fc7f51] rounded-full opacity-10 blur-3xl"></div>

                        <div className="relative z-10">
                            <h3 className="text-2xl font-bold mb-8">Información de Contacto</h3>

                            <div className="space-y-8">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-[#262626] rounded-full flex items-center justify-center text-[#fc7f51] shrink-0">
                                        <Phone className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg mb-1">Teléfono</h4>
                                        <p className="text-gray-400 text-sm mb-1">+51 987 654 321</p>
                                        <p className="text-gray-400 text-sm">+51 123 456 789</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-[#262626] rounded-full flex items-center justify-center text-[#fc7f51] shrink-0">
                                        <Mail className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg mb-1">Email</h4>
                                        <p className="text-gray-400 text-sm mb-1">contacto@inmuevete.com</p>
                                        <p className="text-gray-400 text-sm">ventas@inmuevete.com</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-[#262626] rounded-full flex items-center justify-center text-[#fc7f51] shrink-0">
                                        <MapPin className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg mb-1">Oficina Central</h4>
                                        <p className="text-gray-400 text-sm leading-relaxed">
                                            Av. Principal 123, Oficina 404<br />
                                            Centro Empresarial, Ciudad<br />
                                            Perú
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-12">
                                <h4 className="font-bold text-lg mb-4">Síguenos</h4>
                                <div className="flex gap-4">
                                    <a href="#" className="w-10 h-10 bg-[#262626] rounded-full flex items-center justify-center text-white hover:bg-[#fc7f51] transition">
                                        <Instagram className="w-5 h-5" />
                                    </a>
                                    <a href="#" className="w-10 h-10 bg-[#262626] rounded-full flex items-center justify-center text-white hover:bg-[#fc7f51] transition">
                                        <Facebook className="w-5 h-5" />
                                    </a>
                                    <a href="#" className="w-10 h-10 bg-[#262626] rounded-full flex items-center justify-center text-white hover:bg-[#fc7f51] transition">
                                        <Linkedin className="w-5 h-5" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Form Side */}
                    <div className="bg-white p-6 md:p-10 rounded-3xl shadow-card border border-gray-100">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-[#262626]">Nombre</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Tu nombre completo"
                                        className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#fc7f51]/50 focus:border-[#fc7f51] transition"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-[#262626]">Teléfono</label>
                                    <input
                                        type="text"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handlePhoneChange}
                                        className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#fc7f51]/50 focus:border-[#fc7f51] transition"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-[#262626]">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="ejemplo@correo.com"
                                    className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#fc7f51]/50 focus:border-[#fc7f51] transition"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-[#262626]">Asunto</label>
                                <select
                                    name="subject"
                                    value={formData.subject}
                                    onChange={handleChange}
                                    className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#fc7f51]/50 focus:border-[#fc7f51] transition text-gray-600 bg-white"
                                >
                                    <option value="Información general">Información general</option>
                                    <option value="Comprar una propiedad">Comprar una propiedad</option>
                                    <option value="Vender una propiedad">Vender una propiedad</option>
                                    <option value="Alquileres">Alquileres</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-[#262626]">Mensaje</label>
                                <textarea
                                    name="message"
                                    value={formData.message}
                                    onChange={handleChange}
                                    rows="4"
                                    placeholder="¿Cómo podemos ayudarte?"
                                    className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#fc7f51]/50 focus:border-[#fc7f51] transition"
                                ></textarea>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-[#128C7E] hover:bg-[#075E54] text-white font-bold py-4 rounded-xl transition shadow-lg flex items-center justify-center gap-2 group"
                            >
                                Contactar por WhatsApp
                                <MessageCircle className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>

                        </form>
                    </div>

                </div>
            </div>
            {/* Footer is rendered by App.jsx, removed from here */}
        </div>
    );
};

export default Contact;
