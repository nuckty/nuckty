# Omit eligible HTML head start tags

## Why
The serializer always emits an explicit head start tag, even when HTML permits omission without changing the document tree.

## What Changes
Omit an attribute-free HTML head start tag under html when empty or beginning with an element. Preserve literal text, opaque raw content, emitted attributes and foreign/fragment contexts. Add exact-output regression coverage and align the canonical documentation.

## Impact
HTML serialization, wrapper-output expectations, and the bilingual HTML output reference. No change to other optional-tag policies.

## Optional-tag audit
Source: https://html.spec.whatwg.org/multipage/syntax.html#optional-tags (checked 2026-10-23).

| Tags | Current policy and remaining opportunity |
| --- | --- |
| head start | Implemented by this change for eligible resolved HTML children; opaque raw remains conservative. |
| html/body start | Always retained, even where attribute-free wrappers could be omitted. Attribute-bearing wrappers must remain. |
| colgroup/tbody start | Always retained. Omission requires first-child and preceding sibling/end-tag context. |
| html/head/body end | Already omitted in ordinary structure; retained before any raw/text sibling, including some cases where HTML permits omission. |
| li end | Already omitted for article/tight lists; ordinary lists deliberately retain it. Article lists deliberately retain the last end tag. |
| dt/dd end | Always retained. HTML permits omission before eligible definition siblings, and at the tail for dd. |
| rt/rp end | Always retained. HTML permits omission before rt/rp or at the parent tail. |
| optgroup/option end | Always retained. HTML permits omission before specified peers/hr or at the parent tail. |
| colgroup/caption end | Always retained. HTML permits omission unless followed by ASCII whitespace or a comment. |
| p/thead/tbody/tfoot/tr/td/th end | Contextual omission is already implemented; text/raw and unknown-parent cases remain conservative. |

This audit records opportunities, not a request to change all serialization policies together. Start tags with emitted attributes are never eligible. Omitting tags assumes a conforming input tree; the serializer does not repair invalid HTML.
