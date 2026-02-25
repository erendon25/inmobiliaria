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
        try {
            // First try apis.net.pe (Standard SUNAT API free version without token)
            let res = await fetch('https://api.apis.net.pe/v1/tipo-cambio-sunat');
            if (res.ok) {
                const data = await res.json();
                const rate = data.compra;
                if (rate) {
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('sunat_exchange', rate.toString());
                        localStorage.setItem('sunat_exchange_time', Date.now().toString());
                    }
                    memoryCache = parseFloat(rate);
                    fetchPromise = null;
                    return memoryCache;
                }
            }

            // Fallback to APISPeru.com dniruc endpoint
            res = await fetch('https://dniruc.apisperu.com/api/v1/tipo-cambio');
            if (res.ok) {
                const data = await res.json();
                const rate = data.compra;
                if (rate) {
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('sunat_exchange', rate.toString());
                        localStorage.setItem('sunat_exchange_time', Date.now().toString());
                    }
                    memoryCache = parseFloat(rate);
                    fetchPromise = null;
                    return memoryCache;
                }
            }
        } catch (e) {
            console.error('Error fetching SUNAT rate:', e);
        }

        // Default to a recent rate if both APIs fail
        fetchPromise = null;
        return 3.36; // Closer to SUNAT current values approx 3.36
    })();

    return fetchPromise;
};
