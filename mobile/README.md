# Mobile E2E

Reserved for mobile end-to-end tests. The planned targets (per
`backend/README.md`) are:

- **Flutter** — `integration_test` (Dart) or **Maestro** (YAML flows, Node runner)
- **Android (native)** — instrumentation tests via `./gradlew connectedAndroidTest`

Mobile tests will not be Node-based, so they will live in their own subdirectories
(e.g. `e2e/mobile/flutter/`, `e2e/mobile/android/`) and run from independent CI
lanes. The frontend e2e suite in `e2e/` (Cucumber + Playwright) is
intentionally Node-only.

Nothing here yet — added when the mobile project(s) are scaffolded.
