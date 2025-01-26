import MenuWriter from '../menu-writer.js'
import MenuLinkWriter from '../menu-link-writer.js'

export default class Menu {
	constructor(document,closeWindow,createTab,sendMessage) {
		this.document=document
		this.closeWindow=closeWindow
		this.createTab=createTab
		this.sendMessage=sendMessage
	}

	makeWriter($menu) {
		return new MenuWriter(this.document,$menu)
	}

	makeLinkWriter(tabId) {
		return new MenuLinkWriter(this.document,this.closeWindow,this.createTab,this.sendMessage,tabId)
	}
}
