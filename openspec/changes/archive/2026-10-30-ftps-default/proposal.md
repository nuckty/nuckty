# FTPS by default

## Why

Plain FTP was the default, so a configuration without `secure` sent the password and the artifact unencrypted. The port was taken from configuration without validation.

## What Changes

- **BREAKING** Explicit FTPS with certificate verification is the default; `secure: false` or `FTP_SECURE=false` selects plain FTP and prints a warning.
- The port must be an integer from 1 to 65535; `progress` must be boolean.
