import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * Footer fragment locations, in order of preference:
 * the page's footer metadata (AEM author resolves this to the site's footer page),
 * the local content folder (local preview only) and the site root (Edge Delivery).
 * @returns {string[]}
 */
function footerPaths() {
  const footerMeta = getMetadata('footer');
  const paths = [];
  if (footerMeta) paths.push(new URL(footerMeta, window.location).pathname);
  if (window.location.hostname === 'localhost') paths.push('/content/footer');
  paths.push('/footer');
  return [...new Set(paths)];
}

async function loadFooter() {
  // eslint-disable-next-line no-restricted-syntax
  for (const path of footerPaths()) {
    // eslint-disable-next-line no-await-in-loop
    const fragment = await loadFragment(path);
    if (fragment) return fragment;
  }
  return null;
}

/**
 * Splits a section's content into columns: a new column starts at each heading.
 * @param {Element} wrapper The section's default content wrapper
 */
function buildColumns(wrapper) {
  const columns = [];
  [...wrapper.children].forEach((el) => {
    if (!columns.length || /^H[1-6]$/.test(el.tagName)) {
      const column = document.createElement('div');
      column.className = 'footer-column';
      columns.push(column);
    }
    columns[columns.length - 1].append(el);
  });
  wrapper.replaceChildren(...columns);
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const fragment = await loadFooter();
  block.textContent = '';
  if (!fragment) return;

  const sections = [...fragment.children];
  const [top, bottom] = sections;
  if (top) {
    top.classList.add('footer-top');
    const wrapper = top.querySelector('.default-content-wrapper');
    if (wrapper) buildColumns(wrapper);
    // the brand is a plain text link, not a button
    top.querySelectorAll('.footer-column:first-child .button').forEach((link) => {
      link.className = '';
      link.closest('.button-wrapper, .button-container')?.removeAttribute('class');
    });
    top.querySelector('.footer-column:first-child p:first-child')?.classList.add('footer-brand');
  }
  bottom?.classList.add('footer-bottom');

  block.append(...sections);
}
