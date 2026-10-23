# Output HTML

The engine serializes a [BEMJSON tree](../how/bemjson.md) as minimal HTML5 without formatting indentation. Newlines from text, code, and `raw` are preserved, so the output need not be a single line.

## Minimization by 30 rules

The rules describe how the typed tree becomes minimal HTML. Structural validity depends on the input tree and consumer [templates](../how/templates.md). Check the actual artifact with W3C Nu Html Checker; minimization tests do not prove that every document is valid.

### Document wrapper

1. With `document: true`, the first bytes are `<!doctype html>`.
2. If the tree contains `<html>`, its opening tag and attributes are emitted; **`</html>` is omitted when no following literal sibling requires it**.
3. An HTML `<head>` start tag under `html` is omitted when it has no emitted attributes or classes and is empty or begins with an element, including through nested arrays and tag-false fragments. Initial text, whitespace and nonempty opaque `raw` keep the start tag; empty strings and empty `raw` do not block omission. Standalone and foreign-context `head` start tags remain explicit. `</head>` is omitted when no following literal sibling requires it.
4. If the tree contains `<body>`, its opening tag and attributes are emitted; **`</body>` is omitted when no following literal sibling requires it**.
5. With `document: true`, the engine appends two newlines. A fragment without that option does not receive them.

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

13. `</html>`, `</head>` and `</body>` are omitted in ordinary document structure; they remain before opaque raw/comment or text siblings. In particular, `head` closes before following literal whitespace.
14. `</li>` — depends on the list:
    - lists from Markdown (`article__list`) — omitted before the next `<li>`, **emitted** on the last item;
    - template lists with `tightList: true` — omitted before the next `<li>` and at the end of the list; retained before any other sibling;
    - regular template lists — **always emitted**.
15. `</td>` and `</th>` are omitted before the next cell or at the end of a row; they remain before other siblings.
16. `</tr>` is omitted before the next row or at the end of its table or row group; it remains before other siblings.
17. `</thead>` is omitted only immediately before `tbody` or `tfoot`.
18. `</tbody>` is omitted immediately before another `tbody` or `tfoot`, or at the end of the table. `</tfoot>` is omitted only at the end of the table. Literal text and raw comments are siblings, so they require the preceding group to close.
19. `</p>` is omitted before the tags listed in the [HTML Standard](https://html.spec.whatwg.org/multipage/syntax.html#optional-tags) and at the end of an HTML parent other than `a`, `audio`, `del`, `ins`, `map`, `noscript`, `video` or a custom element. It remains before text, whitespace, inline elements and opaque `raw` content, inside SVG, and at the end of a fragment with no known parent. With `document: true`, a final paragraph directly inside `body` or `html` closes explicitly so the two formatting newlines stay outside it.

20. The rest (`a, code, span, strong, ol, ul, table, div, section, pre, button, footer, video, svg, title, script, noscript, label, h1, …`) — both tags.

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
