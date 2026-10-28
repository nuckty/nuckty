# Gallery and grid

The `gallery` and `grid` extensions add these directives. Compare the rendered block with its “Markdown source” tab: files provide the images and text; extension blocks provide markup and behavior.

## Open an image

Select an image. Close it with the button, the surrounding backdrop or Escape. Focus then returns to the selected image. The first gallery image loads eagerly; the others use `loading=lazy`.

::example{sample=gallery}

All three illustrations are included in this project. The gallery needs no external image service.

## Paragraphs become columns

Each paragraph inside `:::grid` becomes a cell. Resize the window to see the columns rearrange. This directive accepts paragraphs; lists and headings inside it are not supported.

::example{sample=grid}

## Use these extensions

Add the packages to `ext` in the nuckty configuration and block names to the bundle declaration. The build finds their templates, styles and lightbox script. Keep your other extensions and blocks alongside these entries.

```ts
ext: [
    '@nuckty/ext-block-root',
    '@nuckty/ext-block-gallery',
    '@nuckty/ext-block-grid',
]
```

```js
module.exports = ['root', 'gallery', 'lightbox', 'grid'];
```

[Inspect this demo’s build output](output.en.md)
