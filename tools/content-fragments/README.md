# Lux Traveler Content Fragments

The curators, destinations, services and testimonials lists on the home page are authored as AEM
Content Fragments and rendered by the `content-fragment-list` block (`blocks/content-fragment-list`). Each item of a `content-fragment-list`
block references one fragment; the block's *Fragment Type* (`curators`, `destinations`, `services`,
`testimonials`) selects the persisted query and layout.

| File | Purpose |
| --- | --- |
| `models.json` | Content Fragment Models (Sites API `POST /adobe/sites/cf/models` payload) |
| `fragments.json` | Fragments and the DAM images they reference. Also used as the local preview mirror on `localhost` |
| `persisted-queries.json` | GraphQL persisted queries used by `scripts/content-fragments.js` |
| `setup-aem.mjs` | Creates folders, images, models, fragments and persisted queries on AEM author |

## Models

| Model | Fields |
| --- | --- |
| Curator (`curator`) | name, region, bio (multi line), image (content reference), ctaLabel, ctaLink |
| Destination (`destination`) | name, country, tagline, image (content reference), link |
| Service (`service`) | number, title, description (multi line), link |
| Testimonial (`testimonial`) | quote (multi line), author, location, featured (boolean) |

Fragments live in `/content/dam/luxtravelcf/fragments/{curators,destinations,services,testimonials}`,
images in `/content/dam/luxtravelcf/images`.

## Option A: content package (recommended)

`node tools/content-package/build.mjs` builds
`tools/content-package/target/luxtravelcf-content-1.0.0.zip` (FileVault). It contains:

| Path | Content | Filter mode |
| --- | --- | --- |
| `/conf/luxtravelcf/settings/dam/cfm/models` | the 4 Content Fragment Models (enabled) | update |
| `/conf/luxtravelcf/settings/graphql/persistentQueries` | the 4 persisted queries | update |
| `/content/cq:graphql/luxtravelcf/endpoint` | GraphQL endpoint | update |
| `/content/dam/luxtravelcf/jcr:content` | `cq:conf` binding to `/conf/luxtravelcf` | update |
| `/content/dam/luxtravelcf/images` | 9 images (curators, destinations, home page) | update |
| `/content/dam/luxtravelcf/fragments` | the 14 Content Fragments | update |
| `/content/luxtravelcf/index` | the home page (Universal Editor) | **replace** |

Parent nodes (`/conf/luxtravelcf`, `/content/luxtravelcf`, …) are only created when missing.

1. Install the zip in **Package Manager** (`/crx/packmgr`) on author. On AEM as a Cloud Service
   production, deploy it through Cloud Manager instead if Package Manager installs are restricted.
2. In Assets, select `/content/dam/luxtravelcf/images` and run **Reprocess Assets**, so the images
   get renditions and web-optimized delivery URLs (packaged assets aren't processed on install).
3. **Publish** the models, images, fragments, persisted queries, GraphQL endpoint and the page.
4. **CORS**: see step 5 below.

The page source is `tools/content-package/pages/index.xml`, converted from the imported
`content/index.plain.html` with the Universal Editor component models. Regenerate it if the page
is re-imported.

## Option B: setup script

1. **Configuration Browser** (Tools › General): create `luxtravelcf` with *Content Fragment Models*
   and *GraphQL Persisted Queries* enabled.
2. **GraphQL endpoint** (Tools › General › GraphQL): create an endpoint for the `luxtravelcf` configuration.
3. Run the setup script with a local developer token from the AEM Developer Console:

   ```bash
   node tools/content-fragments/setup-aem.mjs --dry-run          # preview what will be created
   AEM_TOKEN=<token> node tools/content-fragments/setup-aem.mjs   # create it
   ```

   The script is idempotent and keeps anything that already exists.
4. **Publish** the models, images, fragments, persisted queries and the GraphQL endpoint.
5. **CORS**: allow the Edge Delivery origins (`https://*--luxtravelcf--sri-adbe.aem.page`,
   `https://*--luxtravelcf--sri-adbe.aem.live` and the production domain) to call
   `/graphql/execute.json/*` on publish (`com.adobe.granite.cors.impl.CORSPolicyImpl` OSGi config).

## Local preview

On `localhost`, when AEM can't be reached, `scripts/content-fragments.js` falls back to
`fragments.json`, so the page renders before the fragments exist in AEM. Keep it in sync with AEM
if fragment content changes.
