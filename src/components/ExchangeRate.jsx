import { useState, useEffect } from 'react';
import { RefreshCcw, DollarSign } from 'lucide-react';

const ExchangeRate = () => {
    const [exchangeData, setExchangeData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchExchangeRate = async () => {
            try {
                // Using a public API for PEN/USD exchange rate (SUNAT reference)
                // Fallback to a different API or handling if this one is down is good practice
                // Using a different public API that allows CORS or a proxy service
                // Using 'https://api.exchangerate-api.com/v4/latest/USD' free tier which allows CORS
                const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
                if (!response.ok) throw new Error('Failed to fetch');
                const data = await response.json();
                // This API returns a base and rates. We want USD -> PEN
                const rate = data.rates.PEN;
                setExchangeData({
                    compra: rate, // The API gives a mid-market rate usually
                    venta: rate, // So we'll use same for both or simulate a spread
                    fecha: new Date(data.date).toISOString().split('T')[0]
                });
            } catch (err) {
                console.error("Error fetching exchange rate:", err);
                setError(true);
                // Fallback data if API fails
                setExchangeData({
                    compra: 3.75,
                    venta: 3.80,
                    fecha: new Date().toISOString().split('T')[0]
                });
            } finally {
                setLoading(false);
            }
        };

        fetchExchangeRate();
    }, []);

    if (loading) return (
        <div className="flex items-center gap-2 text-xs text-gray-400 animate-pulse bg-gray-800/50 px-3 py-1 rounded-full">
            <RefreshCcw className="w-3 h-3 animate-spin" />
            <span>Cargando TC...</span>
        </div>
    );

    return (
        <div className="hidden xl:flex flex-col items-end text-right mr-4 border-r border-gray-700 pr-4">
            <div className="flex items-center gap-1 text-[#fc7f51] text-xs font-bold uppercase tracking-wider mb-0.5">
                <DollarSign className="w-3 h-3" />
                <span>Tipo de Cambio</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-300 font-mono">
                <div className="flex items-center gap-3 text-xs text-gray-300 font-mono">
                    <div title="Tipo de Cambio Referencial">
                        <span className="text-gray-500 mr-1">T.C:</span>
                        <span className="text-white font-bold">{exchangeData?.venta?.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExchangeRate;
