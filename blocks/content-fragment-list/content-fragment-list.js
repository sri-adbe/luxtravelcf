import { moveInstrumentation } from '../../scripts/scripts.js';
import { fetchContentFragment, getImageUrl } from '../../scripts/content-fragments.js';

/**
 * Creates an element with optional class, text and Universal Editor field instrumentation.
 * @param {string} tag
 * @param {object} [options]
 * @returns {Element}
 */
function el(tag, {
  className, text, prop, type = 'text', label,
} = {}) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  if (prop) {
    element.dataset.aueProp = prop;
    element.dataset.aueType = type;
    element.dataset.aueLabel = label || prop;
  }
  return element;
}

function link(href, className) {
  const a = el(href ? 'a' : 'span', { className });
  if (href) a.href = href;
  return a;
}

function picture(image, alt, width, { prop = 'image', label = 'Image', className = 'content-fragment-list-image' } = {}) {
  const src = getImageUrl(image, width);
  if (!src) return null;
  const pic = el('picture', { className });
  const img = el('img', { prop, type: 'media', label });
  img.src = src;
  img.alt = alt || '';
  img.loading = 'lazy';
  if (image.width && image.height) {
    img.width = image.width;
    img.height = image.height;
  }
  pic.append(img);
  return pic;
}

const renderers = {
  curators: {
    query: 'curatorByPath',
    label: 'Curator',
    render: (cf) => {
      const card = el('article', { className: 'content-fragment-list-card' });
      const body = el('div', { className: 'content-fragment-list-body' });
      body.append(
        el('p', {
          className: 'content-fragment-list-eyebrow', text: cf.region, prop: 'region', label: 'Region',
        }),
        el('h3', { text: cf.name, prop: 'name', label: 'Name' }),
        el('p', {
          className: 'content-fragment-list-text', text: cf.bio?.plaintext, prop: 'bio', label: 'Short Bio',
        }),
      );
      if (cf.ctaLabel) {
        const cta = link(cf.ctaLink, 'content-fragment-list-cta');
        Object.assign(cta.dataset, { aueProp: 'ctaLabel', aueType: 'text', aueLabel: 'Button Label' });
        cta.textContent = cf.ctaLabel;
        body.append(cta);
      }
      card.append(...[picture(cf.image, `Travel curator ${cf.name}`, 750), body].filter(Boolean));
      return card;
    },
  },
  destinations: {
    query: 'destinationByPath',
    label: 'Destination',
    render: (cf) => {
      const card = cf.link ? link(cf.link, 'content-fragment-list-card') : el('article', { className: 'content-fragment-list-card' });
      const body = el('div', { className: 'content-fragment-list-body' });
      body.append(
        el('p', {
          className: 'content-fragment-list-eyebrow', text: cf.country, prop: 'country', label: 'Country',
        }),
        el('h3', { text: cf.name, prop: 'name', label: 'Name' }),
        el('p', {
          className: 'content-fragment-list-text', text: cf.tagline, prop: 'tagline', label: 'Tagline',
        }),
      );
      card.append(...[picture(cf.image, `${cf.name} scenic view`, 1200), body].filter(Boolean));
      return card;
    },
  },
  services: {
    query: 'serviceByPath',
    label: 'Service',
    render: (cf) => {
      const card = el('article', { className: 'content-fragment-list-card' });
      card.append(
        el('span', {
          className: 'content-fragment-list-number', text: cf.number, prop: 'number', label: 'Number',
        }),
        el('h3', { text: cf.title, prop: 'title', label: 'Title' }),
        el('p', {
          className: 'content-fragment-list-text', text: cf.description?.plaintext, prop: 'description', label: 'Description',
        }),
      );
      if (cf.link) {
        const arrow = link(cf.link, 'content-fragment-list-arrow');
        arrow.setAttribute('aria-label', cf.title);
        arrow.textContent = '↗';
        card.append(arrow);
      }
      return card;
    },
  },
  testimonials: {
    query: 'testimonialByPath',
    label: 'Testimonial',
    render: (cf) => {
      const quote = el('blockquote', { className: `content-fragment-list-card${cf.featured ? ' featured' : ''}` });
      const text = el('p', { prop: 'quote', label: 'Quote' });
      text.textContent = `"${cf.quote?.plaintext || ''}"`;
      const cite = el('cite');
      const author = el('span', { text: cf.author, prop: 'author', label: 'Author' });
      const location = el('span', { text: cf.location, prop: 'location', label: 'Location' });
      cite.append('— ', author);
      if (cf.location) cite.append(', ', location);
      quote.append(text, cite);
      return quote;
    },
  },
  experiences: {
    query: 'experienceByPath',
    label: 'Experience',
    render: (cf) => {
      const card = el('article', { className: 'content-fragment-list-card' });
      const head = el('div', { className: 'content-fragment-list-head' });
      head.append(el('h3', { text: cf.title, prop: 'title', label: 'Title' }));
      const icon = picture(cf.icon, '', 48, { prop: 'icon', label: 'Icon', className: 'content-fragment-list-icon' });
      if (icon) head.append(icon);
      card.append(head, el('p', {
        className: 'content-fragment-list-text', text: cf.description?.plaintext, prop: 'description', label: 'Description',
      }));
      return card;
    },
  },
  stays: {
    query: 'stayByPath',
    label: 'Stay',
    render: (cf) => {
      const card = el('article', { className: 'content-fragment-list-card' });
      card.append(...[
        picture(cf.image, cf.name, 1200),
        el('h3', { text: cf.name, prop: 'name', label: 'Name' }),
        el('p', {
          className: 'content-fragment-list-text', text: cf.description?.plaintext, prop: 'description', label: 'Description',
        }),
      ].filter(Boolean));
      return card;
    },
  },
  features: {
    query: 'featureByPath',
    label: 'Feature',
    render: (cf) => {
      const card = el('div', { className: 'content-fragment-list-card' });
      card.append(
        el('h3', { text: cf.title, prop: 'title', label: 'Title' }),
        el('p', {
          className: 'content-fragment-list-text', text: cf.description?.plaintext, prop: 'description', label: 'Description',
        }),
      );
      return card;
    },
  },
};

/**
 * Reads the fragment path and variation from an item row.
 * @param {Element} row
 * @returns {{path: string, variation: string}}
 */
function readItem(row) {
  const [fragmentCell, variationCell] = row.children;
  const anchor = fragmentCell?.querySelector('a');
  // the link text holds the repository path; the href may be rewritten for delivery
  const raw = (anchor?.textContent || anchor?.getAttribute('href') || fragmentCell?.textContent || '').trim();
  const path = raw.startsWith('/content/dam/') ? raw : (() => {
    try { return new URL(raw, window.location.href).pathname; } catch (e) { return raw; }
  })();
  return { path: path.replace(/\.html$/, ''), variation: variationCell?.textContent.trim() };
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const type = Object.keys(renderers).find((name) => block.classList.contains(name)) || 'curators';
  const { query, label, render } = renderers[type];

  const ul = document.createElement('ul');
  const items = [...block.children].map(async (row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);
    ul.append(li);

    const { path, variation } = readItem(row);
    if (!path) return;
    const cf = await fetchContentFragment(query, path, variation);
    if (!cf) {
      li.classList.add('content-fragment-list-missing');
      return;
    }
    const content = render(cf);
    // instrument the fragment so it can be edited in place in Universal Editor
    Object.assign(content.dataset, {
      aueResource: `urn:aemconnection:${path}/jcr:content/data/${variation || 'master'}`,
      aueType: 'reference',
      aueFilter: 'cf',
      aueLabel: `${label}: ${cf.name || cf.title || cf.author || ''}`.trim(),
    });
    li.append(content);
  });

  block.replaceChildren(ul);
  await Promise.all(items);
}
