# Contributing

## Build and install

At this point it's still possible to run the extension without building on Firefox as a temporary extension. The building process is there to add [the polyfill for extension api](https://github.com/mozilla/webextension-polyfill) and to satisfy the linter during the submission process on [addons.mozilla.org](https://addons.mozilla.org/developers/).

### Install as a temporary extension in Firefox

1. Download the extension files (clone the repository).
2. Open [about:debugging#/runtime/this-firefox](about:debugging#/runtime/this-firefox).
3. Click *Load Temporary Add-on* under *Temporary Extensions*.
4. Open any file inside the [`src`](./src) subdirectory.

Installed in this manner, the extension won't persist across different browser sessions.

### Build

1. Install [Node.js](https://nodejs.org/). Version 14 was tested.
2. Download the extension files (clone the repository).
3. run `npm install`
4. run `npm run build`

After these steps `dist` subdirectory should contain the unpacked extension suitable to be loaded with *Settings > Extensions > Load unpacked* in Chromium. You can zip the contents of this directory to get the unsigned extension file or run [web-ext](https://github.com/mozilla/web-ext) tools there.

## Content scripts

Content scripts are run in order to retrieve and change information on OSM and OTRS webpages. These scripts are located in the [`src/content`](./src/content) directory. In case of OSM they have to rely on the particulars of webpage markup because of a lack of semantic tags/attributes. This makes these scripts a likely point of failure when [Rails Port](https://github.com/openstreetmap/openstreetmap-website) is updated.

The places to watch (and to fix) are:

- Issue rendering templates at [app/views/issues](https://github.com/openstreetmap/openstreetmap-website/tree/master/app/views/issues), particularly the issue page outline [show.html.erb](https://github.com/openstreetmap/openstreetmap-website/blob/master/app/views/issues/show.html.erb) and report template [_reports.html.erb](https://github.com/openstreetmap/openstreetmap-website/blob/master/app/views/issues/_reports.html.erb). Content script [issue.js](./src/content/issue.js) relies on their format.
- User templates at [app/views/users](https://github.com/openstreetmap/openstreetmap-website/tree/master/app/views/users), particularly the user profile page [show.html.erb](https://github.com/openstreetmap/openstreetmap-website/blob/master/app/views/users/show.html.erb). Content script [user.js](./src/content/user.js) relies on its format.
- TODO: inbox/outbox, message
