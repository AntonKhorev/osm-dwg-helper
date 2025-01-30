export default class MenuLinkWriter {
	constructor(document,closeWindow,createTab,sendMessage,tabId) {
		this.document=document
		this.closeWindow=closeWindow
		this.createTab=createTab
		this.sendMessage=sendMessage
		this.tabId=tabId
	}

	/**
	 * @param text {string}
	 * @param href {string}
	 * @returns {HTMLAnchorElement}
	 */
	makePageLink(text,href) {
		return this.makeLink(text,href,()=>this.createTab({openerTabId:this.tabId,url:href}))
	}

	/**
	 * @param text {string}
	 * @param href {string}
	 * @param tabAction {array}
	 * @returns {HTMLAnchorElement}
	 */
	makeNewTabActionLink(text,href,tabAction) {
		return this.makeLink(text,href,()=>this.sendMessage({
			action:'initiateNewTabAction',
			tabAction
		}))
	}

	/**
	 * @param text {string}
	 * @param href {string}
	 * @param tabAction {array}
	 * @returns {HTMLAnchorElement}
	 */
	makeCurrentTabActionLink(text,href,tabAction) {
		return this.makeLink(text,href,()=>this.sendMessage({
			action:'initiateCurrentTabAction',
			tabAction,
			tabId:this.tabId
		}))
	}

	/**
	 * @param text {string}
	 * @param href {string}
	 * @param tabAction {array}
	 * @returns {HTMLAnchorElement}
	 */
	makeImmediateCurrentTabActionLink(text,href,tabAction) {
		return this.makeLink(text,href,()=>this.sendMessage({
			action:'initiateImmediateCurrentTabAction',
			tabAction,
			tabId:this.tabId
		}))
	}

	/**
	 * @param text {string}
	 * @param href {string}
	 * @param clickHandler {()=>void}
	 * @returns {HTMLAnchorElement}
	 */
	makeLink(text,href,clickHandler) {
		const $a=this.document.createElement('a')
		$a.textContent=text
		$a.href=href
		$a.addEventListener('click',ev=>{
			ev.preventDefault()
			clickHandler(ev)
			this.closeWindow()
		})
		return $a
	}
}
