/* eslint-disable */
/* global WebImporter */

/**
 * Lux Traveler cleanup transformer.
 * Source: client-rendered Figma Make React app (https://speak-salsa-30519598.figma.site/).
 * Selectors taken from migration-work/cleaned.html.
 */
export default function transform(hookName, element, payload) {
  if (hookName === 'beforeTransform') {
    // The source ships placeholder metadata ("Figma Make App" + an unrelated description).
    const doc = element.ownerDocument;
    doc.title = 'Lux Traveler | Bespoke Travel Curation';
    const description = 'Architects of the extraordinary. Bespoke travel curation for the global elite.';
    ['meta[name="description"]', 'meta[property="og:description"]'].forEach((sel) => {
      const meta = doc.querySelector(sel);
      if (meta) meta.setAttribute('content', description);
    });
    const ogTitle = doc.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', doc.title);

    // Global chrome: header (header.nav) and footer (footer.footer#journal).
    WebImporter.DOMUtils.remove(element, [
      'header.nav',
      'footer.footer',
      'footer#journal',
    ]);

    // Decorative overlay inside the hero.
    WebImporter.DOMUtils.remove(element, ['.hero-video-overlay']);

    // Empty decorative spans (rules) around the tagline text.
    element.querySelectorAll('.tagline > span').forEach((span) => {
      if (!span.textContent.trim() && !span.querySelector('img, picture, svg')) {
        span.remove();
      }
    });

    // Empty decorative <i> rule inside eyebrow labels.
    element.querySelectorAll('.eyebrow > i').forEach((i) => {
      if (!i.textContent.trim()) i.remove();
    });

    // Closing CTA: the background image must be the first image of the
    // section's default content. Ensure it sits first in the section.
    const closing = element.querySelector('section.closing, #contact');
    if (closing) {
      // The photo is an inline CSS background (behind a light gradient): turn it into an image.
      const bgUrl = (closing.getAttribute('style') || '').match(/url\(["']?([^"')]+)["']?\)/);
      if (bgUrl && !closing.querySelector(':scope > img')) {
        const img = element.ownerDocument.createElement('img');
        img.src = bgUrl[1];
        img.alt = '';
        closing.prepend(img);
        closing.removeAttribute('style');
      }
      const bg = closing.querySelector(':scope > img');
      if (bg && closing.firstElementChild !== bg) {
        closing.prepend(bg);
      }
      // The source CTA is a <button> that opens the contact dialog: link it to #enquiry,
      // which opens the same dialog in EDS.
      closing.querySelectorAll('button').forEach((button) => {
        const a = element.ownerDocument.createElement('a');
        a.href = '#enquiry';
        a.textContent = button.textContent.trim();
        // bold link = primary button in EDS
        const strong = element.ownerDocument.createElement('strong');
        strong.append(a);
        const p = element.ownerDocument.createElement('p');
        p.append(strong);
        button.replaceWith(p);
      });
    }
  }

  if (hookName === 'afterTransform') {
    // Non-authorable elements.
    WebImporter.DOMUtils.remove(element, [
      'script',
      'style',
      'noscript',
      'link',
      'iframe',
      'header',
      'footer',
      'nav',
    ]);

    // Reveal-animation and tracking attributes are irrelevant for authoring.
    element.querySelectorAll('*').forEach((el) => {
      ['data-track', 'data-analytics', 'onclick', 'data-sr'].forEach((attr) => {
        if (el.hasAttribute(attr)) el.removeAttribute(attr);
      });
      if (el.classList && (el.classList.contains('sr') || el.classList.contains('sr-in'))) {
        [...el.classList]
          .filter((c) => c === 'sr' || c === 'sr-in' || /^sr-d\d+$/.test(c))
          .forEach((c) => el.classList.remove(c));
      }
    });
  }
}
