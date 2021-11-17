export default class ActionsManager {
	constructor() {
		this.tabActions=new Map()
	}
	addTabAction(tabId,action) {
		this.tabActions.set(tabId,action)
	}
	/**
	 * Check if has registered tab with action; if no then don't need to run {@link ActionsManager.act act()}
	 */
	hasTab(tabId) {
		return this.tabActions.has(tabId)
	}
	/**
	 * @returns {boolean} true if tab actions changed
	 */
	clearTabs() {
		const hadTabs=this.tabActions.size>0
		this.tabActions.clear()
		return hadTabs
	}
	/**
	 * @returns {boolean} true if tab actions changed
	 */
	deleteTab(tabId) {
		const hadTab=this.tabActions.has(tabId)
		this.tabActions.delete(tabId)
		return hadTab
	}
	listTabActionEntries() {
		const tabActionEntries=[]
		for (const [tabId,action] of this.tabActions) {
			tabActionEntries.push([tabId,action.getOngoingActionMenuEntry()])
		}
		return tabActionEntries
	}
	/**
	 * @returns {Promise<boolean>} true if tab actions changed
	 */
	async act(settings,tab,tabState,addListenerAndSendMessage) {
		const action=this.tabActions.get(tab.id)
		if (!action) return false
		// TODO check if url matches, if not cancel action
		this.tabActions.delete(tab.id)
		const tabActionsUpdate=await action.act(settings,tab,tabState,addListenerAndSendMessage)
		if (tabActionsUpdate) {
			const [newTabId,newAction]=tabActionsUpdate
			this.tabActions.set(newTabId,newAction)
			if (newTabId==tab.id && newAction==action) {
				return false
			}
			const update={}
			if (newTabId!=tab.id) {
				browser.tabs.remove(tab.id)
				update.active=true
			}
			if (newAction) {
				const url=newAction.getActionUrl(settings)
				if (url!=null) update.url=url
			}
			if (Object.keys(update).length>0) {
				browser.tabs.update(newTabId,update)
			}
		}
		return true
	}
}
