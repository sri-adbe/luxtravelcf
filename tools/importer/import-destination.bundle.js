/* eslint-disable */
var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // tools/importer/import-destination.js
  var import_destination_exports = {};
  __export(import_destination_exports, {
    default: () => import_destination_default
  });

  // tools/importer/parsers/hero-fullbleed.js
  function parse(element, { document }) {
    var _a, _b;
    const cells = [];
    const img = element.querySelector("img.hero-video-bg") || element.querySelector("img");
    if (img) {
      const imageCell = document.createDocumentFragment();
      imageCell.appendChild(document.createComment(" field:image "));
      imageCell.appendChild(img);
      cells.push([imageCell]);
    } else {
      cells.push([""]);
    }
    const content = element.querySelector(".hero-video-content") || element;
    const textCell = document.createDocumentFragment();
    const heading = content.querySelector("h1, .hero-video-headline");
    const eyebrow = ((_a = heading == null ? void 0 : heading.previousElementSibling) == null ? void 0 : _a.tagName) === "P" ? heading.previousElementSibling : null;
    const sub = content.querySelector("p.hero-video-sub") || (((_b = heading == null ? void 0 : heading.nextElementSibling) == null ? void 0 : _b.tagName) === "P" ? heading.nextElementSibling : null) || [...content.querySelectorAll("p")].find((p) => p !== eyebrow);
    const ctaSource = content.querySelector(".hero-video-cta, .amalfi-cta, a, button");
    const textNodes = [];
    if (eyebrow) textNodes.push(eyebrow);
    if (heading) textNodes.push(heading);
    if (sub) textNodes.push(sub);
    if (ctaSource && ctaSource.textContent.trim()) {
      const p = document.createElement("p");
      const a = document.createElement("a");
      const href = ctaSource.tagName === "A" && ctaSource.getAttribute("href") ? ctaSource.getAttribute("href") : "#enquiry";
      a.setAttribute("href", href);
      a.textContent = ctaSource.textContent.trim();
      const strong = document.createElement("strong");
      strong.appendChild(a);
      p.appendChild(strong);
      textNodes.push(p);
    }
    if (textNodes.length) {
      textCell.appendChild(document.createComment(" field:text "));
      textNodes.forEach((n) => textCell.appendChild(n));
      cells.push([textCell]);
    } else {
      cells.push([""]);
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "hero-fullbleed", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/columns-text-image.js
  function parse2(element, { document }) {
    const children = [...element.children];
    const imageWrap = children.find((c) => c.querySelector("img") && !c.querySelector("h1, h2, h3"));
    const textWrap = children.find((c) => c !== imageWrap && c.querySelector("h1, h2, h3, p"));
    if (!textWrap) return;
    const textCell = document.createDocumentFragment();
    [...textWrap.children].forEach((el) => {
      if (!el.textContent.trim() && !el.querySelector('img[alt]:not([alt=""])')) return;
      textCell.appendChild(el);
    });
    const imageCell = document.createDocumentFragment();
    const img = imageWrap && imageWrap.querySelector("img");
    if (img) imageCell.appendChild(img);
    const imageFirst = imageWrap && children.indexOf(imageWrap) < children.indexOf(textWrap);
    const cells = [imageFirst ? [imageCell, textCell] : [textCell, imageCell]];
    const block = WebImporter.Blocks.createBlock(document, {
      name: "columns-text-image",
      variants: imageFirst ? ["image-top"] : [],
      cells
    });
    element.replaceWith(block);
  }

  // tools/importer/parsers/content-fragment-list.js
  var FRAGMENT_ROOT = "/content/dam/luxtravelcf/fragments";
  var TYPES = ["curators", "destinations", "services", "testimonials", "experiences", "stays", "features"];
  var GRID_TYPES = {
    "curator-grid": "curators",
    "destination-grid": "destinations",
    "services-grid": "services",
    quotes: "testimonials",
    // destination pages
    "amalfi-cards-grid": "experiences",
    "amalfi-acc-grid": "stays",
    "amalfi-flex-banner": "features"
  };
  function slugify(str) {
    return (str || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  function detectType(element) {
    const section = element.closest("section");
    if (section) {
      const found = TYPES.find((t) => section.classList.contains(t));
      if (found) return found;
    }
    const key = Object.keys(GRID_TYPES).find((c) => element.classList.contains(c));
    return key ? GRID_TYPES[key] : null;
  }
  function getItems(element, type) {
    switch (type) {
      case "curators":
      case "services":
      case "experiences":
      case "stays":
        return [...element.querySelectorAll(":scope > article")];
      case "features":
        return [...element.children].filter((c) => c.querySelector("h3"));
      case "destinations":
        return [...element.children].filter((c) => c.tagName === "A" || c.tagName === "ARTICLE");
      case "testimonials":
        return [...element.querySelectorAll(":scope > blockquote")];
      default:
        return [];
    }
  }
  function getItemKey(item, type) {
    if (type === "testimonials") {
      const cite = item.querySelector("cite");
      if (!cite) return "";
      return cite.textContent.replace(/^[\s—–-]+/, "").replace(/,[^,]*$/, "").trim();
    }
    const title = item.querySelector('h3, [class*="title"]');
    return title ? title.textContent.trim() : "";
  }
  function parse3(element, { document }) {
    const type = detectType(element) || "curators";
    const cells = [];
    getItems(element, type).forEach((item) => {
      const slug = slugify(getItemKey(item, type));
      if (!slug) return;
      const path = `${FRAGMENT_ROOT}/${type}/${slug}`;
      const fragmentCell = document.createDocumentFragment();
      fragmentCell.appendChild(document.createComment(" field:fragment "));
      const a = document.createElement("a");
      a.setAttribute("href", path);
      a.textContent = path;
      fragmentCell.appendChild(a);
      cells.push([fragmentCell, ""]);
    });
    const block = WebImporter.Blocks.createBlock(document, { name: "content-fragment-list", variants: [type], cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-gallery.js
  function parse4(element, { document }) {
    const cells = [];
    element.querySelectorAll("img").forEach((img) => {
      const imageCell = document.createDocumentFragment();
      imageCell.appendChild(document.createComment(" field:image "));
      imageCell.appendChild(img);
      cells.push([imageCell, ""]);
    });
    if (!cells.length) return;
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-gallery", cells });
    element.replaceWith(block);
  }

  // tools/importer/transformers/luxtraveler-destination-cleanup.js
  function transform(hookName, element, payload) {
    const doc = element.ownerDocument;
    const isDestination = !!element.querySelector('section.amalfi-hero, [class*="amalfi-"]');
    if (!isDestination) return;
    if (hookName === "beforeTransform") {
      const h1 = element.querySelector("section.amalfi-hero h1");
      const sub = element.querySelector("section.amalfi-hero .amalfi-hero-sub");
      const eyebrow = element.querySelector("section.amalfi-hero .amalfi-eyebrow-text");
      doc.title = `${eyebrow ? eyebrow.textContent.trim() : "Destination"} | Lux Traveler`;
      const description = [h1, sub].filter(Boolean).map((e) => e.textContent.trim().replace(/\.?$/, ".")).join(" ");
      ['meta[name="description"]', 'meta[property="og:description"]'].forEach((sel) => {
        const meta = doc.querySelector(sel);
        if (meta && description) meta.setAttribute("content", description);
      });
      const ogTitle = doc.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute("content", doc.title);
      WebImporter.DOMUtils.remove(element, ["header.nav", "footer.footer", "footer"]);
      WebImporter.DOMUtils.remove(element, [
        ".amalfi-hero-overlay",
        ".amalfi-cta-overlay",
        "img.amalfi-dash",
        ".amalfi-rule-wrap",
        // aria-hidden decorative images; the hero and CTA background photos are aria-hidden too but are content
        'img[aria-hidden="true"]:not(.amalfi-hero-bg, .amalfi-cta-bg)'
      ]);
      element.querySelectorAll(".amalfi-eyebrow").forEach((eb) => {
        const p = doc.createElement("p");
        p.textContent = eb.textContent.trim();
        eb.replaceWith(p);
      });
      element.querySelectorAll(".amalfi-section-head > div, .amalfi-cta-content > div").forEach((wrap) => {
        wrap.replaceWith(...wrap.childNodes);
      });
      element.querySelectorAll("button.amalfi-cta").forEach((button) => {
        const a = doc.createElement("a");
        a.href = "#enquiry";
        a.textContent = button.textContent.trim();
        const strong = doc.createElement("strong");
        strong.append(a);
        const p = doc.createElement("p");
        p.append(strong);
        button.replaceWith(p);
      });
    }
    if (hookName === "afterTransform") {
      WebImporter.DOMUtils.remove(element, ["script", "style", "noscript", "link", "iframe", "header", "footer", "nav"]);
      element.querySelectorAll("*").forEach((el) => {
        if (el.classList && [...el.classList].some((c) => /^sr(-d\d+|-in)?$/.test(c))) {
          [...el.classList].filter((c) => /^sr(-d\d+|-in)?$/.test(c)).forEach((c) => el.classList.remove(c));
        }
      });
    }
  }

  // tools/importer/transformers/luxtraveler-sections.js
  var MARKER = "data-excat-section-id";
  var ANCHOR = "data-excat-anchor";
  function findSectionElement(root, section) {
    const selectors = Array.isArray(section.selector) ? section.selector : [section.selector];
    for (let i = 0; i < selectors.length; i += 1) {
      const sel = selectors[i];
      if (sel) {
        try {
          const el = root.querySelector(sel);
          if (el) return el;
        } catch (e) {
        }
      }
    }
    return null;
  }
  function transform2(hookName, element, payload) {
    const template = payload && payload.template;
    const sections = template && Array.isArray(template.sections) ? template.sections : [];
    if (sections.length < 2) return;
    const document = element.ownerDocument;
    if (hookName === "beforeTransform") {
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        const el = findSectionElement(element, section);
        if (el) {
          const isFirst = i === 0;
          const anchorId = el.id || "";
          const hasMeta = section.style || anchorId;
          if (!isFirst || hasMeta) {
            const hr = document.createElement("hr");
            if (hasMeta) hr.setAttribute(MARKER, section.id);
            if (anchorId) hr.setAttribute(ANCHOR, anchorId);
            if (isFirst) hr.setAttribute("data-excat-first-section", "true");
            el.parentNode.insertBefore(hr, el);
          }
        }
      }
    }
    if (hookName === "afterTransform") {
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        const marker = element.querySelector(`hr[${MARKER}="${section.id}"]`);
        const anchorId = marker ? marker.getAttribute(ANCHOR) : "";
        if (section.style || anchorId) {
          const cells = {};
          if (section.style) cells.style = section.style;
          if (anchorId) cells.anchor = anchorId;
          const metadata = WebImporter.Blocks.createBlock(document, {
            name: "Section Metadata",
            cells
          });
          let anchor = marker || findSectionElement(element, section);
          if (anchor) {
            let last = anchor;
            let next = anchor.nextElementSibling;
            while (next && next.tagName !== "HR") {
              last = next;
              next = next.nextElementSibling;
            }
            last.after(metadata);
          }
          if (marker) {
            marker.removeAttribute(MARKER);
            marker.removeAttribute(ANCHOR);
            if (marker.hasAttribute("data-excat-first-section")) {
              marker.remove();
            }
          }
        }
      }
    }
  }

  // tools/importer/import-destination.js
  var PAGE_TEMPLATE = {
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
  var parsers = {
    "hero-fullbleed": parse,
    "columns-text-image": parse2,
    "content-fragment-list": parse3,
    "cards-gallery": parse4
  };
  var transformers = [transform, transform2];
  function executeTransformers(hookName, element, payload) {
    const enhancedPayload = __spreadProps(__spreadValues({}, payload), { template: PAGE_TEMPLATE });
    transformers.forEach((fn) => {
      try {
        fn(hookName, element, enhancedPayload);
      } catch (e) {
        console.error(`Transformer failed at ${hookName}:`, e);
      }
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
  var import_destination_default = {
    transform: (payload) => {
      const { document, url, params } = payload;
      const main = document.body;
      executeTransformers("beforeTransform", main, payload);
      const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
      pageBlocks.forEach((block) => {
        if (!block.element.parentNode) return;
        const parser = parsers[block.name];
        if (!parser) return;
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      });
      executeTransformers("afterTransform", main, payload);
      main.appendChild(document.createElement("hr"));
      const metadata = WebImporter.Blocks.getMetadata(document);
      metadata.template = PAGE_TEMPLATE.name;
      main.append(WebImporter.Blocks.getMetadataBlock(document, metadata));
      WebImporter.rules.transformBackgroundImages(main, document);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      const rawPath = new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html?$/, "");
      const path = WebImporter.FileUtils.sanitizePath(rawPath === "" ? "/index" : rawPath);
      return [{
        element: main,
        path,
        report: { title: document.title, template: PAGE_TEMPLATE.name, blocks: pageBlocks.map((b) => b.name) }
      }];
    }
  };
  return __toCommonJS(import_destination_exports);
})();
