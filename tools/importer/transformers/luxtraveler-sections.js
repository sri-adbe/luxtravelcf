/* eslint-disable */
/* global WebImporter */

/**
 * Lux Traveler sections transformer.
 * Inserts section breaks (<hr>) and Section Metadata blocks based on
 * payload.template.sections from tools/importer/page-templates.json.
 */
const MARKER = 'data-excat-section-id';

function findSectionElement(root, section) {
  const selectors = Array.isArray(section.selector) ? section.selector : [section.selector];
  for (let i = 0; i < selectors.length; i += 1) {
    const sel = selectors[i];
    if (sel) {
      try {
        const el = root.querySelector(sel);
        if (el) return el;
      } catch (e) {
        // invalid selector, try next
      }
    }
  }
  return null;
}

export default function transform(hookName, element, payload) {
  const template = payload && payload.template;
  const sections = template && Array.isArray(template.sections) ? template.sections : [];
  if (sections.length < 2) return;

  const document = element.ownerDocument;

  if (hookName === 'beforeTransform') {
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      const el = findSectionElement(element, section);
      if (el) {
        const isFirst = i === 0;
        if (!isFirst || section.style) {
          const hr = document.createElement('hr');
          if (section.style) hr.setAttribute(MARKER, section.id);
          if (isFirst) hr.setAttribute('data-excat-first-section', 'true');
          el.parentNode.insertBefore(hr, el);
        }
      }
    }
  }

  if (hookName === 'afterTransform') {
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (section.style) {
        const marker = element.querySelector(`hr[${MARKER}="${section.id}"]`);
        const metadata = WebImporter.Blocks.createBlock(document, {
          name: 'Section Metadata',
          cells: { style: section.style },
        });

        // Section content ends right before the next <hr> (or end of parent).
        let anchor = marker || findSectionElement(element, section);
        if (anchor) {
          let last = anchor;
          let next = anchor.nextElementSibling;
          while (next && next.tagName !== 'HR') {
            last = next;
            next = next.nextElementSibling;
          }
          last.after(metadata);
        }

        if (marker) {
          marker.removeAttribute(MARKER);
          if (marker.hasAttribute('data-excat-first-section')) {
            marker.remove();
          }
        }
      }
    }
  }
}
