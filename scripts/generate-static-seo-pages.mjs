import fs from 'node:fs';
import path from 'node:path';
import { SEO_LANDING_PAGES } from '../src/data/seoLandingPages.js';

const SITE_URL = 'https://inmueveteinmobiliaria.com';
const distDirectory = path.resolve('dist');
const templatePath = path.join(distDirectory, 'index.html');

const pages = {
  '/': ['Inmobiliaria en Arequipa | Casas y departamentos | Inmuévete', 'Compra, vende o alquila casas, departamentos y terrenos en Arequipa con asesoría inmobiliaria especializada y propiedades verificadas.'],
  '/properties': ['Propiedades en venta y alquiler en Arequipa | Inmuévete', 'Explora casas, departamentos, terrenos y locales disponibles en Arequipa. Compara precios, ubicación y características en una sola plataforma.'],
  '/about': ['Inmuévete: inmobiliaria y asesoría en Arequipa', 'Conoce a Inmuévete Inmobiliaria y nuestro servicio de asesoría para comprar, vender, alquilar e invertir en propiedades en Arequipa.'],
  '/contact': ['Contacta una inmobiliaria en Arequipa | Inmuévete', 'Habla con un asesor inmobiliario en Arequipa para comprar, vender o alquilar una propiedad. Atención personalizada por WhatsApp.'],
  '/tips': ['Blog inmobiliario de Arequipa | Guías y consejos', 'Guías para comprar, vender, alquilar e invertir en propiedades en Arequipa. Consejos inmobiliarios claros del equipo de Inmuévete.'],
  '/inmuebles-en-arequipa': ['Inmuebles en Arequipa en venta y alquiler | Inmuévete', 'Encuentra casas, departamentos, terrenos y locales en venta o alquiler en Arequipa. Propiedades verificadas y asesoría inmobiliaria personalizada.'],
  '/departamentos-en-venta-arequipa': ['Departamentos en venta en Arequipa | Inmuévete', 'Departamentos en venta en Arequipa: compara precios, áreas, dormitorios y ubicaciones. Opciones verificadas con asesoría para comprar con confianza.'],
  '/casas-en-venta-arequipa': ['Casas en venta en Arequipa | Inmuévete Inmobiliaria', 'Casas en venta en Arequipa con fotos, precios, áreas y ubicación. Encuentra opciones para vivir o invertir con asesoría inmobiliaria especializada.'],
  '/terrenos-en-venta-arequipa': ['Terrenos en venta en Arequipa | Inmuévete', 'Terrenos urbanos, rústicos y comerciales en venta en Arequipa. Compara ubicación, metraje, precio y potencial de inversión con asesoría experta.'],
  '/departamentos-en-alquiler-arequipa': ['Departamentos en alquiler en Arequipa | Inmuévete', 'Departamentos en alquiler en Arequipa: compara ubicación, renta, dormitorios y equipamiento. Contacta directamente a un asesor inmobiliario.'],
  '/casas-en-alquiler-arequipa': ['Casas en alquiler en Arequipa | Inmuévete', 'Casas en alquiler en Arequipa para familias y empresas. Revisa precios, áreas, dormitorios y ubicación con acompañamiento inmobiliario.']
};

const noindexPages = [
  '/search', '/login', '/register', '/forgot-password', '/setup',
  '/agent-dashboard', '/client-dashboard', '/superadmin'
];

const popularSearches = [
  ['/inmuebles-en-arequipa', 'Inmuebles en Arequipa'],
  ['/departamentos-en-venta-arequipa', 'Departamentos en venta en Arequipa'],
  ['/casas-en-venta-arequipa', 'Casas en venta en Arequipa'],
  ['/terrenos-en-venta-arequipa', 'Terrenos en venta en Arequipa'],
  ['/departamentos-en-alquiler-arequipa', 'Departamentos en alquiler en Arequipa'],
  ['/casas-en-alquiler-arequipa', 'Casas en alquiler en Arequipa']
];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function replaceMeta(html, attribute, key, value) {
  const expression = new RegExp(`<meta\\s+${attribute}=["']${key}["'][^>]*>`, 'i');
  const tag = `<meta ${attribute}="${key}" content="${escapeHtml(value)}" />`;
  return expression.test(html)
    ? html.replace(expression, tag)
    : html.replace(/<\/head>/i, `  ${tag}\n</head>`);
}

function injectRootContent(html, content) {
  const root = /<div\s+id=["']root["']\s*><\/div>/i;
  return root.test(html)
    ? html.replace(root, `<div id="root">${content}</div>`)
    : html;
}

function decodeXml(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function readPropertyLinks() {
  const sitemapPath = path.resolve('public/sitemap.xml');
  if (!fs.existsSync(sitemapPath)) return [];

  const sitemap = fs.readFileSync(sitemapPath, 'utf8');
  const entries = [];

  for (const match of sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const block = match[1];
    const location = block.match(/<loc>([^<]+)<\/loc>/)?.[1];
    if (!location?.includes('/property/')) continue;
    const imageTitle = block.match(/<image:title>([^<]+)<\/image:title>/)?.[1];
    entries.push({
      url: decodeXml(location),
      title: decodeXml(imageTitle) || `Propiedad disponible en Arequipa ${entries.length + 1}`
    });
  }

  return entries;
}

function buildFallback(route, title, description, propertyLinks) {
  const heading = title.split('|')[0].trim();
  const landing = SEO_LANDING_PAGES[route];
  const contextualContent = landing
    ? `<p>${escapeHtml(landing.intro)}</p><p>${escapeHtml(landing.details)}</p>${landing.faq?.length ? `<h2>Preguntas frecuentes</h2>${landing.faq.map(([question, answer]) => `<section><h3>${escapeHtml(question)}</h3><p>${escapeHtml(answer)}</p></section>`).join('')}` : ''}`
    : `<p>${escapeHtml(description)}</p>`;
  const searchLinks = `<h2>Búsquedas populares</h2><ul>${popularSearches.map(([href, label]) => `<li><a href="${SITE_URL}${href}">${escapeHtml(label)}</a></li>`).join('')}</ul>`;
  const listingLinks = route === '/properties' && propertyLinks.length
    ? `<h2>Propiedades disponibles</h2><ul>${propertyLinks.map(({ url, title: propertyTitle }) => `<li><a href="${escapeHtml(url)}">${escapeHtml(propertyTitle)}</a></li>`).join('')}</ul>`
    : '';

  return `<main data-seo-fallback="static-page">
  <nav aria-label="Migas de pan"><a href="${SITE_URL}/">Inicio</a> / <span>${escapeHtml(heading)}</span></nav>
  <h1>${escapeHtml(landing?.title || heading)}</h1>
  ${contextualContent}
  ${route === '/' || route === '/properties' || landing ? searchLinks : `<p><a href="${SITE_URL}/properties">Explorar propiedades disponibles</a></p>`}
  ${listingLinks}
</main>`.replace(/^[ \t]+$/gm, '');
}

function buildHtml(template, route, title, description, robots, propertyLinks = []) {
  const canonical = `${SITE_URL}${route}`;
  let html = template.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  html = html.replace(/<link\s+rel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${canonical}" />`);
  html = replaceMeta(html, 'name', 'description', description);
  html = replaceMeta(html, 'name', 'robots', robots);
  html = replaceMeta(html, 'property', 'og:url', canonical);
  html = replaceMeta(html, 'property', 'og:title', title);
  html = replaceMeta(html, 'property', 'og:description', description);
  html = replaceMeta(html, 'property', 'twitter:url', canonical);
  html = replaceMeta(html, 'property', 'twitter:title', title);
  html = replaceMeta(html, 'property', 'twitter:description', description);

  if (robots.startsWith('index')) {
    const pageType = route === '/about'
      ? 'AboutPage'
      : route === '/contact'
        ? 'ContactPage'
        : route === '/tips'
          ? 'Blog'
          : 'CollectionPage';
    const schema = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': pageType,
          name: title,
          description,
          url: canonical,
          isPartOf: { '@id': `${SITE_URL}/#website` }
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${SITE_URL}/` },
            { '@type': 'ListItem', position: 2, name: title, item: canonical }
          ]
        }
      ]
    };
    html = html.replace(/<\/head>/i, `  <script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>\n</head>`);
    html = injectRootContent(html, buildFallback(route, title, description, propertyLinks));
  }

  return html;
}

function writeRoute(route, html) {
  const filename = route === '/' ? 'index.html' : `${route.slice(1)}.html`;
  fs.writeFileSync(path.join(distDirectory, filename), html);
}

const template = fs.readFileSync(templatePath, 'utf8');
const propertyLinks = readPropertyLinks();

for (const [route, [title, description]] of Object.entries(pages)) {
  writeRoute(route, buildHtml(template, route, title, description, 'index, follow, max-image-preview:large', propertyLinks));
}

for (const route of noindexPages) {
  writeRoute(route, buildHtml(
    template,
    route,
    'Inmuévete Inmobiliaria',
    'Acceso a las herramientas de Inmuévete Inmobiliaria.',
    'noindex, follow'
  ));
}

console.log(`Generated ${Object.keys(pages).length} indexable and ${noindexPages.length} noindex route pages.`);
