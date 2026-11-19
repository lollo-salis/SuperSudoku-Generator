# Deploying to Netlify

This is a static, browser-only app. Netlify hosts the game files over HTTPS; generation and saving run on the player's device. A running computer, terminal, database, API key or Node server is not needed to play the deployed app.

## Connect GitHub

Import `lollo-salis/SuperSudoku-Generator` into Netlify and select `main` as the production branch. The committed `netlify.toml` supplies these settings:

| Setting | Value |
| --- | --- |
| Base directory | Repository root (leave empty) |
| Package directory | Leave empty |
| Build command | `npm run build` |
| Publish directory | `dist` |
| Node.js version | `22` (set in `netlify.toml`) |
| Functions directory | Not used |
| Runtime environment variables | None required |

Keep normal dependency installation enabled. Netlify installs dependencies from the lockfile, then runs the build. Do not use `npm start` as the build command or publish the repository root.

The build copies an explicit allowlist of game assets into `dist/`. It excludes the reference image, Git metadata, tests, development tools, dependency folders and README files. PNG icons are committed, so Netlify does not need a browser or image tool during the build. The MIT notice is included as `dist/LICENSE`.

## First deployment

1. Deploy the latest commit on `main` and wait for Netlify to report a successful published deployment.
2. Open the resulting `https://…netlify.app` URL. If access protection is enabled, configure public visitor access for a publicly playable game.
3. Wait until the app reports **Available offline**. This indicates that the app's files and generator have been cached successfully.
4. Open the URL on the phone and install it using the instructions below.
5. Close the computer's local server and test the installed app. Also test reopening it in airplane mode and generating a new puzzle.

Hosting configuration and local browser checks are included in this repository. A real Netlify URL and actual device installation must still be verified after deployment; local emulation does not prove Safari/iOS installation behavior.

## Install on a device

- **iPhone/iPad:** open the HTTPS URL in Safari, choose Share, then Add to Home Screen. If offered, enable opening as a web app.
- **Android:** open the HTTPS URL in a supporting browser and use Install app or Add to Home screen. The in-app Install app button invokes a native prompt when available and otherwise explains the browser-menu route.
- **Desktop:** use Install app in a supporting browser's menu/address bar.

The install guide adapts to Android, iOS and desktop. Chrome controls when its native prompt becomes available; the app cannot force that prompt. If it becomes available while the guide is open, **Install now** appears there. A failed or dismissed prompt leaves a usable manual fallback. Installation controls retain the browser's native touch activation.

The guide also checks anonymous access to the manifest, both PNG icon sizes and the service worker. A 401/403 response explains that hosting access protection is blocking these downloads. Being able to play while logged into Netlify does not demonstrate that an external installer can fetch the files. Diagnostics explicitly bypass the app's cache so a cached copy cannot hide the protection. The app cannot remove Netlify's access restrictions.

The app manifest defines standalone display, 192/512 PNG icons, a maskable icon and an Apple touch icon. Browser support and menu wording vary. The initial download needs connectivity; subsequent offline use requires the successful first cache.

## Saves and updates

Saves stay on the current device and browser storage. They do not synchronize. The old local-network address and the new Netlify address are different origins: an existing local game does not automatically move to the hosted app. Some platforms also use separate storage for an installed app and a browser tab. Keep the Netlify URL stable to retain that origin's saves.

Each build derives a release cache ID from the deployed files. An updated service worker precaches the complete new release and waits; it does not automatically reload a running game. **Update app** saves the game and activates the new release after confirmation. If saving fails, the update is cancelled. Close other game tabs when updating to avoid keeping different releases open. Browser/OS storage cleanup can remove offline files and local saves.

Normal pushes to the connected production branch trigger Netlify deployments. `_headers` controls browser caching; `sw.js` is revalidated so new releases can be detected. No catch-all rewrite is needed for this single-page, single-URL app.

## Local verification of the published files

```powershell
npm.cmd run build
npm.cmd run test:e2e:dist
```

The second command rebuilds and serves `dist/` on the isolated test port 5174. It checks desktop/mobile gameplay, PNG assets, installation help, offline reload, offline generation and a service-worker update preserving the saved game.

To regenerate icons after editing `icon.svg`, first install the development browser described in the README, then run `npm.cmd run icons`. Icon generation is a development-only step.

References: [Netlify repository deployment](https://docs.netlify.com/start/quickstarts/deploy-from-repository/), [file-based configuration](https://docs.netlify.com/build/configure-builds/file-based-configuration/), [PWA installation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).
