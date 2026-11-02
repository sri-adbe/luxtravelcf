/* eslint-disable */
/* global WebImporter */

/**
 * Parser for columns-text-image (Columns convention: one row, one cell per column).
 * Source: section.amalfi-intro (text + image) and section.amalfi-cultural (image above text).
 * Model (blocks/columns-text-image/_columns-text-image.json): columns block, one row with two
 * cells; cells hold default content (text, image). Option image-top: image stacked above the text.
 * Cell order follows the source; a source whose first child is the image gets image-top.
 */
export default function parse(element, { document }) {
  const children = [...element.children];
  const imageWrap = children.find((c) => c.querySelector('img') && !c.querySelector('h1, h2, h3'));
  const textWrap = children.find((c) => c !== imageWrap && c.querySelector('h1, h2, h3, p'));
  if (!textWrap) return;

  // text cell: eyebrow, heading, paragraphs (decorative rules/dashes are drawn by CSS)
  const textCell = document.createDocumentFragment();
  [...textWrap.children].forEach((el) => {
    if (!el.textContent.trim() && !el.querySelector('img[alt]:not([alt=""])')) return;
    textCell.appendChild(el);
  });

  // image cell
  const imageCell = document.createDocumentFragment();
  const img = imageWrap && imageWrap.querySelector('img');
  if (img) imageCell.appendChild(img);

  const imageFirst = imageWrap && children.indexOf(imageWrap) < children.indexOf(textWrap);
  const cells = [imageFirst ? [imageCell, textCell] : [textCell, imageCell]];
  const block = WebImporter.Blocks.createBlock(document, {
    name: 'columns-text-image',
    variants: imageFirst ? ['image-top'] : [],
    cells,
  });
  element.replaceWith(block);
}
