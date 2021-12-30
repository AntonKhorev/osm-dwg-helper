import {strict as assert} from 'assert'
import {JSDOM} from 'jsdom'

import makeNewActionsMenuWriter from '../src/panel-actions-new.js'

const createDocumentAndMenuList=()=>{
	const {document}=(new JSDOM()).window
	const $menu=document.createElement('ul')
	document.body.append($menu)
	return [document,$menu]
}

const findItem=($menu,text)=>{
	for (const $li of $menu.children) {
		const $item=$li.firstElementChild
		if (!$item) continue
		if ($item.innerText.includes(text)) return $item
	}
}

describe("panel-actions-new",()=>{
	it("writes nothing without settings/permissions",()=>{
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
	it("writes open issues link if has osm settings",()=>{
		const [document,$menu]=createDocumentAndMenuList()
		const writeNewActionsMenu=makeNewActionsMenuWriter(
			document,
			()=>{},
			(createProperties)=>{},
			(message)=>{}
		)
		const settings={osm:'https://myosm.example.com/'}
		const permissions={}
		const tabId=1
		const tabState={}
		const otherTabId=2
		const otherTabState={}
		writeNewActionsMenu($menu,settings,permissions,tabId,tabState,otherTabId,otherTabState)
		const $item=findItem($menu,'open OSM issues')
		assert($item)
		assert.equal($item.href,`https://myosm.example.com/issues?status=open`)
	})
})
