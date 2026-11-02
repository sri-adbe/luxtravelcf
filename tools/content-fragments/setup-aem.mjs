#!/usr/bin/env node
/* eslint-disable no-console, no-restricted-syntax, no-await-in-loop, no-continue */
/*
 * Creates the Lux Traveler Content Fragment setup on AEM author:
 *   1. DAM folders (+ cq:conf binding so the models are allowed)
 *   2. Images used by the fragments (direct binary upload)
 *   3. Content Fragment Models          (models.json)
 *   4. Content Fragments                (fragments.json)
 *   5. GraphQL persisted queries        (persisted-queries.json)
 *
 * Usage:
 *   AEM_TOKEN=<local developer token> node tools/content-fragments/setup-aem.mjs [--dry-run]
 *
 * Optional: AEM_AUTHOR_URL (defaults to the project's author host).
 * The script is idempotent: existing folders, assets, models, fragments and queries are kept.
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const AUTHOR = (process.env.AEM_AUTHOR_URL || 'https://author-p111858-e1309055.adobeaemcloud.com').replace(/\/$/, '');
const TOKEN = process.env.AEM_TOKEN;
const DRY_RUN = process.argv.includes('--dry-run');

const readJson = async (file) => JSON.parse(await readFile(join(here, file), 'utf8'));
const modelId = (path) => Buffer.from(path).toString('base64url');
const log = (...args) => console.log(...args);

let csrfToken;

async function aem(path, options = {}) {
  const headers = { Authorization: `Bearer ${TOKEN}`, ...options.headers };
  if (options.method && options.method !== 'GET' && csrfToken) headers['CSRF-Token'] = csrfToken;
  return fetch(`${AUTHOR}${path}`, { ...options, headers });
}

async function expectOk(response, what, allowed = []) {
  if (response.ok || allowed.includes(response.status)) return response;
  throw new Error(`${what} failed: ${response.status} ${await response.text()}`);
}

async function exists(path) {
  if (!TOKEN) return false; // offline dry run
  const response = await aem(`${path}.json`, { method: 'GET' });
  return response.ok;
}

const knownFolders = new Set();

async function ensureFolder(path) {
  // path like /content/dam/luxtravelcf/images/curators; create every missing level
  const parts = path.replace('/content/dam/', '').split('/');
  for (let i = 1; i <= parts.length; i += 1) {
    const sub = parts.slice(0, i).join('/');
    if (knownFolders.has(sub)) continue;
    knownFolders.add(sub);
    if (!(await exists(`/content/dam/${sub}`))) {
      log(`  + folder /content/dam/${sub}`);
      if (!DRY_RUN) {
        await expectOk(await aem(`/api/assets/${sub}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ class: 'assetFolder', properties: { title: parts[i - 1] } }),
        }), `create folder ${sub}`, [409]);
      }
    }
  }
}

async function bindConfiguration(damRoot, conf) {
  log(`  = ${damRoot} cq:conf -> ${conf}`);
  if (DRY_RUN) return;
  const body = new URLSearchParams({ 'cq:conf': conf });
  await expectOk(await aem(`${damRoot}/jcr:content`, { method: 'POST', body }), 'bind cq:conf');
}

async function uploadAsset({ path, source }) {
  if (await exists(`${path}/jcr:content`)) {
    log(`  = asset ${path} (exists)`);
    return;
  }
  log(`  + asset ${path}`);
  if (DRY_RUN) return;
  const binary = Buffer.from(await (await expectOk(await fetch(source), `download ${source}`)).arrayBuffer());
  const folder = path.substring(0, path.lastIndexOf('/'));
  const fileName = path.substring(path.lastIndexOf('/') + 1);

  const init = await (await expectOk(await aem(`${folder}.initiateUpload.json`, {
    method: 'POST',
    body: new URLSearchParams({ fileName, fileSize: String(binary.length) }),
  }), `initiate upload ${fileName}`)).json();
  const [file] = init.files;
  const partSize = Math.ceil(binary.length / file.uploadURIs.length);
  await Promise.all(file.uploadURIs.map(async (uri, index) => {
    const part = binary.subarray(index * partSize, (index + 1) * partSize);
    await expectOk(await fetch(uri, { method: 'PUT', body: part }), `upload part ${index} of ${fileName}`);
  }));
  await expectOk(await aem(init.completeURI, {
    method: 'POST',
    body: new URLSearchParams({ fileName, mimeType: file.mimeType, uploadToken: file.uploadToken }),
  }), `complete upload ${fileName}`);
}

async function createModels({ configurationFolder, models }) {
  for (const model of models) {
    const path = `${configurationFolder}/settings/dam/cfm/models/${model.technicalName}`;
    if (await exists(path)) {
      log(`  = model ${model.name} (exists)`);
    } else {
      log(`  + model ${model.name}`);
      if (!TOKEN) continue; // offline dry run: nothing to validate against
      const response = await aem(`/adobe/sites/cf/models${DRY_RUN ? '?dryRun=true' : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configurationFolder, models: [{ ...model, status: 'enabled' }] }),
      });
      await expectOk(response, `create model ${model.name}`, [409]);
    }
  }
}

async function createFragments({ fragments }, { configurationFolder }) {
  for (const fragment of fragments) {
    const path = `/content/dam${fragment.parentPath}/${fragment.name}`;
    if (await exists(`${path}/jcr:content`)) {
      log(`  = fragment ${path} (exists)`);
    } else {
      log(`  + fragment ${path}`);
      if (!DRY_RUN) {
        await expectOk(await aem('/adobe/sites/cf/fragments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: fragment.title,
            name: fragment.name,
            parentPath: fragment.parentPath,
            modelId: modelId(`${configurationFolder}/settings/dam/cfm/models/${fragment.model}`),
            fields: fragment.fields,
          }),
        }), `create fragment ${path}`, [409]);
      }
    }
  }
}

async function persistQueries({ endpoint, queries }) {
  for (const [name, query] of Object.entries(queries)) {
    log(`  + persisted query ${endpoint}/${name}`);
    if (!DRY_RUN) {
      const url = `/graphql/persist.json/${endpoint}/${name}`;
      const body = JSON.stringify({ query });
      const headers = { 'Content-Type': 'application/json' };
      let response = await aem(url, { method: 'PUT', headers, body });
      // PUT creates, POST updates an existing query
      if (response.status === 409) response = await aem(url, { method: 'POST', headers, body });
      await expectOk(response, `persist query ${name}`);
    }
  }
}

async function main() {
  if (!TOKEN && !DRY_RUN) {
    console.error('Set AEM_TOKEN to a local developer token (AEM Developer Console), or pass --dry-run.');
    process.exit(1);
  }
  const models = await readJson('models.json');
  const content = await readJson('fragments.json');
  const queries = await readJson('persisted-queries.json');
  log(`AEM author: ${AUTHOR}${DRY_RUN ? ' (dry run)' : ''}`);

  if (TOKEN) {
    const csrf = await aem('/libs/granite/csrf/token.json', { method: 'GET' });
    if (csrf.ok) ({ token: csrfToken } = await csrf.json());
  }

  if (TOKEN && !(await exists(models.configurationFolder))) {
    throw new Error(`${models.configurationFolder} does not exist. Create it in Tools > General > Configuration Browser `
      + 'with "Content Fragment Models" and "GraphQL Persisted Queries" enabled, then re-run.');
  }

  log('1. DAM folders');
  const folders = new Set([
    ...content.assets.map(({ path }) => path.substring(0, path.lastIndexOf('/'))),
    ...content.fragments.map(({ parentPath }) => `/content/dam${parentPath}`),
  ]);
  for (const folder of folders) await ensureFolder(folder);
  await bindConfiguration(content.damRoot, models.configurationFolder);

  log('2. Images');
  for (const asset of content.assets) await uploadAsset(asset);

  log('3. Content Fragment Models');
  await createModels(models);

  log('4. Content Fragments');
  await createFragments(content, models);

  log('5. GraphQL persisted queries');
  await persistQueries(queries);

  log('Done. Publish the models, fragments, images and persisted queries '
    + 'to make them available on aem.page / aem.live.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
