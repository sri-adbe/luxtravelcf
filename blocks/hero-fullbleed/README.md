# hero-fullbleed

Custom **hero** block. 

## Authoring (Document Authoring)

Model: `standalone`

Single block table. Content: one row, one cell of content.

## Supported variations

No variations.

## Universal Editor fields

- Content fields derived from the block's decorate contract.

## Content structure

| Row | Field(s) | Content |
| --- | --- | --- |
| 1 | `image`, `imageAlt` | Full-bleed background photo (rendered under a dark overlay) |
| 2 | `text` (rich text) | `h1` headline, subline paragraph, CTA link (e.g. "Talk to a Travel Advisor") |

Missing image falls back to a plain content block (`no-image` class).
