'use strict';

const fill = require('fill-range');
const utils = require('./utils');

module.exports = (ast, options = {}) => {
    const pending = [{ node: ast, parent: {} }];
    const output = [];

    while (pending.length > 0) {
        const { node, parent } = pending.pop();
        const invalidBlock = utils.isInvalidBrace(parent);
        const invalidNode = node.invalid === true && options.escapeInvalid === true;
        const invalid = invalidBlock === true || invalidNode === true;
        const prefix = options.escapeInvalid === true ? '\\' : '';

        if (node.isOpen === true || node.isClose === true) {
            output.push(prefix + node.value);
        } else if (node.type === 'open') {
            output.push(invalid ? prefix + node.value : '(');
        } else if (node.type === 'close') {
            output.push(invalid ? prefix + node.value : ')');
        } else if (node.type === 'comma') {
            output.push(node.prev.type === 'comma' ? '' : invalid ? node.value : '|');
        } else if (node.value) {
            output.push(node.value);
        } else {
            if (node.nodes && node.ranges > 0) {
                const args = utils.reduce(node.nodes);
                const range = fill(...args, { ...options, wrap: false, toRegex: true, strictZeros: true });

                if (range.length !== 0) {
                    output.push(args.length > 1 && range.length > 1 ? `(${range})` : range);
                    continue;
                }
            }
            if (node.nodes) {
                for (let index = node.nodes.length - 1; index >= 0; index -= 1) {
                    pending.push({ node: node.nodes[index], parent: node });
                }
            }
        }
    }

    return output.join('');
};

