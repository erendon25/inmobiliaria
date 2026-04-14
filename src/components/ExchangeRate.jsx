import { useState, useEffect } from 'react';
import { RefreshCcw, DollarSign } from 'lucide-react';

const ExchangeRate = ({ isScrolled = true }) => {
    const [exchangeData, setExchangeData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchExchangeRate = async () => {
            try {
                const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
                if (!response.ok) throw new Error('Failed to fetch');
                const data = await response.json();
                setExchangeData({
                    venta: data.rates.PEN,
                    fecha: new Date(data.date).toISOString().split('T')[0]
                });
            } catch (err) {
                setExchangeData({ venta: 3.78, fecha: new Date().toISOString().split('T')[0] });
            } finally {
                setLoading(false);
            }
        };
        fetchExchangeRate();
    }, []);

    if (loading) return (
        <div className="hidden xl:flex items-center gap-1.5 text-xs animate-pulse px-3 py-1 rounded-full">
            <RefreshCcw className="w-3 h-3 animate-spin text-gray-400" />
            <span className="text-gray-400">TC...</span>
        </div>
    );

    return (
        <div className={`hidden xl:flex flex-col items-end text-right mr-2 pr-4 border-r ${isScrolled ? 'border-gray-200' : 'border-white/20'}`}>
            <div className="flex items-center gap-1 text-[#fc7f51] text-[10px] font-black uppercase tracking-wider mb-0.5">
                <DollarSign className="w-3 h-3" />
                <span>Tipo de Cambio</span>
            </div>
            <div className="flex items-center gap-1 text-xs font-mono">
                <span className={isScrolled ? 'text-gray-400' : 'text-white/50'}>T.C:</span>
                <span className={`font-black ${isScrolled ? 'text-gray-800' : 'text-white'}`}>
                    S/ {exchangeData?.venta?.toFixed(3)}
                </span>
            </div>
        </div>
    );
};

export default ExchangeRate;
