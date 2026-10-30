---
"@nuckty/core": minor
"@nuckty/ext-command-deploy-ftp": patch
---

Unused core exports are removed: `getRoot`, `getExternalContent`, `getFileTimestamp`, `formatLastUpdated`, `classify`, `stringifyEntity`, `parseClass`, `createBlockFor`, `classicPreset` and `NamingPreset`, together with the `tightList` node field and the descriptive `contentRepo`/`assetRepos` site settings. `page.lastUpdated` is now the Unix time in seconds of the source's last commit instead of a preformatted GMT+03 string. The deploy summary no longer counts ZIP uploads separately.
