# Open in PDSls — an Impro plugin

Adds an **"Open in PDSls"** action to posts and profiles in the
[Impro](https://impro.social) Bluesky client, so you can jump straight to the
raw atproto record on [pdsls.dev](https://pdsls.dev).

- **Right-click / context-menu a post** → "Open in PDSls" → opens
  `https://pdsls.dev/at://<author-did>/app.bsky.feed.post/<rkey>`.
- **Context-menu a profile** → opens that account's repo root
  `https://pdsls.dev/at://<did>`.
- **In the thread view**, a one-click "🔍 Open in PDSls ↗" link appears beneath
  the focused post.

Each of these can be turned off individually from the plugin's settings page.

Links open straight in a new tab. The plugin requests one permission,
`open: ["https://pdsls.dev/*"]`, which lets it open pdsls.dev links without
Impro's "Leave this app?" confirmation. It makes no network calls of its own,
it only builds pdsls URLs from data Impro already hands it.

## Install

In Impro: **Settings → Advanced → Install plugin from URL**, and paste:

```
https://github.com/Jython1415/impro-plugin-open-in-pdsls
```

Impro reads `manifest.json` from `main`, then loads `main.js` from the git tag
matching the manifest version. Impro asks you to approve opening links to
pdsls.dev.

## How it works

A built `main.js` runs in a sandboxed worker and talks to the host over RPC. This
plugin uses three extension points: the `post-context-menu` and
`profile-context-menu` events (to add the menu item) and a `registerSlot` UI slot
(`post-thread-view:after-main`, for the inline link). The menu items use
`MenuItem.setUrl`, so Impro renders them as links and opens them in a new tab;
the host checks every URL against the manifest's `open` permission.

## Build

```
npm install      # pulls the SDK from the atpkgs registry (.npmrc)
npm run build    # esbuild src/main.js -> main.js
```

## Publishing a new version

`main.js` is loaded from the tag named after `manifest.version`, so each release
needs both the updated files on `main` and a matching tag:

```
# bump "version" in manifest.json + package.json, then:
npm run build
git add -A && git commit -m "v0.1.1"
git tag 0.1.1 && git push origin main --tags
```

The included GitHub Action (`.github/workflows/release.yml`) also builds and
attaches assets to a GitHub Release on tag push.
