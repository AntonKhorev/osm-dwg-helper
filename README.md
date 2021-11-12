# osm-dwg-helper

Browser extension to handle reported issues ([users](https://wiki.openstreetmap.org/wiki/Report_user) and [notes](https://wiki.openstreetmap.org/wiki/Notes#Reporting_notes)) on [OpenStreetMap website](https://www.openstreetmap.org/).
Mainly of interest for [DWG members](https://wiki.osmfoundation.org/wiki/Data_Working_Group).
Reimplements some of [osm-dwg-userscripts] features without requesting/storing OTRS account login/password.

## Installation

Currently it's possible to install the extension on Firefox from an xpi file. To do so , go to [the latest release page](https://github.com/AntonKhorev/osm-dwg-helper/releases/latest) and open a `osm_dwg_helper-`*`version`*`-fx.xpi` file with Firefox.

There's also a `osm_dwg_helper-`*`version`*`.zip` file for any browser that supports running unsigned extensions. For example, on Chromium you can drag-and-drop it into the *Settings > Extensions* page (`chrome://extensions/`). No browsers other than Firefox and Chromium have been tested yet.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for instructions on installing from the source code.

After a successful installation the extension is going to be available as a sidebar on browsers that support sidebars (*View > Sidebar > DWG Helper* in Firefox) and as a toolbar button opening a popup.

Automatic updates of the extensions are still not implemented. However updating it is likely to be important because the extension relies on the specific markup of certain OSM web pages. Changes to those may break the functionality. Last known breakage happened on 2021-11-11 before v0.1.0 release. You need to update the extension if you're running an older version.

## Features

Overall the goals were:

- speed up some common actions that a DWG member might want to do by replacing copy-pasting various things with clicking
- avoid additional logins present in other similar tools
- don't submit actions right away so they can be reviewed and altered if necessary
- try not to alter the webpage contents too much, keep most of the controls inside the extension panel (currently available as a sidebar)

### Creating tickets from issues

The standard procedure for converting an *OSM issue* into an *OTRS ticket* involves opening a *Create New Phone Ticket* form in OTRS and populating its fields with information from the OSM issue webpage. You can do this manually by copy-pasting which is tedious. There's [dwg_issue2ticket.user.js](https://github.com/woodpeck/osm-dwg-userscripts#dwg_issue2ticketuserjs) script from [osm-dwg-userscripts] to automate the creation of tickets from issues, but you may not like how it works and you may not bother getting it fully working.

This browser extension lets you do the same thing with some differences. Similar to [osm-dwg-userscripts], you start by opening the issue webpage (`https://www.openstreetmap.org/issues/`**id**). Then you click the *Create ticket* link in the extension panel. Unlike [osm-dwg-userscripts], where the ticket is created right away, this should open a *Create New Phone Ticket* form, giving you the opportunity to change ticket details. The form is going to have all of the required fields set. These fields are:

- *Customer user* containing usernames of users who reported the issue formatted as email addresses. If the issue was reported by several users, multiple customer user values will be set. Unlike [osm-dwg-userscripts], the actual email address is not hardcoded to non-working `@thisdoesnotwork.users.openstreetmap.org`, `@dwgmail.info` is used instead by default.
- *To queue* set to a first valid queue. In case of the current DWG setup this is going to be a generic *Data Working Group* queue. [osm-dwg-userscripts] also sets this queue, but here you have the opportunity to change it - which is what you want because changing the queue of an existing ticket does other things like unlocking.
- *Subject* containing the issue id and the reported item.
- *Text* with issue reports, like the one shown on the issue webpage. For a similar function [osm-dwg-userscripts] does some job removing control elements from the issue webpage, but aside from that it makes a partial copy of this page's html. Unlike that, this extension parses the page to some extent and recreates the text in order to really get rid of unnecessary elements. There are limits to what can be detected on the page because its markup is not very semantic. For example, report dates are not represented by [`<time>` elements](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time) and in fact are not delimited by any html elements. And everything is subject to i18n making the exact format of each report unknown. I18n should also be a problem for [osm-dwg-userscripts] because of regexes like `/Open (Issue #\d+)/` that won't find anything when the OSM UI language is set to something other than English. This extension doesn't rely on text matches and will work with any UI language. It will fail however if the webpage structure is changed significantly in OSM's [Rails Port](https://github.com/openstreetmap/openstreetmap-website) code.

You may notice that in some cases the *Create New Phone Ticket* form is not the first thing you see when you click *Create ticket*. First thing that happens is that the reported item's webpage is opened. This is done to determine the reported user's id in case of a reported user. This id is later added to the ticket text. It's going to be helpful if the user changes their name which can happen anytime. Currently nothing useful happens on a note's webpage if reported item is a note.

Another thing you may encounter before the *Create New Phone Ticket* form is the login form. This happens if you haven't yet logged in OTRS with your browser, that is, if you haven't successfully opened any page on the OTRS website, or if your login timed out. Just enter your OTRS username and password as usual and, after a successful login, you'll see the ticket form. Usernames and passwords are not read and stored by this extension, all the credentials management is done by the OTRS code. This is again unlike [osm-dwg-userscripts], where during the first run you will be prompted by the script for your login details, which will be stored in the script's settings.

Last thing that happens is that the issue gets commented with a link to the newly created ticket. In case of [osm-dwg-userscripts], according to its readme, you need the *CORS Everywhere* addon for this to happen. This extension doesn't need any other addon to be installed.

### Other actions

- Go to the issue page corresponding to an OTRS ticket title from a ticket page.
- Search OTRS for reported items in issues.
- Add the last inbox/outbox message to a ticket as an OTRS note or article with pending time.
- Translate issue reports.

[osm-dwg-userscripts]: https://github.com/woodpeck/osm-dwg-userscripts
