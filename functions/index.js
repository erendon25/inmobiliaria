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

const STATIC_SEO_PAGES = {
    "/": {
        title: "Inmobiliaria en Arequipa | Casas y departamentos | Inmuévete",
        description: "Compra, vende o alquila casas, departamentos y terrenos en Arequipa con asesoría inmobiliaria especializada y propiedades verificadas."
    },
    "/properties": {
        title: "Propiedades en venta y alquiler en Arequipa | Inmuévete",
        description: "Explora casas, departamentos, terrenos y locales disponibles en Arequipa. Compara precios, ubicación y características en una sola plataforma."
    },
    "/about": {
        title: "Inmuévete: inmobiliaria y asesoría en Arequipa",
        description: "Conoce a Inmuévete Inmobiliaria y nuestro servicio de asesoría para comprar, vender, alquilar e invertir en propiedades en Arequipa."
    },
    "/contact": {
        title: "Contacta una inmobiliaria en Arequipa | Inmuévete",
        description: "Habla con un asesor inmobiliario en Arequipa para comprar, vender o alquilar una propiedad. Atención personalizada por WhatsApp."
    },
    "/tips": {
        title: "Blog inmobiliario de Arequipa | Guías y consejos",
        description: "Guías para comprar, vender, alquilar e invertir en propiedades en Arequipa. Consejos inmobiliarios claros del equipo de Inmuévete."
    },
    "/inmuebles-en-arequipa": {
        title: "Inmuebles en Arequipa en venta y alquiler | Inmuévete",
        description: "Encuentra casas, departamentos, terrenos y locales en venta o alquiler en Arequipa. Propiedades verificadas y asesoría inmobiliaria personalizada."
    },
    "/departamentos-en-venta-arequipa": {
        title: "Departamentos en venta en Arequipa | Inmuévete",
        description: "Departamentos en venta en Arequipa: compara precios, áreas, dormitorios y ubicaciones. Opciones verificadas con asesoría para comprar con confianza."
    },
    "/casas-en-venta-arequipa": {
        title: "Casas en venta en Arequipa | Inmuévete Inmobiliaria",
        description: "Casas en venta en Arequipa con fotos, precios, áreas y ubicación. Encuentra opciones para vivir o invertir con asesoría inmobiliaria especializada."
    },
    "/terrenos-en-venta-arequipa": {
        title: "Terrenos en venta en Arequipa | Inmuévete",
        description: "Terrenos urbanos, rústicos y comerciales en venta en Arequipa. Compara ubicación, metraje, precio y potencial de inversión con asesoría experta."
    },
    "/departamentos-en-alquiler-arequipa": {
        title: "Departamentos en alquiler en Arequipa | Inmuévete",
        description: "Departamentos en alquiler en Arequipa: compara ubicación, renta, dormitorios y equipamiento. Contacta directamente a un asesor inmobiliario."
    },
    "/casas-en-alquiler-arequipa": {
        title: "Casas en alquiler en Arequipa | Inmuévete",
        description: "Casas en alquiler en Arequipa para familias y empresas. Revisa precios, áreas, dormitorios y ubicación con acompañamiento inmobiliario."
    }
};

const NOINDEX_ROUTES = new Set([
    "/search", "/login", "/register", "/forgot-password", "/setup",
    "/agent-dashboard", "/client-dashboard", "/superadmin"
]);

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function safeJson(value) {
    return JSON.stringify(value).replace(/</g, "\\u003c");
}

function readIndexTemplate() {
    return fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
}

function setMetaName(htmlString, name, content) {
    const safeContent = escapeHtml(content);
    const expression = new RegExp(`<meta\\s+name=["']${name}["'][^>]*>`, "i");
    const tag = `<meta name="${name}" content="${safeContent}" />`;
    return expression.test(htmlString)
        ? htmlString.replace(expression, tag)
        : htmlString.replace(/<\/head>/i, `  ${tag}\n</head>`);
}

function setMetaProperty(htmlString, property, content) {
    const safeContent = escapeHtml(content);
    const expression = new RegExp(`<meta\\s+property=["']${property}["'][^>]*>`, "i");
    const tag = `<meta property="${property}" content="${safeContent}" />`;
    return expression.test(htmlString)
        ? htmlString.replace(expression, tag)
        : htmlString.replace(/<\/head>/i, `  ${tag}\n</head>`);
}

function appendJsonLd(htmlString, schema) {
    return htmlString.replace(
        /<\/head>/i,
        `  <script type="application/ld+json">${safeJson(schema)}</script>\n</head>`
    );
}

function injectRootContent(htmlString, content) {
    const openingTag = /<div\s+id=["']root["'][^>]*>/i.exec(htmlString);
    const renderedRoot = `<div id="root">${content}</div>`;

    if (!openingTag) {
        return htmlString.replace(/<\/body>/i, `${renderedRoot}\n</body>`);
    }

    const start = openingTag.index;
    const contentStart = start + openingTag[0].length;
    const end = htmlString.indexOf("</div>", contentStart);
    if (end === -1) return htmlString;

    return `${htmlString.slice(0, start)}${renderedRoot}${htmlString.slice(end + 6)}`;
}

function formatPrice(property) {
    const price = Number(property.price);
    if (!Number.isFinite(price) || price <= 0) return "Consultar precio";

    const currency = String(property.currency || "USD").toUpperCase();
    const symbol = currency === "PEN" ? "S/" : currency === "USD" ? "US$" : currency;
    return `${symbol} ${new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 }).format(price)}`;
}

function propertyLandingPath(property) {
    const category = String(property.category || "").toLowerCase();
    const operation = String(property.type || "venta").toLowerCase();

    if (category.includes("departamento")) {
        return operation === "alquiler"
            ? "/departamentos-en-alquiler-arequipa"
            : "/departamentos-en-venta-arequipa";
    }
    if (category.includes("casa")) {
        return operation === "alquiler"
            ? "/casas-en-alquiler-arequipa"
            : "/casas-en-venta-arequipa";
    }
    if (category.includes("terreno")) return "/terrenos-en-venta-arequipa";
    return "/inmuebles-en-arequipa";
}

function buildPropertyFallback(property, propertyId, description) {
    const location = property.location || property.address || "Arequipa";
    const operation = String(property.type || "venta").toLowerCase() === "alquiler"
        ? "en alquiler"
        : "en venta";
    const heading = property.title || `${property.category || "Propiedad"} ${operation} en ${location}`;
    const category = property.category || "Propiedad";
    const canonical = `${SITE_URL}/property/${propertyId}`;
    const landingPath = propertyLandingPath(property);

    return `<main data-seo-fallback="property">
  <nav aria-label="Migas de pan">
    <a href="${SITE_URL}/">Inicio</a> /
    <a href="${SITE_URL}/properties">Propiedades</a> /
    <span>${escapeHtml(heading)}</span>
  </nav>
  <article>
    <p>${escapeHtml(category)} ${escapeHtml(operation)}</p>
    <h1>${escapeHtml(heading)}</h1>
    <p><strong>Ubicación:</strong> ${escapeHtml(location)}</p>
    <p><strong>Precio:</strong> ${escapeHtml(formatPrice(property))}</p>
    <p>${escapeHtml(description)}</p>
    <p>
      <a href="${canonical}">Ver ficha completa</a> ·
      <a href="${SITE_URL}${landingPath}">Ver propiedades similares</a> ·
      <a href="${SITE_URL}/contact">Contactar a Inmuévete</a>
    </p>
  </article>
</main>`;
}

function buildStaticFallback(requestPath, page, propertyLinks = []) {
    const heading = page.title.split("|")[0].trim();
    const categoryLinks = [
        ["/departamentos-en-venta-arequipa", "Departamentos en venta en Arequipa"],
        ["/casas-en-venta-arequipa", "Casas en venta en Arequipa"],
        ["/terrenos-en-venta-arequipa", "Terrenos en venta en Arequipa"],
        ["/departamentos-en-alquiler-arequipa", "Departamentos en alquiler en Arequipa"],
        ["/casas-en-alquiler-arequipa", "Casas en alquiler en Arequipa"]
    ];
    const links = requestPath === "/properties"
        ? `<h2>Búsquedas populares</h2><ul>${categoryLinks.map(([href, label]) => `<li><a href="${SITE_URL}${href}">${escapeHtml(label)}</a></li>`).join("")}</ul>`
        : `<p><a href="${SITE_URL}/properties">Explorar propiedades disponibles</a></p>`;
    const listings = propertyLinks.length
        ? `<h2>Propiedades disponibles</h2><ul>${propertyLinks.map(({ id, title, location }) => `<li><a href="${SITE_URL}/property/${encodeURIComponent(id)}">${escapeHtml(title || `Propiedad en ${location || "Arequipa"}`)}</a>${location ? ` — ${escapeHtml(location)}` : ""}</li>`).join("")}</ul>`
        : "";

    return `<main data-seo-fallback="page">
  <nav aria-label="Migas de pan"><a href="${SITE_URL}/">Inicio</a> / <span>${escapeHtml(heading)}</span></nav>
  <h1>${escapeHtml(heading)}</h1>
  <p>${escapeHtml(page.description)}</p>
  ${links}
  ${listings}
</main>`;
}

function buildStatusFallback(heading, message) {
    return `<main data-seo-fallback="status-page">
  <h1>${escapeHtml(heading)}</h1>
  <p>${escapeHtml(message)}</p>
  <p><a href="${SITE_URL}/properties">Ver propiedades disponibles</a></p>
</main>`;
}

function applySeoMeta(htmlString, { title, description, canonical, image, robots = "index, follow, max-image-preview:large", type = "website" }) {
    const safeTitle = escapeHtml(title);
    let html = htmlString.replace(/<title>[^<]*<\/title>/i, `<title>${safeTitle}</title>`);
    html = setCanonicalUrl(html, canonical);
    html = setMetaName(html, "description", description);
    html = setMetaName(html, "robots", robots);
    html = setMetaProperty(html, "og:type", type);
    html = setMetaProperty(html, "og:url", canonical);
    html = setMetaProperty(html, "og:title", title);
    html = setMetaProperty(html, "og:description", description);
    html = setMetaProperty(html, "og:image", image || `${SITE_URL}/hero-bg.webp`);
    html = setMetaProperty(html, "twitter:url", canonical);
    html = setMetaProperty(html, "twitter:title", title);
    html = setMetaProperty(html, "twitter:description", description);
    html = setMetaProperty(html, "twitter:image", image || `${SITE_URL}/hero-bg.webp`);
    return html;
}

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
 * Serve route-specific metadata before React executes. This avoids sending the
 * home page title and canonical for every client-side route.
 */
exports.serveSeoPage = functions.https.onRequest(async (req, res) => {
    const requestPath = req.path.length > 1 ? req.path.replace(/\/+$/, "") : "/";

    try {
        let htmlString = readIndexTemplate();

        if (requestPath.startsWith("/tips/")) {
            const tipId = requestPath.split("/").filter(Boolean)[1];
            const tipDoc = await db.collection("tips").doc(tipId).get();

            if (!tipDoc.exists) {
                htmlString = applySeoMeta(htmlString, {
                    title: "Artículo no encontrado | Inmuévete",
                    description: "El artículo solicitado no está disponible.",
                    canonical: `${SITE_URL}${requestPath}`,
                    robots: "noindex, follow"
                });
                htmlString = injectRootContent(
                    htmlString,
                    buildStatusFallback("Artículo no encontrado", "El artículo solicitado no está disponible.")
                );
                res.set("Cache-Control", "no-store");
                return res.status(404).send(htmlString);
            }

            const tip = tipDoc.data();
            const title = `${tip.title || "Consejo inmobiliario"} | Blog Inmuévete`;
            const description = String(tip.summary || tip.content || "")
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 160);
            const canonical = `${SITE_URL}${requestPath}`;
            const image = tip.imageUrl || `${SITE_URL}/hero-bg.webp`;
            const published = tip.createdAt?.toDate ? tip.createdAt.toDate().toISOString() : undefined;

            htmlString = applySeoMeta(htmlString, {
                title,
                description,
                canonical,
                image,
                type: "article"
            });
            htmlString = appendJsonLd(htmlString, {
                "@context": "https://schema.org",
                "@type": "Article",
                headline: tip.title || "Consejo inmobiliario",
                description,
                image: [image],
                datePublished: published,
                dateModified: published,
                author: {
                    "@type": "Person",
                    name: tip.agentName || "Equipo Inmuévete"
                },
                publisher: {
                    "@type": "Organization",
                    name: "Inmuévete Inmobiliaria",
                    logo: {
                        "@type": "ImageObject",
                        url: `${SITE_URL}/logo.png`
                    }
                },
                mainEntityOfPage: canonical
            });
            htmlString = injectRootContent(htmlString, `<main data-seo-fallback="article">
  <nav aria-label="Migas de pan"><a href="${SITE_URL}/">Inicio</a> / <a href="${SITE_URL}/tips">Consejos</a></nav>
  <article>
    <h1>${escapeHtml(tip.title || "Consejo inmobiliario")}</h1>
    <p>${escapeHtml(description)}</p>
    <p><a href="${SITE_URL}/tips">Ver más consejos inmobiliarios</a></p>
  </article>
</main>`);
            res.set("Cache-Control", "public, max-age=300, s-maxage=900");
            return res.status(200).send(htmlString);
        }

        if (NOINDEX_ROUTES.has(requestPath)) {
            htmlString = applySeoMeta(htmlString, {
                title: "Inmuévete Inmobiliaria",
                description: "Acceso a las herramientas de Inmuévete Inmobiliaria.",
                canonical: `${SITE_URL}${requestPath}`,
                robots: "noindex, follow"
            });
            htmlString = injectRootContent(
                htmlString,
                buildStatusFallback("Área de acceso", "Esta sección forma parte de las herramientas privadas de Inmuévete Inmobiliaria.")
            );
            res.set("Cache-Control", "public, max-age=0, s-maxage=300");
            return res.status(200).send(htmlString);
        }

        const page = STATIC_SEO_PAGES[requestPath];
        if (!page) {
            htmlString = applySeoMeta(htmlString, {
                title: "Página no encontrada | Inmuévete",
                description: "La página solicitada no está disponible.",
                canonical: `${SITE_URL}${requestPath}`,
                robots: "noindex, follow"
            });
            htmlString = injectRootContent(
                htmlString,
                buildStatusFallback("Página no encontrada", "La página solicitada no está disponible.")
            );
            res.set("Cache-Control", "no-store");
            return res.status(404).send(htmlString);
        }

        htmlString = applySeoMeta(htmlString, {
            ...page,
            canonical: `${SITE_URL}${requestPath === "/" ? "/" : requestPath}`
        });

        let propertyLinks = [];
        if (requestPath === "/properties") {
            const availableProperties = await db.collection("properties")
                .where("status", "==", "disponible")
                .select("title", "location", "address")
                .limit(30)
                .get();
            propertyLinks = availableProperties.docs.map((document) => {
                const property = document.data();
                return {
                    id: document.id,
                    title: property.title,
                    location: property.location || property.address || "Arequipa"
                };
            });
        }

        htmlString = injectRootContent(htmlString, buildStaticFallback(requestPath, page, propertyLinks));

        if (requestPath.includes("arequipa") && requestPath !== "/") {
            htmlString = appendJsonLd(htmlString, {
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                itemListElement: [
                    { "@type": "ListItem", position: 1, name: "Inicio", item: `${SITE_URL}/` },
                    { "@type": "ListItem", position: 2, name: page.title, item: `${SITE_URL}${requestPath}` }
                ]
            });
        }

        res.set("Cache-Control", "public, max-age=300, s-maxage=3600");
        return res.status(200).send(htmlString);
    } catch (error) {
        console.error("Error serving SEO page", error);
        return res.status(500).send("Server Error");
    }
});

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
            htmlString = readIndexTemplate();
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
        const location = property.location || property.address || "Arequipa";
        const operation = String(property.type || "venta").toLowerCase() === "alquiler" ? "en alquiler" : "en venta";
        const baseTitle = property.title || `${property.category || "Propiedad"} ${operation} en ${location}`;
        const title = `${baseTitle} | Inmuévete`;
        const rawDesc = property.description || `${property.category || "Propiedad"} ${operation} en ${location}. Consulta precio, ubicación, características y coordina una visita con Inmuévete Inmobiliaria.`;
        const description = String(rawDesc).replace(/\s+/g, " ").trim().slice(0, 160);
        const image = (property.images && property.images.length > 0) ? property.images[0] : `${SITE_URL}/hero-bg.webp`;
        const url = `${SITE_URL}/property/${propertyId}`;
        const robots = property.status === "disponible"
            ? "index, follow, max-image-preview:large"
            : "noindex, follow";

        htmlString = applySeoMeta(htmlString, {
            title,
            description,
            canonical: url,
            image,
            robots
        });
        htmlString = appendJsonLd(htmlString, {
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "RealEstateListing",
                    name: property.title || property.category || "Propiedad",
                    description,
                    url,
                    image: property.images || [image],
                    datePosted: property.createdAt?.toDate ? property.createdAt.toDate().toISOString() : undefined,
                    address: {
                        "@type": "PostalAddress",
                        streetAddress: location,
                        addressRegion: "Arequipa",
                        addressCountry: "PE"
                    },
                    offers: {
                        "@type": "Offer",
                        price: property.price,
                        priceCurrency: property.currency || "USD",
                        availability: property.status === "disponible" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
                    }
                },
                {
                    "@type": "BreadcrumbList",
                    itemListElement: [
                        { "@type": "ListItem", position: 1, name: "Inicio", item: `${SITE_URL}/` },
                        { "@type": "ListItem", position: 2, name: "Propiedades", item: `${SITE_URL}/properties` },
                        { "@type": "ListItem", position: 3, name: property.title || "Propiedad", item: url }
                    ]
                }
            ]
        });

        htmlString = injectRootContent(
            htmlString,
            buildPropertyFallback(property, propertyId, description)
        );

        return res.status(200).send(htmlString);
    } catch (error) {
        console.error("Error serving property meta", error);
        // A temporary server error is preferable to a 200 response with an
        // empty React shell, which search engines can misclassify as Soft 404.
        res.set("Cache-Control", "no-store");
        res.set("Retry-After", "300");
        return res.status(503).send("Propiedad temporalmente no disponible");
    }
});
