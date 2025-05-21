import {isTabStateEqual} from './states.js'

import {
	getOsmMessageIdFromUrl,
	isOsmNewMessageUrl,
	getOsmIssueIdFromUrl,
	isOsmUserUrl,
	getOsmBlockIdFromUrl,
	getOsmNewBlockUserNameFromUrl,
	isOtrsTicketUrl, getOtrsTicketId,
	isOtrsActionUrl,
	isOtrsUserProfileUrl
} from './utils.js'

// tab objects expected to have fields: id, url, active
export default class StatesManager {
	/**
	 * @param messageTab {(tabId,contentScript,message)=>Promise}
	 */
	constructor(messageTab,injectCssIntoTab=()=>{}) {
		this.messageTab=messageTab
		this.injectCssIntoTab=injectCssIntoTab
		this.tabStates=new Map()
		this.activatedTab=undefined // to set value for this.otherTab when another tab activated
		this.otherTab=undefined
		this.otherTabSetFromPreviousTab=undefined
	}
	clearTabs() {
		this.tabStates.clear()
	}
	deleteTab(tabId) {
		this.tabStates.delete(tabId) // TODO what if onUpdated runs after onRemoved?
		if (this.otherTab?.id==tabId) {
			this.otherTab=undefined
			this.otherTabSetFromPreviousTab=undefined
		}
		if (this.activatedTab?.id==tabId) {
			this.activatedTab=undefined
		}
	}
	getTabState(tabId) {
		return this.tabStates.get(tabId)
	}
	// need to be aware of race conditions in async functions
	// because of browser onActivated and onUpdated ~simultaneous events
	async updateTabStatesOnStartup(settings,permissions,activeTabs,activeFocusedTabs) {
		this.activatedTab=activeFocusedTabs[0]
		return this.updateTabStatesBecauseSettingsChanged(settings,permissions,activeTabs,this.messageTab)
	}
	async updateTabStatesBecauseSettingsChanged(settings,permissions,activeTabs) {
		const messagedTabIds=[]
		let needToUpdateOtherTab=this.otherTab!=null
		for (const tab of activeTabs) {
			if (tab.id==this.otherTab?.id) {
				needToUpdateOtherTab=false
			}
			await this.pushIfChangedAndActive(settings,permissions,tab,messagedTabIds)
		}
		if (needToUpdateOtherTab) {
			const otherTabState=await getTabState(settings,permissions,this.otherTab,this.messageTab,this.injectCssIntoTab)
			this.tabStates.set(this.otherTab.id,otherTabState)
		}
		return this.getMessageArgs(messagedTabIds)
	}
	async updateTabStatesBecauseBrowserTabActivated(settings,permissions,tab,otherTab) {
		if (otherTab) {
			this.otherTab=otherTab
			this.otherTabSetFromPreviousTab=false
		} else if (tab.id!=this.activatedTab?.id) {
			this.otherTab=this.activatedTab
			this.otherTabSetFromPreviousTab=true
		} else if (!this.otherTabSetFromPreviousTab) {
			this.otherTab=undefined
			this.otherTabSetFromPreviousTab=undefined
		}
		this.activatedTab=tab
		if (this.otherTab!=null && !this.tabStates.get(this.otherTab.id)) {
			const otherTabState=await getTabState(settings,permissions,this.otherTab,this.messageTab,this.injectCssIntoTab)
			this.tabStates.set(this.otherTab.id,otherTabState)
		}
		if (!this.tabStates.get(tab.id)) {
			const tabState=await getTabState(settings,permissions,tab,this.messageTab,this.injectCssIntoTab)
			this.tabStates.set(tab.id,tabState)
		}
		return this.getMessageArgs([tab.id]) // active + result of tab switch
	}
	async updateTabStateBecauseBrowserTabUpdated(settings,permissions,tab) {
		const messagedTabIds=[]
		await this.pushIfChangedAndActive(settings,permissions,tab,messagedTabIds)
		return this.getMessageArgs(messagedTabIds)
	}
	async updateTabStateBecauseNewPanelOpened(settings,permissions,tab) {
		const tabState=await getTabState(settings,permissions,tab,this.messageTab,this.injectCssIntoTab)
		this.tabStates.set(tab.id,tabState)
		return this.getMessageArgs([tab.id])
	}
	async updateTabStateBecauseBrowserTabRequested(settings,permissions,tab) {
		return this.updateTabStateBecauseNewPanelOpened(settings,permissions,tab)
	}
	/**
	 * @private
	 */
	async pushIfChangedAndActive(settings,permissions,tab,messagedTabIds) {
		let oldTabState=this.tabStates.get(tab.id)
		let tabStateChanged=false
		if (oldTabState==null) {
			tabStateChanged=true
			this.tabStates.set(tab.id,oldTabState={})
		}
		const tabState=await getTabState(settings,permissions,tab,this.messageTab,this.injectCssIntoTab)
		if (!isTabStateEqual(oldTabState,tabState)) {
			tabStateChanged=true
		}
		this.tabStates.set(tab.id,tabState)
		if (tabStateChanged && tab.active) {
			messagedTabIds.push(tab.id)
		}
	}
	/**
	 * @private
	 * @returns {[Array.<number>,?number,Object.<number,Object>]} message data: tab ids to update, other tab id, tab states
	 */
	getMessageArgs(tabIds) {
		const messagedTabStates={}
		for (const tabId of tabIds) {
			messagedTabStates[tabId]=this.tabStates.get(tabId)
		}
		if (this.otherTab!=null) {
			messagedTabStates[this.otherTab.id]=this.tabStates.get(this.otherTab.id)
		}
		return [tabIds,this.otherTab?.id,messagedTabStates]
	}
}

async function getTabState(settings,permissions,tab,messageTab,injectCssIntoTab) {
	const tabState={}
	if (settings.osm) {
		const messageId=getOsmMessageIdFromUrl(settings.osm,tab.url)
		if (messageId!=null) {
			tabState.type='message'
			tabState.messageData={
				id:messageId,
				url:tab.url // TODO what if url includes anchor?
			}
			if (permissions.osm) {
				const contentMessageData=await messageTab(tab.id,'message',{action:'getMessageData'})
				if (contentMessageData) Object.assign(tabState.messageData,contentMessageData)
			}
		}
	}
	if (settings.osm) {
		if (isOsmNewMessageUrl(settings.osm,tab.url)) {
			tabState.type='message-add'
			tabState.userData={}
			if (permissions.osm) {
				const contentUserData=await messageTab(tab.id,'message-add',{action:'getUserData'})
				if (contentUserData) Object.assign(tabState.userData,contentUserData)
			}
		}
	}
	if (settings.osm) {
		const issueId=getOsmIssueIdFromUrl(settings.osm,tab.url)
		if (issueId!=null) {
			injectCssIntoTab(tab.id,'issue')
			tabState.type='issue'
			tabState.issueData={
				id:issueId,
				url:tab.url
			}
			if (permissions.osm) {
				const contentIssueData=await messageTab(tab.id,'issue',{
					action:'getIssueDataAndInjectItemPanes',
					osmcha:settings.osmcha // let it run even w/o permission b/c other extension may grant it
				})
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
				const userId=await messageTab(tab.id,'user',{action:'getUserId'})
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
	if (settings.osm) {
		const blockId=getOsmBlockIdFromUrl(settings.osm,tab.url)
		if (blockId!=null) {
			tabState.type='block'
			tabState.blockData={
				id:blockId,
				url:tab.url
			}
			if (permissions.osm) {
				const contentBlockData=await messageTab(tab.id,'block',{
					action:'getBlockData'
				})
				if (contentBlockData) Object.assign(tabState.blockData,contentBlockData)
			}
		}
	}
	if (settings.osm) {
		const userName=getOsmNewBlockUserNameFromUrl(settings.osm,tab.url)
		if (userName!=null) {
			tabState.type='block-add'
			tabState.userData={
				name:userName
			}
		}
	}
	if (settings.otrs) {
		if (isOtrsTicketUrl(settings.otrs,tab.url)) {
			let ticketId=getOtrsTicketId(settings.otrs,tab.url)
			if (!ticketId && permissions.otrs) {
				ticketId=await messageTab(tab.id,'ticket',{action:'getTicketId'})
			}
			if (ticketId) {
				tabState.type='ticket'
				const [ticketNumber]=tab.title.match(/^\d+/)
				tabState.ticketData={
					id:ticketId,
					number:ticketNumber,
					url:tab.url
				}
				tabState.issueData={}
				if (settings.osm && permissions.otrs) {
					const contentIssueId=await messageTab(tab.id,'ticket',{action:'getIssueId'})
					if (contentIssueId!=null) {
						tabState.issueData={
							id:contentIssueId,
							url:`${settings.osm}issues/${encodeURIComponent(contentIssueId)}`
						}
					}
				}
			}
		}
	}
	if (settings.otrs) {
		if (isOtrsActionUrl(settings.otrs,'AgentTicketPhone',tab.url)) {
			tabState.type='ticket-add'
		}
	}
	if (settings.otrs) {
		if (isOtrsUserProfileUrl(settings.otrs,tab.url)) {
			const otrsUserId=await messageTab(tab.id,'otrs-profile',{action:'getOtrsUserId'})
			tabState.type='otrs-profile'
			tabState.otrsUserData={
				id:otrsUserId
			}
		}
	}
	return tabState
}
