/**
 * nu authoring API — `block('x')(...)` and the fluent selector.
 *
 * Public declaration forms:
 *
 *   block('menu')({ tag: 'ul' });                              // one mode
 *   block('menu').elem('item')({ tag: 'li' });                 // fluent predicate
 *   block<ButtonProps>('button')({ tag: 'button', ... });      // typed props
 *   block('menu').elem('item').when((n) => Boolean(n.props?.submenu))({ // custom predicate
 *       content: (n, next) => [..., next()],
 *   });
 *   block('menu').elem('item')((n) => Boolean(n.props?.submenu))({ ... }); // bare-arrow shorthand
 *   block('badge').replace((n) => ({ ... }));                  // named-intent mode
 *   block('card').wrap((n) => ({ block: 'card-wrapper', content: n }));
 *
 * @module bem/api
 */

import type { BemNode } from './types.js';
import type { Modes, Predicate } from './template-types.js';
import { Templates } from './templates.js';
import { currentTemplates } from './template-context.js';

function ensure(): Templates {
    const templates = currentTemplates();

    if (!templates) {
        throw new Error('nuckty/bem: block() can only be called while loading templates');
    }

    return templates;
}

interface SelectorState {
    block: string;
    templates: Templates;
    elem?: string;
    modName?: string;
    modVal?: string | true;
    elemModName?: string;
    elemModVal?: string | true;
    predicate?: Predicate;
}

/**
 * Fluent selector builder. Each refining call returns a new state; terminating
 * calls (modes object or a named-intent mode) register a template.
 *
 * Generic `<P>` carries the `props` shape for type-safe `(n)` callbacks.
 */
export class Selector<P = Record<string, unknown>> {
    private readonly s: SelectorState;

    constructor(state: SelectorState) {
        this.s = state;
    }

    elem<E extends string>(name: E): Selector<P> {
        return new Selector<P>({ ...this.s, elem: name });
    }

    mod(name: string, val?: string | true): Selector<P> {
        const base = stripUndefined(this.s);
        base.modName = name;
        delete base.modVal;
        if (val !== undefined) {
            base.modVal = val;
        }
        return new Selector<P>(base);
    }

    elemMod(name: string, val?: string | true): Selector<P> {
        const base = stripUndefined(this.s);
        base.elemModName = name;
        delete base.elemModVal;
        if (val !== undefined) {
            base.elemModVal = val;
        }
        return new Selector<P>(base);
    }

    when(pred: (node: BemNode & { props?: P }) => boolean): Selector<P> {
        const merged = this.s.predicate
            ? ((n: BemNode) => this.s.predicate!(n) && (pred as Predicate)(n))
            : (pred as Predicate);
        return new Selector<P>({ ...this.s, predicate: merged });
    }

    /** Terminate with a modes object; supports the bare-arrow predicate shorthand. */
    register(bodyOrPred: Modes<P> | Predicate, maybeBody?: Modes<P>): void {
        let predicate: Predicate | undefined = this.s.predicate;
        let modes: Modes<P>;

        if (typeof bodyOrPred === 'function') {
            // Capture the selector-level predicate BEFORE reassigning `predicate`
            // — the old code referenced the reassigned variable from inside the
            // closure, making it call itself infinitely (RENDER-02).
            const previous = predicate;
            predicate = previous
                ? ((n: BemNode) => previous(n) && (bodyOrPred as Predicate)(n))
                : (bodyOrPred as Predicate);
            if (!maybeBody) {
                throw new Error('nuckty/bem: predicate shorthand requires a modes body');
            }
            modes = maybeBody;
        } else {
            modes = bodyOrPred;
        }

        const entry: Record<string, unknown> = { block: this.s.block, modes: modes as Modes };
        if (this.s.elem) {
            entry.elem = this.s.elem;
        }
        if (this.s.modName) {
            entry.modName = this.s.modName;
        }
        if (this.s.modVal !== undefined) {
            entry.modVal = this.s.modVal;
        }
        if (this.s.elemModName) {
            entry.elemModName = this.s.elemModName;
        }
        if (this.s.elemModVal !== undefined) {
            entry.elemModVal = this.s.elemModVal;
        }
        if (predicate) {
            entry.predicate = predicate;
        }
        this.s.templates.add(entry as Parameters<Templates['add']>[0]);
    }

    replace(fn: NonNullable<Modes<P>['replace']>): void {
        this.register({ replace: fn } as Modes<P>);
    }

    wrap(fn: NonNullable<Modes<P>['wrap']>): void {
        this.register({ wrap: fn } as Modes<P>);
    }

    def(fn: NonNullable<Modes<P>['def']>): void {
        this.register({ def: fn } as Modes<P>);
    }
}

/** Drop keys whose value is `undefined` (satisfies exactOptionalPropertyTypes). */
function stripUndefined<T>(obj: T): T {
    const out = {} as Record<string, unknown>;
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        if (v !== undefined) {
            out[k] = v;
        }
    }
    return out as T;
}

/** The callable returned by `block(name)`: terminate OR refine. */
export interface BlockEntry<P> {
    (body: Modes<P>): void;
    (pred: (node: BemNode & { props?: P }) => boolean, body: Modes<P>): void;
    elem<E extends string>(name: E): BlockEntry<P>;
    mod(name: string, val?: string | true): BlockEntry<P>;
    elemMod(name: string, val?: string | true): BlockEntry<P>;
    when(pred: (node: BemNode & { props?: P }) => boolean): BlockEntry<P>;
    replace(fn: NonNullable<Modes<P>['replace']>): void;
    wrap(fn: NonNullable<Modes<P>['wrap']>): void;
    def(fn: NonNullable<Modes<P>['def']>): void;
}

function withTerminator<P>(sel: Selector<P>): BlockEntry<P> {
    const terminator = ((bodyOrPred: Modes<P> | Predicate, maybeBody?: Modes<P>): void => {
        sel.register(bodyOrPred, maybeBody);
    }) as BlockEntry<P>;
    terminator.elem = <E extends string>(e: E) => withTerminator(sel.elem(e));
    terminator.mod = (n: string, v?: string | true) => withTerminator(sel.mod(n, v));
    terminator.elemMod = (n: string, v?: string | true) => withTerminator(sel.elemMod(n, v));
    terminator.when = (pred: (node: BemNode & { props?: P }) => boolean) => withTerminator(sel.when(pred));
    terminator.replace = (fn: NonNullable<Modes<P>['replace']>) => { sel.replace(fn); };
    terminator.wrap = (fn: NonNullable<Modes<P>['wrap']>) => { sel.wrap(fn); };
    terminator.def = (fn: NonNullable<Modes<P>['def']>) => { sel.def(fn); };
    return terminator;
}

/**
 * Begin a template declaration. `block('x')` returns a callable you refine with
 * `.elem/.mod/.elemMod/.when` and terminate with a modes object. The generic
 * `<P>` types `node.props` for type-safe callbacks. Registers into the active
 * templates from the current loader context.
 */
export function block<P = Record<string, unknown>>(name: string): BlockEntry<P> {
    return createBlockFor<P>(ensure())(name);
}

/**
 * Create a block function bound to a specific template collection.
 */
export function createBlockFor<P = Record<string, unknown>>(templates: Templates): (name: string) => BlockEntry<P> {
    return (name: string): BlockEntry<P> => {
        const sel = new Selector<P>({ block: name, templates });
        return withTerminator(sel);
    };
}

