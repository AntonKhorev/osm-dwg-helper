import settingsData from './settings-data.js'
import SettingsManager from './settings-manager.js'
import StatesManager from './states-manager.js'
import ActionsManager from './actions-manager.js'
import * as Actions from './actions.js'
import icon from './icon.js'
import installOrUninstallHeadersReceivedListener from './webrequest.js'

const statesManager=new StatesManager()
const actionsManager=new ActionsManager(browser.tabs)
const settingsManager=new SettingsManager(settingsData)

// can't use window.* here and browser.runtime.getBackgroundPage() in panel/options pages because:
// https://stackoverflow.com/questions/52618377/firefox-web-extension-cant-access-dead-object-error
// all communication between pages needs to be done with messages
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
	} else if (message.action=='initiateNewTabAction') {
		const tabAction=makeAction(...message.tabAction)
		return initiateNewTabAction(tabAction)
	} else if (message.action=='initiateCurrentTabAction') {
		const tabAction=makeAction(...message.tabAction)
		return initiateCurrentTabAction(tabAction,message.tabId)
	} else if (message.action=='initiateImmediateCurrentTabAction') {
		const tabAction=makeAction(...message.tabAction)
		return initiateImmediateCurrentTabAction(tabAction,message.tabId,message.otherTabId)
	} else if (message.action=='cancelTabAction') {
		if (actionsManager.deleteTab(message.tabId)) {
			reactToActionsUpdate()
		}
		return Promise.resolve()
	}
	return false
})

//browser.tabs.onActivated.addListener(async({previousTabId,tabId})=>{ // no previousTabId on Chrome
browser.tabs.onActivated.addListener(async({tabId})=>{
	const [settings,permissions]=await settingsManager.readSettingsAndPermissions()
	const tab=await browser.tabs.get(tabId)
	const messageData=await statesManager.updateTabStatesBecauseBrowserTabActivated(
		settings,permissions,tab,
		messageTab
	)
	setIconOnTab(tab)
	sendUpdateActionsMessage(settings,permissions,...messageData)
})

browser.tabs.onUpdated.addListener(async(tabId,changeInfo,tab)=>{
	if (tab.url=='about:blank') return // bail on about:blank, when opening new tabs it gets complete status before supplied url is opened

	// possible optimizations:
	// may skip update it if tab is not (active || previous || has scheduled action)
	// may also act only on active tabs, then can skip if tab is not (active || previous)
	// on the other hand these optimizations won't matter much b/c updated tabs are mostly active
	const [settings,permissions]=await settingsManager.readSettingsAndPermissions()
	const messageData=await statesManager.updateTabStateBecauseBrowserTabUpdated(settings,permissions,tab,messageTab)
	setIconOnTab(tab)
	sendUpdateActionsMessage(settings,permissions,...messageData)
	const tabState=statesManager.getTabState(tabId)
	
	if (actionsManager.hasTab(tabId) && (
		changeInfo.status=='complete' || // just loaded
		changeInfo.attention!=null && tab.status=='complete' // switched to already loaded
	)) {
		const settings=await settingsManager.read()
		if (await actionsManager.act(settings,tab,tabState,messageTab)) {
			reactToActionsUpdate()
		}
	}
})

init()

async function init() {
	const activeTabs=await browser.tabs.query({active:true})
	const activeFocusedTabs=await browser.tabs.query({active:true,lastFocusedWindow:true})
	const [settings,permissions]=await settingsManager.readSettingsAndPermissions()
	const hasWebRequestPermission=await browser.permissions.contains({permissions:['webRequest','webRequestBlocking']})
	installOrUninstallHeadersReceivedListener(settings,permissions,hasWebRequestPermission)
	const messageData=await statesManager.updateTabStatesOnStartup(settings,permissions,activeTabs,activeFocusedTabs,messageTab)
	for (const tab of activeTabs) {
		setIconOnTab(tab)
	}
	sendUpdateActionsMessage(settings,permissions,...messageData)
	// no ongoing actions yet
}

async function handleStateChangingSettingsChange() {
	statesManager.clearTabs()
	const activeTabs=await browser.tabs.query({active:true})
	const [settings,permissions]=await settingsManager.readSettingsAndPermissions()
	const hasWebRequestPermission=await browser.permissions.contains({permissions:['webRequest','webRequestBlocking']})
	installOrUninstallHeadersReceivedListener(settings,permissions,hasWebRequestPermission)
	const messageData=await statesManager.updateTabStatesBecauseSettingsChanged(settings,permissions,activeTabs,messageTab)
	for (const tab of activeTabs) {
		setIconOnTab(tab)
	}
	sendUpdateActionsMessage(settings,permissions,...messageData)
	// actions were just dropped, don't need to update them
}

async function registerNewPanel(tab) {
	sendUpdatePermissionsMessage() // TODO limit the update to this tab
	const [settings,permissions]=await settingsManager.readSettingsAndPermissions()
	const messageData=await statesManager.updateTabStateBecauseNewPanelOpened(settings,permissions,tab,messageTab)
	setIconOnTab(tab)
	sendUpdateActionsMessage(settings,permissions,...messageData)
	reactToActionsUpdate()
}

function makeAction(actionClassName,...args) {
	const actionClass=Actions[actionClassName]
	return new actionClass(...args)
}

async function initiateNewTabAction(action) {
	const settings=await settingsManager.read()
	actionsManager.addNewTabAction(settings,action)
	reactToActionsUpdate()
}

async function initiateCurrentTabAction(action,tabId) {
	const settings=await settingsManager.read()
	actionsManager.addCurrentTabAction(settings,action,tabId)
	reactToActionsUpdate()
}

async function initiateImmediateCurrentTabAction(action,tabId,otherTabId) {
	const settings=await settingsManager.read()
	actionsManager.addImmediateCurrentTabAction(settings,action,tabId)
	reactToActionsUpdate()
	// TODO trigger tab update event
	// TODO check if it works - if it does move to actionsManager
	// browser.tabs.update(tabId,{}) // NOPE!
	await browser.tabs.update(otherTabId,{active:true})
	await browser.tabs.update(tabId,{active:true})
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

function setIconOnTab(tab) {
	// would have been easier to set icon for tab but:
	// https://stackoverflow.com/questions/12710061/why-does-a-browser-actions-default-icon-reapper-after-a-custom-icon-was-applied
	// + browserAction.setIcon() and sidebarAction.setIcon() work slightly differently: sidebarAction's tab icon is not reset to default when tab is loaded
	const tabStateType=statesManager.getTabState(tab.id)?.type
	const iconDetails={
		// windowId: tab.windowId, // not in chrome
		tabId: tab.id,
		path: icon(tabStateType)
	}
	browser.browserAction.setIcon(iconDetails)
	browser.sidebarAction?.setIcon(iconDetails)
}

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

async function messageTab(tabId,contentScript,message) {
	await browser.tabs.executeScript(tabId,{file:'browser-polyfill.js'})
	await browser.tabs.executeScript(tabId,{file:`content/${contentScript}.js`})
	return await browser.tabs.sendMessage(tabId,message)
}
