'use strict';

const utils = require('./utils');

module.exports = (ast, options = {}) => {
    const pending = [ast];
    const output = [];

    while (pending.length > 0) {
        const node = pending.pop();

        if (node.value) {
            const invalidNode = node.invalid === true && options.escapeInvalid === true;

            output.push(invalidNode && utils.isOpenOrClose(node) ? '\\' + node.value : node.value);
        } else if (node.nodes) {
            for (let index = node.nodes.length - 1; index >= 0; index -= 1) {
                pending.push(node.nodes[index]);
            }
        }
    }

    return output.join('');
};

