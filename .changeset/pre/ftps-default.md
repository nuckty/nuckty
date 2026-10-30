---
"@nuckty/ext-command-deploy-ftp": minor
---

FTPS with certificate verification is now the default. Set `secure: false` or `FTP_SECURE=false` to use plain FTP; the command then warns that the password and files travel unencrypted. Invalid ports and non-boolean `progress` values are rejected.
