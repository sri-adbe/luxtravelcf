import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

function canOptimize(src) {
  try {
    const url = new URL(src, window.location.href);
    return url.origin === window.location.origin && !url.pathname.toLowerCase().endsWith('.svg');
  } catch (e) {
    return false;
  }
}

/**
 * Cards Gallery: one card per row (image cell, optional caption cell), square images in a row.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) {
        div.className = 'cards-gallery-card-image';
      } else {
        div.className = 'cards-gallery-card-body';
        // keep an empty caption cell in the DOM (UE editable) but out of the layout
        if (!div.textContent.trim() && !div.querySelector('picture')) div.hidden = true;
      }
    });
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => {
    if (!canOptimize(img.src)) return;
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });
  block.replaceChildren(ul);
}
