const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
admin.initializeApp();

const db = admin.firestore();

/**
 * Notify users when a new property matches their saved alerts.
 */
exports.notifyNewProperty = functions.firestore
    .document("properties/{propertyId}")
    .onCreate(async (snap, context) => {
        const property = snap.data();
        const propertyId = context.params.propertyId;

        // Skip drafts
        if (property.status === "borrador") return null;

        console.log(`Processing new property: ${propertyId}`);

        try {
            // In a production app with many users, we would use a more scalable query.
            // For this project, we iterate users with alerts.
            const usersSnapshot = await db.collection("users").get();
            const notifications = [];

            usersSnapshot.forEach((userDoc) => {
                const userData = userDoc.data();
                const alert = userData.alerts;
                const fcmTokens = userData.fcmTokens;

                if (alert && fcmTokens && fcmTokens.length > 0) {
                    // Match logic
                    let isMatch = true;

                    if (alert.type && property.type && alert.type.toLowerCase() !== property.type.toLowerCase()) {
                        isMatch = false;
                    }

                    if (alert.category && property.category) {
                        const aCat = alert.category.toLowerCase();
                        const pCat = property.category.toLowerCase();
                        
                        // Handle "construido" (Casa or Departamento)
                        if (aCat === "construido") {
                            if (pCat !== "casa" && pCat !== "departamento") {
                                isMatch = false;
                            }
                        } else if (aCat !== pCat) {
                            isMatch = false;
                        }
                    }

                    if (alert.minPrice && property.price && Number(property.price) < Number(alert.minPrice)) {
                        isMatch = false;
                    }

                    if (alert.maxPrice && property.price && Number(property.price) > Number(alert.maxPrice)) {
                        isMatch = false;
                    }

                    if (alert.location && property.location && !property.location.toLowerCase().includes(alert.location.toLowerCase())) {
                        isMatch = false;
                    }

                    if (isMatch) {
                        console.log(`Match found for user ${userDoc.id}`);
                        const message = {
                            notification: {
                                title: "🏠 ¡Nueva propiedad para ti!",
                                body: `Se ha publicado: ${property.title} en ${property.location}.`,
                            },
                            data: {
                                propertyId: propertyId,
                                type: "new_property"
                            },
                            tokens: fcmTokens
                        };
                        notifications.push(admin.messaging().sendMulticast(message));
                    }
                }
            });

            const results = await Promise.all(notifications);
            console.log(`Sent ${results.length} notification batches`);
            return null;
        } catch (error) {
            console.error("Error in notifyNewProperty:", error);
            return null;
        }
    });

/**
 * Notify the agent when their property is viewed.
 */
exports.notifyPropertyViewed = functions.firestore
    .document("properties/{propertyId}")
    .onUpdate(async (change, context) => {
        const newData = change.after.data();
        const oldData = change.before.data();
        const propertyId = context.params.propertyId;

        // Check if views increased
        if ((newData.views || 0) > (oldData.views || 0)) {
            const agentId = newData.agentId;
            if (!agentId) return null;

            try {
                const agentDoc = await db.collection("users").doc(agentId).get();
                const agentData = agentDoc.data();

                if (agentData && agentData.fcmTokens && agentData.fcmTokens.length > 0) {
                    const message = {
                        notification: {
                            title: "👀 ¡Nueva visita!",
                            body: `Alguien ha visto tu propiedad: ${newData.title}`,
                        },
                        data: {
                            propertyId: propertyId,
                            type: "property_viewed"
                        },
                        tokens: agentData.fcmTokens
                    };
                    await admin.messaging().sendMulticast(message);
                    console.log(`Viewed notification sent to agent ${agentId}`);
                }
                return null;
            } catch (error) {
                console.error("Error in notifyPropertyViewed:", error);
                return null;
            }
        }
        return null;
    });

/**
 * Notify the agent when someone saves their property as favorite.
 */
exports.notifyPropertyFavorited = functions.firestore
    .document("users/{userId}")
    .onUpdate(async (change, context) => {
        const newUserData = change.after.data();
        const oldUserData = change.before.data();

        const newFavs = newUserData.favorites || [];
        const oldFavs = oldUserData.favorites || [];

        // Find strictly added favorites
        const addedIds = newFavs.filter(id => !oldFavs.includes(id));
        if (addedIds.length === 0) return null;

        try {
            const notifications = [];
            for (const propId of addedIds) {
                const propSnap = await db.collection("properties").doc(propId).get();
                if (propSnap.exists()) {
                    const prop = propSnap.data();
                    const agentId = prop.agentId;
                    
                    if (agentId && agentId !== context.params.userId) { // Don't notify if agent favorites their own property
                        const agentSnap = await db.collection("users").doc(agentId).get();
                        const agentData = agentSnap.data();
                        
                        if (agentData && agentData.fcmTokens && agentData.fcmTokens.length > 0) {
                            notifications.push(admin.messaging().sendMulticast({
                                notification: {
                                    title: "❤️ ¡Propiedad Guardada!",
                                    body: `A alguien le interesó tu propiedad y la guardó: ${prop.title}`,
                                },
                                data: {
                                    propertyId: propId,
                                    type: "property_favorited"
                                },
                                tokens: agentData.fcmTokens
                            }));
                        }
                    }
                }
            }
            await Promise.all(notifications);
            return null;
        } catch (error) {
            console.error("Error in notifyPropertyFavorited:", error);
            return null;
        }
    });

const fs = require("fs");
const path = require("path");
const SITE_URL = "https://inmueveteinmobiliaria.com";

function setCanonicalUrl(htmlString, url) {
    const canonicalTag = `<link rel="canonical" href="${url}" />`;

    if (/<link\s+rel=["']canonical["'][^>]*>/i.test(htmlString)) {
        return htmlString.replace(/<link\s+rel=["']canonical["'][^>]*>/i, canonicalTag);
    }

    return htmlString.replace(/<\/head>/i, `  ${canonicalTag}\n</head>`);
}

function sendNotFoundProperty(res, propertyId) {
    const url = `${SITE_URL}/property/${propertyId || ""}`;
    res.set("Cache-Control", "no-store");

    const htmlString = `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, follow" />
  <link rel="canonical" href="${url}" />
  <title>Propiedad no encontrada | Inmuévete Inmobiliaria</title>
</head>
<body>
  <main>
    <h1>Propiedad no encontrada</h1>
    <p>La propiedad solicitada no está disponible.</p>
    <a href="${SITE_URL}/properties">Ver propiedades disponibles</a>
  </main>
</body>
</html>`;

    return res.status(404).send(htmlString);
}

/**
 * Serve dynamic meta tags for property pages to improve SEO and social sharing.
 */
exports.servePropertyMeta = functions.https.onRequest(async (req, res) => {
    // Cache the response at the CDN for 5 minutes to reduce function invocations
    res.set("Cache-Control", "public, max-age=300, s-maxage=600");

    try {
        const urlParts = req.path.split("/");
        // Path should be something like /property/PROPERTY_ID
        const propertyId = urlParts[urlParts.length - 1];

        let htmlString = "";
        try {
            htmlString = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
        } catch (e) {
            console.error("Could not find index.html in functions directory", e);
            return res.status(500).send("Server Error: Missing index template");
        }

        if (!propertyId || propertyId === "property") {
            return sendNotFoundProperty(res, propertyId);
        }

        const docSnap = await db.collection("properties").doc(propertyId).get();

        if (!docSnap.exists) {
            return sendNotFoundProperty(res, propertyId);
        }

        const property = docSnap.data();
        const title = `${property.title || 'Propiedad'} | Inmuévete Inmobiliaria`;
        // Clean description of newlines and quotes to avoid breaking HTML
        const rawDesc = property.description || '';
        const description = rawDesc.substring(0, 160).replace(/\n/g, ' ').replace(/"/g, '&quot;');
        const image = (property.images && property.images.length > 0) ? property.images[0] : `${SITE_URL}/og-image.png`;
        const url = `${SITE_URL}/property/${propertyId}`;

        // Replace metadata
        htmlString = htmlString.replace(/<title>[^<]*<\/title>/i, `<title>${title}</title>`);
        htmlString = setCanonicalUrl(htmlString, url);
        htmlString = htmlString.replace(/<meta name="description"[\s]+content="[^"]*"/i, `<meta name="description" content="${description}"`);

        // Replace OG Tags
        htmlString = htmlString.replace(/<meta property="og:title" content="[^"]*"/i, `<meta property="og:title" content="${title}"`);
        htmlString = htmlString.replace(/<meta property="og:description"[\s]+content="[^"]*"/i, `<meta property="og:description" content="${description}"`);
        htmlString = htmlString.replace(/<meta property="og:image" content="[^"]*"/i, `<meta property="og:image" content="${image}"`);
        htmlString = htmlString.replace(/<meta property="og:url" content="[^"]*"/i, `<meta property="og:url" content="${url}"`);

        // Replace Twitter Tags
        htmlString = htmlString.replace(/<meta property="twitter:title" content="[^"]*"/i, `<meta property="twitter:title" content="${title}"`);
        htmlString = htmlString.replace(/<meta property="twitter:description"[\s]+content="[^"]*"/i, `<meta property="twitter:description" content="${description}"`);
        htmlString = htmlString.replace(/<meta property="twitter:image" content="[^"]*"/i, `<meta property="twitter:image" content="${image}"`);
        htmlString = htmlString.replace(/<meta property="twitter:url" content="[^"]*"/i, `<meta property="twitter:url" content="${url}"`);

        return res.status(200).send(htmlString);
    } catch (error) {
        console.error("Error serving property meta", error);
        // Fallback to sending the default index.html if possible
        try {
            const htmlString = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
            return res.status(200).send(htmlString);
        } catch {
            return res.status(500).send("Server Error");
        }
    }
});
