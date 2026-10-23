# Validate consumer CSS property names

## Why

The public consumer contains aborder and aborder-radius declarations, which have no CSS effect. Its Stylelint gate does not check unknown property names.

## What Changes

Enable property-no-unknown in the consumer stylesheet gate and remove the two inert declarations without enabling borders. Preserve the current visual rules.

## Impact

Consumer CSS configuration and one public stylesheet; no dependency or API change.

