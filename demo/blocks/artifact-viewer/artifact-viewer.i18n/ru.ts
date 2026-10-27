import type en from './en.js';

const messages = {
    'files in this build': 'файлов в текущей сборке',
    'All files: {0} KB, including compressed copies.': (value0: string) =>
        `Размер всех файлов: ${value0} КБ, включая сжатые копии.`,
    B: 'Б',
    'File list unavailable: {0}. Open the demo with npm run serve.': (value0: string) =>
        `Список файлов недоступен: ${value0}. Откройте демо через npm run serve.`,
} satisfies typeof en;

export default messages;
