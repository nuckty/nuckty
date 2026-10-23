# Retain empty string modifier values

## Why

stringifyEntity collapses an empty string modifier to boolean naming while classify retains the value delimiter. ModVal permits strings and both public helpers must agree.

## What Changes

Preserve the value delimiter for all string values, including empty strings, in stringifyEntity. Add block/element/custom delimiter parity regressions; remove unproved exhaustive test claim.

## Impact

Naming helper only; existing class serialization unchanged.
