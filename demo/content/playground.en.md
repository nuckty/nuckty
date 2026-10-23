# BEMJSON → templates → HTML

BEMJSON describes a block: its name, elements, content and modifiers. Edit JSON and compare the HTML, resolved tree and preview. The example uses the real nuckty engine in your browser.

::playground

## How templates change markup

The card template sets `article` for the block, `h2` for its title and `p` for its description. Block and element names become BEM classes: `card`, `card__title` and `card__description`.

```ts
import { block } from 'nuckty';

export default function templates(): void {
    block('card')({ tag: 'article' });
    block('card').elem('title')({ tag: 'h2' });
    block('card').elem('description')({ tag: 'p' });
}
```

The editor registers these rules in `Templates` and calls the core `render` function. Expand “Tree after templates” to inspect the intermediate result before the engine serializes it into HTML.

## What to try

1. Change `Hello, nuckty` in the card: its HTML and preview update immediately.
2. Add `"mods": { "color": "orange" }` to the card object, separated by a comma. The HTML gains `card_color_orange`, and the preview uses an orange border and background.
3. Select “List”. Its `"tightList": true` allows the engine to omit closing `li` tags in this example.
4. Select “Button with a modifier” and change `"disabled": true` to `false`. The template stops adding `disabled`, enabling the button.
5. Select “Escaping”. Angle brackets become entities in HTML and remain text in the preview.
6. Remove a JSON quote to see the error. Restore it or select “Reset”.

The preview uses a separate `iframe` with an empty `sandbox`: scripts in the entered HTML do not execute. Editing JSON changes the example; it does not write website source files.

[Inspect build files](output.en.md)
