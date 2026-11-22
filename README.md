# WeatherGPT for Farmers

A mobile-first weather companion for Indian farmers, designed to turn weather forecasts into clear crop guidance and community support.

## Features

- Plain-language local weather summaries
- Crop-specific field advice
- 5-day forecast and 7-day planning view
- Interactive India state, district, and city weather simulator
- Weather chat with quick questions
- Voice briefings and speech-to-text controls
- Community posts, likes, photos, and polite-language checks
- English, Hindi, Marathi, and 22 additional Indian languages
- Location and farm-profile support

The core experience is frontend-first and works without account setup. Community posts and profile progress are stored on the device.

## Tech stack

- Expo SDK 57
- React Native 0.86
- Expo Router
- TypeScript
- pnpm workspaces
- Express API and OpenAPI code generation

## Requirements

- Node.js 20 or newer
- pnpm 10 or newer
- Expo Go for mobile testing, or a browser for the web preview

## Run locally

```powershell
corepack enable
corepack pnpm install
corepack pnpm dev:web
```

For the Expo mobile app:

```powershell
corepack pnpm dev
```

Then scan the QR code in Expo Go.

## Validation

```powershell
corepack pnpm typecheck
corepack pnpm build
```

The API package also accepts optional environment variables documented in `.env.example`.

The production web build is written to `artifacts/weathergpt-farmers/dist`.

## Demo data and live integrations

The current prototype is designed to be usable without account setup. Weather values are
interactive demo simulations, community posts are stored on the device, and the map is a
representative India interface. Optional speech and translation features require the API
and OpenAI-compatible environment variables described in `.env.example`.

## Project structure

- `artifacts/weathergpt-farmers` - Expo mobile and web application
- `artifacts/api-server` - Express API
- `lib/api-spec` - OpenAPI specification
- `lib/api-client-react` - generated React API client
- `lib/db` - Drizzle database schema
- `screenshots` - project screenshots

## GitHub preparation

Do not commit API keys, database credentials, or device secrets. The app stores only demo/community data on the device unless a live database is explicitly configured.

## License

MIT. See [LICENSE](LICENSE).
