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
		return scheduleUpdatePanelActionsOngoing(message.tabActions)
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
		const $goToIssues=makeLink(`${settings.osm}issues?status=open`)
		$goToIssues.innerText="Go to open OSM issues"
		addAction($goToIssues)
	}
	if (settings.otrs!=null) {
		const $goToTickets=makeLink(settings.otrs)
		$goToTickets.innerText="Go to OTRS"
		addAction($goToTickets)
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
				browser.tabs.create({
					openerTabId:tabId,
					url:issueData.reportedItem.url
				}).then((reportedItemTab)=>{
					background.addTabAction(reportedItemTab.id,{
						type:'scrapeReportedItemThenCreateIssueTicket',
						issueData,
						openerTabId:tabId
					})
				})
			})
		}
		addAction($createTicket)
	}
	if (settings.otrs!=null) {
		if (tabState.type=='issue') {
			const issueData=tabState.issueData
			if (issueData.id!=null) {
				const $search=makeSearchLink(issueData.id)
				$search.innerText=`Search OTRS for issue id "${issueData.id}"`
				addAction($search)
			}
			if (issueData.reportedItem?.type=='user') {
				const $search=makeSearchLink(issueData.reportedItem.name)
				$search.innerText=`Search OTRS for reported user "${issueData.reportedItem.name}"`
				addAction($search)
			}
			if (issueData.reportedItem?.type=='note') {
				const $search=makeSearchLink(issueData.reportedItem.id)
				$search.innerText=`Search OTRS for reported note id "${issueData.reportedItem.id}"`
				addAction($search)
			}
			function makeSearchLink(query) {
				return makeLink(`${settings.otrs}otrs/index.pl?Action=AgentTicketSearch&Subaction=Search&Fulltext=${encodeURIComponent(query)}`)
			}
		}
	}
	if (settings.osm!=null) {
		if (tabState.type=='ticket' && tabState.issueData) {
			const issueData=tabState.issueData
			const $goToIssue=makeLink(issueData.url)
			$goToIssue.innerText=`Go to ticket issue #${issueData.id}`
			addAction($goToIssue)
		}
	}
	if (settings.osm!=null) {
		if (tabState.type=='user' && tabState.userData.id!=null) {
			const $a=makeLink(tabState.userData.apiUrl)
			$a.innerText=`Check user id #${tabState.userData.id}`
			addAction($a)
		}
	}
	function makeLink(href) {
		const $a=document.createElement('a')
		$a.href=href
		return $a
	}
	function addAction($action) {
		const $li=document.createElement('li')
		$li.append($action)
		$actions.append($li)
	}
}

function updatePanelActionsOngoing(actions) {
	const $actions=document.getElementById('actions-ongoing')
	$actions.innerHTML=""
	for (const [tabId,action] of actions) {
		const $li=document.createElement('li')
		if (action.type=='scrapeReportedItemThenCreateIssueTicket') {
			$li.innerHTML=`scrape reported item then create ticket `
		} else if (action.type=='createIssueTicket') {
			$li.innerHTML=`create ticket <em>${escapeHtml(action.ticketData.Subject)}</em> `
		} else if (action.type=='commentIssue') {
			$li.innerHTML=`add comment to issue for created ticket `
		} else {
			$li.innerText='unknown action '
		}
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

// copypasted
// TODO proper module
function escapeHtml(string) {
	return string
	.replace(/&/g,"&amp;")
	.replace(/</g,"&lt;")
	.replace(/>/g,"&gt;")
	.replace(/"/g,"&quot;")
	.replace(/'/g,"&#039;")
}
