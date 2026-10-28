# Output HTML

The engine serializes a [BEMJSON tree](../how/bemjson.md) as minimal HTML5 without formatting indentation. Newlines from text, code, and `raw` are preserved, so the output need not be a single line.

## Minimization by 30 rules

The rules describe how the typed tree becomes minimal HTML. Structural validity depends on the input tree and consumer [templates](../how/templates.md). Check the actual artifact with W3C Nu Html Checker; minimization tests do not prove that every document is valid.

### Document wrapper

1. With `document: true`, the first bytes are `<!doctype html>`.
2. The `<html>` start tag is omitted when it has no emitted attributes or classes and omission does not move a leading comment outside the root.
3. The `<head>` start tag is omitted when it has no emitted attributes or classes and is empty or begins with an element.
4. The `<body>` start tag is omitted when it has no emitted attributes or classes and is empty or begins with something other than ASCII whitespace, a comment, or `meta`, `noscript`, `link`, `script`, `style`, `template`.
5. With `document: true`, the engine appends two newlines. A fragment without that option does not receive them. A required paragraph or empty-wrapper boundary remains explicit so those newlines do not move into another element.

The serializer evaluates resolved children after flattening arrays and `tag: false` fragments; null positions and empty strings emit nothing. Attributes include BEM/mix classes, explicit `cls` and generated `data-bem`: an opening tag carrying any of them stays. Standalone `head`/`body` fragments retain their wrappers because their parent is unknown. Trusted `raw` is preserved verbatim; where its contents prevent proving omission safe, the neighboring tag stays explicit.

### Void elements

`area, base, br, col, embed, hr, img, input, link, meta, param, source, track, wbr`:

6. `<name attributes>` — **without `/>`**.
7. Inside SVG, empty `path`, `circle`, `ellipse`, `line`, `polygon`, `polyline`, `rect`, `use`, and `stop` elements use `/>`. Other SVG elements retain an end tag. `foreignObject` restores HTML rules for its descendants; a nested `svg` restores SVG rules.

The supported void-tag set also includes legacy `param`.

Tag and boolean-attribute matching ignores ASCII letter case while preserving authored spelling. Thus `IMG` remains a void tag; mixed-case SVG and `foreignObject` preserve their serialization contexts. Unicode attribute names are not folded into known boolean names.

### Boolean attributes

`muted, autoplay, playsinline, async, defer, disabled, checked, selected, …`:

8. Name only, no `=` and no value.

`hidden` is enumerated: string values such as `until-found` are preserved. In `attrs`, `hidden: true` emits a bare attribute and `hidden: false` omits it.

### Attribute quotes

The engine escapes HTML characters first, then chooses outer quotes for the encoded value:

9. the value is empty → `alt=""` (quotes are mandatory);
10. quotes are required if it contains any of these characters: whitespace, `"`, `'`, `` ` ``, `=`, `<`, `>`;
11. otherwise — unquoted: `name=value`.

12. When quoting is required, use double quotes `"..."`.

A comma in a value does **not** require quotes — `data-tags=a,b` stays unquoted.

A logical `"`, `<`, or `>` becomes an HTML entity before this check and does not require outer quotes by itself. For example, the logical value `"` can be emitted as `data-x=&quot;`. Generated `data-bem` is the always-quoted exception described below.

### Omitting optional closing tags

13. `</html>` and `</body>` are omitted unless a following comment would move to another parent. `</head>` stays before ASCII whitespace or a comment. Opaque `raw` boundaries are handled conservatively.
14. `</li>` is omitted before another `li` and at the end of `ul`, `ol` or `menu`. This applies equally to Markdown and template lists. The legacy `tightList` field no longer changes serialization.
15. `</td>` and `</th>` are omitted before another `td`/`th` or at the end of a row.
16. `</tr>` is omitted before another `tr` or at the end of its table or row group.
17. `</thead>` is omitted immediately before `tbody` or `tfoot`.
18. `</tbody>` is omitted before another `tbody` or `tfoot`, or at the end of its table. `</tfoot>` is omitted at the end of its table.
19. `</p>` is omitted before the tags listed in the [HTML Standard](https://html.spec.whatwg.org/multipage/syntax.html#optional-tags) and at the end of a known HTML parent other than `a`, `audio`, `del`, `ins`, `map`, `noscript`, `video` or an autonomous custom element. It stays before text, whitespace, inline elements and opaque `raw`, in foreign content and in a fragment with an unknown parent. Document-formatting newlines stay outside a final paragraph.
20. Other optional end tags follow the table below. Non-optional end tags remain explicit.

| End tag | Omitted when followed by |
| --- | --- |
| `dt` | `dt` or `dd` |
| `dd` | `dt`, `dd`, or the end of its definition group |
| `rt`, `rp` | `rt`, `rp`, or the end of `ruby` |
| `option` | `option`, `optgroup`, `hr`, or the end of its option container |
| `optgroup` | `optgroup`, `hr`, or the end of its parent inside `select` |
| `caption`, `colgroup` | Anything except ASCII whitespace or a comment; an unknown `raw` boundary keeps the tag |

The `<colgroup>` start tag is omitted without emitted attributes only when the first child is `col` and the preceding sibling is not another `colgroup` with an omitted end tag. The `<tbody>` start tag is omitted without emitted attributes only when the first child is `tr` and the preceding sibling is not `thead`, `tbody` or `tfoot` with an omitted end tag. Empty groups and groups beginning with text or comments retain their start tags. These guards keep adjacent groups distinct.

Optional-tag rules apply to HTML elements, not SVG or MathML elements. HTML descendants at SVG/MathML integration points use HTML rules again. Minimization assumes a conforming input tree; it does not repair an invalid content model. Regression tests compare the parsed structure, namespaces, attributes, text and comments against explicit-tag output.

### Whitespace and comments

21. The engine adds no spaces, indentation, or formatting newlines between elements.
22. Literal spaces from the source and templates are preserved (they are not stripped inside text or attributes).
23. HTML comments (`<!-- -->`) are not dropped or reformatted — they are output as is.
24. Inside `<pre><code>`, the inner text is preserved as is, including the trailing `\n`.

### Special cases

25. `raw` nodes are output unchanged — no escaping, no minimization.
26. The serializer preserves inline HTML supplied as `raw`, including single quotes. The Markdown bridge may rewrite image paths before serialization.
27. Scripts inside `raw` are preserved verbatim; ordinary string `content` is escaped.

### Edge cases

28. The `d` value of an SVG path (`d="m14.5...c..."`) contains sequences like `c/` — these must not be parsed as tags.
29. `data-bem` is always emitted in double quotes.
30. UTF-8 characters are inserted directly (`—`, Cyrillic); the serializer escapes text and attribute values; trusted `raw` stays unchanged.

## Why not html-minifier

The engine minimizes its typed tree during serialization, so it does not need a separate finished-string postprocessor. This architectural choice does not establish that other tools reject every document with omitted optional tags. For details, see the [data model decision](../why/bemjson.md).

## One mode

There is no separate development mode with "pretty" HTML. It is the same as production: the output is always minimal. Debugging a page is easier through the `output: 'bemjson'` mode (see [two-pass rendering](../why/render.md)) than through formatted HTML.
