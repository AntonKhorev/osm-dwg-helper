const buildScriptChromePatch=false

import settingsData from './settings-data.js'
import SettingsManager from './settings-manager.js'
import StatesManager from './states-manager.js'
import ActionsManager from './actions-manager.js'
import * as Actions from './actions.js'
import icon from './icon.js'

const statesManager=new StatesManager()
const actionsManager=new ActionsManager()
const settingsManager=new SettingsManager(settingsData)

browser.runtime.onMessage.addListener(message=>{
	if (message.action=='reportSettingsWillChange') {
		if (actionsManager.clearTabs()) {
			reactToActionsUpdate()
		}
		return Promise.resolve()
	} else if (message.action=='reportPermissionsWereChanged') {
		sendUpdatePermissionsMessage()
		return handleStateChangingSettingsChange() // permissions update implies states update
	} else if (message.action=='reportStateChangingSettingsWereChanged') {
		return handleStateChangingSettingsChange()
	} else if (message.action=='registerNewPanel') {
		return registerNewPanel(message.tab)
	} else if (message.action=='registerNewOptionsPage') {
		reactToActionsUpdate() // need to send updateActionsOngoing message
		return Promise.resolve()
	}
	return false
})

async function handleStateChangingSettingsChange() {
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

async function registerNewPanel(tab) {
	sendUpdatePermissionsMessage() // TODO limit the update to this tab
	const [settings,permissions]=await settingsManager.readSettingsAndPermissions()
	const messageData=await statesManager.updateTabStateBecauseNewPanelOpened(
		settings,permissions,tab,
		addListenerAndSendMessage
	)
	sendUpdateActionsMessage(settings,permissions,...messageData)
	reactToActionsUpdate()
}

/**
 * Make action object in background window to avoid dead objects when panels are closed
 * FIXME not going to work
 */
window.makeAction=(actionClassName,...args)=>{
	const actionClass=Actions[actionClassName]
	return new actionClass(...args)
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

browser.tabs.onRemoved.addListener((tabId)=>{
	statesManager.deleteTab(tabId)
	if (actionsManager.deleteTab(tabId)) {
		reactToActionsUpdate()
	}
})

//browser.tabs.onActivated.addListener(async({previousTabId,tabId})=>{ // no previousTabId on Chrome
browser.tabs.onActivated.addListener(async({tabId})=>{
	const [settings,permissions]=await settingsManager.readSettingsAndPermissions()
	const messageData=await statesManager.updateTabStatesBecauseBrowserTabActivated(
		settings,permissions,tabId,
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
	for (const tabId of tabIds) {
		const tabState=tabStates[tabId]
		const iconDetails={
			tabId,
			path:icon(tabState.type)
		}
		browser.browserAction.setIcon(iconDetails)
		browser.sidebarAction?.setIcon(iconDetails)
	}
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
