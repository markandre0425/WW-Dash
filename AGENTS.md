# AGENTS.md

## Cursor Cloud specific instructions

This is **WW-Dash**, a cryptocurrency portfolio dashboard SPA built with React 18 + TypeScript + Vite 6 + Tailwind CSS v4.

### Key commands

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Dev server | `npm run dev` (serves on port 5173) |
| Build | `npm run build` |
| Type-check | `npx tsc --noEmit` |

### Notes

- **No test framework** is configured. There are no unit/integration tests in this repo.
- **No linter** (ESLint) is configured. `npx tsc --noEmit` is the closest lint-equivalent.
- **No backend services or databases** are required. This is a purely client-side SPA.
- React and react-dom are listed as **peer dependencies** (not direct dependencies). `npm install` resolves them automatically.
- The Vite dev server proxies `/api/coingecko` to the CoinGecko public API (no key needed). Live crypto prices and charts require outbound internet access.
- Optional API keys (`VITE_MORALIS_API_KEY`, `VITE_ALCHEMY_API_KEY`, `VITE_ETHERSCAN_API_KEY`) can be set as environment variables but are not required; the app gracefully falls back.
- Use `--host 0.0.0.0` with `npm run dev` if you need to access the dev server from outside the container.
