# Release audit hardening

## Why
Independent probes found false deployment and validation success, broken WebP routes, incorrect CSS targets and coverage blind spots.

## What Changes
Validate artifact contents, retain preview ownership across builds, restrict preview to loopback, repair image/text/metadata handling, check VNU port availability, restore meaningful coverage and secure smoke inputs.

## Impact
Core, FTP, VNU, convert-images lockfile, demo verification scripts and CI. No remote deployments or publishing.
