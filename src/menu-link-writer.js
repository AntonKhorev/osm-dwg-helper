export default class MenuLinkWriter {
	constructor(document,closeWindow,createTab,sendMessage,tabId) {
		this.document=document
		this.closeWindow=closeWindow
		this.createTab=createTab
		this.sendMessage=sendMessage
		this.tabId=tabId
	}

	makePageLink(text,href) {
		return this.makeLink(text,href,()=>this.createTab({openerTabId:this.tabId,url:href}))
	}

	makeLink(text,href,clickHandler) {
		const $a=this.document.createElement('a')
		$a.textContent=text
		$a.href=href
		$a.addEventListener('click',ev=>{
			ev.preventDefault()
			clickHandler()
			this.closeWindow()
		})
		return $a
	}
}
