import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../../blocks/gallery/gallery.js', import.meta.url), 'utf8');

test('gallery runtime preserves native links and manages one modal with focus return', () => {
    const listeners: Record<string, (event: any) => void> = {};
    let focused: unknown;
    const body = { style: { overflow: 'auto' } };
    const create = () => {
        const classes = new Set<string>();
        const button = { focus() { focused = button; } };
        const image = { src: '', alt: '' };
        const box = {
            modal: false,
            classList: { add(value: string) { classes.add(value); }, remove(value: string) { classes.delete(value); } },
            querySelector(selector: string) { return selector === 'img' ? image : button; },
            showModal() { this.modal = true; },
            close() { this.modal = false; },
        };
        const gallery = { querySelector() { return box; } };
        const item = {
            isConnected: true,
            closest(selector: string) { return selector === '.gallery' ? gallery : item; },
            getAttribute() { return '/image.png'; },
            querySelector() { return { alt: 'Example' }; },
            focus() { focused = item; },
        };
        return { box, item, button, classes };
    };
    const first = create();
    const second = create();
    runInNewContext(source, { document: { body, addEventListener(name: string, callback: (event: any) => void) { listeners[name] = callback; } } });
    const click = (target: unknown, extra = {}) => {
        let prevented = false;
        listeners.click!({ target, button: 0, preventDefault() { prevented = true; }, ...extra });
        return prevented;
    };
    for (const modifier of ['ctrlKey', 'metaKey', 'shiftKey', 'altKey']) {
        assert.equal(click(first.item, { [modifier]: true }), false);
        assert.equal(first.box.modal, false);
    }
    assert.equal(click(first.item, { button: 1 }), false);
    assert.equal(click(first.item), true);
    assert.equal(first.box.modal, true);
    assert.equal(focused, first.button);
    assert.equal(body.style.overflow, 'hidden');
    click(second.item);
    assert.equal(first.box.modal, false);
    assert.equal(second.box.modal, true);
    let stopped = false;
    listeners.keydown!({ key: 'Escape', preventDefault() {}, stopImmediatePropagation() { stopped = true; } });
    assert.equal(stopped, true);
    assert.equal(second.box.modal, false);
    assert.equal(focused, second.item);
    assert.equal(body.style.overflow, 'auto');
});
