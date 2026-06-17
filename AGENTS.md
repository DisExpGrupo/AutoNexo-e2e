# AGENTS.md

## What this is
A standalone pnpm package for end-to-end BDD tests of the Vue 3 frontend
(`frontend/`). Stack: **Cucumber (gherkin) + Playwright + tsx** (Node only).
The `mobile/` directory is reserved for future Flutter/Android suites — empty.

## Prerequisites (must be running before `pnpm e2e`)
- Backend on `http://localhost:8080` (no seed data required).
- Vite dev server on `http://localhost:5173`. Start it from the repo root:
  `pnpm --filter vue3-primevue-app dev`.

## Commands
Run from this directory (`e2e/`):
- `pnpm install` — install devDeps.
- `pnpm e2e` — runs `e2e:setup` then `cucumber-js --config ./cucumber.cjs`. The
  full happy path.
- `pnpm e2e:setup` — only provisions fresh users + workshop (see below).
- `cucumber-js --config ./cucumber.cjs` — re-run scenarios without re-provisioning
  (useful when debugging a flaky step). Requires a fresh `.e2e-setup.json`.
- `pnpm typecheck` — `tsc --noEmit`.

There is **no `lint` or `test` script**. Don't invent one; run `typecheck` only.

## Auto-provisioning (no manual seeding)
`support/setup.ts` runs on every `pnpm e2e` and hits the backend to:
1. Register a fresh car owner + workshop manager (unique emails per run, suffix
   `e2e-carowner-<ts>-<rand>` / `e2e-workshop-<ts>-<rand>`). Password is the
   hardcoded constant `E2EPassw0rd!` (see `support/setup.ts:20`).
2. Create a workshop, re-login the manager (the JWT now carries `workshopId`),
   add a location at the env-supplied coords, and add the
   `BRAKE_PAD_REPLACEMENT` service template.
3. Write the result to `.e2e-setup.json` (gitignored).

The script exits non-zero on any failure; the error includes the failing API
`status` + body. **No cleanup runs** — each setup leaves 2 users, 1
workshop, 1 location, 1 service template in the DB (with unique emails so
collisions are avoided). Don't run e2e against prod.

## Environment
Copy `.env.e2e.example` to `.env.e2e` (gitignored). Keys:
`E2E_BASE_URL`, `E2E_API_URL`, `E2E_HEADLESS`, `E2E_SLOWMO`, `E2E_VIDEO`,
`E2E_VIDEO_DIR`, plus `E2E_WORKSHOP_LATITUDE` / `E2E_WORKSHOP_LONGITUDE`.

**`E2E_WORKSHOP_LATITUDE` / `E2E_WORKSHOP_LONGITUDE` are the single source of
truth** — the setup script registers the workshop at these coords, and the
car-owner's service request uses the same coords (read from
`config.workshopLatitude/Longitude` in `steps/car_owner.steps.ts:38-39`) so
matching finds the workshop. The feature file's coord string is human-readable
documentation only and is **not** consumed by the step. Keep env and feature
in sync if you change either.

## Generated state files (all gitignored)
- `.e2e-setup.json` — credentials + IDs from the latest setup. Required for
  any cucumber run; world throws if missing.
- `.e2e-state.json` — carries `lastRequestDescription` between scenarios so
  the car-owner-create → workshop-send-offer → car-owner-accept chain can find
  the same request. Written in `world.close()` (`support/world.ts:40-46`).
- `artifacts/videos/` — Playwright video output when `E2E_VIDEO=true`.

## Scenario order matters
`cucumber.cjs` lists the three features in this fixed order:
`car_owner_create_request` → `workshop_send_offer` → `car_owner_accept_offer`.
They form a chained flow; reordering or running only the last scenario will
break the `lastRequestDescription` lookup.

## Package layout
- `features/*.feature` — gherkin.
- `steps/*.steps.ts` — step definitions (cucumber auto-globs via `cucumber.cjs`).
- `support/world.ts` — `CustomWorld` (browser, page, setup, lastRequestDescription).
- `support/hooks.ts` — `Before` calls `world.init()` (loads setup state,
  launches chromium), `After` closes + writes state file. Default timeout 60s.
- `support/config.ts` — loads `.env.e2e` via dotenv; throws if `E2E_BASE_URL`
  or `E2E_API_URL` missing.
- `support/api-client.ts` — typed fetch wrapper, defines `ApiError`.
- `support/setup.ts` + `support/setup-state.ts` — provisioning script and
  state I/O.

## Debugging
Set in `.env.e2e`: `E2E_HEADLESS=false`, `E2E_SLOWMO=150`, `E2E_VIDEO=true`.
Videos land in `artifacts/videos/`. Login selectors are tied to PrimeVue
(`#email`, `.an-dashboard-title`); PrimeVue's `InputNumber`/`Calendar` are
wrapped, so steps target `#offer-price input`, `#offer-date input`, and the
dialog-scoped "Send Offer" button (`steps/workshop.steps.ts:28-32`).
