const buildScriptChromePatch=false

import SettingsManager from './settings-manager.js'
import StatesManager from './states-manager.js'
import ActionsManager from './actions-manager.js'

const statesManager=new StatesManager()
const actionsManager=new ActionsManager()

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

window.reportNeedToDropActions=()=>{
	if (actionsManager.clearTabs()) {
		reactToActionsUpdate()
	}
}

window.reportPermissionsUpdate=async()=>{
	await sendUpdatePermissionsMessage()
	await reportStateChangingSettingsUpdate() // permissions update implies states update
}

window.reportStateChangingSettingsUpdate=async()=>{
	statesManager.clearTabs()
	const activeTabs=await browser.tabs.query({active:true})
	const [settings,permissions]=await settingsManager.readSettingsAndPermissions()
	const messageData=await statesManager.updateTabStatesBecauseSettingsChanged(
		settings,permissions,activeTabs,
		tabId=>browser.tabs.get(tabId),
		addListenerAndSendMessage
	)
	sendUpdateActionsMessage(settings,permissions,...messageData)
	// actions were just dropped, don't need to update them
}

window.registerNewPanel=async(tab)=>{
	sendUpdatePermissionsMessage() // TODO limit the update to this tab
	const [settings,permissions]=await settingsManager.readSettingsAndPermissions()
	const messageData=await statesManager.updateTabStateBecauseNewPanelOpened(
		settings,permissions,tab,
		addListenerAndSendMessage
	)
	sendUpdateActionsMessage(settings,permissions,...messageData)
	reactToActionsUpdate()
}

window.registerNewOptionsPage=()=>{ // need to send updateActionsOngoing message
	reactToActionsUpdate()
}

window.initiateCurrentTabAction=async(action,tabId)=>{
	const settings=await settingsManager.read()
	actionsManager.addCurrentTabAction(settings,action,tabId)
	reactToActionsUpdate()
}

window.initiateNewTabAction=async(action)=>{
	const settings=await settingsManager.read()
	actionsManager.addNewTabAction(settings,action)
	reactToActionsUpdate()
}

window.removeTabAction=(tabId)=>{
	if (actionsManager.deleteTab(tabId)) {
		reactToActionsUpdate()
	}
}

function reactToActionsUpdate() {
	browser.runtime.sendMessage({action:'updateActionsOngoing',tabActionEntries:actionsManager.listTabActionEntries()})
}

let rememberedPreviousTabId

browser.tabs.onRemoved.addListener((tabId)=>{
	if (rememberedPreviousTabId==tabId) {
		rememberedPreviousTabId=undefined
	}
	statesManager.deleteTab(tabId)
	if (actionsManager.deleteTab(tabId)) {
		reactToActionsUpdate()
	}
})

//browser.tabs.onActivated.addListener(async({previousTabId,tabId})=>{ // no previousTabId on Chrome
browser.tabs.onActivated.addListener(async({tabId})=>{
	const previousTabId=rememberedPreviousTabId
	rememberedPreviousTabId=tabId
	const [settings,permissions]=await settingsManager.readSettingsAndPermissions()
	const messageData=await statesManager.updateTabStatesBecauseBrowserTabActivated(
		settings,permissions,
		tabId,previousTabId,
		tabId=>browser.tabs.get(tabId),
		addListenerAndSendMessage
	)
	sendUpdateActionsMessage(settings,permissions,...messageData)
})

browser.tabs.onUpdated.addListener(async(tabId,changeInfo,tab)=>{
	if (tab.url=='about:blank') return // bail on about:blank, when opening new tabs it gets complete status before supplied url is opened

	// possible optimizations:
	// may skip update it if tab is not (active || previous || has scheduled action)
	// may also act only on active tabs, then can skip if tab is not (active || previous)
	// on the other hand these optimizations won't matter much b/c updated tabs are mostly active
	const [settings,permissions]=await settingsManager.readSettingsAndPermissions()
	const messageData=await statesManager.updateTabStateBecauseBrowserTabUpdated(settings,permissions,tab,addListenerAndSendMessage)
	sendUpdateActionsMessage(settings,permissions,...messageData)
	const tabState=statesManager.getTabState(tabId)
	
	if (actionsManager.hasTab(tabId) && (
		changeInfo.status=='complete' || // just loaded
		changeInfo.attention!=null && tab.status=='complete' // switched to already loaded
	)) {
		const settings=await settingsManager.read()
		if (await actionsManager.act(settings,tab,tabState,addListenerAndSendMessage)) {
			reactToActionsUpdate()
		}
	}
})

/**
 * @param tabIds {Array<number>}
 */
async function sendUpdateActionsMessage(
	settings,permissions, // they are always computed right before tab state updates
	tabIds,otherTabId,tabStates
) {
	if (tabIds.length==0) return
	//const [settings,permissions]=await settingsManager.readSettingsAndPermissions()
	browser.runtime.sendMessage({
		action:'updateActionsNew',
		settings,permissions,
		tabIds,otherTabId,tabStates
	})
}

async function sendUpdatePermissionsMessage() {
	const [,,missingOrigins,existingOrigins]=await settingsManager.readSettingsAndPermissions()
	browser.runtime.sendMessage({
		action:'updatePermissions',
		missingOrigins,existingOrigins
	})
}

async function addListenerAndSendMessage(tabId,contentScript,message) {
	if (buildScriptChromePatch) await browser.tabs.executeScript(tabId,{file:'browser-polyfill.js'})
	await browser.tabs.executeScript(tabId,{file:`content/${contentScript}.js`})
	return await browser.tabs.sendMessage(tabId,message)
}
