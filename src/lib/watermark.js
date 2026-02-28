/**
 * Adds a watermark to an image and returns a data URL.
 * Handles CORS by fetching the image as a blob first.
 *
 * @param {string} imageUrl - The URL of the source image.
 * @param {string|null} watermarkLogoSrc - The logo URL or imported asset src to use as a watermark.
 * @param {string} watermarkText - Fallback text if the logo fails to load.
 * @returns {Promise<string>} - A data URL of the watermarked image.
 */
export const addWatermark = async (imageUrl, watermarkLogoSrc = null, watermarkText = 'Inmuévete') => {
    // Step 1: Load the source image via fetch (blob) to avoid canvas CORS taint
    const imgBlob = await fetchImageAsBlob(imageUrl);
    const imgObjectUrl = URL.createObjectURL(imgBlob);

    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');

            // Draw original image
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(imgObjectUrl);

            if (watermarkLogoSrc) {
                const wm = new Image();
                wm.onload = () => {
                    applyLogoWatermark(ctx, img.naturalWidth, img.naturalHeight, wm);
                    try {
                        resolve(canvas.toDataURL('image/jpeg', 0.92));
                    } catch (e) {
                        console.error('Canvas toDataURL failed, falling back to text watermark', e);
                        drawTextWatermark(ctx, img.naturalWidth, img.naturalHeight, watermarkText);
                        resolve(canvas.toDataURL('image/jpeg', 0.92));
                    }
                };
                wm.onerror = () => {
                    // Fallback to text watermark if logo fails
                    drawTextWatermark(ctx, img.naturalWidth, img.naturalHeight, watermarkText);
                    resolve(canvas.toDataURL('image/jpeg', 0.92));
                };
                wm.src = watermarkLogoSrc;
            } else {
                drawTextWatermark(ctx, img.naturalWidth, img.naturalHeight, watermarkText);
                resolve(canvas.toDataURL('image/jpeg', 0.92));
            }
        };

        img.onerror = (err) => {
            URL.revokeObjectURL(imgObjectUrl);
            reject(new Error(`Failed to load image: ${err}`));
        };

        img.src = imgObjectUrl;
    });
};

/**
 * Fetches an image URL as a Blob to sidestep canvas CORS taint issues.
 */
const fetchImageAsBlob = async (url) => {
    // Add cache buster to force browser to ignore previously cached non-CORS response
    const cacheBusterUrl = url.startsWith('http')
        ? url + (url.includes('?') ? '&' : '?') + 'cb=' + Date.now()
        : url;

    try {
        const response = await fetch(cacheBusterUrl, { mode: 'cors' });
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        return await response.blob();
    } catch (err) {
        // If CORS fails on fetch, try without mode (may still fail for canvas export)
        console.warn('CORS fetch failed, trying no-cors fallback (download may be affected):', err);
        const response = await fetch(cacheBusterUrl);
        return await response.blob();
    }
};

/**
 * Applies a semi-transparent logo watermark in the center.
 */
const applyLogoWatermark = (ctx, width, height, wmImg) => {
    // Logo watermark: center, 35% of image width
    const wmWidth = width * 0.35;
    const wmHeight = wmWidth * (wmImg.naturalHeight / wmImg.naturalWidth);

    const x = (width - wmWidth) / 2;
    // Shift slightly up to leave room for text below
    const y = (height - wmHeight) / 2 - (height * 0.05);

    // Create an offscreen canvas to turn logo white
    const offCanvas = document.createElement('canvas');
    offCanvas.width = wmWidth;
    offCanvas.height = wmHeight;
    const offCtx = offCanvas.getContext('2d');
    offCtx.drawImage(wmImg, 0, 0, wmWidth, wmHeight);
    offCtx.globalCompositeOperation = 'source-in';
    offCtx.fillStyle = '#ffffff';
    offCtx.fillRect(0, 0, wmWidth, wmHeight);

    // Draw the white logo with lower opacity
    ctx.globalAlpha = 0.15;
    ctx.drawImage(offCanvas, x, y, wmWidth, wmHeight);

    // Draw text "Inmuevete Inmobiliaria" below the logo
    const text = 'Inmuevete Inmobiliaria';
    const fontSize = Math.max(24, Math.floor(width * 0.04));
    ctx.font = `bold ${fontSize}px Montserrat, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const textX = width / 2;
    const textY = y + wmHeight + (height * 0.02);

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 8;
    ctx.fillText(text, textX, textY);

    // Reset global styles
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1.0;
};

/**
 * Draws a text-based watermark on the canvas (center).
 */
const drawTextWatermark = (ctx, width, height, text) => {
    const fontSize = Math.max(30, Math.floor(width * 0.06));
    ctx.font = `bold ${fontSize}px Montserrat, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const x = width / 2;
    const y = height / 2;

    ctx.globalAlpha = 0.15;

    // Shadow / outline for readability
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 8;

    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, x, y);

    // Reset shadow and alpha
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1.0;
};

/**
 * Triggers a browser file download from a data URL.
 */
export const downloadImage = (dataUrl, filename) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
