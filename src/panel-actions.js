import MenuWriter from './menu-writer.js'
import MenuLinkWriter from './menu-link-writer.js'

/**
 * @returns [global, this tab, this+other tab] actions menu updater functions
 */
export default (document,closeWindow,createTab,sendMessage)=>{
	const makeMakeLink=(tabId)=>(href,text,clickHandler=()=>createTab({openerTabId:tabId,url:href}))=>{
		const $a=document.createElement('a')
		$a.href=href
		if (text!=null) $a.textContent=text
		$a.addEventListener('click',ev=>{
			ev.preventDefault()
			clickHandler()
			closeWindow()
		})
		return $a
	}
	return [($menu,settings,permissions,tabId)=>{ // global actions
		const menuWriter=new MenuWriter(document,$menu)
		const menuLinkWriter=new MenuLinkWriter(document,closeWindow,createTab,sendMessage,tabId)
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
			const $icon=document.createElement('img')
			$icon.src='icons/ticket.svg'
			$icon.alt=''
			menuWriter.addActiveEntry($icon,[
				menuLinkWriter.makePageLink("Go to OTRS",`${settings.otrs}otrs/index.pl?Action=AgentDashboard`) // need to link to AgentDashboard, otherwise might end up on Agent/Customer selection screen
			])
		}
	},($menu,settings,permissions,tabId,tabState)=>{ // this tab actions
		const makeLink=makeMakeLink(tabId)
		const menuWriter=new MenuWriter(document,$menu)
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
						makeLink(createTicketUrl,text+` + scan user id`,()=>sendMessage({
							action:'initiateNewTabAction',
							tabAction:['ScrapeReportedItemThenCreateIssueTicket',tabId,issueData]
						}))
					])
				}
				submenuWriter.addActiveEntry(null,[
					makeLink(createTicketUrl,text,()=>sendMessage({
						action:'initiateNewTabAction',
						tabAction:['CreateIssueTicket',tabId,issueData]
					}))
				])
			}
			{
				submenuWriter.addActiveEntry(null,[
					makeLink(createTicketUrl,"empty")
				])
			}
		}
		if (settings.osm) {
			if (tabState.type=='issue') {
				const issueData=tabState.issueData
				const userReportCountsMap=getUserReportCountsMap(issueData)
				if (userReportCountsMap.size>0) {
					const submenuWriter=menuWriter.addSubmenu(null,[
						`Quick message reporting user of issue #${issueData.id}`
					])
					for (const [userName,userReportCounts] of userReportCountsMap) {
						submenuWriter.addActiveEntry(null,[
							makeLink(getUserMessageUrl(userName),userName,()=>sendMessage({
								action:'initiateNewTabAction',
								tabAction:['SendMessageFromIssueReports',tabId,issueData,userName]
							})),
							` - ${formatUserReportCounts(userReportCounts)} selected`
						])
					}
				}
				function getUserMessageUrl(userName) {
					return settings.osm+'message/new/'+encodeURIComponent(userName)
				}
			}
		}
		if (settings.otrs) {
			if (tabState.type=='issue') {
				const issueData=tabState.issueData
				const numberNote='searching just for a number often yields unrelated results'
				if (issueData.id!=null) {
					const submenuWriter=menuWriter.addSubmenu(null,[
						`Search OTRS for issue`
					])
					submenuWriter.addActiveEntry(null,[
						makeSearchLink(issueData.id,numberNote)
					])
					submenuWriter.addActiveEntry(null,[
						makeSearchLink('issue '+issueData.id)
					])
				}
				if (issueData.reportedItem?.type=='user') {
					const submenuWriter=menuWriter.addSubmenu(null,[
						`Search OTRS for reported user`
					])
					submenuWriter.addActiveEntry(null,[
						makeSearchLink(issueData.reportedItem.name)
					])
					submenuWriter.addActiveEntry(null,[
						makeSearchLink('user '+issueData.reportedItem.name)
					])
				}
				if (issueData.reportedItem?.type=='note') {
					const submenuWriter=menuWriter.addSubmenu(null,[
						`Search OTRS for reported note`
					])
					submenuWriter.addActiveEntry(null,[
						makeSearchLink(issueData.reportedItem.id,numberNote)
					])
					submenuWriter.addActiveEntry(null,[
						makeSearchLink('note '+issueData.reportedItem.id)
					])
				}
				function makeSearchLink(query,note) {
					const $a=makeLink(`${settings.otrs}otrs/index.pl?Action=AgentTicketSearch&Subaction=Search&Fulltext=${encodeURIComponent(query)}`)
					$a.innerText=query
					if (note!=null) {
						const $note=document.createElement('span')
						$note.innerText='(?)'
						$note.title=note
						$a.append(' ',$note)
					}
					return $a
				}
			}
		}
		if (settings.osm) {
			if (tabState.type=='ticket' && tabState.issueData) {
				const issueData=tabState.issueData
				if (issueData.id!=null) {
					menuWriter.addActiveEntry(null,[
						makeLink(issueData.url,`Go to ticket issue #${issueData.id}`)
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
						return makeLink(
							`${settings.osm}messages/${mailbox}`,
							'as '+addAs,
							()=>sendMessage({
								action:'initiateNewTabAction',
								tabAction:['GoToLastMessageThenAddMessageToTicket',tabId,ticketData.id,addAs,mailbox]
							})
						)
					}
				}
			}
		}
		if (settings.osm) {
			if (tabState.type=='user' && tabState.userData.id!=null) {
				menuWriter.addActiveEntry(null,[
					makeLink(tabState.userData.apiUrl,`Check user id #${tabState.userData.id}`)
				])
			}
		}
		{
			if (tabState.type=='issue' && tabState.issueData?.reports && tabState.issueData.reports.length>0) {
				const text=tabState.issueData.reports.map(report=>report.text).join('\n\n---\n\n') // TODO remove tags?
				const googleTranslateUrl=`https://translate.google.com/?sl=auto&tl=en&op=translate&text=`+encodeURIComponent(text)
				menuWriter.addActiveEntry(null,[
					makeLink(googleTranslateUrl,'translate issue text')
				])
			}
		}
	},($menu,settings,permissions,tabId,tabState,otherTabId,otherTabState)=>{ // this+other tab actions
		const makeLink=makeMakeLink(tabId)
		const menuWriter=new MenuWriter(document,$menu)
		if (permissions.otrs && permissions.osm) {
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
				// 		makeLink(createTicketUrl,text+` + scan user id`,()=>sendMessage({
				// 			action:'initiateNewTabAction',
				// 			tabAction:['ScrapeReportedItemThenCreateIssueTicket',tabId,issueData]
				// 		}))
				// 	])
				// }
				const submenuWriter=menuWriter.addSubmenu(null,[
					`Add to new ticket form`
				])
				submenuWriter.addActiveEntry(null,[
					makeLink(createTicketUrl,text,()=>sendMessage({
						action:'initiateImmediateCurrentTabAction',
						tabAction:['AddToCreateIssueTicket',otherTabId,issueData],
						tabId,
						otherTabId
					}))
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
					return makeAddToOtrsLink(addAs,ticketData.id,{
						action:'initiateCurrentTabAction',
						tabAction:['AddSelectedReportsAndCommentsToTicket',ticketData.id,addAs,issueData,otherTabId],
						tabId
					})
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
					return makeAddToOtrsLink(addAs,ticketData.id,{
						action:'initiateCurrentTabAction',
						tabAction:['AddMessageToTicket',ticketData.id,addAs,messageData],
						tabId
					})
				}
			}
		}
		if (permissions.otrs) {
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
					return makeAddToOtrsLink(addAs,ticketData.id,{
						action:'initiateCurrentTabAction',
						tabAction:['AddBlockToTicket',ticketData.id,addAs,blockData],
						tabId
					})
				}
			}
		}
		if (permissions.osm) {
			if (tabState.type=='message-add' && otherTabState.type=='issue') {
				const userData=tabState.userData
				const issueData=otherTabState.issueData
				if (userData.name) {
					const userReportCountsMap=getUserReportCountsMap(issueData)
					if (userReportCountsMap.has(userData.name)) {
						const submenuWriter=menuWriter.addSubmenu(null,[
							`Add to quick message to user ${userData.name}`
						])
						submenuWriter.addActiveEntry(null,[
							makeLink('#',userData.name,()=>sendMessage({
								action:'initiateImmediateCurrentTabAction',
								tabAction:['AddToSendMessageFromIssueReports',otherTabId,issueData,userData.name],
								tabId,
								otherTabId
							})),
							` - ${formatUserReportCounts(userReportCountsMap.get(userData.name))} selected`
						])
						const nOtherUsers=userReportCountsMap.size-1
						if (nOtherUsers>0) {
							submenuWriter.addPassiveEntry(null,[
								`won't add selected reports from ${nOtherUsers} other ${plural(`user`,nOtherUsers)}`
							])
						}
					}
				}
			}
		}
		function makeAddToOtrsLink(addAs,ticketId,message) {
			let otrsAction='AgentTicketNote'
			if (addAs=='pending') otrsAction='AgentTicketPending'
			return makeLink(
				`${settings.otrs}otrs/index.pl?Action=${otrsAction};TicketID=${encodeURIComponent(ticketId)}`,
				'as '+addAs,
				()=>sendMessage(message)
			)
		}
	}]
}

function getUserReportCountsMap(issueData) {
	const userReportCountsMap=new Map()
	if (issueData.reports) {
		for (const report of issueData.reports) {
			if (!report.selected) continue
			const userName=report.by
			if (userName==null) continue
			let userReportCounts={read:0, unread:0}
			if (userReportCountsMap.has(userName)) {
				userReportCounts=userReportCountsMap.get(userName)
			} else {
				userReportCountsMap.set(userName,userReportCounts)
			}
			if (report.wasRead) {
				userReportCounts.read++
			} else {
				userReportCounts.unread++
			}
		}
	}
	return userReportCountsMap
}

function formatUserReportCounts(userReportCounts) {
	const counts=[]
	if (userReportCounts.unread>0) counts.push(`${userReportCounts.unread} new`)
	if (userReportCounts.read>0) counts.push(`${userReportCounts.read} read`)
	const totalUserReportCount=userReportCounts.unread+userReportCounts.read
	return counts.join(` and `)+` `+plural(`report`,totalUserReportCount)
}

function plural(w,n) {
	return w+(n>1?'s':'')
}
