# WeatherGPT for Farmers

WeatherGPT for Farmers is a phone-first weather companion that turns forecast information into plain-language crop advice and local farmer conversations.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/weathergpt-farmers/app/index.tsx` — the first complete farmer experience: today view, weather chat, field map, and farmer interaction feed.
- `artifacts/weathergpt-farmers/constants/colors.ts` — semantic product palette used by the mobile UI.
- `artifacts/weathergpt-farmers/assets/images/icon.png` — custom farm-weather app icon.
- `artifacts/api-server` — shared Express API scaffold, reserved for future live meteorological data and persistence.

## Architecture decisions

- The first build is frontend-first so farmers can try the core experience without account setup or an external service.
- Farmer interaction posts are stored locally with AsyncStorage so creating and liking a post work immediately on a device.
- The map uses a lightweight touch-friendly field map for the first mobile build; it is ready to be replaced by live GIS tiles when a mapping data source is connected.
- Chat uses a local response layer for the first build, keeping the conversation fast and available offline while the live weather/LLM contract is defined.

## Product

- Plain-language weather snapshot for Nashik, including temperature, rain chance, sunrise, wind, and a five-day glance.
- Field advice card with a crop-aware action suggestion.
- WeatherGPT chat with quick questions, question input, and a voice-friendly microphone interaction.
- Interactive field map with tap-to-select locations and rain, wind, and field layers.
- Farmer interaction feed with local posts, likes, and a share composer.
- Multilingual UI switcher for English, Hindi, and Marathi across navigation, weather advice, chat prompts, map labels, and community actions.

## User preferences

- Keep the UI easiest and playful for farmers, with large touch targets, simple language, and minimal typing.

## Gotchas

- Use `pnpm --filter @workspace/weathergpt-farmers run typecheck` for quick mobile checks.
- Run the Expo artifact through its managed workflow; do not start Expo directly from the shell.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
