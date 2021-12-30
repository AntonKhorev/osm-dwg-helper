import {strict as assert} from 'assert'
import {JSDOM} from 'jsdom'

import makeNewActionsMenuWriter from '../src/panel-actions-new.js'

const createDocumentAndMenuList=()=>{
	const {document}=(new JSDOM()).window
	const $menu=document.createElement('ul')
	document.body.append($menu)
	return [document,$menu]
}

describe("panel-actions-new",()=>{
	it("writes nothing without settings/permissions",async()=>{
		const [document,$menu]=createDocumentAndMenuList()
		const writeNewActionsMenu=makeNewActionsMenuWriter(
			document,
			()=>{},
			(createProperties)=>{},
			(message)=>{}
		)
		const settings={}
		const permissions={}
		const tabId=1
		const tabState={}
		const otherTabId=2
		const otherTabState={}
		writeNewActionsMenu($menu,settings,permissions,tabId,tabState,otherTabId,otherTabState)
		assert.equal($menu.childElementCount,0)
	})
})
