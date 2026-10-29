import test from 'node:test';
import assert from 'node:assert/strict';
import { importSpecifiers } from './check-imports.mjs';

test('import specifiers include multi-line lists, re-exports, side effects and dynamic imports', () => {
    const source = 'import {\n  a,\n  b\n} from "multi";\nexport * from "re";\nimport type { T } from \'typed\';\nimport "side";\nconst m = await import("dynamic");\nexport const text = "from \'not-an-import\'";\n';
    assert.deepEqual(importSpecifiers(source), ['multi', 're', 'typed', 'side', 'dynamic']);
});
