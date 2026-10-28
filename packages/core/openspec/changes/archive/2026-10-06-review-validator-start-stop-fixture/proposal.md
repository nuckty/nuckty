# Synchronize validator stop during startup

## Why

The stop-start fixture waits five milliseconds rather than observing startup. Under native JVM test load, stop can occur before startup and produce a readiness timeout instead of testing startup cancellation.

## What Changes

Signal the first health request and stop only while that request is pending. Preserve the stopped-error and child-exit assertions. Runtime unchanged.

## Impact

Validator lifecycle fixture only.
