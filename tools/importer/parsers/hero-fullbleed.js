/* eslint-disable */
/* global WebImporter */

/**
 * Parser for hero-fullbleed.
 * Source: section.hero-video (#top)
 * Model (blocks/hero-fullbleed/_hero-fullbleed.json): image (+ imageAlt collapsed), text (richtext)
 * Row 1: background image. Row 2: h1 headline, subline, CTA link.
 * Source CTA is a <button> without href; emitted as a link to #contact.
 */
export default function parse(element, { document }) {
  const cells = [];

  // Row 1: background image
  const img = element.querySelector('img.hero-video-bg') || element.querySelector('img');
  if (img) {
    const imageCell = document.createDocumentFragment();
    imageCell.appendChild(document.createComment(' field:image '));
    imageCell.appendChild(img);
    cells.push([imageCell]);
  } else {
    cells.push(['']);
  }

  // Row 2: rich text (headline, subline, CTA)
  const content = element.querySelector('.hero-video-content') || element;
  const textCell = document.createDocumentFragment();
  const heading = content.querySelector('h1, .hero-video-headline');
  const sub = content.querySelector('p.hero-video-sub') || content.querySelector('p');
  const ctaSource = content.querySelector('.hero-video-cta, a, button');

  const textNodes = [];
  if (heading) textNodes.push(heading);
  if (sub) textNodes.push(sub);
  if (ctaSource && ctaSource.textContent.trim()) {
    const p = document.createElement('p');
    const a = document.createElement('a');
    const href = ctaSource.tagName === 'A' && ctaSource.getAttribute('href')
      ? ctaSource.getAttribute('href')
      : '#contact';
    a.setAttribute('href', href);
    a.textContent = ctaSource.textContent.trim();
    // bold link = primary button in EDS
    const strong = document.createElement('strong');
    strong.appendChild(a);
    p.appendChild(strong);
    textNodes.push(p);
  }

  if (textNodes.length) {
    textCell.appendChild(document.createComment(' field:text '));
    textNodes.forEach((n) => textCell.appendChild(n));
    cells.push([textCell]);
  } else {
    cells.push(['']);
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-fullbleed', cells });
  element.replaceWith(block);
}
