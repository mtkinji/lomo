# @kwilt/sdk

Typed Kwilt data access helpers shared by mobile, desktop, and web clients.

This package is intentionally small at first. Desktop M3 needs a stable contract
for reading summaries, lazy-loading object detail, updating core objects, and
building local-first View configurations. Mobile services can migrate into this
package incrementally once the desktop command-center shell starts consuming it.

## Build

```bash
npm run -w @kwilt/sdk typecheck
npm run -w @kwilt/sdk build
```
