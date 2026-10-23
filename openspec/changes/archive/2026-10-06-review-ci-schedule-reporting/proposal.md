# Report configured CI schedules accurately

## Why

Day-of-month step schedules reset each month and do not guarantee fixed five/six-day intervals or a next run five days after the current run.

## What Changes

Clarify comments and remove the unsupported next-run prediction from cache metrics without changing cron expressions.

## Impact

Two public site workflow files only.

