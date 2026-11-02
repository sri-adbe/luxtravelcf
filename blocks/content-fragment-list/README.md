# content-fragment-list

Renders a list of AEM Content Fragments. Each item references one fragment; the block fetches it
through a GraphQL persisted query (`scripts/content-fragments.js`) and renders it for the selected
Fragment Type. Models, fragments and queries are described in `tools/content-fragments/README.md`.

## Universal Editor fields

- **Content Fragment List** (`content-fragment-list`): *Fragment Type* select (`classes`): `curators`,
  `destinations`, `services`, `testimonials`, `experiences`, `stays`, `features`. Selects the persisted query and layout.
- **Content Fragment** (`content-fragment-list-item`): *Content Fragment* picker (`fragment`, limited to
  `/content/dam/luxtravelcf/fragments`) and a hidden `variation`.

Rendered fragments are instrumented as Universal Editor references, so their fields can be edited in
place, in the properties rail, or in the Content Fragment Editor.

## Content structure

| Row | Cell 1 | Cell 2 |
| --- | --- | --- |
| one per item | link to the fragment path, e.g. `/content/dam/luxtravelcf/fragments/curators/jim-moreau` | variation (optional, defaults to `master`) |

| Fragment Type | Model | Persisted query |
| --- | --- | --- |
| curators | Curator | `luxtravelcf/curatorByPath` |
| destinations | Destination | `luxtravelcf/destinationByPath` |
| services | Service | `luxtravelcf/serviceByPath` |
| testimonials | Testimonial | `luxtravelcf/testimonialByPath` |
| experiences | Experience | `luxtravelcf/experienceByPath` |
| stays | Stay | `luxtravelcf/stayByPath` |
| features | Feature | `luxtravelcf/featureByPath` |

Items whose fragment can't be loaded are hidden.
