import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const fixtures = require('./fixtures/brace-compatibility.json');
const repaired = require('../../vendor/braces');
test('brace repair preserves ordinary compiled, expanded and stringified patterns', () => {
    for (const { pattern, options, main, compile, stringify, expand } of fixtures) {
        assert.deepEqual(repaired(pattern, options), main, pattern);
        assert.equal(repaired.compile(pattern, options), compile, pattern);
        assert.equal(repaired.stringify(pattern, options), stringify, pattern);
        assert.deepEqual(repaired.expand(pattern, options), expand, pattern);
    }

    assert.deepEqual(repaired(['{a,b}', '{1..2}'], { expand: true }), ['a', 'b', '1', '2']);
    assert.throws(() => repaired.expand('{1..1001}'), /range limit/);
    assert.throws(() => repaired.parse('a'.repeat(10001)), /max characters/);
});

for (const method of ['compile', 'stringify', 'expand']) {
    test(`brace ${method} completes deep patterns with a small native stack`, () => {
        const modulePath = fileURLToPath(new URL('../../vendor/braces/index.js', import.meta.url));
        const code = `const assert=require('node:assert/strict');const braces=require(${JSON.stringify(modulePath)});const input='{'.repeat(1800)+'x'+'}'.repeat(1800);const output=braces[${JSON.stringify(method)}](input);assert.deepEqual(output,${method === 'expand' ? '[input]' : 'input'});`;

        execFileSync(process.execPath, ['--stack-size=256', '-e', code], { stdio: 'pipe', timeout: 10000 });
    });
}

test('brace repair preserves deep valid alternatives and parenthesis groups', () => {
    const modulePath = fileURLToPath(new URL('../../vendor/braces/index.js', import.meta.url));
    const code = `const assert=require('node:assert/strict');const braces=require(${JSON.stringify(modulePath)});const depth=1500;const input='{'.repeat(depth)+'a,b'+',}'.repeat(depth);assert.equal(braces.compile(input),'('.repeat(depth)+'a|b'+'|)'.repeat(depth));assert.equal(braces.stringify(input),input);assert.deepEqual(braces.expand(input,{nodupes:true}),['a','b','']);const groups='('.repeat(depth)+'x'+')'.repeat(depth);assert.equal(braces.compile(groups),groups);assert.equal(braces.stringify(groups),groups);assert.deepEqual(braces.expand(groups),[groups]);`;

    execFileSync(process.execPath, ['--stack-size=256', '-e', code], { stdio: 'pipe', timeout: 10000 });
});

