---
name: Expo speech install
description: Expo voice dependencies must be installed against the mobile workspace package, not the monorepo root.
---

Install Expo voice modules against the target mobile package so the dependency lands in that app's package manifest and lockfile.

**Why:** The generic language-package installer can target the monorepo root in a pnpm workspace, which fails or puts the dependency in the wrong package.

**How to apply:** For Expo voice features, use the workspace-filtered package install flow and then restart the managed Expo workflow once before checking the bundle.