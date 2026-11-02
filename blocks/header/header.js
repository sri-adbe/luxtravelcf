import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

// links to this anchor open the nav dialog (the contact enquiry)
const DIALOG_HASH = '#enquiry';

/**
 * Nav fragment locations, in order of preference:
 * the page's nav metadata (AEM author resolves this to the site's nav page),
 * the local content folder (local preview only) and the site root (Edge Delivery).
 * @returns {string[]}
 */
function navPaths() {
  const navMeta = getMetadata('nav');
  const paths = [];
  if (navMeta) paths.push(new URL(navMeta, window.location).pathname);
  if (window.location.hostname === 'localhost') paths.push('/content/nav');
  paths.push('/nav');
  return [...new Set(paths)];
}

async function loadNav() {
  // eslint-disable-next-line no-restricted-syntax
  for (const path of navPaths()) {
    // eslint-disable-next-line no-await-in-loop
    const fragment = await loadFragment(path);
    if (fragment) return fragment;
  }
  return null;
}

/**
 * Builds a modal dialog from an authored nav section (eyebrow, heading, text, CTA).
 * The backdrop sits below the sticky header, like on the source site.
 * @param {Element} section
 * @returns {{ open: Function }}
 */
function buildDialog(section) {
  const backdrop = document.createElement('div');
  backdrop.className = 'nav-dialog-backdrop';
  backdrop.hidden = true;

  const dialog = document.createElement('div');
  dialog.className = 'nav-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  const heading = section.querySelector('h1, h2, h3');
  if (heading) {
    heading.id = heading.id || 'nav-dialog-title';
    dialog.setAttribute('aria-labelledby', heading.id);
  }

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'nav-dialog-close';
  close.setAttribute('aria-label', 'Close');
  close.textContent = '×';

  const body = section.querySelector('.default-content-wrapper') || section;
  const eyebrow = body.querySelector(':scope > p:has(+ h1, + h2, + h3)');
  if (eyebrow) eyebrow.classList.add('nav-dialog-eyebrow');
  dialog.append(close, ...body.children);
  backdrop.append(dialog);
  document.body.append(backdrop);

  let opener = null;
  const focusables = () => [...dialog.querySelectorAll('a[href], button')];

  function hide() {
    backdrop.hidden = true;
    document.removeEventListener('keydown', onKeydown); // eslint-disable-line no-use-before-define
    opener?.focus();
  }

  function onKeydown(e) {
    if (e.key === 'Escape') {
      hide();
    } else if (e.key === 'Tab') {
      // keep focus inside the dialog
      const items = focusables();
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  close.addEventListener('click', hide);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) hide(); });

  return {
    open(trigger) {
      opener = trigger;
      backdrop.hidden = false;
      document.addEventListener('keydown', onKeydown);
      close.focus();
    },
  };
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const fragment = await loadNav();
  block.textContent = '';
  if (!fragment) return;

  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-label', 'Main');
  const sections = [...fragment.children];
  ['brand', 'sections', 'tools'].forEach((name, i) => sections[i]?.classList.add(`nav-${name}`));
  nav.append(...sections.slice(0, 3));

  // the brand is a plain text link, not a button
  nav.querySelectorAll('.nav-brand .button').forEach((link) => {
    link.className = '';
    link.closest('.button-wrapper, .button-container')?.removeAttribute('class');
  });

  // an optional fourth section is a dialog, opened by the tools call to action
  // and by any link to #enquiry on the page (including links rendered later by blocks)
  const dialogSection = sections[3];
  const cta = nav.querySelector('.nav-tools a.button') || nav.querySelector('.nav-tools a');
  if (dialogSection) {
    const dialog = buildDialog(dialogSection);
    const isTrigger = (link) => link === cta || link.hash === DIALOG_HASH;
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (!link || !isTrigger(link)) return;
      e.preventDefault();
      dialog.open(link);
    });
    document.querySelectorAll(`a[href$="${DIALOG_HASH}"]`).forEach((link) => link.setAttribute('aria-haspopup', 'dialog'));
    cta?.setAttribute('aria-haspopup', 'dialog');
    if (window.location.hash === DIALOG_HASH) dialog.open(cta);
  }

  // links to home page sections (e.g. /#services) scroll in place when that section is on this page
  nav.addEventListener('click', (e) => {
    const link = e.target.closest('a[href*="#"]');
    if (!link?.hash || link.hash === DIALOG_HASH || link.origin !== window.location.origin) return;
    const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth' });
    window.history.pushState(null, '', link.hash);
  });

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}
