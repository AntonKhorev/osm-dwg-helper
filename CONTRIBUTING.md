# Contributing

## Build and install

There are two build stages:

1. The required stage handled by the build script inside the source code. It generates the extension code that is runnable by browsers but inconvenient to distribute.
2. The packaging stage handled either by `web-ext build` command or just by zipping the output of the previous stage.

### Required build

1. install [Node.js](https://nodejs.org/). Version 14 was tested
2. download the extension files (clone the repository)
3. run `npm install`
4. run `npm run build`

After these steps `dist` subdirectory should contain the unpacked extension suitable to be loaded with *Settings > Extensions > Load unpacked* in Chromium. See the next section for loading in Firefox.

The building process does these things:

- adds [the polyfill for extension api](https://github.com/mozilla/webextension-polyfill)
- bundles content scripts injected into OSM and OTRS webpages
- converts svg icons to png

The last operation is the largest dev dependency to be installed because it requires a Chromium build ran by [Puppeteer](https://github.com/puppeteer/puppeteer). This dependency is currently a source of "[high severity vulnerabilities](https://github.com/advisories/GHSA-jv7g-9g6q-cxvw)" according to `npm audit`. They are actual vulnerabilities only if an attacker can replace svgs generated during the build process.

### Install as a temporary extension in Firefox

1. build the extension
2. open [about:debugging#/runtime/this-firefox](about:debugging#/runtime/this-firefox)
3. click *Load Temporary Add-on* under *Temporary Extensions*
4. open any file inside the [`dist`](./dist) subdirectory

Installed in this manner, the extension won't persist across different browser sessions.

### Packing

You can zip the contents of this directory to get the unsigned extension file or run [web-ext](https://github.com/mozilla/web-ext) tools there. `web-ext build` will create a zip archive of the extension.

## Content scripts

Content scripts are run in order to retrieve and change information on OSM and OTRS webpages. Modules that implement the functionality of content scripts are located in the [`src/content`](./src/content) directory. Because of incomplete content script module support by browsers these modules have to be bundled into actual content scripts during the build process. The actual scripts are written to [`dist/content`](./dist/content).

Content scripts for OSM webpages have to rely on the particulars of markup because of a lack of semantic tags/attributes. This makes these scripts a likely point of failure when [Rails Port](https://github.com/openstreetmap/openstreetmap-website) is updated. The places to watch (and to fix) are:

- Issue rendering templates at [app/views/issues](https://github.com/openstreetmap/openstreetmap-website/tree/master/app/views/issues), particularly the issue page outline [show.html.erb](https://github.com/openstreetmap/openstreetmap-website/blob/master/app/views/issues/show.html.erb) and report template [_reports.html.erb](https://github.com/openstreetmap/openstreetmap-website/blob/master/app/views/issues/_reports.html.erb). Content script [issue.js](./src/content/issue.js) relies on their format. Some things cannot be reliably extracted from issue pages at all. For example, report dates are not represented by [`<time>` elements](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time) and in fact are not delimited by any html tags. And everything is subject to i18n, including dates, making the exact format of each report unknown. So report dates are not extracted. Reporting users are extracted, relying on the fact that they are the only hyperlinks inside the reports. On the other hand, this extension doesn't rely on string matching because of already mentioned i18n. For comparison, [osm-dwg-userscripts] do string matches like `/Open (Issue #\d+)/` that are expected to fail when the OSM UI language is set to something other than English.
- User templates at [app/views/users](https://github.com/openstreetmap/openstreetmap-website/tree/master/app/views/users), particularly the user profile page [show.html.erb](https://github.com/openstreetmap/openstreetmap-website/blob/master/app/views/users/show.html.erb). Content script [user.js](./src/content/user.js) relies on its format. Currently the thing of interest is the report link that contains the user's id.
- Message templates at [app/views/messages](https://github.com/openstreetmap/openstreetmap-website/tree/master/app/views/messages), particularly [show.html.erb](https://github.com/openstreetmap/openstreetmap-website/blob/master/app/views/messages/show.html.erb). Content script [message.js](./src/content/message.js) relies on its format. Inbound messages are distinguished by the presence of a "Reply" button.
- Block templates at [app/views/user_blocks](app/views/user_blocks/). Content script [block.js](./src/content/block.js) relies on their format. There's an extra hurdle of finding the blocked user's name on the rendered webpage. It comes in the headed together with the name of the block issuer. A locale-dependent string is substituted there, making the username order locale-dependent. Usually the blocked user's name comes first, but there are a few exceptions, currently 'diq','hu' and 'ja' locales. They are detected by the content script. The locale strings are found in [config/locales](https://github.com/openstreetmap/openstreetmap-website/blob/master/config/locales/), `user_blocks.show.heading_html` items of yml files.
- TODO: inbox/outbox

## Extra scripts

- [build.js](./build.js) builds an unpacked extension
- [check-block-heading-user-order.js](./check-block-heading-user-order.js) checks OSM block page heading username order, see above
- [copy-version-notes.js](./copy-version-notes.js) turns the most recent changelog entries into limited html code supported by [addons.mozilla.org](https://addons.mozilla.org/) and copies it to clipboard

[osm-dwg-userscripts]: https://github.com/woodpeck/osm-dwg-userscripts
