# Deploying LifePilot AI

## 1. Backend (API + web)

The API and web client are one Bun server (`packages/web/src/server.ts`).

- It's already running on the platform preview at the URL set in
  `packages/mobile/app.json` → `expo.extra.apiUrl`.
- To publish the website / API and attach a custom domain, use the **Publish**
  option in the platform's website preview UI. Custom domains and env settings
  are managed there.
- Ensure these env vars exist in production (root `.env`):
  - `DATABASE_URL` (+ `DATABASE_AUTH_TOKEN` if libSQL/Turso)
  - `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
  - AI gateway key used by `packages/web/src/api/agent/gateway.ts`

After deploying the backend, set `expo.extra.apiUrl` in `app.json` to the
**production** API URL before building the mobile app.

## 2. Mobile app (iOS + Android)

> ⚠️ Do **not** run native builds in this sandbox — it will crash the environment.
> Builds are done via Expo's cloud (EAS) through the platform.

Steps:

1. Open the **mobile preview dashboard** in the platform.
2. Choose the **Publish** option and connect your **Expo account**.
3. Trigger the build:
   - **Android** → `.aab` (Play Store) or `.apk` (sideload/testing)
   - **iOS** → `.ipa` (App Store / TestFlight)
4. Submit to the stores directly from the same dashboard once the build succeeds.

### Pre-build checklist

- [ ] `expo.extra.apiUrl` points to the **production** backend.
- [ ] `app.json` identifiers are final:
  - `expo.name` = `LifePilot AI`
  - `expo.slug` = `lifepilot`
  - `ios.bundleIdentifier` = `com.lifepilot_3d95.runable`
  - `android.package` = `com.lifepilot_3d95.runable`
- [ ] App icons & splash present in `packages/mobile/assets/`.
- [ ] Permissions copy reviewed (location usage string in `app.json`).
- [ ] `cd packages/mobile && bunx tsc --noEmit` is clean.
- [ ] `bunx expo export --platform ios` (and `android`) bundles without errors.

### Store metadata

- **Name:** LifePilot AI
- **Subtitle:** Your AI life operating system
- **Privacy:** App collects location (timeline), journal, and finance data — all
  user-scoped and stored against the authenticated account. Disclose location
  use in the store privacy form (matches the `NSLocationWhenInUseUsageDescription`).

## 3. Post-release

- Monitor API logs (pm2: `pm2 logs web-app`).
- Roll new mobile JS via EAS Update (OTA) for non-native changes; full rebuild
  only when native deps/permissions change.
