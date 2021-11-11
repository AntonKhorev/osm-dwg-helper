const background=await browser.runtime.getBackgroundPage()

const scheduleUpdatePanelActionsNew=setupUpdateScheduler(updatePanelActionsNew,async(settings,permissions,tabId,tabState)=>{
	const [currentTab]=await browser.tabs.query({active:true,currentWindow:true})
	return (currentTab.id==tabId)
})
const scheduleUpdatePanelActionsOngoing=setupUpdateScheduler(updatePanelActionsOngoing)
const scheduleUpdatePanelPermissions=setupUpdateScheduler(updatePanelPermissions)

browser.runtime.onMessage.addListener(message=>{
	if (message.action=='updatePanelPermissions') {
		return scheduleUpdatePanelPermissions(message.missingOrigins)
	} else if (message.action=='updatePanelActionsNew') {
		return scheduleUpdatePanelActionsNew(message.settings,message.permissions,message.tabId,message.tabState)
	} else if (message.action=='updatePanelActionsOngoing') {
		return scheduleUpdatePanelActionsOngoing(message.tabActionListItems)
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
		if (filterFn && !await filterFn(...args)) return
		if (updateTimeoutId!=null) clearTimeout(updateTimeoutId)
		updateTimeoutId=setTimeout(()=>{
			updateTimeoutId=undefined
			handlerFn(...args)
		},100)
	}
}

function updatePanelPermissions(missingOrigins) {
	const $permissions=document.getElementById('permissions')
	const $permissionsWarning=document.getElementById('permissions-warning')
	$permissions.innerHTML=""
	if ($permissionsWarning) $permissionsWarning.innerHTML=""
	if (missingOrigins.length<=0) return
	const $button=document.createElement('button') // TODO doesn't work in sidebar - https://bugzilla.mozilla.org/show_bug.cgi?id=1493396 - fix somehow
	$button.innerText="Grant permissions to access OSM/OTRS webpages"
	$button.addEventListener('click',()=>{
		browser.permissions.request({
			origins:missingOrigins
		}).then(granted=>{
			if (granted) background.reportPermissionsUpdate()
		})
	})
	$permissions.append($button)
	if (!$permissionsWarning) return
	const $p=document.createElement('p')
	$p.append("Note that the button above won't work in Firefox until ")
	const $aBug=document.createElement('a')
	$aBug.innerText="this bug"
	$aBug.href='https://bugzilla.mozilla.org/show_bug.cgi?id=1493396'
	$aBug.addEventListener('click',ev=>{
		ev.preventDefault()
		browser.tabs.create({url:$aBug.href})
	})
	$p.append($aBug)
	$p.append(" is fixed. Please press this button in a popup window or in ")
	const $aOptions=document.createElement('a')
	$aOptions.innerText="the extension's options page"
	$aOptions.href='#'
	$aOptions.addEventListener('click',ev=>{
		ev.preventDefault()
		browser.runtime.openOptionsPage()
	})
	$p.append($aOptions)
	$p.append(".")
	$permissionsWarning.append($p)
}

function updatePanelActionsNew(settings,permissions,tabId,tabState) {
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
		{
			addSubAction(makeLink(createTicketUrl,"empty"))
		}
		if (tabState.type=='issue') {
			const issueData=tabState.issueData
			let text=`issue #${issueData.id}`
			if (issueData.reportedItem) {
				text+=` - ${issueData.reportedItem.type} ${issueData.reportedItem.ref}`
			}
			addSubAction(makeLink(createTicketUrl,text,()=>background.initiateNewTabAction(
				issueData.reportedItem.url,
				new background.TabActions.ScrapeReportedItemThenCreateIssueTicket(tabId,issueData)
			)))
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
				const addSubAction=addSubmenu(`Add last ${mailbox} message to ticket`)
				addSubAction(makeMessageLink('note'))
				addSubAction(makeMessageLink('pending'))
				function makeMessageLink(addAs) {
					const outboxHref=`${settings.osm}messages/${mailbox}`
					return makeLink(outboxHref,'as '+addAs,()=>background.initiateNewTabAction(
						outboxHref,
						new background.TabActions.GoToLastMessageThenAddMessageToTicket(tabId,mailbox,addAs)
					))
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
		}
		return addSubAction
	}
}

function updatePanelActionsOngoing(tabActionListItems) {
	const $actions=document.getElementById('actions-ongoing')
	$actions.innerHTML=""
	for (const [tabId,actionPanelHtml] of tabActionListItems) {
		const $li=document.createElement('li')
		$li.innerHTML=actionPanelHtml+' '
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
