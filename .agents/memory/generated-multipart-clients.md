---
name: Generated multipart clients
description: Durable constraints when adding binary upload endpoints to this workspace's generated API libraries.
---

When an OpenAPI endpoint introduces multipart binary fields, regenerate all API packages together and keep the generated Zod barrel exports unambiguous.

**Why:** The generator emits browser `File`/`Blob` references and can produce duplicate type exports when a request body is represented in more than one generated module.

**How to apply:** Include the DOM library in the affected generated package's TypeScript config, then run the shared type checks and inspect `lib/api-zod/src/index.ts` for duplicate request-body exports before finishing.