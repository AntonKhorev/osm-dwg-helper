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
- try not to alter the webpage contents too much, keep most of the controls inside the extension panel (currently available as a sidebar)

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

As noted above, tickets created with this extension add customers with a correct (as of current DWG setup) @dwgmail.info address, or the one you specified through the options. This address may function (and does so as of current DWG setup) as means to send and receive [user messages](https://wiki.openstreetmap.org/wiki/Web_front_end#User_messaging) from/to OTRS. However the implementation of this OTRS-to-OSM messaging bridge is located outside of both OTRS and OSM and may come with limitations. In case of current DWG setup, the outbound messages are stripped to plaintext. OTRS users may be unaware of this as they still see the html-formatted articles attached to the ticket. Users who receive the message see something else, possibly unreadable, if the original html message contained a lot of stuff such as reply quotations.

Another way to contact the OSM user is just to send them a message from the OSM website, then manually add that message to the OTRS ticket. When the reply is received, it also needs to be added manually. This is tedious, and that's why the system described above was implemented. But if you still want to send messages through the OSM website, the extension can help you with copy-pasting them. When on the OTRS ticket page, use *Add last outbox/inbox message to ticket* in the extension panel to quickly add the last send/received message. You can select to add it either *as note* without any additional actions or *as pending* which lets you specify a pending reminder/autoclose along with the message.

In order to add a message that is not necessarily the last one in your inbox/outbox take the following steps:

1. Navigate to an OTRS ticket page.
2. Open a new browser tab.
3. In the new tab navigate to the necessary message on the OSM website.
4. Switch back to the tab with an OTRS ticket.
5. *Add message from/to username to ticket* links should appear in the extension panel. Click one of those links.

### Other actions

- Go to the issue page corresponding to an OTRS ticket title from a ticket page.
- Search OTRS for reported items in issues.
- Translate issue reports.

[osm-dwg-userscripts]: https://github.com/woodpeck/osm-dwg-userscripts
