module.exports = {
  multipass: true,
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          // Preserve fractional transforms in pre-scaled logo exports.
          convertPathData: { applyTransforms: false },
          convertTransform: false,
        },
      },
    },
    'removeEmptyContainers',
    'sortAttrs',
    {
      name: 'mergePaths',
      params: {
        force: true,
        floatPrecision: 0,
      },
    },
  ],
}
