import Menu from './base.js'
import ReportCounter from '../report-counter.js'

export default class ThisMenu extends Menu {
	update($menu,settings,permissions,tabId,tabState) {
		const writer=this.makeWriter($menu)
		const linkWriter=this.makeLinkWriter(tabId)
		if (permissions.otrs) {
			const submenuWriter=writer.addSubmenu('ticket-add',[
				`Create ticket`
			])
			const createTicketUrl=`${settings.otrs}otrs/index.pl?Action=AgentTicketPhone`
			if (tabState.type=='issue') {
				const issueData=tabState.issueData
				let text=`issue #${issueData.id}`
				if (issueData.reportedItem) {
					text+=` - ${issueData.reportedItem.type} ${issueData.reportedItem.ref}`
				}
				if (issueData.reportedItem?.type=='user') {
					submenuWriter.addEntry('user',[
						linkWriter.makeNewTabActionLink(text+` + scan user id`,createTicketUrl,[
							'ScrapeReportedItemThenCreateIssueTicket',tabId,issueData
						])
					])
				}
				submenuWriter.addEntry({item:issueData.reportedItem?.type},[
					linkWriter.makeNewTabActionLink(text,createTicketUrl,[
						'CreateIssueTicket',tabId,issueData
					])
				])
			}
			{
				submenuWriter.addEntry(null,[
					linkWriter.makePageLink("empty",createTicketUrl)
				])
			}
		}
		if (settings.osm) {
			if (tabState.type=='issue') {
				const issueData=tabState.issueData
				const reportCounter=new ReportCounter(issueData)
				if (reportCounter.nUsers>0) {
					const submenuWriter=writer.addSubmenu('message-add',[
						`Quick message reporting user of issue #${issueData.id}`
					])
					for (const userName of reportCounter.userNames()) {
						submenuWriter.addEntry({url:reportCounter.getUserAvatarUrl(userName)},[
							linkWriter.makeNewTabActionLink(userName,getUserMessageUrl(userName),[
								'SendMessageFromIssueReports',tabId,issueData,userName
							]),
							` - ${reportCounter.formatUserReportCounts(userName)} selected`
						])
					}
				}
				function getUserMessageUrl(userName) {
					return settings.osm+'message/new/'+encodeURIComponent(userName)
				}
			}
		}
		if (settings.otrs) {
			const otrsLinkWriter=this.makeOtrsLinkWriter(linkWriter,settings.otrs)
			if (tabState.type=='issue') {
				const issueData=tabState.issueData
				if (issueData.id!=null) {
					const submenuWriter=writer.addSubmenu('search',[
						`Search OTRS for issue`
					])
					submenuWriter.addEntry(null,makeNumberNote(
						otrsLinkWriter.makeSearchLink(issueData.id)
					))
					submenuWriter.addEntry('issue',[
						otrsLinkWriter.makeSearchLink('issue '+issueData.id)
					])
				}
				if (issueData.reportedItem?.type=='user') {
					const submenuWriter=writer.addSubmenu('search',[
						`Search OTRS for reported user`
					])
					submenuWriter.addEntry(null,[
						otrsLinkWriter.makeSearchLink(issueData.reportedItem.name)
					])
					submenuWriter.addEntry('user',[
						otrsLinkWriter.makeSearchLink('user '+issueData.reportedItem.name)
					])
				}
				if (issueData.reportedItem?.type=='note') {
					const submenuWriter=writer.addSubmenu('search',[
						`Search OTRS for reported note`
					])
					submenuWriter.addEntry(null,makeNumberNote(
						otrsLinkWriter.makeSearchLink(issueData.reportedItem.id)
					))
					submenuWriter.addEntry('note',[
						otrsLinkWriter.makeSearchLink('note '+issueData.reportedItem.id)
					])
				}
				function makeNumberNote($a) {
					$a.title=`searching just for a number often yields unrelated results`
					return [$a,` (?)`]
				}
			}
		}
		if (settings.osm) {
			if (tabState.type=='ticket' && tabState.issueData) {
				const issueData=tabState.issueData
				if (issueData.id!=null) {
					writer.addEntry('issue',[
						linkWriter.makePageLink(`Go to ticket issue #${issueData.id}`,issueData.url)
					])
				}
			}
		}
		if (permissions.otrs && permissions.osm) {
			if (tabState.type=='ticket') {
				for (const mailbox of ['outbox','inbox']) {
					const ticketData=tabState.ticketData
					const submenuWriter=writer.addSubmenu('message-add',[
						`Add last ${mailbox} message to ticket`
					])
					submenuWriter.addEntry(null,[
						makeMessageLink('note')
					])
					submenuWriter.addEntry(null,[
						makeMessageLink('pending')
					])
					function makeMessageLink(addAs) {
						return linkWriter.makeNewTabActionLink('as '+addAs,`${settings.osm}messages/${mailbox}`,[
							'GoToLastMessageThenAddMessageToTicket',tabId,ticketData.id,addAs,mailbox
						])
					}
				}
			}
		}
		if (settings.osm) {
			if (tabState.type=='user' && tabState.userData.id!=null) {
				writer.addEntry('user',[
					linkWriter.makePageLink(`Check user id #${tabState.userData.id}`,tabState.userData.apiUrl)
				])
			}
		}
		{
			if (tabState.type=='issue' && tabState.issueData?.reports && tabState.issueData.reports.length>0) {
				const issueData=tabState.issueData
				const reportCounter=new ReportCounter(issueData)
				const inputReportTexts=[]
				for (const report of issueData.reports) {
					if (!report.selected) continue
					const doc=new DOMParser().parseFromString(report.text,'text/html')
					const strippedReportText=doc.body.textContent||''
					if (strippedReportText.length==0) continue
					inputReportTexts.push(strippedReportText)
				}
				const text=inputReportTexts.join('\n\n---\n\n')
				const googleTranslateUrl=`https://translate.google.com/?sl=auto&tl=en&op=translate&text=`+encodeURIComponent(text)
				const libreTranslateUrl=`https://libretranslate.com/?source=auto&target=en&q=`+encodeURIComponent(text)
				if (text.length>0) {
					const submenuWriter=writer.addSubmenu('translate',[
						`Translate `+reportCounter.formatSelectedReportsCount()
					])
					submenuWriter.addEntry(null,[
						linkWriter.makePageLink(`with Google Translate`,googleTranslateUrl)
					])
					submenuWriter.addEntry(null,[
						linkWriter.makePageLink(`with LibreTranslate`,libreTranslateUrl)
					])
				}
			}
		}
	}
}
