import Menu from './base.js'

export default class GlobalMenu extends Menu {
	update($menu,settings,permissions,tabId) {
		const menuWriter=this.makeWriter($menu)
		const menuLinkWriter=this.makeLinkWriter(tabId)
		menuWriter.addActiveEntry(null,[
			menuLinkWriter.makePageLink("Read 'dealing with issues' guide",`cookbook.html`)
		])
		if (settings.osm) {
			menuWriter.addActiveEntry(null,[
				menuLinkWriter.makePageLink("Go to open OSM issues",`${settings.osm}issues?status=open`)
			])
			menuWriter.addActiveEntry(null,[
				menuLinkWriter.makePageLink("Go to blocks list",`${settings.osm}user_blocks`)
			])
		}
		if (settings.otrs) {
			const $icon=this.document.createElement('img')
			$icon.src='icons/ticket.svg'
			$icon.alt=''
			menuWriter.addActiveEntry($icon,[
				menuLinkWriter.makePageLink("Go to OTRS",`${settings.otrs}otrs/index.pl?Action=AgentDashboard`) // need to link to AgentDashboard, otherwise might end up on Agent/Customer selection screen
			])
		}
	}
}
