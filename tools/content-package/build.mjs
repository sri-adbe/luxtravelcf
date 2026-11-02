#!/usr/bin/env node
/* eslint-disable no-console, no-restricted-syntax, no-await-in-loop */
/*
 * Builds the Lux Traveler AEM content package (FileVault zip) for Package Manager:
 *   - /conf/luxtravelcf: Content Fragment Models and GraphQL persisted queries
 *   - /content/cq:graphql/luxtravelcf/endpoint: GraphQL endpoint
 *   - /content/dam/luxtravelcf: cq:conf binding, images, Content Fragments
 *   - /content/luxtravelcf/index: the migrated home page (Universal Editor / xwalk)
 *
 * Usage: node tools/content-package/build.mjs
 * Output: tools/content-package/target/luxtravelcf-content-<version>.zip
 *
 * Sources: tools/content-fragments/{models,fragments,persisted-queries}.json,
 * tools/content-package/pages/index.xml and tools/content-package/page-assets.json.
 * Images are downloaded from their source URLs at build time.
 */
import {
  mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync, statSync, existsSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateRawSync } from 'node:zlib';

const here = dirname(fileURLToPath(import.meta.url));
const cfDir = join(here, '../content-fragments');
const target = join(here, 'target');
const root = join(target, 'package');
const jcrRoot = join(root, 'jcr_root');
const cache = join(target, 'cache');

const GROUP = 'luxtravelcf';
const NAME = 'luxtravelcf-content';
const VERSION = '1.0.0';
const SITE_ROOT = '/content/luxtravelcf';
const PAGE = `${SITE_ROOT}/index`;
const CONF = '/conf/luxtravelcf';
const DAM = '/content/dam/luxtravelcf';
const ENDPOINT = '/content/cq:graphql/luxtravelcf/endpoint';

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const models = readJson(join(cfDir, 'models.json'));
const content = readJson(join(cfDir, 'fragments.json'));
const queries = readJson(join(cfDir, 'persisted-queries.json'));
const pageAssets = readJson(join(here, 'page-assets.json'));

const NS = {
  jcr: 'http://www.jcp.org/jcr/1.0',
  nt: 'http://www.jcp.org/jcr/nt/1.0',
  sling: 'http://sling.apache.org/jcr/sling/1.0',
  cq: 'http://www.day.com/jcr/cq/1.0',
  dam: 'http://www.day.com/dam/1.0',
  mix: 'http://www.jcp.org/jcr/mix/1.0',
  granite: 'http://www.adobe.com/jcr/granite/1.0',
  dc: 'http://purl.org/dc/elements/1.1/',
  tiff: 'http://ns.adobe.com/tiff/1.0/',
};

/* ---------- FileVault serialization ---------- */

/** Marks a value as already typed docview syntax, e.g. {Long}5 or [a,b]. */
const raw = (value) => ({ raw: String(value) });

/** Escapes a property value for docview XML; plain strings must not be read as typed/array. */
function val(value) {
  let v = value?.raw ?? String(value);
  if (value?.raw === undefined && /^[{[]/.test(v)) v = `\\${v}`;
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
    .replace(/\n/g, '&#xa;')
    .replace(/\t/g, '&#x9;');
}

/** Encodes a JCR node name as an XML element name (digits first need _xHHHH_). */
function elementName(name) {
  return name.replace(/^([0-9])/, (d) => `_x${d.charCodeAt(0).toString(16).padStart(4, '0')}_`);
}

/**
 * Serializes a node tree: { props: {name: rawValue}, children: [[name, node], ...] }.
 * Prop values are plain strings (escaped) or raw('{Long}1') typed docview values.
 */
function node(name, { props = {}, children = [] }, indent = '') {
  const tag = name === 'jcr:root' ? name : elementName(name);
  const attrs = Object.entries(props).map(([k, v]) => `\n${indent}    ${k}="${val(v)}"`).join('');
  if (!children.length) return `${indent}<${tag}${attrs}/>`;
  const inner = children.map(([n, c]) => node(n, c, `${indent}    `)).join('\n');
  return `${indent}<${tag}${attrs}>\n${inner}\n${indent}</${tag}>`;
}

function docview(tree) {
  const xmlns = Object.entries(NS).map(([p, uri]) => `xmlns:${p}="${uri}"`).join(' ');
  const xml = node('jcr:root', tree).replace('<jcr:root', `<jcr:root ${xmlns}`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${xml}\n`;
}

/** Writes <jcrPath>/.content.xml (jcr:content names map to _jcr_content folders). */
function write(jcrPath, tree) {
  const dir = join(jcrRoot, ...jcrPath.split('/').filter(Boolean).map((s) => (s.includes(':') ? `_${s.replace(':', '_')}` : s)));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, '.content.xml'), typeof tree === 'string' ? tree : docview(tree));
  return dir;
}

const folder = (title, primaryType = 'sling:OrderedFolder', extra = {}) => ({
  props: { 'jcr:primaryType': primaryType },
  children: [['jcr:content', { props: { 'jcr:primaryType': 'nt:unstructured', 'jcr:title': title, ...extra } }]],
});
const page = (children = []) => ({ props: { 'jcr:primaryType': 'cq:Page' }, children });

/* ---------- conf: models ---------- */

const FIELD = {
  text: (f) => ({
    'sling:resourceType': 'granite/ui/components/coral/foundation/form/textfield',
    fieldLabel: f.label,
    maxlength: String(f.maxLength || 255),
    metaType: 'text-single',
    valueType: 'string',
  }),
  'long-text': (f) => ({
    'sling:resourceType': 'dam/cfm/admin/components/authoring/contenteditor/multieditor',
    'cfm-element': f.label,
    'default-mime-type': f.mimeType || 'text/plain',
    metaType: 'text-multi',
    valueType: 'string/multiline',
  }),
  'content-reference': (f) => ({
    'sling:resourceType': 'dam/cfm/models/editor/components/contentreference',
    fieldLabel: f.label,
    filter: 'hierarchy',
    metaType: 'reference',
    nameSuffix: 'contentReference',
    rootPath: f.root || DAM,
    showThumbnail: 'true',
    validation: 'cfm.validation.contenttype.image',
    valueType: 'string/reference',
  }),
  boolean: (f) => ({
    'sling:resourceType': 'granite/ui/components/coral/foundation/form/checkbox',
    fieldLabel: f.label,
    text: f.label,
    metaType: 'boolean',
    valueType: 'boolean',
  }),
};

function modelTree(model, index) {
  const items = model.fields.map((f, i) => {
    const props = {
      'jcr:primaryType': 'nt:unstructured',
      ...FIELD[f.type](f),
      listOrder: String(i + 1),
      name: f.name,
      renderReadOnly: 'false',
      showEmptyInReadOnly: 'true',
      ...(f.description ? { fieldDescription: f.description } : {}),
      ...(f.required ? { required: 'on' } : {}),
    };
    return [`17300000${index}${String(i).padStart(4, '0')}`, { props, children: [['granite:data', { props: { 'jcr:primaryType': 'nt:unstructured' } }]] }];
  });
  const path = `${CONF}/settings/dam/cfm/models/${model.technicalName}`;
  return {
    props: { 'jcr:primaryType': 'cq:Template', allowedPaths: raw('[/content/entities(/.*)?]'), ranking: raw('{Long}100') },
    children: [['jcr:content', {
      props: {
        'jcr:primaryType': 'cq:PageContent',
        'cq:scaffolding': `${path}/jcr:content/model`,
        'cq:templateType': '/libs/settings/dam/cfm/model-types/fragment',
        'jcr:title': model.name,
        'jcr:description': model.description || '',
        'sling:resourceSuperType': 'dam/cfm/models/console/components/data/entity',
        'sling:resourceType': 'dam/cfm/models/console/components/data/entity/default',
        status: 'enabled',
      },
      children: [
        ['metadata', { props: { 'jcr:primaryType': 'nt:unstructured' } }],
        ['model', {
          props: {
            'jcr:primaryType': 'cq:PageContent',
            'cq:targetPath': '/content/entities',
            'sling:resourceType': 'wcm/scaffolding/components/scaffolding',
            dataTypesConfig: '/mnt/overlay/settings/dam/cfm/models/formbuilderconfig/datatypes',
            maxGeneratedOrder: '20',
          },
          children: [['cq:dialog', {
            props: { 'jcr:primaryType': 'nt:unstructured', 'sling:resourceType': 'cq/gui/components/authoring/dialog' },
            children: [['content', {
              props: { 'jcr:primaryType': 'nt:unstructured', 'sling:resourceType': 'granite/ui/components/coral/foundation/fixedcolumns' },
              children: [['items', { props: { 'jcr:primaryType': 'nt:unstructured', maxGeneratedOrder: '20' }, children: items }]],
            }]],
          }]],
        }],
      ],
    }]],
  };
}

/* ---------- dam: assets and fragments ---------- */

function pngSize(buffer) {
  return buffer.readUInt32BE(12) === 0x49484452 // IHDR
    ? { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) } : null;
}

async function download(url) {
  mkdirSync(cache, { recursive: true });
  const file = join(cache, Buffer.from(url).toString('base64url').slice(-60));
  if (!existsSync(file)) {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`download ${url}: ${resp.status}`);
    writeFileSync(file, Buffer.from(await resp.arrayBuffer()));
  }
  return readFileSync(file);
}

async function writeAsset({ path, source, alt }) {
  const binary = await download(source);
  const size = pngSize(binary);
  const mime = 'image/png';
  const name = path.substring(path.lastIndexOf('/') + 1);
  const dir = write(path, {
    props: { 'jcr:primaryType': 'dam:Asset', 'jcr:mixinTypes': raw('[mix:referenceable]') },
    children: [['jcr:content', {
      props: { 'jcr:primaryType': 'dam:AssetContent', 'jcr:title': name, 'cq:name': name },
      children: [
        ['metadata', {
          props: {
            'jcr:primaryType': 'nt:unstructured',
            'jcr:mixinTypes': raw('[cq:Taggable]'),
            'dam:MIMEtype': mime,
            'dam:size': raw(`{Long}${binary.length}`),
            'dc:format': mime,
            ...(alt ? { 'dc:description': alt } : {}),
            ...(size ? { 'tiff:ImageWidth': raw(`{Long}${size.width}`), 'tiff:ImageLength': raw(`{Long}${size.height}`) } : {}),
          },
        }],
        ['renditions', { props: { 'jcr:primaryType': 'nt:folder' }, children: [['original', {}]] }],
        ['related', { props: { 'jcr:primaryType': 'nt:unstructured' } }],
      ],
    }]],
  });
  const renditions = join(dir, '_jcr_content', 'renditions');
  mkdirSync(join(renditions, 'original.dir'), { recursive: true });
  writeFileSync(join(renditions, 'original'), binary);
  writeFileSync(join(renditions, 'original.dir', '.content.xml'), docview({
    props: { 'jcr:primaryType': 'nt:file' },
    children: [['jcr:content', { props: { 'jcr:primaryType': 'nt:resource', 'jcr:mimeType': mime } }]],
  }));
}

function fragmentValue({ type, values, mimeType }, name) {
  if (!values?.length) return {};
  const [v] = values;
  if (type === 'boolean') return { [name]: raw(`{Boolean}${v}`) };
  if (type === 'long-text') return { [name]: v, [`${name}@ContentType`]: mimeType || 'text/plain' };
  return { [name]: v };
}

function fragmentTree(fragment) {
  const master = { 'jcr:primaryType': 'nt:unstructured', 'jcr:mixinTypes': raw('[cq:Taggable,dam:cfVariationNode]') };
  fragment.fields.forEach((f) => Object.assign(master, fragmentValue(f, f.name)));
  // '@' is not allowed in XML names: FileVault encodes it as _x0040_
  const props = Object.fromEntries(Object.entries(master).map(([k, v]) => [k.replace('@', '_x0040_'), v]));
  return {
    props: { 'jcr:primaryType': 'dam:Asset', 'jcr:mixinTypes': raw('[mix:referenceable,mix:versionable]') },
    children: [['jcr:content', {
      props: {
        'jcr:primaryType': 'dam:AssetContent',
        'cq:name': fragment.name,
        'cq:parentPath': `/content/dam${fragment.parentPath}`,
        'jcr:title': fragment.title,
        'jcr:description': '',
        contentFragment: raw('{Boolean}true'),
      },
      children: [
        ['data', {
          props: { 'jcr:primaryType': 'nt:unstructured', 'cq:model': `${CONF}/settings/dam/cfm/models/${fragment.model}` },
          children: [['master', { props }]],
        }],
        ['metadata', { props: { 'jcr:primaryType': 'nt:unstructured', 'jcr:mixinTypes': raw('[cq:Taggable]') } }],
        ['related', { props: { 'jcr:primaryType': 'nt:unstructured' } }],
      ],
    }]],
  };
}

/* ---------- zip (FileVault packages are plain zip files) ---------- */

function zip(dir, outFile) {
  const files = [];
  const walk = (d) => readdirSync(d).sort().forEach((n) => {
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p); else files.push(p);
  });
  walk(dir);
  const locals = [];
  const centrals = [];
  let offset = 0;
  files.forEach((file) => {
    const name = Buffer.from(relative(dir, file).split('\\').join('/'));
    const data = readFileSync(file);
    const deflated = deflateRawSync(data);
    const useDeflate = deflated.length < data.length;
    const body = useDeflate ? deflated : data;
    const crc = crc32(data);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x0800, 6); // UTF-8 names
    header.writeUInt16LE(useDeflate ? 8 : 0, 8);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(body.length, 18);
    header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(name.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(useDeflate ? 8 : 0, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(header, name, body);
    centrals.push(central, name);
    offset += header.length + name.length + body.length;
  });
  const centralSize = centrals.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  writeFileSync(outFile, Buffer.concat([...locals, ...centrals, end]));
  return files.length;
}

/* ---------- build ---------- */

async function main() {
  rmSync(root, { recursive: true, force: true });

  // conf: ancestors are only created when missing, the filter limits what is replaced
  write(CONF, { props: { 'jcr:primaryType': 'sling:Folder', 'jcr:title': 'Lux Traveler' } });
  write(`${CONF}/settings`, { props: { 'jcr:primaryType': 'sling:Folder' } });
  write(`${CONF}/settings/dam`, page());
  write(`${CONF}/settings/dam/cfm`, page());
  write(`${CONF}/settings/dam/cfm/models`, page());
  models.models.forEach((m, i) => write(`${CONF}/settings/dam/cfm/models/${m.technicalName}`, modelTree(m, i)));

  write(`${CONF}/settings/graphql`, page());
  // query text lives in <name>/_jcr_content/_jcr_data.binary, as AEM exports it
  const queryNodes = Object.keys(queries.queries).map((name) => [name, {
    props: { 'jcr:primaryType': 'nt:unstructured', 'sling:resourceType': 'graphql/persistent/query' },
    children: [['jcr:content', {
      props: {
        'jcr:primaryType': 'nt:unstructured',
        'sling:resourceType': 'graphql/persistent/query/content',
        'jcr:data': raw('{Binary}'),
        'jcr:mimeType': 'text/html',
      },
    }]],
  }]);
  write(`${CONF}/settings/graphql/persistentQueries`, page([
    ['jcr:content', { props: { 'jcr:primaryType': 'nt:unstructured' } }],
    ...queryNodes,
  ]));
  Object.entries(queries.queries).forEach(([name, query]) => {
    const dir = join(jcrRoot, 'conf/luxtravelcf/settings/graphql/persistentQueries', name, '_jcr_content');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, '_jcr_data.binary'), `${query}\n`);
  });

  // GraphQL endpoint for the configuration
  write('/content/cq:graphql', { props: { 'jcr:primaryType': 'sling:Folder' } });
  write('/content/cq:graphql/luxtravelcf', { props: { 'jcr:primaryType': 'sling:Folder' } });
  write(ENDPOINT, {
    props: {
      'jcr:primaryType': 'nt:unstructured',
      'jcr:title': 'Lux Traveler Endpoint',
      'sling:resourceType': 'graphql/sites/components/endpoint',
    },
  });

  // DAM: root folder bound to the configuration so the models can be used
  write(DAM, folder('Lux Traveler', 'sling:OrderedFolder', { 'cq:conf': CONF }));
  const folders = new Set();
  [...content.assets, ...pageAssets.assets].forEach(({ path }) => folders.add(path.substring(0, path.lastIndexOf('/'))));
  content.fragments.forEach(({ parentPath }) => folders.add(`/content/dam${parentPath}`));
  [...folders].flatMap((f) => {
    const parts = f.slice(DAM.length + 1).split('/');
    return parts.map((_, i) => `${DAM}/${parts.slice(0, i + 1).join('/')}`);
  }).filter((f, i, all) => all.indexOf(f) === i).forEach((f) => {
    const title = f.substring(f.lastIndexOf('/') + 1).replace(/^./, (c) => c.toUpperCase());
    write(f, folder(title));
  });
  for (const asset of [...content.assets, ...pageAssets.assets]) await writeAsset(asset);
  content.fragments.forEach((f) => write(`/content/dam${f.parentPath}/${f.name}`, fragmentTree(f)));

  // Sites: site root (only created if missing) and the home page
  write(SITE_ROOT, {
    props: { 'jcr:primaryType': 'cq:Page' },
    children: [['jcr:content', {
      props: {
        'jcr:primaryType': 'cq:PageContent',
        'jcr:title': 'Lux Traveler',
        'cq:template': '/libs/core/franklin/templates/page',
        'sling:resourceType': 'core/franklin/components/page/v1/page',
      },
    }]],
  });
  write(PAGE, readFileSync(join(here, 'pages/index.xml'), 'utf8'));

  // META-INF
  const vault = join(root, 'META-INF', 'vault');
  mkdirSync(vault, { recursive: true });
  writeFileSync(join(vault, 'filter.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<workspaceFilter version="1.0">
    <filter root="${CONF}/settings/dam/cfm/models" mode="update"/>
    <filter root="${CONF}/settings/graphql/persistentQueries" mode="update"/>
    <filter root="${ENDPOINT}" mode="update"/>
    <filter root="${DAM}/jcr:content" mode="update"/>
    <filter root="${DAM}/images" mode="update"/>
    <filter root="${DAM}/fragments" mode="update"/>
    <filter root="${PAGE}" mode="replace"/>
</workspaceFilter>
`);
  writeFileSync(join(vault, 'properties.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE properties SYSTEM "http://java.sun.com/dtd/properties.dtd">
<properties>
    <comment>FileVault Package Properties</comment>
    <entry key="name">${NAME}</entry>
    <entry key="group">${GROUP}</entry>
    <entry key="version">${VERSION}</entry>
    <entry key="description">Lux Traveler: Content Fragment Models, persisted queries, GraphQL endpoint, DAM images, Content Fragments and the home page.</entry>
    <entry key="createdBy">luxtravelcf migration</entry>
    <entry key="packageType">content</entry>
    <entry key="requiresRoot">false</entry>
    <entry key="allowIndexDefinitions">false</entry>
</properties>
`);
  writeFileSync(join(vault, 'config.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<vaultfs version="1.1">
    <aggregates>
        <aggregate type="file" title="Files"/>
        <aggregate type="filefolder" title="File Folders"/>
        <aggregate type="nodetype" title="Node Types"/>
        <aggregate type="full" title="Full Coverage">
            <include name="rep:AccessControl" respectSupertype="true"/>
            <include name="rep:Policy" respectSupertype="true"/>
            <include name="cq:Widget" respectSupertype="true"/>
            <include name="cq:EditConfig" respectSupertype="true"/>
            <include name="cq:WorkflowModel" respectSupertype="true"/>
            <include name="vlt:FullCoverage" respectSupertype="true"/>
            <include name="mix:language" respectSupertype="true"/>
            <include name="sling:OsgiConfig" respectSupertype="true"/>
        </aggregate>
        <aggregate type="generic" title="Folders">
            <matches>
                <include name="nt:folder" respectSupertype="true"/>
            </matches>
            <contains>
                <exclude isNode="true"/>
            </contains>
        </aggregate>
        <aggregate type="generic" title="Default"/>
    </aggregates>
</vaultfs>
`);

  const out = join(target, `${NAME}-${VERSION}.zip`);
  const count = zip(root, out);
  console.log(`Wrote ${relative(process.cwd(), out)} (${count} files, ${(statSync(out).size / 1048576).toFixed(1)} MB)`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
