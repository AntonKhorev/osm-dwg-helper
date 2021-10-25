window.defaultSettingsText=`otrs = https://otrs.openstreetmap.org/
osm = https://www.openstreetmap.org/
ticket_customer = \${user.name} <fwd@dwgmail.info>
ticket_subject = Issue #\${issue.id}
ticket_subject_user = Issue #\${issue.id} (User "\${user.name}")
ticket_subject_note = Issue #\${issue.id} (Note #\${note.id})
ticket_body_header = <h1><a href='\${issue.url}'>Issue #\${issue.id}</a></h1>
ticket_body_item = <p>Reported item : <a href='\${item.url}'>osm link</a></p>
ticket_body_item_user = <p>User : <a href='\${user.url}'>\${user.name}</a></p>
ticket_body_item_note = <p>Note : <a href='\${note.url}'>Note #\${note.id}</a></p>
`

let settings=parseSettingsText(defaultSettingsText)

const tabStates=new Map()
const tabActions=new Map()

window.updateSettings=async(text)=>{
	if (tabActions.size>0) {
		tabActions.clear()
		reactToActionsUpdate()
	}
	tabStates.clear()
	settings=parseSettingsText(text)
	const activeTabs=await browser.tabs.query({active:true})
	for (const tab of activeTabs) {
		updateTabState(tab)
	}
}

window.registerNewPanel=(tab)=>{
	updateTabState(tab,true)
	reactToActionsUpdate()
}

window.addTabAction=(tabId,tabAction)=>{
	tabActions.set(tabId,tabAction)
	reactToActionsUpdate()
}

window.removeTabAction=(tabId)=>{
	if (tabActions.has(tabId)) {
		tabActions.delete(tabId)
		reactToActionsUpdate()
	}
}

function parseSettingsText(text) {
	const settings={}
	for (const line of text.split('\n')) {
		let match
		if (match=line.match(/^\s*([a-z_]+)\s*=\s*(.*)$/)) {
			const [,key,value]=match
			settings[key]=value
		}
	}
	return settings
}

function reactToActionsUpdate() {
	browser.runtime.sendMessage({action:'updatePanelActionsOngoing',tabActions})
}

browser.tabs.onRemoved.addListener((tabId)=>{
	tabStates.delete(tabId) // TODO what if onUpdated runs after onRemoved?
	if (tabActions.has(tabId)) {
		tabActions.delete(tabId)
		reactToActionsUpdate()
	}
})

browser.tabs.onActivated.addListener(async({tabId})=>{
	const tabState=tabStates.get(tabId)
	if (tabState) {
		browser.runtime.sendMessage({
			action:'updatePanelActionsNew',
			settings,tabId,tabState
		})
	} else {
		const tab=await browser.tabs.get(tabId)
		updateTabState(tab,true)
	}
})

browser.tabs.onUpdated.addListener(async(tabId,changeInfo,tab)=>{
	await updateTabState(tab)
	const tabAction=tabActions.get(tabId)
	if (tabAction && tabAction.type=='createIssueTicket' && tab.status=='complete') {
		// TODO check if url matches, if not cancel action
		try {
			tabActions.delete(tabId) // remove pending action before await
			await addListenerAndSendMessage(tabId,'/content-create-ticket.js',{action:'addIssueDataToTicket',ticketData:tabAction.ticketData})
		} catch {
			tabActions.set(tabId,tabAction)
		}
		if (!tabActions.has(tabId)) {
			// TODO reschedule get ticket id/url
			reactToActionsUpdate()
		}
	}
})

async function updateTabState(tab,forcePanelUpdate=false) {
	if (tabStates.get(tab.id)==null) {
		tabStates.set(tab.id,{})
	}
	const tabState=await getTabState(tab)
	const tabStateChanged=!isTabStateEqual(tabStates.get(tab.id),tabState)
	if (tabStateChanged) tabStates.set(tab.id,tabState)
	if (forcePanelUpdate || tabStateChanged && tab.active) browser.runtime.sendMessage({
		action:'updatePanelActionsNew',
		settings,tabId:tab.id,tabState
	})
}

function isTabStateEqual(data1,data2) {
	if (data1.type!=data2.type) return false
	if (data1.type=='issue') {
		if (data1.issueData.id!=data2.issueData.id) return false
		// TODO compare other stuff
	}
	if (data1.type=='ticket') {
		if (data1.issueData.id!=data2.issueData.id) return false
		// TODO compare other stuff
	}
	return true
}

async function getTabState(tab) {
	const tabState={}
	if (settings.osm!=null) {
		const issueId=getOsmIssueIdFromUrl(settings.osm,tab.url)
		if (issueId!=null) {
			tabState.type='issue'
			tabState.issueData={
				osmRoot:settings.osm,
				id:issueId,
				url:tab.url
			}
			const contentIssueData=await addListenerAndSendMessage(tab.id,'/content-issue.js',{action:'getIssueData'})
			if (contentIssueData) Object.assign(tabState.issueData,contentIssueData)
		}
	}
	if (settings.osm!=null && settings.otrs!=null) {
		if (isOtrsTicketUrl(settings.otrs,tab.url)) {
			tabState.type='ticket'
			const contentIssueId=await addListenerAndSendMessage(tab.id,'/content-ticket.js',{action:'getIssueId'})
			if (contentIssueId!=null) {
				tabState.issueData={
					osmRoot:settings.osm,
					id:contentIssueId,
					url:`${settings.osm}issues/${encodeURIComponent(contentIssueId)}`
				}
			}
		}
	}
	return tabState
}

async function addListenerAndSendMessage(tabId,contentScript,message) {
	await browser.tabs.executeScript(tabId,{file:contentScript})
	return await browser.tabs.sendMessage(tabId,message)
}

function getOsmIssueIdFromUrl(osmRoot,url) {
	const match=url.match(new RegExp('^'+escapeRegex(osmRoot)+'issues/([0-9]+)'))
	if (match) {
		const [,issueId]=match
		return issueId
	}
}

function isOtrsTicketUrl(otrsRoot,url) {
	const match=url.match(new RegExp('^'+escapeRegex(otrsRoot+'otrs/index.pl?Action=AgentTicketZoom;')))
	return !!match
}

function escapeRegex(string) { // https://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript/3561711
	return string.replace(/[-\/\\^$*+?.()|[\]{}]/g,'\\$&')
}
