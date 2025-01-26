import GlobalMenu from './menu/global.js'
import ThisMenu from './menu/this.js'
import OtherMenu from './menu/other.js'

/**
 * @returns [global, this tab, this+other tab] actions menu updater functions
 */
export default (document,closeWindow,createTab,sendMessage)=>{
	const globalMenu=new GlobalMenu(document,closeWindow,createTab,sendMessage)
	const thisMenu=new ThisMenu(document,closeWindow,createTab,sendMessage)
	const otherMenu=new OtherMenu(document,closeWindow,createTab,sendMessage)
	return [($menu,settings,permissions,tabId)=>{
		globalMenu.update($menu,settings,permissions,tabId)
	},($menu,settings,permissions,tabId,tabState)=>{
		thisMenu.update($menu,settings,permissions,tabId,tabState)
	},($menu,settings,permissions,tabId,tabState,otherTabId,otherTabState)=>{
		otherMenu.update($menu,settings,permissions,tabId,tabState,otherTabId,otherTabState)
	}]
}
