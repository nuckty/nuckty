# BEMJSON → templates → HTML

BEMJSON describes a block: its name, elements, content and modifiers. Edit JSON and compare the HTML, resolved tree and preview. The example uses the real nuckty engine in your browser.

::playground

## How templates change markup

The card template sets `article` for the block, `h2` for its title and `p` for its description. Block and element names become BEM classes: `card`, `card__title` and `card__description`.

```ts
import { block } from '@nuckty/core';

export default function templates(): void {
    block('card')({ tag: 'article' });
    block('card').elem('title')({ tag: 'h2' });
    block('card').elem('description')({ tag: 'p' });
}
```

The editor registers these rules in `Templates` and calls the core `render` function. Expand “Tree after templates” to inspect the intermediate result before the engine serializes it into HTML.

An explicit BEMJSON `tag` takes precedence over the template tag. For example, `"tag": "section"` on the card produces `section` instead of `article`. The block declaration does not apply to its elements: an element without its own template uses the default `div`.

## What to try

1. Change the card heading text: its HTML and preview update immediately.
2. Add `"mods": { "color": "orange" }` to the card object, separated by a comma. The HTML gains `card_color_orange`, and the preview changes the card background.
3. Select “List”. The `list` block and its `item` elements become `ul` and `li`. Closing `li` tags are omitted automatically according to HTML5 rules.
4. Select “Button with a modifier” and change `"disabled": true` to `false`. The template stops adding `disabled`, enabling the button.
5. Select “Escaping”. Angle brackets become entities in HTML and remain text in the preview.
6. Remove a JSON quote to see the error. Restore it or select “Reset”.

The preview uses a separate `iframe` with an empty `sandbox`: scripts in the entered HTML do not execute. Editing JSON changes the example; it does not write website source files.

[Inspect build files](output.en.md)
