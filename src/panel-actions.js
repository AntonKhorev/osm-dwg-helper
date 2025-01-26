import GlobalMenu from './menu/global.js'

import MenuWriter from './menu-writer.js'
import MenuLinkWriter from './menu-link-writer.js'
import OtrsMenuLinkWriter from './otrs-menu-link-writer.js'
import ReportCounter from './report-counter.js'

/**
 * @returns [global, this tab, this+other tab] actions menu updater functions
 */
export default (document,closeWindow,createTab,sendMessage)=>{
	const globalMenu=new GlobalMenu(document,closeWindow,createTab,sendMessage)
	return [($menu,settings,permissions,tabId)=>{
		globalMenu.update($menu,settings,permissions,tabId)
	},($menu,settings,permissions,tabId,tabState)=>{ // this tab actions
		const menuWriter=new MenuWriter(document,$menu)
		const menuLinkWriter=new MenuLinkWriter(document,closeWindow,createTab,sendMessage,tabId)
		if (permissions.otrs) {
			const submenuWriter=menuWriter.addSubmenu(null,[
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
					submenuWriter.addActiveEntry(null,[
						menuLinkWriter.makeNewTabActionLink(text+` + scan user id`,createTicketUrl,[
							'ScrapeReportedItemThenCreateIssueTicket',tabId,issueData
						])
					])
				}
				submenuWriter.addActiveEntry(null,[
					menuLinkWriter.makeNewTabActionLink(text,createTicketUrl,[
						'CreateIssueTicket',tabId,issueData
					])
				])
			}
			{
				submenuWriter.addActiveEntry(null,[
					menuLinkWriter.makePageLink("empty",createTicketUrl)
				])
			}
		}
		if (settings.osm) {
			if (tabState.type=='issue') {
				const issueData=tabState.issueData
				const reportCounter=new ReportCounter(issueData)
				if (reportCounter.nUsers>0) {
					const submenuWriter=menuWriter.addSubmenu(null,[
						`Quick message reporting user of issue #${issueData.id}`
					])
					for (const userName of reportCounter.userNames()) {
						submenuWriter.addActiveEntry(null,[
							menuLinkWriter.makeNewTabActionLink(userName,getUserMessageUrl(userName),[
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
			const otrsMenuLinkWriter=new OtrsMenuLinkWriter(menuLinkWriter,settings.otrs)
			if (tabState.type=='issue') {
				const issueData=tabState.issueData
				if (issueData.id!=null) {
					const submenuWriter=menuWriter.addSubmenu(null,[
						`Search OTRS for issue`
					])
					submenuWriter.addActiveEntry(null,makeNumberNote(
						otrsMenuLinkWriter.makeSearchLink(issueData.id)
					))
					submenuWriter.addActiveEntry(null,[
						otrsMenuLinkWriter.makeSearchLink('issue '+issueData.id)
					])
				}
				if (issueData.reportedItem?.type=='user') {
					const submenuWriter=menuWriter.addSubmenu(null,[
						`Search OTRS for reported user`
					])
					submenuWriter.addActiveEntry(null,[
						otrsMenuLinkWriter.makeSearchLink(issueData.reportedItem.name)
					])
					submenuWriter.addActiveEntry(null,[
						otrsMenuLinkWriter.makeSearchLink('user '+issueData.reportedItem.name)
					])
				}
				if (issueData.reportedItem?.type=='note') {
					const submenuWriter=menuWriter.addSubmenu(null,[
						`Search OTRS for reported note`
					])
					submenuWriter.addActiveEntry(null,makeNumberNote(
						otrsMenuLinkWriter.makeSearchLink(issueData.reportedItem.id)
					))
					submenuWriter.addActiveEntry(null,[
						otrsMenuLinkWriter.makeSearchLink('note '+issueData.reportedItem.id)
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
					menuWriter.addActiveEntry(null,[
						menuLinkWriter.makePageLink(`Go to ticket issue #${issueData.id}`,issueData.url)
					])
				}
			}
		}
		if (permissions.otrs && permissions.osm) {
			if (tabState.type=='ticket') {
				for (const mailbox of ['outbox','inbox']) {
					const ticketData=tabState.ticketData
					const submenuWriter=menuWriter.addSubmenu(null,[
						`Add last ${mailbox} message to ticket`
					])
					submenuWriter.addActiveEntry(null,[
						makeMessageLink('note')
					])
					submenuWriter.addActiveEntry(null,[
						makeMessageLink('pending')
					])
					function makeMessageLink(addAs) {
						return menuLinkWriter.makeNewTabActionLink('as '+addAs,`${settings.osm}messages/${mailbox}`,[
							'GoToLastMessageThenAddMessageToTicket',tabId,ticketData.id,addAs,mailbox
						])
					}
				}
			}
		}
		if (settings.osm) {
			if (tabState.type=='user' && tabState.userData.id!=null) {
				menuWriter.addActiveEntry(null,[
					menuLinkWriter.makePageLink(`Check user id #${tabState.userData.id}`,tabState.userData.apiUrl)
				])
			}
		}
		{
			if (tabState.type=='issue' && tabState.issueData?.reports && tabState.issueData.reports.length>0) {
				const text=tabState.issueData.reports.map(report=>report.text).join('\n\n---\n\n') // TODO remove tags?
				const googleTranslateUrl=`https://translate.google.com/?sl=auto&tl=en&op=translate&text=`+encodeURIComponent(text)
				menuWriter.addActiveEntry(null,[
					menuLinkWriter.makePageLink('Translate issue text',googleTranslateUrl)
				])
			}
		}
	},($menu,settings,permissions,tabId,tabState,otherTabId,otherTabState)=>{ // this+other tab actions
		const menuWriter=new MenuWriter(document,$menu)
		const menuLinkWriter=new MenuLinkWriter(document,closeWindow,createTab,sendMessage,tabId)
		if (permissions.otrs && permissions.osm) {
			const otrsMenuLinkWriter=new OtrsMenuLinkWriter(menuLinkWriter,settings.otrs)
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
				// 	submenuWriter.addActiveEntry(null,[
				// 		menuLinkWriter.makeNewTabActionLink(text+` + scan user id`,createTicketUrl,[
				// 			'ScrapeReportedItemThenCreateIssueTicket',tabId,issueData
				// 		])
				// 	])
				// }
				const submenuWriter=menuWriter.addSubmenu(null,[
					`Add to new ticket form`
				])
				submenuWriter.addActiveEntry(null,[
					menuLinkWriter.makeImmediateCurrentTabActionLink(text,createTicketUrl,[
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
					const submenuWriter=menuWriter.addSubmenu(null,[
						`Add ${menuTitleRocParts.join(' and ')} ${getMenuTitleIssuePart()}`
					])
					submenuWriter.addActiveEntry(null,[
						makeIssueLink('note')
					])
					submenuWriter.addActiveEntry(null,[
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
					return otrsMenuLinkWriter.makeAddToTicketLink(addAs,ticketData.id,[
						'AddSelectedReportsAndCommentsToTicket',ticketData.id,addAs,issueData,otherTabId
					])
				}
			}
			if (tabState.type=='ticket' && otherTabState.type=='message') {
				const messageData=otherTabState.messageData
				const ticketData=tabState.ticketData
				const submenuWriter=menuWriter.addSubmenu(null,[
					`Add message ${messageData.isInbound?'from':'to'} ${messageData.user} to ticket`
				])
				submenuWriter.addActiveEntry(null,[
					makeMessageLink('note')
				])
				submenuWriter.addActiveEntry(null,[
					makeMessageLink('pending')
				])
				function makeMessageLink(addAs) {
					return otrsMenuLinkWriter.makeAddToTicketLink(addAs,ticketData.id,[
						'AddMessageToTicket',ticketData.id,addAs,messageData
					])
				}
			}
		}
		if (permissions.otrs) {
			const otrsMenuLinkWriter=new OtrsMenuLinkWriter(menuLinkWriter,settings.otrs)
			if (tabState.type=='ticket' && otherTabState.type=='block') {
				const blockData=otherTabState.blockData
				const ticketData=tabState.ticketData
				const submenuWriter=menuWriter.addSubmenu(null,[
					`Add user ${blockData.user} block record to ticket`
				])
				submenuWriter.addActiveEntry(null,[
					makeBlockLink('note')
				])
				const $explanation=document.createElement('span')
				$explanation.textContent=`won't fully work`
				$explanation.title=`Normally, DWG Action field is updated to have "block issued" action added. This field is not present in the "pending" form and thus can't be changed in this manner. The "pending" menu entry is removed to avoid unexpectedly leaving out "block issued" actions.`
				submenuWriter.addPassiveEntry(null,[
					`"as pending" `,$explanation
				])
				function makeBlockLink(addAs) {
					return otrsMenuLinkWriter.makeAddToTicketLink(addAs,ticketData.id,[
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
						const submenuWriter=menuWriter.addSubmenu(null,[
							`Add to quick message to user ${userData.name}`
						])
						submenuWriter.addActiveEntry(null,[
							menuLinkWriter.makeImmediateCurrentTabActionLink(userData.name,'#',[
								'AddToSendMessageFromIssueReports',otherTabId,issueData,userData.name
							]),
							` - ${reportCounter.formatUserReportCounts(userData.name)} selected`
						])
						if (reportCounter.nUsers>1) {
							submenuWriter.addPassiveEntry(null,[
								`won't add selected reports from ${reportCounter.formatOtherUsersCount()}`
							])
						}
					}
				}
			}
		}
	}]
}
