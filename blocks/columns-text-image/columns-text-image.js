/**
 * Columns Text Image: one row, two cells (rich text + image).
 * Option `image-top` stacks a full-width image above the text at every breakpoint.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const firstRow = block.firstElementChild;
  if (!firstRow) return;
  const cols = [...firstRow.children];
  block.classList.add(`columns-text-image-${cols.length}-cols`);

  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      const pic = col.querySelector('picture');
      if (pic) {
        const picWrapper = pic.closest('div');
        if (picWrapper && picWrapper.children.length === 1) {
          // picture is the only content in the cell
          picWrapper.classList.add('columns-text-image-img-col');
          return;
        }
      }
      col.classList.add('columns-text-image-text-col');
    });
  });
}
