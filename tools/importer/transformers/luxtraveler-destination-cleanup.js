/* eslint-disable */
/* global WebImporter */

/**
 * Lux Traveler destination page cleanup (e.g. /destinations/amalfi-coast).
 * Selectors taken from migration-work/cleaned.html of the destination template.
 * Only acts on destination markup (amalfi-* classes), so it is a no-op on the home page.
 */
export default function transform(hookName, element, payload) {
  const doc = element.ownerDocument;
  const isDestination = !!element.querySelector('section.amalfi-hero, [class*="amalfi-"]');
  if (!isDestination) return;

  if (hookName === 'beforeTransform') {
    // The source ships placeholder metadata ("Figma Make App").
    const h1 = element.querySelector('section.amalfi-hero h1');
    const sub = element.querySelector('section.amalfi-hero .amalfi-hero-sub');
    const eyebrow = element.querySelector('section.amalfi-hero .amalfi-eyebrow-text');
    doc.title = `${eyebrow ? eyebrow.textContent.trim() : 'Destination'} | Lux Traveler`;
    const description = [h1, sub].filter(Boolean).map((e) => e.textContent.trim().replace(/\.?$/, '.')).join(' ');
    ['meta[name="description"]', 'meta[property="og:description"]'].forEach((sel) => {
      const meta = doc.querySelector(sel);
      if (meta && description) meta.setAttribute('content', description);
    });
    const ogTitle = doc.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', doc.title);

    // Global chrome (header + footer are migrated separately).
    WebImporter.DOMUtils.remove(element, ['header.nav', 'footer.footer', 'footer']);

    // Overlays and decorative images: dashes, rules, card dividers, column divider.
    WebImporter.DOMUtils.remove(element, [
      '.amalfi-hero-overlay',
      '.amalfi-cta-overlay',
      'img.amalfi-dash',
      '.amalfi-rule-wrap',
      // aria-hidden decorative images; the hero and CTA background photos are aria-hidden too but are content
      'img[aria-hidden="true"]:not(.amalfi-hero-bg, .amalfi-cta-bg)',
    ]);

    // Eyebrow labels become a paragraph right before their heading.
    element.querySelectorAll('.amalfi-eyebrow').forEach((eb) => {
      const p = doc.createElement('p');
      p.textContent = eb.textContent.trim();
      eb.replaceWith(p);
    });

    // Section heads: flatten the inner wrapper so eyebrow, heading and intro are siblings.
    element.querySelectorAll('.amalfi-section-head > div, .amalfi-cta-content > div').forEach((wrap) => {
      wrap.replaceWith(...wrap.childNodes);
    });

    // Source CTAs are <button>s that open the contact dialog: link them to #enquiry,
    // which opens the same dialog in EDS (bold link = primary button).
    element.querySelectorAll('button.amalfi-cta').forEach((button) => {
      const a = doc.createElement('a');
      a.href = '#enquiry';
      a.textContent = button.textContent.trim();
      const strong = doc.createElement('strong');
      strong.append(a);
      const p = doc.createElement('p');
      p.append(strong);
      button.replaceWith(p);
    });
  }

  if (hookName === 'afterTransform') {
    WebImporter.DOMUtils.remove(element, ['script', 'style', 'noscript', 'link', 'iframe', 'header', 'footer', 'nav']);
    element.querySelectorAll('*').forEach((el) => {
      if (el.classList && [...el.classList].some((c) => /^sr(-d\d+|-in)?$/.test(c))) {
        [...el.classList].filter((c) => /^sr(-d\d+|-in)?$/.test(c)).forEach((c) => el.classList.remove(c));
      }
    });
  }
}
