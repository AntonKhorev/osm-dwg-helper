import * as Actions from './actions.js'
import * as templateEngine from './template-engine.js'

const background=await browser.runtime.getBackgroundPage()

const scheduleUpdateActionsNew=setupUpdateScheduler(updateActionsNew,updateActionsNewFilter)
const scheduleUpdateActionsOngoing=setupUpdateScheduler(updateActionsOngoing)
const scheduleUpdatePermissions=setupUpdateScheduler(updatePermissions)

browser.runtime.onMessage.addListener(message=>{
	if (message.action=='updatePermissions') {
		return scheduleUpdatePermissions(message.missingOrigins)
	} else if (message.action=='updateActionsNew') {
		return scheduleUpdateActionsNew(
			message.settings,message.permissions,
			message.tabIds,message.otherTabId,
			message.tabStates
		)
	} else if (message.action=='updateActionsOngoing') {
		return scheduleUpdateActionsOngoing(message.tabActionEntries)
	}
	return false
})

{
	const [currentTab]=await browser.tabs.query({active:true,currentWindow:true})
	background.registerNewPanel(currentTab)
}

function setupUpdateScheduler(handlerFn,filterFn) {
	let updateTimeoutId
	return async(...args)=>{
		if (filterFn) {
			args=await filterFn(...args)
			if (!args) return
		}
		if (updateTimeoutId!=null) clearTimeout(updateTimeoutId)
		updateTimeoutId=setTimeout(()=>{
			updateTimeoutId=undefined
			handlerFn(...args)
		},100)
	}
}

function updatePermissions(missingOrigins) {
	const $permissions=document.getElementById('permissions')
	const $permissionsWarning=document.getElementById('permissions-warning')
	$permissions.innerHTML=""
	if ($permissionsWarning) $permissionsWarning.innerHTML=""
	if (missingOrigins.length<=0) return
	const $button=document.createElement('button') // TODO doesn't work in sidebar - https://bugzilla.mozilla.org/show_bug.cgi?id=1493396 - fix somehow
	$button.innerText="Grant access to OSM/OTRS webpages"
	$button.addEventListener('click',()=>{
		browser.permissions.request({
			origins:missingOrigins
		}).then(granted=>{
			if (granted) background.reportPermissionsUpdate()
		})
	})
	$permissions.append($button)
	if (!$permissionsWarning) return
	const bugHref='https://bugzilla.mozilla.org/show_bug.cgi?id=1493396'
	const $p=document.createElement('p')
	$p.append(
		"Note that the button above won't work in Firefox until ",
		makeLink(bugHref,"this bug",()=>browser.tabs.create({url:bugHref})),
		" is fixed. Please press this button in a ",
		makeLink('#',"popup window",()=>browser.browserAction.openPopup()),
		" or in ",
		makeLink('#',"the extension's options page",()=>browser.runtime.openOptionsPage()),
		"."
	)
	$permissionsWarning.append($p)
	function makeLink(href,text,handler) {
		const $a=document.createElement('a')
		$a.innerText=text
		$a.href=href
		$a.addEventListener('click',ev=>{
			ev.preventDefault()
			handler()
		})
		return $a
	}
}

/**
 * @param tabIds {Array<number>}
 */
async function updateActionsNewFilter(settings,permissions,tabIds,otherTabId,tabStates) {
	const [currentTab]=await browser.tabs.query({active:true,currentWindow:true})
	if (!tabIds.includes(currentTab.id)) return
	return [
		settings,permissions,
		currentTab.id,tabStates[currentTab.id],
		otherTabId,tabStates[otherTabId]??{}
	]
}

function updateActionsNew(settings,permissions,tabId,tabState,otherTabId,otherTabState) {
	const $actions=document.getElementById('actions-new')
	$actions.innerHTML=""
	if (settings.osm) {
		addAction(makeLink(`${settings.osm}issues?status=open`,"Go to open OSM issues"))
	}
	if (settings.otrs) {
		addAction(makeLink(settings.otrs,"Go to OTRS"))
	}
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
				addSubAction(makeLink(createTicketUrl,text+` + scan user id`,()=>background.initiateNewTabAction(
					new Actions.ScrapeReportedItemThenCreateIssueTicket(tabId,issueData)
				)))
			}
			addSubAction(makeLink(createTicketUrl,text,()=>background.initiateNewTabAction(
				new Actions.CreateIssueTicket(tabId,issueData)
			)))
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
		if (tabState.type=='ticket' && otherTabState.type=='message') {
			const messageData=otherTabState.messageData
			const ticketData=tabState.ticketData
			const addSubAction=addSubmenu(`Add message ${messageData.isInbound?'from':'to'} ${messageData.user} to ticket`)
			addSubAction(makeMessageLink('note'))
			addSubAction(makeMessageLink('pending'))
			function makeMessageLink(addAs) {
				const action=new Actions.AddMessageToTicket(ticketData.id,addAs,messageData)
				return makeLink(
					action.getActionUrl(settings),
					'as '+addAs,
					()=>background.initiateCurrentTabAction(action,tabId)
				)
			}
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
					const action=new Actions.GoToLastMessageThenAddMessageToTicket(tabId,ticketData.id,addAs,mailbox)
					return makeLink(
						action.getActionUrl(settings),
						'as '+addAs,
						()=>background.initiateNewTabAction(action)
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
			const text=tabState.issueData.reports.map(report=>report.text.join('\n')).join('\n\n---\n\n')
			const googleTranslateUrl=`https://translate.google.com/?sl=auto&tl=en&op=translate&text=`+encodeURIComponent(text)
			addAction(makeLink(googleTranslateUrl,'translate issue text'))
		}
	}
	function makeLink(href,text,clickHandler=()=>browser.tabs.create({openerTabId:tabId,url:href})) {
		const $a=document.createElement('a')
		$a.href=href
		if (text!=null) $a.innerText=text
		$a.addEventListener('click',ev=>{
			ev.preventDefault()
			clickHandler()
			window.close() // for popup; does nothing on sidebar
		})
		return $a
	}
	function addAction(...$action) {
		const $li=document.createElement('li')
		$li.append(...$action)
		$actions.append($li)
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
}

function updateActionsOngoing(tabActionEntries) {
	const $actions=document.getElementById('actions-ongoing')
	$actions.innerHTML=""
	for (const [tabId,menuEntryElements] of tabActionEntries) {
		const $li=document.createElement('li')
		for (const [text,type] of menuEntryElements) {
			if (type=='em') {
				const $em=document.createElement('em')
				$em.innerText=text
				$li.append($em)
			} else {
				$li.append(text)
			}
		}
		$li.append(' ')
		const $switchButton=document.createElement('button')
		$switchButton.innerText='go to'
		$switchButton.addEventListener('click',()=>{
			browser.tabs.update(tabId,{active:true})
		})
		$li.append($switchButton)
		const $cancelButton=document.createElement('button')
		$cancelButton.innerText='cancel'
		$cancelButton.addEventListener('click',()=>{
			background.removeTabAction(tabId)
		})
		$li.append($cancelButton)
		$actions.append($li)
	}
}
