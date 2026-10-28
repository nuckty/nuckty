const messages = {
    'files in this build': 'files in this build',
    'All files: {0} KB, including compressed copies.': (value0: string) =>
        `All files: ${value0} KB, including compressed copies.`,
    B: 'B',
    'File list unavailable: {0}. Open the demo with npm run serve.': (value0: string) =>
        `File list unavailable: ${value0}. Open the demo with npm run serve.`,
};

export default messages;
