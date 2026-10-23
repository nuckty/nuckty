# Prepare beta1 source publication

## Why
The approved multi-repository source publication needs a consistent prerelease version, bilingual release notes and reproducible source snapshots before commits are approved.

## What Changes
Set first-party package and peer versions to 1.0.0-beta1, align CLI and starter archives, document the release, and prepare site CI and production configuration without publishing.

## Impact
Core, extensions, consumers, documentation and release preparation only. Remote empty repository creation is explicitly authorized. No commits, push, tags, npm publication or deployment. The final plan uses fresh root commits named Hello, world! as requested; existing local Git state is preserved during preparation.
