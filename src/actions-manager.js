/**
 * @typedef { import('./actions.js').Action } Action
 * @typedef { import('./actions.js').OffshootAction } OffshootAction
 */

export default class ActionsManager {
	constructor() {
		/** @type{Map<number,Action>} */
		this.tabActions=new Map()
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
	 * @param action {OffshootAction}
	 */
	async addNewTabAction(settings,action) {
		const newTab=await browser.tabs.create({
			openerTabId:action.openerTabId,
			url:action.getActionUrl(settings)
		})
		this.tabActions.set(newTab.id,action)
	}
	/**
	 * @param action {Action}
	 */
	async addCurrentTabAction(settings,action,tabId) {
		await this.addImmediateCurrentTabAction(settings,action,tabId)
		browser.tabs.update(tabId,{
			url:action.getActionUrl(settings)
		})
	}
	/**
	 * @param action {Action}
	 */
	async addImmediateCurrentTabAction(settings,action,tabId) {
		// { TODO add more than one action
		if (this.tabActions.get(tabId)) {
			console.log('action manager will replace tab action',tabId,action)
		}
		// }
		this.tabActions.set(tabId,action)
	}
	/**
	 * @returns {Promise<boolean>} true if tab actions changed
	 */
	async act(settings,tab,tabState,messageTab) {
		// TODO act on more than one action
		const action=this.tabActions.get(tab.id)
		if (!action) return false
		if (action.needToRejectUrl(settings,tab.url)) return false
		this.tabActions.delete(tab.id)
		const tabActionsUpdate=await action.act(settings,tab,tabState,messageTab)
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
