# Preserve literal heading content

## Why

Heading metadata strips inline-code angle-bracket content as HTML, collapsing distinct component headings and raising duplicate IDs.

## What Changes

Exclude actual mdast HTML nodes from metadata, retain literal code/text, and strip only angle delimiters for slug input. Preserve numbered prefixes, explicit IDs and visible formatting.

## Impact

Affected capability: markdown. No dependency or public option added.

