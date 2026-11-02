/* eslint-disable */
/* global WebImporter */

/**
 * Parser for content-fragment-list (Content Fragment list container block).
 * Does NOT copy item content: each source item becomes a row referencing its
 * Content Fragment (/content/dam/luxtravelcf/fragments/{type}/{slug}).
 * Model (blocks/content-fragment-list/_content-fragment-list.json):
 *   content-fragment-list: classes (type -> block variant)
 *   content-fragment-list-item: fragment (aem-content-fragment), variation (hidden text)
 * Paths must match tools/content-fragments/fragments.json.
 * Block header: "content-fragment-list (<type>)", type from enclosing section class.
 */
const FRAGMENT_ROOT = '/content/dam/luxtravelcf/fragments';
const TYPES = ['curators', 'destinations', 'services', 'testimonials'];
const GRID_TYPES = {
  'curator-grid': 'curators',
  'destination-grid': 'destinations',
  'services-grid': 'services',
  quotes: 'testimonials',
};

function slugify(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function detectType(element) {
  const section = element.closest('section');
  if (section) {
    const found = TYPES.find((t) => section.classList.contains(t));
    if (found) return found;
  }
  const key = Object.keys(GRID_TYPES).find((c) => element.classList.contains(c));
  return key ? GRID_TYPES[key] : null;
}

function getItems(element, type) {
  switch (type) {
    case 'curators':
    case 'services':
      return [...element.querySelectorAll(':scope > article')];
    case 'destinations':
      return [...element.children].filter((c) => c.tagName === 'A' || c.tagName === 'ARTICLE');
    case 'testimonials':
      return [...element.querySelectorAll(':scope > blockquote')];
    default:
      return [];
  }
}

function getItemKey(item, type) {
  if (type === 'testimonials') {
    const cite = item.querySelector('cite');
    if (!cite) return '';
    return cite.textContent
      .replace(/^[\s—–-]+/, '') // leading em/en dash, hyphen, whitespace
      .replace(/,[^,]*$/, '') // trailing ", Location"
      .trim();
  }
  const h3 = item.querySelector('h3');
  return h3 ? h3.textContent.trim() : '';
}

export default function parse(element, { document }) {
  const type = detectType(element) || 'curators';
  const cells = [];

  getItems(element, type).forEach((item) => {
    const slug = slugify(getItemKey(item, type));
    if (!slug) return;
    const path = `${FRAGMENT_ROOT}/${type}/${slug}`;

    const fragmentCell = document.createDocumentFragment();
    fragmentCell.appendChild(document.createComment(' field:fragment '));
    const a = document.createElement('a');
    a.setAttribute('href', path);
    a.textContent = path;
    fragmentCell.appendChild(a);

    // variation: empty (defaults to master), no field hint on empty cells
    cells.push([fragmentCell, '']);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'content-fragment-list', variants: [type], cells });
  element.replaceWith(block);
}
