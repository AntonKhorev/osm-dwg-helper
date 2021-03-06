/**
 * @typedef { import('./actions.js').Action } Action
 * @typedef { import('./actions.js').OffshootAction } OffshootAction
 */

export default class ActionsManager {
	/**
	 * @param browserTabs - needs to have these calls: .create(), .update(), .remove()
	 */
	constructor(browserTabs) {
		/** @type{Map<number,Action>} */
		this.tabActions=new Map()
		this.browserTabs=browserTabs
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
	_addAction(tabId,action) {
		const actions=this.tabActions.get(tabId)??[]
		actions.push(action)
		this.tabActions.set(tabId,actions)
	}
	listTabActionEntries() {
		const tabActionEntries=[]
		for (const [tabId,actions] of this.tabActions) {
			tabActionEntries.push([tabId,actions.map(action=>action.getOngoingActionMenuEntry())])
		}
		return tabActionEntries
	}
	/**
	 * @param action {OffshootAction}
	 */
	async addNewTabAction(settings,action) {
		const newTab=await this.browserTabs.create({
			openerTabId:action.openerTabId,
			url:action.getActionUrl(settings)
		})
		this._addAction(newTab.id,action)
	}
	/**
	 * @param action {Action}
	 */
	async addCurrentTabAction(settings,action,tabId) {
		this._addAction(tabId,action)
		this.browserTabs.update(tabId,{
			url:action.getActionUrl(settings)
		})
	}
	/**
	 * @param action {Action}
	 */
	addImmediateCurrentTabAction(action,tabId) {
		this._addAction(tabId,action)
	}
	replaceTabActionWithButtonResponse(tabId,tabActionIndex) {
		const actions=this.tabActions.get(tabId)
		if (!actions) return
		const action=actions[tabActionIndex]
		if (!action) return
		const newAction=action.getOngoingActionMenuButtonResponse()
		if (!newAction) return
		actions[tabActionIndex]=newAction
	}
	/**
	 * @returns {Promise<boolean>} true if tab actions changed
	 */
	async act(settings,tab,tabState,messageTab) {
		const actions=this.tabActions.get(tab.id)
		if (!actions) return false
		let isUpdated=false
		this.tabActions.delete(tab.id)
		for (const action of actions) {
			if (action.needToRejectUrl(settings,tab.url)) {
				this._addAction(tab.id,action)
				continue
			}
			const tabActionsUpdate=await action.act(settings,tab,tabState,messageTab)
			if (tabActionsUpdate) {
				const [newTabId,newAction,forkNewTabId,forkNewAction]=tabActionsUpdate
				if (newTabId) {
					this._addAction(newTabId,newAction)
					if (newTabId==tab.id && newAction==action) {
						continue
					}
					const update={}
					if (newTabId!=tab.id) {
						this.browserTabs.remove(tab.id)
						update.active=true
					}
					if (newAction) {
						const url=newAction.getActionUrl(settings)
						if (url!=null) update.url=url
					}
					if (Object.keys(update).length>0) {
						this.browserTabs.update(newTabId,update)
					}
				}
				if (forkNewTabId) {
					this._addAction(forkNewTabId,forkNewAction)
				}
			}
			isUpdated=true
		}
		return isUpdated
	}
}
