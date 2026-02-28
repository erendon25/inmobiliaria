let memoryCache = null;
let fetchPromise = null;

export const fetchSunatExchangeRate = async () => {
    if (memoryCache) return memoryCache;

    // In-browser environment check
    if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('sunat_exchange');
        const cachedTime = localStorage.getItem('sunat_exchange_time');
        const now = Date.now();

        // Cache for 12 hours
        if (cached && cachedTime && (now - parseInt(cachedTime)) < 12 * 60 * 60 * 1000) {
            memoryCache = parseFloat(cached);
            return memoryCache;
        }
    }

    // Prevent multiple parallel fetches
    if (fetchPromise) return fetchPromise;

    fetchPromise = (async () => {
        let rate = null;

        // Try apis.net.pe first
        try {
            const res = await fetch('https://api.apis.net.pe/v1/tipo-cambio-sunat');
            if (res.ok) {
                const data = await res.json();
                if (data.compra) rate = data.compra;
            }
        } catch (e) {
            console.warn('apis.net.pe failed:', e.message);
        }

        // Try APISPeru if previous failed
        if (!rate) {
            try {
                const res = await fetch('https://dniruc.apisperu.com/api/v1/tipo-cambio', {
                    headers: {
                        'Authorization': 'Bearer 72685412'
                    }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.compra) rate = data.compra;
                }
            } catch (e) {
                console.warn('dniruc.apisperu.com failed:', e.message);
            }
        }

        // Try ExchangeRate-API as a reliable fallback
        if (!rate) {
            try {
                const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.rates && data.rates.PEN) {
                        rate = data.rates.PEN;
                    }
                }
            } catch (e) {
                console.warn('ExchangeRate-API failed:', e.message);
            }
        }

        if (!rate) {
            rate = 3.75; // More realistic current SUNAT rate approx 3.75
        }

        if (rate) {
            if (typeof window !== 'undefined') {
                localStorage.setItem('sunat_exchange', rate.toString());
                localStorage.setItem('sunat_exchange_time', Date.now().toString());
            }
            memoryCache = parseFloat(rate);
        }

        fetchPromise = null;
        return memoryCache || 3.75;
    })();

    return fetchPromise;
};
