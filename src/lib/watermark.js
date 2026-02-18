export const addWatermark = async (imageUrl, watermarkUrl = null, watermarkText = 'Inmuévete') => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');

            // Draw original image
            ctx.drawImage(img, 0, 0);

            if (watermarkUrl) {
                const wm = new Image();
                wm.crossOrigin = 'anonymous';
                wm.onload = () => {
                    // Calculate watermark size (e.g., 20% of image width)
                    const wmWidth = img.width * 0.2;
                    const wmHeight = wmWidth * (wm.height / wm.width);

                    // Position: Bottom Right with padding
                    const padding = img.width * 0.02;
                    const x = img.width - wmWidth - padding;
                    const y = img.height - wmHeight - padding;

                    ctx.globalAlpha = 0.7; // Semi-transparent
                    ctx.drawImage(wm, x, y, wmWidth, wmHeight);
                    ctx.globalAlpha = 1.0;

                    try {
                        resolve(canvas.toDataURL('image/jpeg', 0.9));
                    } catch (e) {
                        // Fallback to text if tainted canvas prevents export (though CORS usually blocks drawImage first)
                        console.error("Canvas export failed", e);
                        reject(e);
                    }
                };
                wm.onerror = () => {
                    // Fallback to text if logo fails
                    drawTextWatermark(ctx, img.width, img.height, watermarkText);
                    resolve(canvas.toDataURL('image/jpeg', 0.9));
                };
                wm.src = watermarkUrl;
            } else {
                drawTextWatermark(ctx, img.width, img.height, watermarkText);
                resolve(canvas.toDataURL('image/jpeg', 0.9));
            }
        };

        img.onerror = (err) => reject(err);
        img.src = imageUrl;
    });
};

const drawTextWatermark = (ctx, width, height, text) => {
    const fontSize = Math.max(20, Math.floor(width * 0.05));
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';

    // Add shadow/outline for readability
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';

    const padding = width * 0.03;
    const x = width - padding;
    const y = height - padding;

    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
};

export const downloadImage = (dataUrl, filename) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
