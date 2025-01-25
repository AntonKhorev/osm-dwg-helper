# Contributing

## Build and install

There are two build stages:

1. The required stage handled by the build script inside the source code. It generates the extension code that is runnable by browsers but inconvenient to distribute.
2. The packaging stage handled either by `web-ext build` command or just by zipping the output of the previous stage.

### Required build

1. install [Node.js](https://nodejs.org/). Version 20 was tested
2. download the extension files (clone the repository)
3. run `npm install`
4. run `npm run build`

After these steps the `dist` subdirectory could be loaded as a temporary/unpacked extension in the developer mode/version of browsers. See the subsections below for loading the extension in Firefox and Chrome.

The building process does these things:

- adds [the polyfill for extension api](https://github.com/mozilla/webextension-polyfill)
- bundles content scripts injected into OSM and OTRS webpages
- converts svg icons to png

#### Install as a temporary extension in Firefox

1. build the extension
2. open [about:debugging#/runtime/this-firefox](about:debugging#/runtime/this-firefox)
3. click *Load Temporary Add-on* under *Temporary Extensions*
4. open any file inside the [`dist`](./dist) subdirectory

Installed in this manner, the extension won't persist across different browser sessions.

#### Install as an unpacked extension in Chrome

1. build the extension
2. select *Extensions > Manage Extensions* or open [chrome://extensions/](chrome://extensions/)
3. enable *Developer mode*
4. click *Load unpacked*
5. select the [`dist`](./dist) subdirectory

### Packing

You can zip the contents of this directory to get the unsigned extension file or run [web-ext](https://github.com/mozilla/web-ext) tools there. `web-ext build` will create a zip archive of the extension.

## Content scripts

Content scripts are run in order to retrieve and change information on OSM and OTRS webpages. Modules that implement the functionality of content scripts are located in the [`src/content`](./src/content) directory. Because of incomplete content script module support by browsers these modules have to be bundled into actual content scripts during the build process. The actual scripts are written to [`dist/content`](./dist/content).

Content scripts for OSM webpages have to rely on the particulars of markup because of a lack of semantic tags/attributes. This makes these scripts a likely point of failure when [Rails Port](https://github.com/openstreetmap/openstreetmap-website) is updated. The places to watch (and to fix) are:

- Issue rendering templates at [app/views/issues](https://github.com/openstreetmap/openstreetmap-website/tree/master/app/views/issues), particularly the issue page outline [show.html.erb](https://github.com/openstreetmap/openstreetmap-website/blob/master/app/views/issues/show.html.erb) and report template [_reports.html.erb](https://github.com/openstreetmap/openstreetmap-website/blob/master/app/views/issues/_reports.html.erb). Content script [issue.js](./src/content/issue.js) relies on their format. Report dates are not yet extracted because they used to be not delimited by any html tags until recently; now they are inside [`<time>` elements](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time). Reporting users are extracted, relying on the fact that they are the only hyperlinks inside the reports. Reporting categories are extracted relying on string matches because they are not translated, although there's an uncertainty if that's going to be the case in the future. This extension mostly tries not to rely on string matching, unlike [osm-dwg-userscripts] that does it using patterns like `/Open (Issue #\d+)/`. Such approach is going to fail when the OSM UI language is set to something other than English.
- User templates at [app/views/users](https://github.com/openstreetmap/openstreetmap-website/tree/master/app/views/users), particularly the user profile page [show.html.erb](https://github.com/openstreetmap/openstreetmap-website/blob/master/app/views/users/show.html.erb). Content script [user.js](./src/content/user.js) relies on its format. Currently the thing of interest is the report link that contains the user's id.
- Message templates at [app/views/messages](https://github.com/openstreetmap/openstreetmap-website/tree/master/app/views/messages), particularly [show.html.erb](https://github.com/openstreetmap/openstreetmap-website/blob/master/app/views/messages/show.html.erb). Content script [message.js](./src/content/message.js) relies on its format. Inbound messages are distinguished by the presence of a "Reply" button.
- Block templates at [app/views/user_blocks](app/views/user_blocks/). Content script [block.js](./src/content/block.js) relies on their format. There's an extra hurdle of finding the blocked user's name on the rendered webpage. It comes in the headed together with the name of the block issuer. A locale-dependent string is substituted there, making the username order locale-dependent. Usually the blocked user's name comes first, but there are a few exceptions, currently 'diq','hu' and 'ja' locales. They are detected by the content script. The locale strings are found in [config/locales](https://github.com/openstreetmap/openstreetmap-website/blob/master/config/locales/), `user_blocks.show.heading_html` items of yml files.
- TODO: inbox/outbox

## Extra scripts

- [build.js](./build.js) builds an unpacked extension
- [check-block-heading-user-order.js](./check-block-heading-user-order.js) checks OSM block page heading username order, see above
- [copy-version-notes.js](./copy-version-notes.js) turns the most recent changelog entries into limited html code supported by [addons.mozilla.org](https://addons.mozilla.org/) and copies it to clipboard

## Testing

### Running only specific test

Example command to run tests describing only `Actions.SendMessageFromIssueReports`:
```
npm test -- -f "Actions.SendMessageFromIssueReports"
```

[osm-dwg-userscripts]: https://github.com/woodpeck/osm-dwg-userscripts
