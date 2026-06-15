## E2E Setup (BDD)

This package lives at the repo root (`./e2e/`) and uses Playwright + Cucumber
for E2E tests. **Test users and the test workshop are auto-registered on
every run** — no manual backend setup is required.

### How it works

1. `pnpm e2e:setup` calls the backend API to:
   - Register a fresh car owner and a fresh workshop manager (unique emails
     per run, no pre-seeded accounts).
   - Create a workshop owned by the manager.
   - Re-login the manager to obtain a JWT with `workshop_id`.
   - Add the workshop's location and the `BRAKE_PAD_REPLACEMENT` service
     template.
   - Write the resulting state to `.e2e-setup.json`.
2. `pnpm e2e` runs the setup script, then `cucumber-js`. Steps read
   credentials from `.e2e-setup.json` via the world.

### Prerequisites

- The Vite dev server must be running (`pnpm --filter vue3-primevue-app dev`,
  serving on `http://localhost:5173`).
- The backend must be running on `http://localhost:8080`. No seed data
  required — the setup script provisions everything.

### Environment Variables

Create a local `.env.e2e` in this directory (not committed; see
`.env.e2e.example`):

```
E2E_BASE_URL=http://localhost:5173
E2E_API_URL=http://localhost:8080/api
E2E_WORKSHOP_LATITUDE=-12.108527
E2E_WORKSHOP_LONGITUDE=-76.992718
E2E_HEADLESS=true
E2E_SLOWMO=0
E2E_VIDEO=false
E2E_VIDEO_DIR=artifacts/videos
```

`E2E_WORKSHOP_LATITUDE` / `E2E_WORKSHOP_LONGITUDE` are the coordinates used
for both the workshop's location AND the car owner's service request — keep
them in sync (single source of truth, no need to edit two places).

### Running E2E

From this directory (`e2e/`):

```
pnpm install
pnpm e2e
```

`pnpm e2e` is equivalent to `pnpm e2e:setup && cucumber-js ...`. If you
want to re-run the cucumber scenarios without re-registering (e.g., to
debug a flaky step), call `cucumber-js --config ./cucumber.cjs` directly
after a successful setup.

### Generated state files (gitignored)

- `.e2e-setup.json` — credentials and IDs from the latest setup run.
- `.e2e-state.json` — the `lastRequestDescription` shared between scenarios
  in the chained car-owner → workshop → accept-offer flow.
- `artifacts/videos/` — Playwright videos (when `E2E_VIDEO=true`).

### Debugging tips

- Run headed with slow motion and video recording: set
  `E2E_HEADLESS=false`, `E2E_SLOWMO=150`, `E2E_VIDEO=true`.
- Videos are saved in `artifacts/videos/`.
- To re-run a single scenario in isolation, ensure `.e2e-setup.json` is
  fresh and the matching service request still exists in the backend.
- The setup script exits non-zero on any failure — check the error message
  for the failing API call (status + body).

### What gets left in the backend

Each setup run creates 2 users + 1 workshop + 1 location + 1 service
template. There is no automatic cleanup — this is fine for dev. **Do not
run e2e against production.**
