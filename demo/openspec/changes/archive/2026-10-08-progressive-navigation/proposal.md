# Preserve static navigation and hide uninitialized controls

## Why
When scripts do not execute, mobile navigation remains hidden behind dead controls. The demo editor exposes an empty loading interface.

## What Changes
Keep ordinary mobile navigation available before enhancement. Hide script-dependent controls until their handlers are installed; expose a compact section-index link before the sidebar toggle is ready. Keep the existing enhanced layout and keyboard behavior. The demo editor uses a concise static fallback until initialization.

## Impact
Consumer templates, CSS and client initialization only.
