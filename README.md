## E2E Manual Setup (BDD)

This package lives at the repo root (`./e2e/`) and uses Playwright + Cucumber
for E2E tests. The scenarios rely on a small amount of manual setup to keep
tests stable without backend seeding.

### Prerequisites

- The Vite dev server must be running (`pnpm --filter vue3-primevue-app dev`,
  serving on `http://localhost:5173`).
- The backend must be running on `http://localhost:8080` with the pre-seeded
  accounts and workshop described below.

### Accounts (pre-verified)

- Car owner
  - Email: `amircasan@gmail.com`
  - Password: `12345678`

- Workshop owner
  - Email: `thepowereddog@gmail.com`
  - Password: `12345678`

### Backend URL

- API base URL: `http://localhost:8080/api`

### Workshop Setup (one-time)

1) Create workshop
   - Name: `Testing Workshop`
   - Legal name: `TBB S.A.C`
   - RUC: `10987654321`
   - Description: `For E2E Testing`

2) Add location
   - Address: `Ciclovia San Luis, San Borja, Lima, 15037, Peru`
   - Lat: `-12.108527`
   - Lng: `-76.992718`

3) Add service templates
   - Category code: `BRAKES`
   - Service code: `BRAKE_PAD_REPLACEMENT`

### Car Owner Request Inputs

- Service: `BRAKES / BRAKE_PAD_REPLACEMENT`
- Location: `-12.108527, -76.992718`

### Environment Variables

Create a local `.env.e2e` in this directory (not committed; see `.env.e2e.example`):

```
E2E_BASE_URL=http://localhost:5173
E2E_API_URL=http://localhost:8080/api
E2E_CAR_OWNER_EMAIL=amircasan@gmail.com
E2E_CAR_OWNER_PASSWORD=12345678
E2E_WORKSHOP_EMAIL=thepowereddog@gmail.com
E2E_WORKSHOP_PASSWORD=12345678
E2E_HEADLESS=false
E2E_SLOWMO=150
E2E_VIDEO=true
E2E_VIDEO_DIR=artifacts/videos
```

### Running E2E

From this directory (`e2e/`):

```
pnpm install
pnpm e2e
```

### Debugging tips

- Run headed with slow motion and video recording:
  - Set `E2E_HEADLESS=false`, `E2E_SLOWMO=150`, `E2E_VIDEO=true`
- Videos are saved in `artifacts/videos/` (relative to this directory)
- The cross-scenario state file (`.e2e-state.json`) is also written here
