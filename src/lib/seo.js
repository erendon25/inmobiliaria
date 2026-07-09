export const SITE_URL = 'https://inmueveteinmobiliaria.com';

export function getCanonicalUrl(pathname) {
  const cleanPath = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
  return `${SITE_URL}${cleanPath === '/' ? '/' : cleanPath}`;
}

export function setPageTitle(title) {
  document.title = title;

  let titleTag = document.querySelector('title');
  if (!titleTag) {
    titleTag = document.createElement('title');
    document.head.appendChild(titleTag);
  }

  titleTag.textContent = title;
}

export function setCanonicalUrl(url) {
  let canonical = document.querySelector('link[rel="canonical"]');

  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }

  canonical.setAttribute('href', url);
}

export function setMetaProperty(property, content) {
  if (!content) return;

  let meta = document.querySelector(`meta[property="${property}"]`);

  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('property', property);
    document.head.appendChild(meta);
  }

  meta.setAttribute('content', content);
}

export function setMetaName(name, content) {
  if (!content) return;

  let meta = document.querySelector(`meta[name="${name}"]`);

  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', name);
    document.head.appendChild(meta);
  }

  meta.setAttribute('content', content);
}
