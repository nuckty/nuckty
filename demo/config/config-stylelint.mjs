const group = (properties) => ({
    properties,
    emptyLineBefore: 'always',
    noEmptyLineBetween: true,
});

export default {
    extends: [],
    plugins: ['stylelint-order', '@stylistic/stylelint-plugin'],
    rules: {
        'order/order': [
            'custom-properties',
            'declarations',
            { type: 'at-rule', name: 'supports' },
            { type: 'at-rule', name: 'media' },
            { type: 'at-rule', hasBlock: true },
            'rules',
        ],
        'order/properties-order': [
            group(['position', 'z-index', 'top', 'right', 'bottom', 'left', 'inset']),
            group([
                'display', 'visibility', 'float', 'clear', 'overflow', 'overflow-x', 'overflow-y',
                'flex', 'flex-grow', 'flex-shrink', 'flex-basis', 'flex-direction', 'flex-wrap',
                'justify-content', 'align-items', 'align-self', 'grid', 'grid-template-rows',
                'grid-template-columns', 'grid-row', 'grid-column', 'gap',
            ]),
            group([
                'box-sizing', 'width', 'min-width', 'max-width', 'height', 'min-height', 'max-height',
                'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'padding',
                'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
            ]),
            group([
                'font', 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height',
                'content', 'text-align', 'text-decoration', 'text-overflow', 'text-transform',
                'letter-spacing', 'white-space', 'cursor', 'user-select', 'pointer-events',
            ]),
            group([
                'opacity', 'color', 'border', 'border-width', 'border-style', 'border-color',
                'border-radius', 'outline', 'background', 'background-color', 'background-image',
                'background-repeat', 'background-position', 'background-size', 'object-fit',
                'box-shadow', 'mask', 'filter', 'fill',
            ]),
            group([
                'transition', 'transition-property', 'transition-duration',
                'transition-timing-function', 'transform', 'transform-origin', 'animation',
            ]),
        ],
        'rule-empty-line-before': ['always', { except: ['first-nested'], ignore: ['after-comment'] }],
        'block-no-empty': true,
        'property-no-unknown': true,
        'color-hex-length': 'short',
        'color-no-invalid-hex': true,
        'no-empty-source': true,
        'shorthand-property-no-redundant-values': true,
        'declaration-block-no-duplicate-properties': true,
        'length-zero-no-unit': true,
        '@stylistic/max-empty-lines': 1,
    },
};
