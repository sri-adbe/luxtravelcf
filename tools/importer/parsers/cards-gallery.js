/* eslint-disable */
/* global WebImporter */

/**
 * Parser for cards-gallery (Cards convention: one row per card, image cell + text cell).
 * Source: .amalfi-gallery-grid (three square images).
 * Model (blocks/cards-gallery/_cards-gallery.json): cards-gallery-card fields image (reference)
 * and text (richtext). The text cell is empty for these images but is kept, as the convention requires.
 */
export default function parse(element, { document }) {
  const cells = [];
  element.querySelectorAll('img').forEach((img) => {
    const imageCell = document.createDocumentFragment();
    imageCell.appendChild(document.createComment(' field:image '));
    imageCell.appendChild(img);
    // empty text cell: no field hint on empty cells
    cells.push([imageCell, '']);
  });
  if (!cells.length) return;
  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-gallery', cells });
  element.replaceWith(block);
}
