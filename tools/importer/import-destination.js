/* eslint-disable */
/* global WebImporter */

import heroFullbleedParser from './parsers/hero-fullbleed.js';
import columnsTextImageParser from './parsers/columns-text-image.js';
import contentFragmentListParser from './parsers/content-fragment-list.js';
import cardsGalleryParser from './parsers/cards-gallery.js';
import destinationCleanupTransformer from './transformers/luxtraveler-destination-cleanup.js';
import sectionsTransformer from './transformers/luxtraveler-sections.js';

const PAGE_TEMPLATE = {
  "name": "destination",
  "urls": [
    "https://speak-salsa-30519598.figma.site/destinations/amalfi-coast"
  ],
  "representativeUrl": "https://speak-salsa-30519598.figma.site/destinations/amalfi-coast",
  "description": "Destination detail page (Amalfi Coast): hero, intro, Content Fragment lists for experiences, stays and features, gallery and closing CTA",
  "blocks": [
    {
      "name": "hero-fullbleed",
      "instances": [
        "section.amalfi-hero"
      ]
    },
    {
      "name": "columns-text-image",
      "instances": [
        "section.amalfi-intro",
        "section.amalfi-cultural"
      ]
    },
    {
      "name": "content-fragment-list",
      "instances": [
        ".amalfi-cards-grid",
        ".amalfi-acc-grid",
        ".amalfi-flex-banner"
      ]
    },
    {
      "name": "cards-gallery",
      "instances": [
        ".amalfi-gallery-grid"
      ]
    }
  ],
  "urlPattern": "/destinations/*",
  "sections": [
    {
      "id": "rc1",
      "name": "Hero",
      "selector": [
        "section.amalfi-hero"
      ],
      "style": null,
      "blocks": [
        "hero-fullbleed"
      ],
      "defaultContent": []
    },
    {
      "id": "rc2",
      "name": "Destination intro",
      "selector": [
        "section.amalfi-intro"
      ],
      "style": null,
      "blocks": [
        "columns-text-image"
      ],
      "defaultContent": []
    },
    {
      "id": "rc3",
      "name": "Bespoke experiences",
      "selector": [
        "section.amalfi-section:has(.amalfi-cards-grid)"
      ],
      "style": "beige",
      "blocks": [
        "content-fragment-list"
      ],
      "defaultContent": [
        "section.amalfi-section:has(.amalfi-cards-grid) > .amalfi-section-head"
      ]
    },
    {
      "id": "rc4",
      "name": "Accommodations",
      "selector": [
        "section.amalfi-section:has(.amalfi-acc-grid)"
      ],
      "style": null,
      "blocks": [
        "content-fragment-list"
      ],
      "defaultContent": [
        "section.amalfi-section:has(.amalfi-acc-grid) > .amalfi-section-head"
      ]
    },
    {
      "id": "rc5",
      "name": "Local legacies",
      "selector": [
        "section.amalfi-cultural"
      ],
      "style": "beige",
      "blocks": [
        "columns-text-image"
      ],
      "defaultContent": []
    },
    {
      "id": "rc6",
      "name": "Flexibility",
      "selector": [
        "section.amalfi-flex-section"
      ],
      "style": "centered",
      "blocks": [
        "content-fragment-list"
      ],
      "defaultContent": [
        "section.amalfi-flex-section > .amalfi-flex-header"
      ]
    },
    {
      "id": "rc7",
      "name": "Gallery",
      "selector": [
        "section.amalfi-gallery-section"
      ],
      "style": "centered",
      "blocks": [
        "cards-gallery"
      ],
      "defaultContent": [
        "section.amalfi-gallery-section > p"
      ]
    },
    {
      "id": "rc8",
      "name": "Closing CTA",
      "selector": [
        "section.amalfi-cta-section"
      ],
      "style": "closing, image-background, centered",
      "blocks": [],
      "defaultContent": [
        "section.amalfi-cta-section"
      ]
    }
  ]
};

const parsers = {
  'hero-fullbleed': heroFullbleedParser,
  'columns-text-image': columnsTextImageParser,
  'content-fragment-list': contentFragmentListParser,
  'cards-gallery': cardsGalleryParser,
};
// the home page cleanup transformer is home-specific (it sets the home metadata), so it is not used here
const transformers = [destinationCleanupTransformer, sectionsTransformer];

function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((fn) => {
    try { fn(hookName, element, enhancedPayload); }
    catch (e) { console.error(`Transformer failed at ${hookName}:`, e); }
  });
}

function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        pageBlocks.push({ name: blockDef.name, selector, element });
      });
    });
  });
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.body;

    executeTransformers('beforeTransform', main, payload);

    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (!parser) return;
      try { parser(block.element, { document, url, params }); }
      catch (e) { console.error(`Failed to parse ${block.name} (${block.selector}):`, e); }
    });

    executeTransformers('afterTransform', main, payload);

    main.appendChild(document.createElement('hr'));
    // page metadata plus the page template, which applies the destination layout (body.destination)
    const metadata = WebImporter.Blocks.getMetadata(document);
    metadata.Template = PAGE_TEMPLATE.name;
    main.append(WebImporter.Blocks.getMetadataBlock(document, metadata));
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: { title: document.title, template: PAGE_TEMPLATE.name, blocks: pageBlocks.map((b) => b.name) },
    }];
  },
};
