const ru = document.documentElement.lang === 'ru';
const locale = ru ? 'ru' : 'en';
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
            const entries = Object.entries(files).filter(([, value]) => value && typeof value === 'object' && typeof value.size === 'number');
            status.textContent = `${entries.length} ${ru ? 'файлов в текущей сборке' : 'files in this build'}`;
            const total = entries.reduce((sum, [, file]) => sum + file.size, 0);
            summary.textContent = ru ? `Размер всех файлов: ${(total / 1024).toLocaleString(locale, { maximumFractionDigits: 1 })} КБ, включая сжатые копии.` : `All files: ${(total / 1024).toLocaleString(locale, { maximumFractionDigits: 1 })} KB, including compressed copies.`;

            for (const [filename, file] of entries.sort(([a], [b]) => a.localeCompare(b))) {
                const row = document.createElement('div');
                row.className = 'artifact-viewer__row';
                const original = /^(?:html|css|js|svg)\//.test(filename);
                const label = document.createElement(original ? 'a' : 'span');

                if (original) {
                    label.href = filename.startsWith('html/') ? (filename === 'html/index.html' ? '/' : `/${filename.slice(5, -5).replaceAll('_', '/')}`) : `/${filename.split('/').at(-1)}`;
                }
                label.textContent = filename;
                const size = document.createElement('span');
                size.textContent = `${file.size.toLocaleString(locale)} ${ru ? 'Б' : 'B'}`;
                row.append(label, size);
                list.append(row);
            }
        } catch (error) {
            status.textContent = ru ? `Список файлов недоступен: ${error.message}. Откройте демо через npm run serve.` : `File list unavailable: ${error.message}. Open the demo with npm run serve.`;
        }
    }

    void load();
}

