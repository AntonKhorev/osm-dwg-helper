const buildScriptChromePatch=false

import SettingsManager from './settings-manager.js'
import * as TabActions from './tab-actions.js'

const tabStates=new Map()
const tabActions=new Map()

window.settingsManager=new SettingsManager([
	"Main settings",
	['otrs','https://otrs.openstreetmap.org/',"OTRS root URL",{type:'url',state:true,origin:true}],
	['osm','https://www.openstreetmap.org/',"OpenStreetMap root URL",{type:'url',state:true,origin:true}],
	['osm_api','https://api.openstreetmap.org/',"OpenStreetMap API root URL",{type:'url',state:true,note:"to make a link to user id"}],
	"OTRS ticket creation from OSM issues",
	['ticket_customer',`\${user.name} <fwd@dwgmail.info>`,"Customer template",{note:"usually needs to be email-like for OTRS not to complain"}],
	['ticket_subject',`Issue #\${issue.id}`,"Subject template when reported item is unknown"],
	['ticket_subject_user',`Issue #\${issue.id} (User "\${user.name}")`,"Subject template when reported item is user with unknown id"],
	['ticket_subject_user_id',`Issue #\${issue.id} (User "\${user.name}")`,"Subject template when reported item is user with known id"],
	['ticket_subject_note',`Issue #\${issue.id} (Note #\${note.id})`,"Subject template when reported item is note"],
	// TODO textareas for html templates, also need to alter textfile format
	['ticket_body_header',`<h1><a href='\${issue.url}'>Issue #\${issue.id}</a></h1>`,"Body header template",{note:"HTML"}],
	['ticket_body_item',`<p>Reported item : <a href='\${item.url}'>osm link</a></p>`,"Body reported item template when it's unknown",{note:"HTML"}],
	['ticket_body_item_user',`<p>User : <a href='\${user.url}'>\${user.name}</a></p>`,"Body reported item template when it's user with unknown id",{note:"HTML"}],
	['ticket_body_item_user_id',`<p>User : <a href='\${user.url}'>\${user.name}</a> , <a href='\${user.apiUrl}'>#\${user.id}</a></p>`,"Body reported item template when it's user with known id",{note:"HTML"}],
	['ticket_body_item_note',`<p>Note : <a href='\${note.url}'>Note #\${note.id}</a></p>`,"Body reported item template when it's note",{note:"HTML"}],
	"Addition of OSM messages to OTRS tickets",
	['article_message_to_subject',`PM to \${user.name}`,"Subject template for outbound message"],
	['article_message_from_subject',`PM from \${user.name}`,"Subject template for inbound message"],
])

window.TabActions=TabActions

window.reportNeedToDropActions=()=>{
	if (tabActions.size>0) {
		tabActions.clear()
		reactToActionsUpdate()
	}
}

window.reportPermissionsUpdate=async()=>{
	await sendUpdatePanelPermissionsMessage()
	await reportStatesUpdate() // permissions update implies states update
}

window.reportStatesUpdate=async()=>{
	tabStates.clear()
	const activeTabs=await browser.tabs.query({active:true})
	for (const tab of activeTabs) {
		updateTabState(tab)
	}
}

window.registerNewPanel=(tab)=>{
	sendUpdatePanelPermissionsMessage() // TODO limit the update to this tab
	updateTabState(tab,true)
	reactToActionsUpdate()
}

window.initiateNewTabAction=async(tabAction)=>{
	const newTab=await browser.tabs.create({
		openerTabId:tabAction.openerTabId,
		url:tabAction.getActionUrl(await settingsManager.read())
	})
	tabActions.set(newTab.id,tabAction)
	reactToActionsUpdate()
}

window.removeTabAction=(tabId)=>{
	if (tabActions.has(tabId)) {
		tabActions.delete(tabId)
		reactToActionsUpdate()
	}
}

function reactToActionsUpdate() {
	const tabActionListItems=[]
	for (const [tabId,action] of tabActions) {
		tabActionListItems.push([tabId,action.getOngoingActionMenuEntry()])
	}
	browser.runtime.sendMessage({action:'updatePanelActionsOngoing',tabActionListItems})
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
		sendUpdatePanelActionsMessage(tabId,tabState)
	} else {
		const tab=await browser.tabs.get(tabId)
		updateTabState(tab,true)
	}
})

browser.tabs.onUpdated.addListener(async(tabId,changeInfo,tab)=>{
	if (tab.url=='about:blank') return // bail on about:blank, when opening new tabs it gets complete status before supplied url is opened
	const tabState=await updateTabState(tab)
	const tabAction=tabActions.get(tabId)
	if (tabAction && (
		changeInfo.status=='complete' || // just loaded
		changeInfo.attention!=null && tab.status=='complete' // switched to already loaded
	)) {
		// TODO check if url matches, if not cancel action
		tabActions.delete(tabId)
		const settings=await settingsManager.read()
		const tabActionsUpdate=await tabAction.act(settings,tab,tabState,addListenerAndSendMessage)
		if (tabActionsUpdate) {
			const [newActionTabId,newAction]=tabActionsUpdate
			tabActions.set(newActionTabId,newAction)
			if (newActionTabId==tabId && newAction==tabAction) {
				return
			}
			const update={}
			if (newActionTabId!=tabId) {
				browser.tabs.remove(tabId)
				update.active=true
			}
			if (newAction) {
				const url=newAction.getActionUrl(settings)
				if (url!=null) update.url=url
			}
			if (Object.keys(update).length>0) {
				browser.tabs.update(newActionTabId,update)
			}
		}
		reactToActionsUpdate()
	}
})

async function updateTabState(tab,forcePanelUpdate=false) {
	if (tabStates.get(tab.id)==null) {
		tabStates.set(tab.id,{})
	}
	const tabState=await getTabState(tab)
	const tabStateChanged=!isTabStateEqual(tabStates.get(tab.id),tabState)
	if (tabStateChanged) tabStates.set(tab.id,tabState)
	if (forcePanelUpdate || tabStateChanged && tab.active) sendUpdatePanelActionsMessage(tab.id,tabState)
	return tabState
}

async function sendUpdatePanelActionsMessage(tabId,tabState) {
	const [settings,permissions]=await settingsManager.readSettingsAndPermissions()
	browser.runtime.sendMessage({
		action:'updatePanelActionsNew',
		settings,permissions,
		tabId,tabState
	})
}

async function sendUpdatePanelPermissionsMessage() { // TODO fix name - it's also for options window
	const [,,missingOrigins,existingOrigins]=await settingsManager.readSettingsAndPermissions()
	browser.runtime.sendMessage({
		action:'updatePanelPermissions',
		missingOrigins,existingOrigins
	})
}

function isTabStateEqual(data1,data2) {
	if (data1.type!=data2.type) return false
	if (data1.type=='user') {
		if (data1.userData.id!=data2.userData.id) return false
	}
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
	const [settings,permissions]=await settingsManager.readSettingsAndPermissions()
	const tabState={}
	if (settings.osm) {
		const issueId=getOsmIssueIdFromUrl(settings.osm,tab.url)
		if (issueId!=null) {
			tabState.type='issue'
			tabState.issueData={
				osmRoot:settings.osm,
				id:issueId,
				url:tab.url
			}
			if (permissions.osm) {
				const contentIssueData=await addListenerAndSendMessage(tab.id,'issue',{action:'getIssueData'})
				if (contentIssueData) Object.assign(tabState.issueData,contentIssueData)
			}
		}
	}
	if (settings.osm) {
		// TODO get username from url - not necessary for now
		if (isOsmUserUrl(settings.osm,tab.url)) {
			tabState.type='user'
			tabState.userData={}
			if (permissions.osm) {
				const userId=await addListenerAndSendMessage(tab.id,'user',{action:'getUserId'})
				if (userId!=null) {
					let apiUrl='#' // not important for now - only used in templates
					if (settings.osm_api) apiUrl=settings.osm_api+'api/0.6/user/'+encodeURIComponent(userId)
					tabState.userData={
						id:userId,
						apiUrl
					}
				}
			}
		}
	}
	if (settings.otrs) {
		if (isOtrsTicketUrl(settings.otrs,tab.url)) {
			tabState.type='ticket'
			tabState.issueData={}
			if (settings.osm && permissions.otrs) {
				const contentIssueId=await addListenerAndSendMessage(tab.id,'ticket',{action:'getIssueId'})
				if (contentIssueId!=null) {
					tabState.issueData={
						osmRoot:settings.osm,
						id:contentIssueId,
						url:`${settings.osm}issues/${encodeURIComponent(contentIssueId)}`
					}
				}
			}
		}
	}
	return tabState
}

async function addListenerAndSendMessage(tabId,contentScript,message) {
	if (buildScriptChromePatch) await browser.tabs.executeScript(tabId,{file:'browser-polyfill.js'})
	await browser.tabs.executeScript(tabId,{file:`content/${contentScript}.js`})
	return await browser.tabs.sendMessage(tabId,message)
}

function getOsmIssueIdFromUrl(osmRoot,url) {
	const match=url.match(new RegExp('^'+escapeRegex(osmRoot)+'issues/([0-9]+)'))
	if (match) {
		const [,issueId]=match
		return issueId
	}
}

function isOsmUserUrl(osmRoot,url) {
	const match=url.match(new RegExp('^'+escapeRegex(osmRoot)+'user/[^/]+$'))
	return !!match
}

function isOsmNoteUrl(osmRoot,url) {
	const match=url.match(new RegExp('^'+escapeRegex(osmRoot)+'note/[0-9]+$'))
	return !!match
}

function isOtrsTicketUrl(otrsRoot,url) {
	const match=url.match(new RegExp('^'+escapeRegex(otrsRoot+'otrs/index.pl?Action=AgentTicketZoom;')))
	return !!match
}

function escapeRegex(string) { // https://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript/3561711
	return string.replace(/[-\/\\^$*+?.()|[\]{}]/g,'\\$&')
}
