/**
 * nu authoring API — `block('x')(...)` and the fluent selector.
 *
 *   block('menu')({ tag: 'ul' });                          // block
 *   block('menu').elem('item')({ tag: 'li' });             // element
 *   block('link').mod('active')({ tag: 'span' });          // block modifier
 *   block('menu').elem('item').mod('state', 'open')({});   // element modifier
 *   block<ButtonProps>('button')({ attrs: (n) => ... });   // typed props
 *   block('menu').elem('item').when((n) => ...)({ ... });  // custom predicate
 *   block('badge').replace((n) => ({ ... }));              // control mode
 *
 * `.mod()` refines the selected entity: a block modifier on a block selector,
 * an element modifier after `.elem()`.
 *
 * @module bem/api
 */

import type { BemNode } from './types.js';
import type { Modes, Predicate, Template } from './template-types.js';
import { Templates } from './templates.js';
import { currentTemplates } from './template-context.js';

type Selection = Omit<Template, 'modes' | 'order'>;
type TypedPredicate<P> = (node: BemNode & { props?: P }) => boolean;

/** The callable returned by `block(name)`: terminate with modes, or refine further. */
export interface BlockEntry<P> {
    (body: Modes<P>): void;
    (predicate: TypedPredicate<P>, body: Modes<P>): void;
    elem(name: string): BlockEntry<P>;
    mod(name: string, value?: string | true): BlockEntry<P>;
    when(predicate: TypedPredicate<P>): BlockEntry<P>;
    replace(fn: NonNullable<Modes<P>['replace']>): void;
    wrap(fn: NonNullable<Modes<P>['wrap']>): void;
    def(fn: NonNullable<Modes<P>['def']>): void;
}

function both(first: Predicate | undefined, second: Predicate): Predicate {
    return first ? (node) => first(node) && second(node) : second;
}

function entry<P>(templates: Templates, selection: Selection): BlockEntry<P> {
    const register = (modes: Modes<P>, predicate?: Predicate): void => {
        const declared: Selection = predicate ? { ...selection, predicate: both(selection.predicate, predicate) } : selection;

        templates.add({ ...declared, modes: modes as Modes });
    };
    const terminator = ((bodyOrPredicate: Modes<P> | TypedPredicate<P>, body?: Modes<P>): void => {
        if (typeof bodyOrPredicate !== 'function') {
            register(bodyOrPredicate);
            return;
        }
        if (!body) {
            throw new Error('nuckty/bem: predicate shorthand requires a modes body');
        }
        register(body, bodyOrPredicate as Predicate);
    }) as BlockEntry<P>;

    terminator.elem = (name) => {
        if (selection.modName !== undefined) {
            throw new Error(`nuckty/bem: block('${selection.block}').mod() cannot be followed by .elem(); select the element first`);
        }

        return entry<P>(templates, { ...selection, elem: name });
    };
    terminator.mod = (name, value) => {
        const { modVal: _previous, ...rest } = selection;

        return entry<P>(templates, { ...rest, modName: name, ...(value === undefined ? {} : { modVal: value }) });
    };
    terminator.when = (predicate) => entry<P>(templates, { ...selection, predicate: both(selection.predicate, predicate as Predicate) });
    terminator.replace = (fn) => register({ replace: fn } as Modes<P>);
    terminator.wrap = (fn) => register({ wrap: fn } as Modes<P>);
    terminator.def = (fn) => register({ def: fn } as Modes<P>);

    return terminator;
}

/** Create a block function bound to a template collection. */
export function createBlockFor<P = Record<string, unknown>>(templates: Templates): (name: string) => BlockEntry<P> {
    return (name) => entry<P>(templates, { block: name });
}

/**
 * Begin a template declaration in the collection of the template module being
 * loaded. The generic `<P>` types `node.props` in mode callbacks.
 */
export function block<P = Record<string, unknown>>(name: string): BlockEntry<P> {
    const templates = currentTemplates();

    if (!templates) {
        throw new Error('nuckty/bem: block() can only be called while loading templates');
    }

    return createBlockFor<P>(templates)(name);
}
