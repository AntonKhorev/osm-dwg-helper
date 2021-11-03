# osm-dwg-helper

Browser extension to handle reported issues ([users](https://wiki.openstreetmap.org/wiki/Report_user) and [notes](https://wiki.openstreetmap.org/wiki/Notes#Reporting_notes)) on [OpenStreetMap website](https://www.openstreetmap.org/).
Mainly of interest for [DWG members](https://wiki.osmfoundation.org/wiki/Data_Working_Group).
Reimplements some of [osm-dwg-userscripts](https://github.com/woodpeck/osm-dwg-userscripts) features without requesting/storing OTRS account login/password.

## Features

- Open a *Create New Phone Ticket* form in OTRS with fields populated from an issue page.
- Go to the issue page corresponding to an OTRS ticket title from a ticket page.
- Search OTRS for reported items in issues.
- Add the last outbox message to a ticket as an OTRS note.

## Installation

Currently you can load it as a temporary extension in Firefox.

1. Download the files (clone the repository).
2. Open [about:debugging#/runtime/this-firefox](about:debugging#/runtime/this-firefox).
3. Click *Load Temporary Add-on* under *Temporary Extensions*.
4. Open any file inside the extension directory. This should load the extension and a sidebar titled *DWG Helper* should appear.
5. If the sidebar didn't appear select *View* > *Sidebar* > *DWG Helper* from the top menu bar. If the menu bar is hidden press *Alt*.

- Doesn't work in Chrome because there's no sidebar API.
- Not yet tested in other browsers.
