const background=await browser.runtime.getBackgroundPage()

document.getElementById('settings-load').addEventListener('change',readSettingsFile)
document.getElementById('settings-sample').addEventListener('click',downloadSettingsFile)

const scheduleUpdatePanelActionsNew=setupUpdateScheduler(updatePanelActionsNew,async(settings,tabId,tabState)=>{
	const [currentTab]=await browser.tabs.query({active:true,currentWindow:true})
	return (currentTab.id==tabId)
})
const scheduleUpdatePanelActionsOngoing=setupUpdateScheduler(updatePanelActionsOngoing)

browser.runtime.onMessage.addListener(message=>{
	if (message.action=='updatePanelActionsNew') {
		return scheduleUpdatePanelActionsNew(message.settings,message.tabId,message.tabState)
	} else if (message.action=='updatePanelActionsOngoing') {
		return scheduleUpdatePanelActionsOngoing(message.tabActionListItems)
	}
	return false
})

{
	const [currentTab]=await browser.tabs.query({active:true,currentWindow:true})
	background.registerNewPanel(currentTab)
}

////

function readSettingsFile() {
	const [file]=this.files
	const reader=new FileReader()
	reader.addEventListener('load',()=>{
		background.updateSettings(reader.result)
	})
	reader.readAsText(file)
}

function downloadSettingsFile() {
	const blob=new Blob([background.defaultSettingsText],{type:'text/plain'})
	const url=URL.createObjectURL(blob)
	browser.downloads.download({url,filename:'osm-dwg-helper-settings.txt',saveAs:true})
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

function updatePanelActionsNew(settings,tabId,tabState) {
	const $actions=document.getElementById('actions-new')
	$actions.innerHTML=""
	if (settings.otrs==null) {
		$actions.innerHTML="<p>Please load a settings file</p>"
		return
	}
	if (settings.osm!=null) {
		addAction(makeLink(`${settings.osm}issues?status=open`,"Go to open OSM issues"))
	}
	if (settings.otrs!=null) {
		addAction(makeLink(settings.otrs,"Go to OTRS"))
	}
	if (settings.otrs!=null) {
		const $createTicket=makeLink(`${settings.otrs}otrs/index.pl?Action=AgentTicketPhone`)
		let ticketType="empty"
		let issueData
		if (settings.osm==null) {
			ticketType+=" <span title='can only create empty ticket because osm key is not set'>(?)</span>"
		} else {
			if (tabState.type=='issue') {
				issueData=tabState.issueData
				ticketType=`issue #${issueData.id}`
				if (issueData.reportedItem) {
					ticketType+=` - ${issueData.reportedItem.type} ${issueData.reportedItem.ref}`
				}
			}
		}
		$createTicket.innerHTML="Create ticket - "+ticketType
		if (issueData) {
			$createTicket.addEventListener('click',(ev)=>{
				ev.preventDefault()
				background.initiateNewTabAction(
					issueData.reportedItem.url,
					new background.TabActions.ScrapeReportedItemThenCreateIssueTicket(tabId,issueData)
				)
			})
		}
		addAction($createTicket)
	}
	if (settings.otrs!=null) {
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
	if (settings.osm!=null) {
		if (tabState.type=='ticket' && tabState.issueData) {
			const issueData=tabState.issueData
			addAction(makeLink(issueData.url,`Go to ticket issue #${issueData.id}`))
		}
	}
	if (settings.otrs!=null && settings.osm!=null) {
		if (tabState.type=='ticket') {
			for (const mailbox of ['outbox','inbox']) {
				const addSubAction=addSubmenu(`Add last ${mailbox} message to ticket`)
				addSubAction(makeMessageLink('note'))
				addSubAction(makeMessageLink('pending'))
				function makeMessageLink(addAs) {
					const outboxHref=`${settings.osm}messages/${mailbox}`
					const $a=makeLink(outboxHref,'as '+addAs)
					$a.addEventListener('click',(ev)=>{
						ev.preventDefault()
						background.initiateNewTabAction(
							outboxHref,
							new background.TabActions.GoToLastMessageThenAddMessageToTicket(tabId,mailbox,addAs)
						)
					})
					return $a
				}
			}
		}
	}
	if (settings.osm!=null) {
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
	function makeLink(href,text) {
		const $a=document.createElement('a')
		$a.href=href
		if (text!=null) $a.innerText=text
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
