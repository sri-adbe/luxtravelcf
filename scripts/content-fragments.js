/* eslint-disable no-underscore-dangle */

/**
 * AEM Content Fragment delivery for Lux Traveler.
 * Fragments are read through GraphQL persisted queries
 * (see tools/content-fragments/persisted-queries.json).
 */
const AEM_AUTHOR = 'https://author-p111858-e1309055.adobeaemcloud.com';
const AEM_PUBLISH = 'https://publish-p111858-e1309055.adobeaemcloud.com';
const GRAPHQL_ENDPOINT = 'luxtravelcf';

// local development only: mirror of the fragments created by tools/content-fragments/setup-aem.mjs
const LOCAL_FRAGMENTS = '/tools/content-fragments/fragments.json';

const isAuthor = () => window.location.hostname.includes('adobeaemcloud.com');
const isLocal = () => window.location.hostname === 'localhost';

/**
 * Returns the AEM host Content Fragments and their images are served from.
 * @returns {string}
 */
export function getAemHost() {
  return isAuthor() ? AEM_AUTHOR : AEM_PUBLISH;
}

let localFragments;

/**
 * Converts a fragment from the local mirror into the shape returned by the persisted queries.
 * @param {string} path Content Fragment path
 * @returns {Promise<object|null>}
 */
async function getLocalFragment(path) {
  if (!localFragments) {
    localFragments = fetch(`${window.hlx.codeBasePath}${LOCAL_FRAGMENTS}`)
      .then((resp) => (resp.ok ? resp.json() : { assets: [], fragments: [] }));
  }
  const { assets, fragments } = await localFragments;
  const fragment = fragments.find((f) => `/content/dam${f.parentPath}/${f.name}` === path);
  if (!fragment) return null;

  const item = { _path: path };
  fragment.fields.forEach(({ name, type, values }) => {
    const [value] = values;
    if (type === 'long-text') {
      item[name] = value !== undefined ? { plaintext: value } : null;
    } else if (type === 'content-reference') {
      const asset = assets.find((a) => a.path === value);
      item[name] = asset
        ? { _path: asset.path, _publishUrl: asset.source, _authorUrl: asset.source }
        : null;
    } else if (/link$/i.test(name) && /^\/(?!content\/)\w/.test(value || '')) {
      // the local preview serves pages under /content, so page links get that prefix
      item[name] = `/content${value}`;
    } else {
      item[name] = value ?? null;
    }
  });
  return item;
}

/**
 * Loads a Content Fragment through a persisted query.
 * @param {string} query Persisted query name, e.g. curatorByPath
 * @param {string} path Content Fragment path
 * @param {string} [variation] Content Fragment variation, defaults to master
 * @returns {Promise<object|null>} The fragment item, or null when it could not be loaded
 */
export async function fetchContentFragment(query, path, variation) {
  const params = `;path=${encodeURIComponent(path)};variation=${encodeURIComponent(variation || 'master')}`;
  const url = `${getAemHost()}/graphql/execute.json/${GRAPHQL_ENDPOINT}/${query}${params}`;
  try {
    const resp = await fetch(url, isAuthor() ? { credentials: 'include' } : {});
    if (resp.ok) {
      const { data } = await resp.json();
      const item = data?.[query]?.item;
      if (item) return item;
    }
  } catch (e) {
    // fall through to the local mirror
  }
  return isLocal() ? getLocalFragment(path) : null;
}

/**
 * Returns the delivery URL of an image referenced by a Content Fragment.
 * @param {object} image ImageRef from a persisted query
 * @param {number} [width] Requested width for web-optimized delivery
 * @returns {string|null}
 */
export function getImageUrl(image, width = 750) {
  if (!image) return null;
  if (image._dynamicUrl) {
    const url = new URL(image._dynamicUrl, getAemHost());
    url.searchParams.set('width', width);
    return url.toString();
  }
  return (isAuthor() ? image._authorUrl : image._publishUrl) || image._path;
}
