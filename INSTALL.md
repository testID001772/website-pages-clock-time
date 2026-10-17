# Installing Clock Time

Three ways to get Clock Time onto a device, cheapest first. All three ship the
**same** artifact: the static build from `npm run build:pages` (prerendered HTML
plus a client bundle). It has no server, no database and no sign-in, so an
installed app works with no network at all.

| Path              | What you get                            | Needs                           |
| ----------------- | --------------------------------------- | ------------------------------- |
| PWA install       | an app icon and a standalone window     | a browser. Nothing to build     |
| Android APK       | `app-debug.apk`                         | JDK 21 + the Android SDK, or CI |
| Windows installer | `ClockTime-<version>-windows-setup.exe` | Windows (or CI)                 |

---

## 1. PWA install — no build step

This already works on the deployed site. Desktop Chrome/Edge show **Install
app** in the header chip; Android Chrome offers _Add to Home screen_; iOS uses
Share → _Add to Home Screen_ (Apple never fires the install event, so the chip
stays hidden there and the share sheet is the path).

The service worker makes it work offline after the first visit.

## 2. Android APK

```sh
npm ci
npm run app:apk          # build:pages → icons → cap sync → gradlew assembleDebug
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`.

The pieces, if you want to run them by hand:

```sh
npm run build:pages      # dist/client — what the app packages
npm run app:icons        # launcher icons from the same master as the web icons
npx cap sync android     # copy dist/client into android/app/src/main/assets/public
cd android && ./gradlew assembleDebug
```

**Without the SDK on your machine**, run the `Build installers` workflow
(Actions tab → _Run workflow_) and download `ClockTime-android-apk` from the run.
That is the recommended path: the runner has a pinned JDK 21, and the APK is
built from a clean checkout rather than whatever is on your laptop.

Install it by opening the file on the device and allowing apps from unknown
sources.

## 3. Windows installer

```sh
npm ci && npm run build:pages && npm run app:icons
cd desktop
npm ci
npm run dist:win         # → desktop/dist/ClockTime-<version>-windows-setup.exe
```

The shell (`desktop/main.cjs`) serves `desktop/web` over `127.0.0.1` and loads
it in a sandboxed window — `file://` cannot resolve the build's absolute asset
paths, and `http://` keeps `fetch` and the router behaving exactly as they do in
a browser. It ships no service worker: the files are already on disk, and a
worker holding the previous release would keep serving it after an update.

**Supported desktop target: Windows 10/11, 64-bit (x64).** Windows 7/8/8.1
and 32-bit Windows are not supported by this installer. We use a current,
maintained Electron runtime rather than shipping an obsolete Chromium runtime
just to support end-of-life Windows versions. For unsupported systems, open the
website in a compatible browser and use its install option where available.

Same as Android, the `Build installers` workflow will produce the `.exe` on a
`windows-latest` runner if you would rather not install the toolchain.

### Legacy Windows 7 installers (unsupported runtime)

The workflow builds one x64 installer with Electron 22.3.27 for Windows 7-era
devices:

- `ClockTime-windows-legacy-x64-setup.exe`

**Security warning:** Electron 22 / Chromium 108 reached end of support in 2023
and receives no security fixes. Keep these legacy builds offline or use them
only for the countdown on a trusted, isolated machine. Prefer the maintained
Windows 10/11 x64 installer for everyday use. The legacy and modern app IDs are
separate so the two variants do not overwrite one another.

---

## 4. Download page availability

The download page marks native builds as **Coming later** until a real installer
is published. The Windows 7 x64 row is marked **Done** per the requested plan,
but its installer has not yet been published, so there is no download link yet.
The Windows 7 x86 target has been removed.

| Target               | Planned build artifact                   | Current page status      |
| -------------------- | ---------------------------------------- | ------------------------ |
| Windows 7 legacy x64 | `ClockTime-windows-legacy-x64-setup.exe` | Done; file not published |
| Windows 10/11 x64    | `ClockTime-windows-setup.exe`            | Coming later             |
| Android 8+           | `ClockTime-android.apk`                  | Coming later             |
| iPhone and iPad      | App Store distribution                   | Coming later             |
| Browser              | PWA / add to home screen                 | Available now            |

The Windows and Android workflows publish release assets only when configured
and run for a release tag. A manual build can provide run artifacts without
making a public download. Once files are published, the page can link to the
stable GitHub release asset names; no placeholder link should be shown before
then.

The browser option is already usable and needs no separate file. Its install
prompt is handled by `useInstallPrompt` (`src/lib/use-install-prompt.ts`), with
manual menu instructions where the browser does not offer a prompt.

---

## Signing

Neither package is signed for distribution.

- **Android** builds with Gradle's debug key, which is installable but not
  uploadable to Play. For a release, add a keystore and set the `signingConfig`
  in `android/app/build.gradle`; keep the keystore out of the repository.
- **Windows** produces an unsigned installer, so SmartScreen warns on first
  run. Code-sign it with `electron-builder`'s `win.certificateFile` /
  `certificatePassword` (or a cloud signer) once you have a certificate.

## What is source and what is generated

| Path                                                                   | Status                                                                 |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `capacitor.config.ts`, `android/` (Gradle project)                     | source                                                                 |
| `desktop/main.cjs`, `static-server.cjs`, `preload.cjs`, `package.json` | source                                                                 |
| `desktop/buildResources/icon.{ico,png}`, `android/**/mipmap-*/*.png`   | generated by `npm run app:icons`, committed like `public/icon-512.png` |
| `desktop/web/`, `android/app/src/main/assets/public/`                  | generated by `npm run app:sync`, gitignored                            |

`desktop/static-server.test.mjs` boots the shell's server against
`desktop/web` and asserts what a packaged app actually serves, so regenerate the
bundle (`npm run app:sync`) before `npm test` if you want those cases to run
rather than skip.
