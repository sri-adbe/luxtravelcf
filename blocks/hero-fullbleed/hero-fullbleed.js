import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Full-bleed hero: background image with overlay, centered heading, subline and CTA.
 * Authored structure (rows, any order tolerated):
 *   - a row/cell containing the background picture
 *   - a row/cell containing rich text (heading, paragraph(s), CTA link)
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  const media = document.createElement('div');
  media.className = 'hero-fullbleed-media';
  const content = document.createElement('div');
  content.className = 'hero-fullbleed-content';

  rows.forEach((row) => {
    [...row.children].forEach((cell) => {
      const picture = cell.querySelector('picture');
      if (picture && !media.querySelector('picture')) {
        media.append(picture);
      }
      // move remaining authored content (text, links) into the content area,
      // dropping whitespace and wrappers left empty after the picture moved out
      [...cell.childNodes].forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) return;
        if (node.nodeType === Node.ELEMENT_NODE && !node.textContent.trim()
          && !node.querySelector('img, picture')) return;
        content.append(node);
      });
    });
  });

  block.replaceChildren();
  if (media.querySelector('picture')) {
    block.append(media);
  } else {
    block.classList.add('no-image');
  }
  block.append(content);

  // the last paragraph that contains only links becomes the CTA group
  content.querySelectorAll('p').forEach((p) => {
    const links = p.querySelectorAll('a');
    if (links.length && [...p.childNodes].every((n) => n.nodeName === 'A'
      || n.nodeName === 'STRONG' || n.nodeName === 'EM'
      || (n.nodeType === Node.TEXT_NODE && !n.textContent.trim()))) {
      p.classList.add('hero-fullbleed-cta');
    }
  });

  // optimize same-origin, non-SVG background images; hero image is LCP, load eagerly
  media.querySelectorAll('picture > img').forEach((img) => {
    const url = new URL(img.src, window.location.href);
    if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) return;
    const optimized = createOptimizedPicture(img.src, img.alt, true, [
      { media: '(min-width: 900px)', width: '2000' },
      { width: '900' },
    ]);
    img.closest('picture').replaceWith(optimized);
  });
}
