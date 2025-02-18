import settingsData from './settings-data.js'
import {SettingsManager,SettingsAndPermissionsReader} from './settings-manager.js'
import StatesManager from './states-manager.js'
import ActionsManager from './actions-manager.js'
import * as Actions from './actions.js'
import icon from './icon.js'
import installOrUninstallHeadersReceivedListener from './webrequest.js'

const statesManager=new StatesManager(messageTab,injectCssIntoTab)
const actionsManager=new ActionsManager(browser.tabs)
const settingsManager=new SettingsManager(settingsData,browser.storage.local)
const settingsAndPermissionsReader=new SettingsAndPermissionsReader(settingsManager,browser.permissions)

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
		actionsManager.addImmediateCurrentTabAction(tabAction,message.tabId)
		return reactToImmediateTabAction(message.tabId)
	} else if (message.action=='runTabMenuAction') {
		actionsManager.replaceTabActionWithButtonResponse(message.tabId,message.tabActionIndex)
		return reactToImmediateTabAction(message.tabId)
	} else if (message.action=='cancelTabAction') {
		if (actionsManager.deleteTab(message.tabId)) {
			reactToActionsUpdate()
		}
		return Promise.resolve()
	} else if (message.action=='tabStateWasChanged') {
		return handleStateChangingTabCallback(message.tabId)
	}
	return false
})

//browser.tabs.onActivated.addListener(async({previousTabId,tabId})=>{ // no previousTabId on Chrome
browser.tabs.onActivated.addListener(handleTabActivationOrHighlight)
browser.tabs.onHighlighted.addListener(handleTabActivationOrHighlight)

async function handleTabActivationOrHighlight() {
	const [settings,permissions]=await settingsAndPermissionsReader.read()
	const [tab]=await browser.tabs.query({active:true,currentWindow:true})
	const highlightedTabs=await browser.tabs.query({highlighted:true,currentWindow:true})
	let otherTab
	if (highlightedTabs.length==2) {
		if (tab.id==highlightedTabs[0].id) {
			otherTab=highlightedTabs[1]
		} else if (tab.id==highlightedTabs[1].id) {
			otherTab=highlightedTabs[0]
		}
	}
	const messageData=await statesManager.updateTabStatesBecauseBrowserTabActivated(settings,permissions,tab,otherTab)
	setIconOnTab(tab)
	sendUpdateActionsMessage(settings,permissions,...messageData)
}

browser.tabs.onUpdated.addListener(async(tabId,changeInfo,tab)=>{
	if (tab.url=='about:blank') return // bail on about:blank, when opening new tabs it gets complete status before supplied url is opened
	if (hasOnlyChange('isArticle')) return // this change happens on previous tab state and may cause race condition
	if (hasOnlyChange('favIconUrl')) return // happens after page is loaded and processed

	// possible optimizations:
	// may skip update it if tab is not (active || previous || has scheduled action)
	// may also act only on active tabs, then can skip if tab is not (active || previous)
	// on the other hand these optimizations won't matter much b/c updated tabs are mostly active
	const [settings,permissions]=await settingsAndPermissionsReader.read()
	const messageData=await statesManager.updateTabStateBecauseBrowserTabUpdated(settings,permissions,tab)
	setIconOnTab(tab)
	sendUpdateActionsMessage(settings,permissions,...messageData)
	const tabState=statesManager.getTabState(tabId)
	
	if (actionsManager.hasTab(tabId) && (
		changeInfo.status=='complete' // just loaded
		// ||
		// changeInfo.attention!=null && tab.status=='complete' // switched to already loaded - this used to work - see initiateImmediateCurrentTabAction()
	)) {
		const settings=await settingsManager.read()
		if (await actionsManager.act(settings,tab,tabState,messageTab)) {
			reactToActionsUpdate()
		}
	}

	function hasOnlyChange(targetProp) {
		const props=Object.keys(changeInfo)
		if (props.length!=1) return false
		const [prop]=props
		return prop==targetProp
	}
})

init()

async function init() {
	const activeTabs=await browser.tabs.query({active:true})
	const activeFocusedTabs=await browser.tabs.query({active:true,lastFocusedWindow:true})
	const [settings,permissions]=await settingsAndPermissionsReader.read()
	const hasWebRequestPermission=await browser.permissions.contains({permissions:['webRequest','webRequestBlocking']})
	installOrUninstallHeadersReceivedListener(settings,permissions,hasWebRequestPermission)
	const messageData=await statesManager.updateTabStatesOnStartup(settings,permissions,activeTabs,activeFocusedTabs)
	for (const tab of activeTabs) {
		setIconOnTab(tab)
	}
	sendUpdateActionsMessage(settings,permissions,...messageData)
	// no ongoing actions yet
}

async function handleStateChangingTabCallback(tabId) {
	const tab=await browser.tabs.get(tabId)
	const [settings,permissions]=await settingsAndPermissionsReader.read()
	const messageData=await statesManager.updateTabStateBecauseBrowserTabRequested(settings,permissions,tab)
	setIconOnTab(tab)
	sendUpdateActionsMessage(settings,permissions,...messageData)
}

async function handleStateChangingSettingsChange() {
	statesManager.clearTabs()
	const activeTabs=await browser.tabs.query({active:true})
	const [settings,permissions]=await settingsAndPermissionsReader.read()
	const hasWebRequestPermission=await browser.permissions.contains({permissions:['webRequest','webRequestBlocking']})
	installOrUninstallHeadersReceivedListener(settings,permissions,hasWebRequestPermission)
	const messageData=await statesManager.updateTabStatesBecauseSettingsChanged(settings,permissions,activeTabs)
	for (const tab of activeTabs) {
		setIconOnTab(tab)
	}
	sendUpdateActionsMessage(settings,permissions,...messageData)
	// actions were just dropped, don't need to update them
}

async function registerNewPanel(tab) {
	sendUpdatePermissionsMessage() // TODO limit the update to this tab
	const [settings,permissions]=await settingsAndPermissionsReader.read()
	const messageData=await statesManager.updateTabStateBecauseNewPanelOpened(settings,permissions,tab)
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

async function reactToImmediateTabAction(tabId) {
	reactToActionsUpdate()
	const settings=await settingsManager.read()
	// here we tried to trigger tab update event
	// first attempt was:
		// browser.tabs.update(tabId,{})
	// this didn't work
	// second attempt was causing update event by switching active tabs back and forth:
		// await browser.tabs.update(otherTabId,{active:true})
		// await browser.tabs.update(tabId,{active:true})
	// it worked, but then probably because of some browser update it stopped working; the update was before Firefox 101.0.1
	// third attempt - just call actions manager directly:
	const tab=await browser.tabs.get(tabId)
	const tabState=statesManager.getTabState(tabId)
	if (await actionsManager.act(settings,tab,tabState,messageTab)) {
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

function setIconOnTab(tab) {
	// would have been easier to set icon for tab but:
	// https://stackoverflow.com/questions/12710061/why-does-a-browser-actions-default-icon-reapper-after-a-custom-icon-was-applied
	// + browserAction.setIcon() and sidebarAction.setIcon() work slightly differently: sidebarAction's tab icon is not reset to default when tab is loaded
	const tabStateType=statesManager.getTabState(tab.id)?.type
	const iconDetails={
		// windowId: tab.windowId, // not in chrome
		tabId: tab.id,
		path: icon(tabStateType,'branded')
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
	//const [settings,permissions]=await settingsAndPermissionsReader.read()
	browser.runtime.sendMessage({
		action:'updateActionsNew',
		settings,permissions,
		tabIds,otherTabId,tabStates
	})
}

async function sendUpdatePermissionsMessage() {
	const [,,missingOrigins,existingOrigins]=await settingsAndPermissionsReader.read()
	browser.runtime.sendMessage({
		action:'updatePermissions',
		missingOrigins,existingOrigins
	})
}

async function messageTab(tabId,contentScript,message) {
	await browser.tabs.executeScript(tabId,{file:'/browser-polyfill.js'})
	await browser.tabs.executeScript(tabId,{file:`/content/${contentScript}.js`})
	return await browser.tabs.sendMessage(tabId,{tabId,...message})
}

function injectCssIntoTab(tabId,contentScript) {
	browser.tabs.insertCSS(tabId,{file:`/content/${contentScript}.css`})
}
