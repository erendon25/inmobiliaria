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
    // Sizing
    const iconHeight = height * 0.11; // 11% height for the logo icon
    const iconWidth = iconHeight * (wmImg.naturalWidth / wmImg.naturalHeight);

    // Title font
    const titleSize = iconHeight * 0.70;
    ctx.font = `900 ${titleSize}px Montserrat, Arial, sans-serif`;
    const titleWidth = ctx.measureText("Inmuévete").width;

    // Gap and layout positioning
    const gap = iconWidth * 0.25;
    const totalWidth = iconWidth + gap + titleWidth;

    const startX = (width - totalWidth) / 2;
    const startY = (height - iconHeight) / 2;

    // Create an offscreen canvas to turn logo white
    const offCanvas = document.createElement('canvas');
    offCanvas.width = iconWidth;
    offCanvas.height = iconHeight;
    const offCtx = offCanvas.getContext('2d');
    offCtx.drawImage(wmImg, 0, 0, iconWidth, iconHeight);
    offCtx.globalCompositeOperation = 'source-in';
    offCtx.fillStyle = '#ffffff';
    offCtx.fillRect(0, 0, iconWidth, iconHeight);

    // Apply main styles
    ctx.globalAlpha = 0.60;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Draw the white logo icon
    ctx.drawImage(offCanvas, startX, startY, iconWidth, iconHeight);

    // Start drawing text
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const textStartX = startX + iconWidth + gap;
    const titleY = startY + (iconHeight * 0.05);

    // Draw Title "Inmuévete"
    ctx.font = `900 ${titleSize}px Montserrat, Arial, sans-serif`;
    ctx.fillText("Inmuévete", textStartX, titleY);

    // Draw Subtitle "ASESORÍA INMOBILIARIA"
    const subtitleSize = iconHeight * 0.16;
    ctx.font = `bold ${subtitleSize}px Montserrat, Arial, sans-serif`;

    // Modern canvas has letterSpacing, fallback to spaced text if not 
    let subtitleText = "A S E S O R Í A   I N M O B I L I A R I A";
    if (ctx.letterSpacing !== undefined) {
        ctx.letterSpacing = `${subtitleSize * 0.3}px`;
        subtitleText = "ASESORÍA INMOBILIARIA";
    }

    const subtitleY = titleY + titleSize + (iconHeight * 0.04);
    ctx.fillText(subtitleText, textStartX + (iconWidth * 0.05), subtitleY);

    // Reset global styles
    if (ctx.letterSpacing !== undefined) {
        ctx.letterSpacing = "0px";
    }
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
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

    ctx.globalAlpha = 0.40;

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
 * Triggers a browser file download from a data URL, with mobile fallback.
 */
export const downloadImage = async (dataUrl, filename) => {
    // Convert base64 Data URL to Blob
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    const blob = new Blob([u8arr], { type: mime });

    // Check if we can use Web Share API (Great for iOS/Android WebViews/Browsers)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile && navigator.canShare) {
        try {
            const file = new File([blob], filename, { type: mime });
            if (navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: filename
                });
                return; // Shared/Saved successfully
            }
        } catch (e) {
            console.warn('Share API failed or cancelled', e);
        }
    }

    // Standard fallback download via Anchor tag using Object URL
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Cleanup URL after interaction
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};
