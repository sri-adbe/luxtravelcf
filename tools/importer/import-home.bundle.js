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

  // tools/importer/import-home.js
  var import_home_exports = {};
  __export(import_home_exports, {
    default: () => import_home_default
  });

  // tools/importer/parsers/hero-fullbleed.js
  function parse(element, { document }) {
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
    const sub = content.querySelector("p.hero-video-sub") || content.querySelector("p");
    const ctaSource = content.querySelector(".hero-video-cta, a, button");
    const textNodes = [];
    if (heading) textNodes.push(heading);
    if (sub) textNodes.push(sub);
    if (ctaSource && ctaSource.textContent.trim()) {
      const p = document.createElement("p");
      const a = document.createElement("a");
      const href = ctaSource.tagName === "A" && ctaSource.getAttribute("href") ? ctaSource.getAttribute("href") : "#contact";
      a.setAttribute("href", href);
      a.textContent = ctaSource.textContent.trim();
      p.appendChild(a);
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

  // tools/importer/parsers/content-fragment-list.js
  var FRAGMENT_ROOT = "/content/dam/luxtravelcf/fragments";
  var TYPES = ["curators", "destinations", "services", "testimonials"];
  var GRID_TYPES = {
    "curator-grid": "curators",
    "destination-grid": "destinations",
    "services-grid": "services",
    quotes: "testimonials"
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
        return [...element.querySelectorAll(":scope > article")];
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
    const h3 = item.querySelector("h3");
    return h3 ? h3.textContent.trim() : "";
  }
  function parse2(element, { document }) {
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

  // tools/importer/transformers/luxtraveler-cleanup.js
  function transform(hookName, element, payload) {
    if (hookName === "beforeTransform") {
      const doc = element.ownerDocument;
      doc.title = "Lux Traveler | Bespoke Travel Curation";
      const description = "Architects of the extraordinary. Bespoke travel curation for the global elite.";
      ['meta[name="description"]', 'meta[property="og:description"]'].forEach((sel) => {
        const meta = doc.querySelector(sel);
        if (meta) meta.setAttribute("content", description);
      });
      const ogTitle = doc.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute("content", doc.title);
      WebImporter.DOMUtils.remove(element, [
        "header.nav",
        "footer.footer",
        "footer#journal"
      ]);
      WebImporter.DOMUtils.remove(element, [".hero-video-overlay"]);
      element.querySelectorAll(".tagline > span").forEach((span) => {
        if (!span.textContent.trim() && !span.querySelector("img, picture, svg")) {
          span.remove();
        }
      });
      element.querySelectorAll(".eyebrow > i").forEach((i) => {
        if (!i.textContent.trim()) i.remove();
      });
      const closing = element.querySelector("section.closing, #contact");
      if (closing) {
        const bgUrl = (closing.getAttribute("style") || "").match(/url\(["']?([^"')]+)["']?\)/);
        if (bgUrl && !closing.querySelector(":scope > img")) {
          const img = element.ownerDocument.createElement("img");
          img.src = bgUrl[1];
          img.alt = "";
          closing.prepend(img);
          closing.removeAttribute("style");
        }
        const bg = closing.querySelector(":scope > img");
        if (bg && closing.firstElementChild !== bg) {
          closing.prepend(bg);
        }
        closing.querySelectorAll("button").forEach((button) => {
          const a = element.ownerDocument.createElement("a");
          a.href = "mailto:curator@voyageconcierge.com";
          a.textContent = button.textContent.trim();
          const p = element.ownerDocument.createElement("p");
          p.append(a);
          button.replaceWith(p);
        });
      }
    }
    if (hookName === "afterTransform") {
      WebImporter.DOMUtils.remove(element, [
        "script",
        "style",
        "noscript",
        "link",
        "iframe",
        "header",
        "footer",
        "nav"
      ]);
      element.querySelectorAll("*").forEach((el) => {
        ["data-track", "data-analytics", "onclick", "data-sr"].forEach((attr) => {
          if (el.hasAttribute(attr)) el.removeAttribute(attr);
        });
        if (el.classList && (el.classList.contains("sr") || el.classList.contains("sr-in"))) {
          [...el.classList].filter((c) => c === "sr" || c === "sr-in" || /^sr-d\d+$/.test(c)).forEach((c) => el.classList.remove(c));
        }
      });
    }
  }

  // tools/importer/transformers/luxtraveler-sections.js
  var MARKER = "data-excat-section-id";
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
          if (!isFirst || section.style) {
            const hr = document.createElement("hr");
            if (section.style) hr.setAttribute(MARKER, section.id);
            if (isFirst) hr.setAttribute("data-excat-first-section", "true");
            el.parentNode.insertBefore(hr, el);
          }
        }
      }
    }
    if (hookName === "afterTransform") {
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        if (section.style) {
          const marker = element.querySelector(`hr[${MARKER}="${section.id}"]`);
          const metadata = WebImporter.Blocks.createBlock(document, {
            name: "Section Metadata",
            cells: { style: section.style }
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
            if (marker.hasAttribute("data-excat-first-section")) {
              marker.remove();
            }
          }
        }
      }
    }
  }

  // tools/importer/import-home.js
  var PAGE_TEMPLATE = {
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
  var parsers = {
    "hero-fullbleed": parse,
    "content-fragment-list": parse2
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
  var import_home_default = {
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
      WebImporter.rules.createMetadata(main, document);
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
  return __toCommonJS(import_home_exports);
})();
