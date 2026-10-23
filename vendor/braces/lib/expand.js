'use strict';

const fill = require('fill-range');
const stringify = require('./stringify');
const utils = require('./utils');

const append = (queue = '', stash = '', enclose = false) => {
  const result = [];

  queue = [].concat(queue);
  stash = [].concat(stash);

  if (!stash.length) return queue;
  if (!queue.length) {
    return enclose ? utils.flatten(stash).map(ele => `{${ele}}`) : stash;
  }

  for (const item of queue) {
    if (Array.isArray(item)) {
      for (const value of item) {
        result.push(append(value, stash, enclose));
      }
    } else {
      for (let ele of stash) {
        if (enclose === true && typeof ele === 'string') ele = `{${ele}}`;
        result.push(Array.isArray(ele) ? append(item, ele, enclose) : item + ele);
      }
    }
  }
  return utils.flatten(result);
};

const expand = (ast, options = {}) => {
  const rangeLimit = options.rangeLimit === undefined ? 1000 : options.rangeLimit;

  const pending = [{ node: ast, parent: {}, entered: false }];
  let result;

  while (pending.length > 0) {
    const frame = pending[pending.length - 1];
    const { node, parent } = frame;

    if (!frame.entered) {
      frame.entered = true;
      node.queue = [];
      let p = parent;
      let q = parent.queue;

      while (p.type !== 'brace' && p.type !== 'root' && p.parent) {
        p = p.parent;
        q = p.queue;
      }
      if (node.invalid || node.dollar) {
        q.push(append(q.pop(), stringify(node, options)));
        pending.pop();
        continue;
      }
      if (node.type === 'brace' && node.invalid !== true && node.nodes.length === 2) {
        q.push(append(q.pop(), ['{}']));
        pending.pop();
        continue;
      }
      if (node.nodes && node.ranges > 0) {
        const args = utils.reduce(node.nodes);

        if (utils.exceedsLimit(...args, options.step, rangeLimit)) {
          throw new RangeError('expanded array length exceeds range limit. Use options.rangeLimit to increase or disable the limit.');
        }
        let range = fill(...args, options);

        if (range.length === 0) {
          range = stringify(node, options);
        }
        q.push(append(q.pop(), range));
        node.nodes = [];
        pending.pop();
        continue;
      }
      frame.enclose = utils.encloseBrace(node);
      let queue = node.queue;
      let block = node;

      while (block.type !== 'brace' && block.type !== 'root' && block.parent) {
        block = block.parent;
        queue = block.queue;
      }
      frame.queue = queue;
      frame.q = q;
      frame.index = 0;
    }
    if (frame.index >= node.nodes.length) {
      result = frame.queue;
      pending.pop();
      continue;
    }
    const index = frame.index++;
    const child = node.nodes[index];
    const { queue, q, enclose } = frame;

    if (child.type === 'comma' && node.type === 'brace') {
      if (index === 1) queue.push('');
      queue.push('');
    } else if (child.type === 'close') {
      q.push(append(q.pop(), queue, enclose));
    } else if (child.value && child.type !== 'open') {
      queue.push(append(queue.pop(), child.value));
    } else if (child.nodes) {
      pending.push({ node: child, parent: node, entered: false });
    }
  }

  return utils.flatten(result);
};

module.exports = expand;

