/* eslint-disable */
/* global WebImporter */

import heroFullbleedParser from './parsers/hero-fullbleed.js';
import contentFragmentListParser from './parsers/content-fragment-list.js';
import cleanupTransformer from './transformers/luxtraveler-cleanup.js';
import sectionsTransformer from './transformers/luxtraveler-sections.js';

const PAGE_TEMPLATE = {
  "name": "home",
  "urls": [
    "https://speak-salsa-30519598.figma.site/"
  ],
  "representativeUrl": "https://speak-salsa-30519598.figma.site/",
  "description": "Lux Traveler home page: full-bleed hero, Content Fragment lists (curators, destinations, services, testimonials), tagline strip and closing CTA",
  "urlPattern": "/",
  "blocks": [
    {
      "name": "hero-fullbleed",
      "instances": [
        "section.hero-video",
        "#top"
      ]
    },
    {
      "name": "content-fragment-list",
      "instances": [
        "section.curators .curator-grid",
        "section.destinations .destination-grid",
        "section.services .services-grid",
        "section.testimonials .quotes"
      ]
    }
  ],
  "sections": [
    {
      "id": "rc1",
      "name": "Hero",
      "selector": [
        "section.hero-video",
        "#top"
      ],
      "style": null,
      "blocks": [
        "hero-fullbleed"
      ],
      "defaultContent": []
    },
    {
      "id": "rc2",
      "name": "Curators",
      "selector": [
        "section.curators"
      ],
      "style": "beige",
      "blocks": [
        "content-fragment-list"
      ],
      "defaultContent": [
        "section.curators > .section-head"
      ]
    },
    {
      "id": "rc3",
      "name": "Tagline strip",
      "selector": [
        "main > div.tagline",
        ".tagline"
      ],
      "style": "beige, tagline",
      "blocks": [],
      "defaultContent": [
        ".tagline"
      ]
    },
    {
      "id": "rc4",
      "name": "Destinations",
      "selector": [
        "section.destinations",
        "#destinations"
      ],
      "style": null,
      "blocks": [
        "content-fragment-list"
      ],
      "defaultContent": [
        "section.destinations > .section-head"
      ]
    },
    {
      "id": "rc5",
      "name": "Services",
      "selector": [
        "section.services",
        "#services"
      ],
      "style": "beige, centered",
      "blocks": [
        "content-fragment-list"
      ],
      "defaultContent": [
        "section.services > .center-title"
      ]
    },
    {
      "id": "rc6",
      "name": "Testimonials",
      "selector": [
        "section.testimonials"
      ],
      "style": null,
      "blocks": [
        "content-fragment-list"
      ],
      "defaultContent": [
        "section.testimonials > .section-head"
      ]
    },
    {
      "id": "rc7",
      "name": "Closing CTA",
      "selector": [
        "section.closing",
        "#contact"
      ],
      "style": "closing, image-background, centered",
      "blocks": [],
      "defaultContent": [
        "section.closing"
      ]
    }
  ]
};

const parsers = {
  'hero-fullbleed': heroFullbleedParser,
  'content-fragment-list': contentFragmentListParser,
};
const transformers = [cleanupTransformer, sectionsTransformer];

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
    WebImporter.rules.createMetadata(main, document);
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
