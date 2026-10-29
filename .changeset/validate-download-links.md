---
"@nuckty/core": patch
---

Relative `.pdf`, `.zip` and `.ini` links now point to the file the assets stage copied to the artifact root, and the build fails when a link names a file that stage did not publish or published from another repository.
