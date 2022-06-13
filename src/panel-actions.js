import * as templateEngine from './template-engine.js'

/**
 * @returns [global, this tab, this+other tab] actions menu updater functions
 */
export default (document,closeWindow,createTab,sendMessage)=>{
	return [($menu,settings,permissions,tabId)=>{ // global actions
		const [addAction,addSubmenu,makeLink]=enterMenu($menu,tabId)
		if (settings.osm) {
			addAction(makeLink(`${settings.osm}issues?status=open`,"Go to open OSM issues"))
		}
		if (settings.otrs) {
			addAction(makeLink(`${settings.otrs}otrs/index.pl?Action=AgentDashboard`,"Go to OTRS")) // need to link to AgentDashboard, otherwise might end up on Agent/Customer selection screen
		}
	},($menu,settings,permissions,tabId,tabState)=>{ // this tab actions
		const [addAction,addSubmenu,makeLink]=enterMenu($menu,tabId)
		if (permissions.otrs) {
			const createTicketUrl=`${settings.otrs}otrs/index.pl?Action=AgentTicketPhone`
			const addSubAction=addSubmenu(`Create ticket`)
			if (tabState.type=='issue') {
				const issueData=tabState.issueData
				let text=`issue #${issueData.id}`
				if (issueData.reportedItem) {
					text+=` - ${issueData.reportedItem.type} ${issueData.reportedItem.ref}`
				}
				if (issueData.reportedItem?.type=='user') {
					addSubAction(makeLink(createTicketUrl,text+` + scan user id`,()=>sendMessage({
						action:'initiateNewTabAction',
						tabAction:['ScrapeReportedItemThenCreateIssueTicket',tabId,issueData]
					})))
				}
				addSubAction(makeLink(createTicketUrl,text,()=>sendMessage({
					action:'initiateNewTabAction',
					tabAction:['CreateIssueTicket',tabId,issueData]
				})))
			}
			{
				addSubAction(makeLink(createTicketUrl,"empty"))
			}
		}
		if (settings.osm) {
			if (tabState.type=='issue') {
				const issueData=tabState.issueData
				const newUsers=new Set()
				const oldUsers=new Set()
				if (issueData.reports) {
					for (const report of issueData.reports) {
						const userName=report.by
						if (userName==null) continue
						if (report.wasRead) {
							if (!newUsers.has(userName)) {
								oldUsers.add(userName)
							}
						} else {
							oldUsers.delete(userName)
							newUsers.add(userName)
						}
					}
				}
				if (newUsers.size>0 || oldUsers.size>0) {
					const addSubAction=addSubmenu(`Quick message reporting user of issue #${issueData.id}`)
					const subject=getSubject()
					for (const userName of newUsers) {
						const $li=addSubAction(makeLink(getUserMessageUrl(userName,subject),`${userName}`))
						if (newUsers.size==1 && oldUsers.size==0) {
							$li.append(" - the only reporting user")
						} else if (newUsers.size==1) {
							$li.append(" - the only reporting user with unread report")
						}
					}
					for (const userName of oldUsers) {
						const $li=addSubAction(makeLink(getUserMessageUrl(userName,subject),`${userName}`))
						$li.append(" - report was read")
					}
				}
				function getSubject() {
					if (issueData.reportedItem?.type=='user') {
						return templateEngine.evaluate(settings.issue_message_subject_user,{user:issueData.reportedItem})
					} else if (issueData.reportedItem?.type=='note') {
						return templateEngine.evaluate(settings.issue_message_subject_note,{note:issueData.reportedItem})
					} else {
						return templateEngine.evaluate(settings.issue_message_subject,{})
					}
				}
				function getUserMessageUrl(userName,subject) {
					return issueData.osmRoot+'message/new/'+encodeURIComponent(userName)+'?message[title]='+encodeURIComponent(subject)
				}
			}
		}
		if (settings.otrs) {
			if (tabState.type=='issue') {
				const issueData=tabState.issueData
				const numberNote='searching just for a number often yields unrelated results'
				if (issueData.id!=null) {
					const addSubAction=addSubmenu(`Search OTRS for issue`)
					addSubAction(makeSearchLink(issueData.id,numberNote))
					addSubAction(makeSearchLink('issue '+issueData.id))
				}
				if (issueData.reportedItem?.type=='user') {
					const addSubAction=addSubmenu(`Search OTRS for reported user`)
					addSubAction(makeSearchLink(issueData.reportedItem.name))
					addSubAction(makeSearchLink('user '+issueData.reportedItem.name))
				}
				if (issueData.reportedItem?.type=='note') {
					const addSubAction=addSubmenu(`Search OTRS for reported note`)
					addSubAction(makeSearchLink(issueData.reportedItem.id,numberNote))
					addSubAction(makeSearchLink('note '+issueData.reportedItem.id))
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
				if (issueData.id!=null) addAction(makeLink(issueData.url,`Go to ticket issue #${issueData.id}`))
			}
		}
		if (permissions.otrs && permissions.osm) {
			if (tabState.type=='ticket') {
				for (const mailbox of ['outbox','inbox']) {
					const ticketData=tabState.ticketData
					const addSubAction=addSubmenu(`Add last ${mailbox} message to ticket`)
					addSubAction(makeMessageLink('note'))
					addSubAction(makeMessageLink('pending'))
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
				addAction(makeLink(tabState.userData.apiUrl,`Check user id #${tabState.userData.id}`))
			}
		}
		{
			if (tabState.type=='issue' && tabState.issueData?.reports && tabState.issueData.reports.length>0) {
				const text=tabState.issueData.reports.map(report=>report.text).join('\n\n---\n\n') // TODO remove tags?
				const googleTranslateUrl=`https://translate.google.com/?sl=auto&tl=en&op=translate&text=`+encodeURIComponent(text)
				addAction(makeLink(googleTranslateUrl,'translate issue text'))
			}
		}
	},($menu,settings,permissions,tabId,tabState,otherTabId,otherTabState)=>{ // this+other tab actions
		const [addAction,addSubmenu,makeLink]=enterMenu($menu,tabId)
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
					// addSubAction(makeLink(createTicketUrl,text+` + scan user id`,()=>sendMessage({
					// 	action:'initiateNewTabAction',
					// 	tabAction:['ScrapeReportedItemThenCreateIssueTicket',tabId,issueData]
					// })))
				// }
				const addSubAction=addSubmenu(`Add to new ticket form`)
				addSubAction(makeLink(createTicketUrl,text,()=>sendMessage({
					action:'initiateImmediateCurrentTabAction',
					tabAction:['AddToCreateIssueTicket',otherTabId,issueData],
					tabId,
					otherTabId
				})))
			}
			if (tabState.type=='ticket' && otherTabState.type=='issue') {
				const issueData=otherTabState.issueData
				const ticketData=tabState.ticketData
				if (hasUnreadReports()) {
					const addSubAction=addSubmenu(`Add unread reports from issue #${issueData.id} to ticket`)
					addSubAction(makeIssueLink('note'))
					addSubAction(makeIssueLink('pending'))
				}
				function hasUnreadReports() {
					if (issueData.id==null) return false
					if (issueData.reports==null) return false
					for (const report of issueData.reports) {
						if (!report.wasRead) return true
					}
					return false
				}
				function makeIssueLink(addAs) {
					return makeAddToOtrsLink(addAs,ticketData.id,{
						action:'initiateCurrentTabAction',
						tabAction:['AddUnreadReportsToTicket',ticketData.id,addAs,issueData,otherTabId],
						tabId
					})
				}
			}
			if (tabState.type=='ticket' && otherTabState.type=='message') {
				const messageData=otherTabState.messageData
				const ticketData=tabState.ticketData
				const addSubAction=addSubmenu(`Add message ${messageData.isInbound?'from':'to'} ${messageData.user} to ticket`)
				addSubAction(makeMessageLink('note'))
				addSubAction(makeMessageLink('pending'))
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
				const addSubAction=addSubmenu(`Add user ${blockData.user} block record to ticket`)
				addSubAction(makeBlockLink('note'))
				const $explanation=document.createElement('span')
				$explanation.textContent=`won't fully work`
				$explanation.title=`Normally, DWG Action field is updated to have "block issued" action added. This field is not present in the "pending" form and thus can't be changed in this manner. The "pending" menu entry is removed to avoid unexpectedly leaving out "block issued" actions.`
				addSubAction(`"as pending" `,$explanation)
				function makeBlockLink(addAs) {
					return makeAddToOtrsLink(addAs,ticketData.id,{
						action:'initiateCurrentTabAction',
						tabAction:['AddBlockToTicket',ticketData.id,addAs,blockData],
						tabId
					})
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

	function enterMenu($menu,tabId) {
		return [addAction,addSubmenu,makeLink]
		function addAction(...$action) {
			const $li=document.createElement('li')
			$li.append(...$action)
			$menu.append($li)
			return $li
		}
		function addSubmenu(name) {
			const $span=document.createElement('span')
			$span.innerText=name
			const $subactions=document.createElement('ul')
			addAction($span,$subactions)
			const addSubAction=(...$subaction)=>{
				const $li=document.createElement('li')
				$li.append(...$subaction)
				$subactions.append($li)
				return $li
			}
			return addSubAction
		}
		function makeLink(href,text,clickHandler=()=>createTab({openerTabId:tabId,url:href})) {
			const $a=document.createElement('a')
			$a.href=href
			if (text!=null) $a.innerText=text
			$a.addEventListener('click',ev=>{
				ev.preventDefault()
				clickHandler()
				closeWindow() // for popup; does nothing on sidebar
			})
			return $a
		}
	}
}
