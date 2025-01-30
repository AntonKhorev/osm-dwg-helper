# Change Log

## 0.7.3

- Select other tab using browser tab highlight (Ctrl/Shift+click)

## 0.7.2

- Copy OTRS reply email address when creating new blocks

## 0.7.1

- Support usernames with `[`/`]` brackets in quick messages

## 0.7.0

- Redesign menu with larger click areas and icons
- User avatars in menu
- Add LibreTranslate
- Translate only selected reports

## 0.6.12

- Fix *Quick message* not proceeding to issue comment after landing on `/messages/outbox`

## 0.6.11

- Add *Go to blocks list* action
- Support canonical new message URL `/messages/new`
- Don't close the sidebar after clicking on an action in Firefox

## 0.6.10

- Fix extension popup size in Chrome
- Update issue page processing for [new Bootstrap classes](https://github.com/openstreetmap/openstreetmap-website/pull/4756)

## 0.6.9

- Fix *Add report to ticket* in case this extension runs after OTRS rich text editor loads

## 0.6.8

- Prepare for machine-readable report categories/dates on issue pages

## 0.6.7

- Remove outdated permissions browser bug warning
- Fix access OSM permission for root URLs with port numbers

## 0.6.6

- Write reported item to quick message body
- *Add to quick message* command to put several issues ito one message
- *Dealing with issues* guide

## 0.6.5

- Fix tab state update when report/comment selection changes due to page reloading
- Quick message menu shows users with selected reports
- Issue gets commented after a quick message have been sent

## 0.6.4

- Fixes to *Add to new ticket form* related to browser tab update event behavior change and potential race conditions
- *Comment/resolve issue* button available after copying reports to a ticket

## 0.6.3

- *Add to ticket* respects checkboxes

## 0.6.2

- Reports and comments on issue pages have checkboxes that can be used to select what to include in a new ticket

## 0.6.1

- Copy issue reports as html instead of as a sequence of plaintext paragraphs

## 0.6.0

- Partial fix for richtext issue reports
- Partial fix for [the osm website fix of richtext issue reports](https://github.com/openstreetmap/openstreetmap-website/pull/3566) (wrap richtext with `div` instead of `p`)

## 0.5.1

- Add issue to create new ticket form for multi-issue tickets

## 0.5.0

- Running the extension directly from the source without building is no longer available
- Moved some actions to *Other Tab Actions* menu
- Can add block record with an update of DWG ticket actions

## 0.4.0

- Add unread reports to a ticket

## 0.3.2

- Open changesets from report texts in OSMCha on user issue pages

## 0.3.1

- OSMCha pane injected into user issue pages
- Added controls for webRequest permissions required by OSMCha injection
- Options button in panels

## 0.3.0

- Reported item panes injected into issue pages

## 0.2.5

- Fix: icon was reset after reloading a tab
- Fix: icons weren't set on startup for browsers without sidebars
- Fix: panels weren't updated if tab state changed to unknown as a result of settings changes
- Fix: switching from a message to a ticket didn't allow adding the message when the message tab got focus on startup

## 0.2.4

- Reset/restore buttons in options
- Firefox-specific fix: actions launched from a popup weren't working because they were referencing dead objects as soon as the popup has been closed, this should be fixed by passing messages instead of objects between the extension windows

## 0.2.3

- Issue comment template for a new ticket
- Support OTRS Personal Preferences > Miscellaneous > Screen after new ticket > Ticket Zoom setting

## 0.2.2

- Quick messages to reporting users

## 0.2.1

- Toolbar/sidebar icon changes with a detected actionable webpage

## 0.2.0

- Add OSM message from a previous tab to a ticket
- Fix: populate the document iframe of a rich text editor if it's already loaded
- Fix due to older Rails Port update: detect if a report was read and doesn't need to be added to a new ticket

## 0.1.2

- Changed user id detection due to a [Rails Port update](https://github.com/openstreetmap/openstreetmap-website/commit/3719e8defbe019b153df79bf6996341d5774759d#diff-78ff736409d758722403cce31873ba803b3fb526d37398ca21caa557b54dfd95)
- Warn on the settings page that changing settings cancels ongoing actions
- Don't cancel ongoing actions when closing the settings page
- Allow to create tickets without opening reported item pages

## 0.1.1

- Ability to recall origins permissions
- Reload panels when permissions changed
- Basic dark theme support

## 0.1.0

- Initial release
