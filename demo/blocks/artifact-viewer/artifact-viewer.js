import { messages } from './artifact-viewer.i18n/index.js';
const locale = document.documentElement.lang;
const t = messages(locale);
const viewer = document.querySelector('.artifact-viewer');

if (viewer) {
    const status = viewer.querySelector('.artifact-viewer__status');
    const summary = viewer.querySelector('.artifact-viewer__summary');
    const list = viewer.querySelector('.artifact-viewer__files');

    async function load() {
        try {
            const response = await fetch('/build-files.txt');

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const manifest = await response.json();
            const files = manifest.files ?? manifest;
            const entries = Object.entries(files).filter(
                ([, value]) => value && typeof value === 'object' && typeof value.size === 'number',
            );
            status.textContent = `${entries.length} ${t['files in this build']}`;
            const total = entries.reduce((sum, [, file]) => sum + file.size, 0);
            summary.textContent = t['All files: {0} KB, including compressed copies.'](
                String((total / 1024).toLocaleString(locale, { maximumFractionDigits: 1 })),
            );

            for (const [filename, file] of entries.sort(([a], [b]) => a.localeCompare(b))) {
                const row = document.createElement('div');
                row.className = 'artifact-viewer__row';
                const original = /^(?:html|css|js|svg)\//.test(filename);
                const label = document.createElement(original ? 'a' : 'span');

                if (original) {
                    label.href = filename.startsWith('html/')
                        ? filename === 'html/index.html'
                            ? '/'
                            : `/${filename.slice(5, -5).replaceAll('_', '/')}`
                        : `/${filename.split('/').at(-1)}`;
                }
                label.textContent = filename;
                const size = document.createElement('span');
                size.textContent = `${file.size.toLocaleString(locale)} ${t['B']}`;
                row.append(label, size);
                list.append(row);
            }
        } catch (error) {
            status.textContent = t['File list unavailable: {0}. Open the demo with npm run serve.'](
                String(error.message),
            );
        }
    }

    void load();
}
