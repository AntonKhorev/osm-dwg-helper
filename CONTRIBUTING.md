# Contributing

## Build and install

At this poing it's still possible to run the extension without building on Firefox as a temporary extension. The building process is there to add [the polyfill for extension api](https://github.com/mozilla/webextension-polyfill) and to satisfy the linter during the submission process on [addons.mozilla.org](https://addons.mozilla.org/developers/).

### Install as a temporary extension in Firefox

1. Download the extension files (clone the repository).
2. Open [about:debugging#/runtime/this-firefox](about:debugging#/runtime/this-firefox).
3. Click *Load Temporary Add-on* under *Temporary Extensions*.
4. Open any file inside the `src` subdirectory.

Installed in this manner, the extension won't persist across different browser sessions.

### Build

1. Install [Node.js](https://nodejs.org/). Version 14 was tested.
2. Download the extension files (clone the repository).
3. run `npm install`
4. run `npm run build`

After these steps `dist` subdirectory should contain the unpacked extension suitable to be loaded with *Settings > Extensions > Load unpacked* in Chromium. You can zip the contents of this directory to get the unsigned extension file or run [web-ext](https://github.com/mozilla/web-ext) tools there.
