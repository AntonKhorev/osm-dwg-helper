import Menu from './base.js'
import ReportCounter from '../report-counter.js'
import * as templateEngine from '../template-engine.js'

export default class OtherMenu extends Menu {
	update($menu,settings,permissions,tabId,tabState,otherTabId,otherTabState) {
		const writer=this.makeWriter($menu)
		const linkWriter=this.makeLinkWriter(tabId)
		if (permissions.otrs && permissions.osm) {
			const otrsLinkWriter=this.makeOtrsLinkWriter(linkWriter,settings.otrs)
			if (tabState.type=='ticket-add' && otherTabState.type=='issue') {
				// const createTicketUrl=`${settings.otrs}otrs/index.pl?Action=AgentTicketPhone`
				const createTicketUrl=`#`
				const issueData=otherTabState.issueData
				let text=`issue #${issueData.id}`
				if (issueData.reportedItem) {
					text+=` - ${issueData.reportedItem.type} ${issueData.reportedItem.ref}`
				}
				// TODO equivalent of this
				// if (issueData.reportedItem?.type=='user') {
				// 	submenuWriter.addEntry(null,[
				// 		linkWriter.makeNewTabActionLink(text+` + scan user id`,createTicketUrl,[
				// 			'ScrapeReportedItemThenCreateIssueTicket',tabId,issueData
				// 		])
				// 	])
				// }
				const submenuWriter=writer.addSubmenu('ticket-add',[
					`Add to new ticket form`
				])
				submenuWriter.addEntry({item:issueData.reportedItem?.type},[
					linkWriter.makeImmediateCurrentTabActionLink(text,createTicketUrl,[
						'AddToCreateIssueTicket',otherTabId,issueData
					])
				])
			}
			if (tabState.type=='ticket' && otherTabState.type=='issue') {
				const issueData=otherTabState.issueData
				const ticketData=tabState.ticketData
				const ticketIssueData=tabState.issueData
				const selectedReports=listSelectedReportsOrComments(issueData.reports)
				const selectedComments=listSelectedReportsOrComments(issueData.comments)
				if (selectedReports.length>0 || selectedComments.length>0) {
					const menuTitleRocParts=[]
					if (selectedReports.length>0) menuTitleRocParts.push(getMenuTitleRocPart('report',selectedReports))
					if (selectedComments.length>0) menuTitleRocParts.push(getMenuTitleRocPart('comment',selectedComments))
					const submenuWriter=writer.addSubmenu('issue-add',[
						`Add ${menuTitleRocParts.join(' and ')} ${getMenuTitleIssuePart()}`
					])
					submenuWriter.addEntry(null,[
						makeIssueLink('note')
					])
					submenuWriter.addEntry(null,[
						makeIssueLink('pending')
					])
				}
				function listSelectedReportsOrComments(rocs) {
					if (rocs==null) return []
					return rocs.filter(roc=>roc.selected)
				}
				function getMenuTitleRocPart(name,rocs) {
					const users={}
					const userList=[]
					for (const roc of rocs) {
						if (users[roc.by]) continue
						users[roc.by]=true
						userList.push(roc.by)
					}
					return `${rocs.length} selected ${name+(rocs.length>1?'s':'')} (by ${userList.join(', ')})`
				}
				function getMenuTitleIssuePart() {
					let s=`from issue #${issueData.id} to ticket`
					if (ticketIssueData.id!=null) {
						if (issueData.id==ticketIssueData.id) {
							s+=` of the same issue ✓`
						} else {
							s+=` of a DIFFERENT issue #${ticketIssueData.id} ❌`
						}
					}
					return s
				}
				function makeIssueLink(addAs) {
					return otrsLinkWriter.makeAddToTicketLink(addAs,ticketData.id,[
						'AddSelectedReportsAndCommentsToTicket',ticketData.id,addAs,issueData,otherTabId
					])
				}
			}
			if (tabState.type=='ticket' && otherTabState.type=='message') {
				const messageData=otherTabState.messageData
				const ticketData=tabState.ticketData
				const submenuWriter=writer.addSubmenu('message-add',[
					`Add message ${messageData.isInbound?'from':'to'} ${messageData.user} to ticket`
				])
				submenuWriter.addEntry(null,[
					makeMessageLink('note')
				])
				submenuWriter.addEntry(null,[
					makeMessageLink('pending')
				])
				function makeMessageLink(addAs) {
					return otrsLinkWriter.makeAddToTicketLink(addAs,ticketData.id,[
						'AddMessageToTicket',ticketData.id,addAs,messageData
					])
				}
			}
		}
		if (permissions.otrs) {
			const otrsLinkWriter=this.makeOtrsLinkWriter(linkWriter,settings.otrs)
			if (tabState.type=='ticket' && otherTabState.type=='block') {
				const blockData=otherTabState.blockData
				const ticketData=tabState.ticketData
				const submenuWriter=writer.addSubmenu('block-add',[
					`Add user ${blockData.user} block record to ticket`
				])
				submenuWriter.addEntry(null,[
					makeBlockLink('note')
				])
				const $explanation=this.document.createElement('span')
				$explanation.textContent=`won't fully work`
				$explanation.title=`Normally, DWG Action field is updated to have "block issued" action added. This field is not present in the "pending" form and thus can't be changed in this manner. The "pending" menu entry is removed to avoid unexpectedly leaving out "block issued" actions.`
				submenuWriter.addEntry(null,[
					`"as pending" `,$explanation
				])
				function makeBlockLink(addAs) {
					return otrsLinkWriter.makeAddToTicketLink(addAs,ticketData.id,[
						'AddBlockToTicket',ticketData.id,addAs,blockData
					])
				}
			}
		}
		if (permissions.osm) {
			if (tabState.type=='message-add' && otherTabState.type=='issue') {
				const userData=tabState.userData
				const issueData=otherTabState.issueData
				if (userData.name) {
					const reportCounter=new ReportCounter(issueData)
					if (reportCounter.hasUserName(userData.name)) {
						const submenuWriter=writer.addSubmenu('issue-add',[
							`Add to quick message to user ${userData.name}`
						])
						submenuWriter.addEntry({url:reportCounter.getUserAvatarUrl(userData.name)},[
							linkWriter.makeImmediateCurrentTabActionLink(userData.name,'#',[
								'AddToSendMessageFromIssueReports',otherTabId,issueData,userData.name
							]),
							` - ${reportCounter.formatUserReportCounts(userData.name)} selected`
						])
						if (reportCounter.nUsers>1) {
							submenuWriter.addEntry(null,[
								`won't add selected reports from ${reportCounter.formatOtherUsersCount()}`
							])
						}
					}
				}
			}
			if (tabState.type=='block-add' && otherTabState.type=='ticket') {
				const userData=tabState.userData
				const ticketData=otherTabState.ticketData
				const templateValues={ticket:ticketData,user:userData}
				const subject=templateEngine.evaluate(settings.otrs_email_block_subject,templateValues)
				const [_,angledEmailPart]=settings.otrs_email.match(/<(.+)>/)
				const plainEmail=angledEmailPart||settings.otrs_email
				const url=`mailto:${settings.otrs_email}?subject=${encodeURIComponent(subject)}`
				const mailKramdown=`[${plainEmail}](${url})`
				writer.addEntry('ticket-add',[
					linkWriter.makeLink(
						`Copy ticket email link to clipboard`,
						url,
						async(ev)=>{
							await navigator.clipboard.writeText(mailKramdown)
							ev.target.textContent=`Copied ticket email link ✓`
						}
					)
				])
			}
		}
	}
}
