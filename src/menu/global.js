import Menu from './base.js'

export default class GlobalMenu extends Menu {
	update($menu,settings,permissions,tabId) {
		const writer=this.makeWriter($menu)
		const linkWriter=this.makeLinkWriter(tabId)
		if (settings.osm) {
			writer.addEntry('issue',[
				linkWriter.makePageLink("Go to open OSM issues",`${settings.osm}issues?status=open`)
			])
			writer.addEntry('block',[
				linkWriter.makePageLink("Go to blocks list",`${settings.osm}user_blocks`)
			])
			writer.addEntry('redaction',[
				linkWriter.makePageLink("Go to redactions list",`${settings.osm}redactions`)
			])
		}
		if (settings.otrs) {
			writer.addEntry('ticket',[
				linkWriter.makePageLink("Go to OTRS",`${settings.otrs}otrs/index.pl?Action=AgentDashboard`),
				" (",
				linkWriter.makePageLink("all",`${settings.otrs}otrs/index.pl?Action=AgentTicketStatusView;DeleteFilters=DeleteFilters`),
				" / ",
				linkWriter.makePageLink("my tickets",`${settings.otrs}otrs/index.pl?Action=AgentTicketOwnerView;DeleteFilters=DeleteFilters`),
				")"
			])
		}
	}
}
