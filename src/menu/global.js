import Menu from './base.js'

export default class GlobalMenu extends Menu {
	update($menu,settings,permissions,tabId) {
		const writer=this.makeWriter($menu)
		const linkWriter=this.makeLinkWriter(tabId)
		if (settings.osm) {
			writer.addActiveEntry('issue',[
				linkWriter.makePageLink("Go to open OSM issues",`${settings.osm}issues?status=open`)
			])
			writer.addActiveEntry('block',[
				linkWriter.makePageLink("Go to blocks list",`${settings.osm}user_blocks`)
			])
		}
		if (settings.otrs) {
			writer.addActiveEntry('ticket',[
				linkWriter.makePageLink("Go to OTRS",`${settings.otrs}otrs/index.pl?Action=AgentDashboard`) // need to link to AgentDashboard, otherwise might end up on Agent/Customer selection screen
			])
		}
	}
}
