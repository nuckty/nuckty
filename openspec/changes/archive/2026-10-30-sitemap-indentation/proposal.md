# Strict sitemap indentation

## Why

The parser divided indentation by two, so three spaces silently nested like two and tabs were not detected.

## What Changes

- **BREAKING** Indentation must be two spaces per level; tabs and odd indentation fail the build.
