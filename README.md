# osm-dwg-helper

A browser extension to handle reported issues ([users](https://wiki.openstreetmap.org/wiki/Report_user) and [notes](https://wiki.openstreetmap.org/wiki/Notes#Reporting_notes)) on the [OpenStreetMap website](https://www.openstreetmap.org/).
Allows to quickly create [OTRS](https://github.com/OTRS/otrs) tickets from issues and to add OSM messages to tickets.
Mainly of interest to [OSMF Data Working Group members](https://wiki.osmfoundation.org/wiki/Data_Working_Group).
An alternative to [osm-dwg-userscripts] without requesting/storing OTRS account login/password.

## Installation

Available as a [Firefox addon on addons.mozilla.org](https://addons.mozilla.org/addon/osm-dwg-helper/) since v0.1.2. Older versions can be downloaded as xpi files from [github releases](https://github.com/AntonKhorev/osm-dwg-helper/releases/). `osm_dwg_helper-`*`version`*`-fx.xpi` files are signed Firefox releases. There are also `osm_dwg_helper-`*`version`*`.zip` files for non-browser-specific releases. They should be installable on any browser that supports running unsigned extensions. For example, on Chromium you can drag-and-drop it into the *Settings > Extensions* page (`chrome://extensions/`). No browsers other than Firefox and Chromium have been tested yet.

See [CONTRIBUTING.md](./CONTRIBUTING.md#build-and-install) for instructions on installing from the source code.

After a successful installation the extension is going to be available as a sidebar on browsers that support sidebars (*View > Sidebar > DWG Helper* in Firefox) and as a toolbar button opening a popup. First thing that you'll need to do is to grant this extension permissions to access to OSM and OTRS websites. This action is separate from granting permissions during the installation in order to avoid hardcoding urls of these websites in the extension manifest. It's possible to change those urls in the extension options.

Automatic updates of the extensions are available if installed from addons.mozilla.org. Updating the extension is likely to be important because it relies on the specific markup of certain OSM web pages. Changes to those may break the functionality. Last known breakage happened on 2021-11-11 before the v0.1.0 release, also affecting v0.1.1. You need to update the extension if you're running an older version. See [CONTRIBUTING.md](./CONTRIBUTING.md#content-scripts) for details.

## Features

Overall the goals were:

- speed up some common actions that a DWG member might want to do by replacing copy-pasting various things with clicking
- avoid additional logins present in other similar tools
- don't submit actions right away so they can be reviewed and altered if necessary
- try not to alter the webpage contents too much, keep most of the controls inside the extension panel (currently available as a sidebar) - this may change as further development required altering issue pages, but most of alterations should be marked with the extension icon

### Create tickets from issues

The standard procedure for converting an *OSM issue* into an *OTRS ticket* involves opening a *Create New Phone Ticket* form in OTRS and populating its fields with information from the OSM issue webpage. You can do this manually by copy-pasting which is tedious. There's [dwg_issue2ticket.user.js](https://github.com/woodpeck/osm-dwg-userscripts#dwg_issue2ticketuserjs) script from [osm-dwg-userscripts] to automate the creation of tickets from issues, but you may not like how it works and you may not bother getting it fully working.

This browser extension lets you do the same thing with some differences. Similar to [osm-dwg-userscripts], you start by opening the issue webpage (`https://www.openstreetmap.org/issues/`**`id`**). Then you click the *Create ticket* link in the extension panel. Unlike [osm-dwg-userscripts], where the ticket is created right away, this should open a *Create New Phone Ticket* form, giving you the opportunity to change ticket details. The form is going to have all of the required fields set. These fields are:

- *Customer user* containing usernames of users who reported the issue formatted as email addresses. If the issue was reported by several users, multiple customer user values will be set. Unlike [osm-dwg-userscripts], the actual email address is not hardcoded to non-working `@thisdoesnotwork.users.openstreetmap.org`, `@dwgmail.info` is used instead by default.
- *To queue* set to a first valid queue. In case of the current DWG setup this is going to be a generic *Data Working Group* queue. [osm-dwg-userscripts] also sets this queue, but here you have the opportunity to change it - which is what you want because changing the queue of an existing ticket does other things like unlocking.
- *Subject* containing the issue id and the reported item.
- *Text* with issue reports, like the one shown on the issue webpage. For a similar function [osm-dwg-userscripts] does some job removing control elements from the issue webpage, but aside from that it makes a partial copy of this page's html. Unlike that, this extension parses the page to some extent and recreates the text in order to really get rid of unnecessary elements. See [CONTRIBUTING.md](./CONTRIBUTING.md#content-scripts) for limitations of this approach and the one of [osm-dwg-userscripts].

When the reported item is a user, there's an additional option to create a ticket - *+ scan user id*. If you choose this option, the extension is going to open the user profile before proceeding to the OTRS new ticket form. While on the user profile page, the id of the user is detected to be later added to the ticket. This might be helpful in case the user changes their name which can happen anytime.

Another thing you may encounter before the *Create New Phone Ticket* form is the OTRS login form. This happens if you haven't yet logged in OTRS with your browser, that is, if you haven't successfully opened any page on the OTRS website, or if your login timed out. Just enter your OTRS username and password as usual and, after a successful login, you'll see the ticket form. Usernames and passwords are not read and stored by this extension, all the credentials management is done by the OTRS code. This is again unlike [osm-dwg-userscripts], where during the first run you will be prompted by the script for your login details, which will be stored in the script's settings.

Last thing that happens is that the issue gets commented with a link to the newly created ticket. In case of [osm-dwg-userscripts], according to its readme, you need the *CORS Everywhere* addon for this to happen. This extension doesn't need any other addon to be installed.

### Add messages to tickets

As noted above, when tickets are created using this extension, the reporting users are automatically added as customers with `@dwgmail.info` addresses. In the current DWG setup these addresses serve as means to send and receive [user messages](https://wiki.openstreetmap.org/wiki/Web_front_end#User_messaging) from/to OTRS. However the implementation of this OTRS-to-OSM messaging bridge is located outside of OTRS, OSM and this extension and may come with limitations. Its possible for a username to be processed incorrectly, especially if it contains special characters. There are also message text conversions that may mangle the text. Until recently the DWG setup had a html-to-plaintext-to-[kramdown](https://kramdown.gettalong.org/)-to-html conversion of roundtrip messages. Currently the plaintext stage is avoided, but html-allowed-inside-OTRS and html-produced-by-kramdown still have differences that may lead to formatting losses.

If you want to be absolutely sure that the message is sent to a specific user and want to know exactly how its text is going too look, you may create it directly on the OSM website. After that, of course, you'll have to add it manually to the OTRS ticket, and do the same thing for the reply once you receive it. That is, you'll have to do the things that the mail forwarding system was supposed to automate. But if you still want to send messages through the OSM website, or already have the messages you want to add to a ticket, the extension can help you with copy-pasting them. When on the OTRS ticket page, use *Add last outbox/inbox message to ticket* in the extension panel to quickly add the last send/received message. You can choose to add it either *as note* without any additional actions or *as pending* which lets you specify a pending reminder/autoclose along with the message.

In order to add a message that is not necessarily the last one in your inbox/outbox take the following steps:

1. Navigate to an OTRS ticket page.
2. Open a new browser tab and navigate to the necessary message on the OSM website, or just switch to the message tab if it's already open.
3. Switch back to the tab with an OTRS ticket.
4. *Add message from/to username to ticket* links should appear in the *Other Tab Actions* menu of the extension panel. Click one of those links.

### Add unread reports to tickets

Sometimes, after creating a ticket, you discover another issue about the same thing or that new reports got added to the original issue. For example, this happens when two users report each other. At first you may come across only one of those reports and create a ticket for it. Later you may discover another report and decide that it belongs to the already existing ticket. Thus you can't use the *Create ticket* command but you probably still don't want to copy-paste stuff from issue pages.

In order to add reports to an existing ticket, use *Add unread reports from issue* in the extension panel. Using it is similar to adding an already posted OSM message. The panel entry appears when you switch from an issue tab to a ticket tab when the issue contains unread ("new") reports. The reports, like messages, can be added as either a ticket note or a pending item, with subject and body similar to the ones you get by creating a ticket. After the reports are added, the issue gets commented with a link to the ticket, again similar to what happens when creating a ticket. You'll have to resolve the issue to turn unread reports into read ones that won't be picked up by this extension feature.

### Add blocks to tickets

If you've issued a block, you can add it to a ticket in a manner similar to adding messages/reports. Open the block tab, then switch to the ticket tab, and *Add block record* should appear in *Other Tab Actions*. Clicking one of the links below it opens a new ticket article with a link to the block. It also adds *block issued* to *DWG Actions* free field. Since this is a DWG-specific field not present in default OTRS configurations, the name of its input can be configured in the options.

### Quick messages from issues

Sometimes you don't want to create a ticket for an issue. You may want just to send a message to the reporting user and resolve te issue. To quickly do this from the issue page, click on the username under *Quick message reporting user* in the extension panel. An OSM new message form will be opened with a pregenerated subject.

### Other actions

- Go to the issue page corresponding to an OTRS ticket title from a ticket page.
- Search OTRS for reported items in issues.
- Translate issue reports.

### Issue webpage extensions

- A pane is added for opening the reported item directly inside the issue webpage. This should make it faster to deal with reported notes that don't require creating a ticket.
- A pane is added for [OSMCha](https://wiki.openstreetmap.org/wiki/OSMCha) page of the reported user. The default two-week time limit is disabled, allowing to see all of the user's changesets. Issue reports are scanned for changeset links. These links open their changeset inside the OSMCha pane. Middle-click opens them in a new tab. The OSMCha pane insertion requires working against cross-site frame permissions and may not work on some browsers.

## Use outside of DWG

The extension can be set up work with other [Rails Port](https://github.com/openstreetmap/openstreetmap-website) (OpenStreetMap web server) and [OTRS](https://github.com/OTRS/otrs) instances.

### Rails Port

- any version with [2021-11-11 changes](https://github.com/openstreetmap/openstreetmap-website/commit/e21b9b2bf16d8d27312a82ae4ede5500e618fe88)
- any user account is enough for message/translation/search-related functionality
- [moderator account](https://wiki.openstreetmap.org/wiki/Web_front_end#Moderators) for issue-related functionality
- use the *OpenStreetMap root URL* option to setup your Rails Port instance
  - default value for DWG workflow is `https://www.openstreetmap.org/`
  - value for [dev.openstreetmap.org-hosted sandbox](https://wiki.openstreetmap.org/wiki/Master.apis.dev.openstreetmap.org) is `https://master.apis.dev.openstreetmap.org/`
- there's also the *OpenStreetMap API root URL* option
  - currently only in use to provide links to user ids, because all user links on the web server use *display names*
  - no data is read by the extension from this address
  - default value for DWG workflow is `https://api.openstreetmap.org/`
  - sandbox value is `https://master.apis.dev.openstreetmap.org/`

### OTRS

- *((OTRS)) Community Edition* 6.x, which is discontinued, or one of its forks
  - checked to work with [Centuran Consulting fork](https://otrscommunityedition.com/)
- agent account for all ticket-related functionality
- use the *OTRS root URL* option to setup your Rails Port instance

If you want to try Centuran fork online demo:

1. to avoid accidentally submitting real issue data, set up the Rails Port sandbox or other dummy instance as described in the previous section
2. go to [demo.otrsce.com](https://demo.otrsce.com/) or [new.demo.otrsce.com](https://new.demo.otrsce.com/)
3. click *Open Agent Interface*
4. change the extension option *OTRS root URL* to either `https://demo.otrsce.com/` or `https://new.demo.otrsce.com/`

### Mail-to-issue forwarder

Part of the code that processes the mail sent from OTRS is available [here](https://github.com/AntonKhorev/osm-dwg-mail-reader). You likely want to put the receiving email address in the *Customer template* extension option.

[osm-dwg-userscripts]: https://github.com/woodpeck/osm-dwg-userscripts
