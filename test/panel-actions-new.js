import {strict as assert} from 'assert'
import {JSDOM} from 'jsdom'

import makeNewActionsMenuWriter from '../src/panel-actions-new.js'

const createDocumentAndMenuPlaceholder=()=>{
	const {document}=(new JSDOM()).window
	const $menu=document.createElement('ul')
	document.body.append($menu)
	return [document,$menu]
}

const createCallbacksWithLog=()=>{
	const callbackLog=[]
	return [
		[
			()=>{
				callbackLog.push(['closeWindow'])
			},
			(createProperties)=>{
				callbackLog.push(['createTab',createProperties])
			},
			(message)=>{
				callbackLog.push(['sendMessage',message])
			}
		],
		callbackLog
	]
}

const findItem=($menu,text)=>{
	for (const $li of $menu.children) {
		const $item=$li.firstElementChild
		if (!$item) continue
		if ($item.innerText.includes(text)) return $item
	}
}
const findSubItem=($menu,text,subText)=>{
	const $superItem=findItem($menu,text)
	if (!$superItem) return
	const $subMenu=$superItem.nextElementSibling
	for (const $li of $subMenu.children) {
		const $item=$li.firstElementChild
		if (!$item) continue
		if ($item.innerText.includes(subText)) return $item
	}
}

describe("panel-actions-new",()=>{
	it("writes nothing without settings/permissions",()=>{
		const [document,$menu]=createDocumentAndMenuPlaceholder()
		const [callbacks,callbackLog]=createCallbacksWithLog()
		const writeNewActionsMenu=makeNewActionsMenuWriter(document,...callbacks)
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
		const [document,$menu]=createDocumentAndMenuPlaceholder()
		const [callbacks,callbackLog]=createCallbacksWithLog()
		const writeNewActionsMenu=makeNewActionsMenuWriter(document,...callbacks)
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
		$item.click()
		assert.deepEqual(callbackLog,[
			['createTab',{
				openerTabId:tabId,
				url:`https://myosm.example.com/issues?status=open`
			}],
			['closeWindow'],
		])
	})
	it("writes create ticket command on issue page if has both osm and otrs settings+permissions",()=>{
		const [document,$menu]=createDocumentAndMenuPlaceholder()
		const [callbacks,callbackLog]=createCallbacksWithLog()
		const writeNewActionsMenu=makeNewActionsMenuWriter(document,...callbacks)
		const settings={osm:'https://myosm.example.com/',otrs:'https://myotrs.example.com/'}
		const permissions=settings
		const tabId=1
		const issueData={
			osmRoot:'https://myosm.example.com/',
			id:'321',
			url:'https://myosm.example.com/issues/321',
			reportedItem:{
				type:'user',
				ref:'SomeOsmUser',
				name:'SomeOsmUser',
				url:'https://myosm.example.com/user/SomeOsmUser'
			},
			reports:[]
		}
		const tabState={
			type:'issue',
			issueData
		}
		const otherTabId=2
		const otherTabState={}
		writeNewActionsMenu($menu,settings,permissions,tabId,tabState,otherTabId,otherTabState)
		const $item=findSubItem($menu,'Create ticket','issue #321')
		assert($item)
		assert.equal($item.href,`https://myotrs.example.com/otrs/index.pl?Action=AgentTicketPhone`)
		$item.click()
		assert.deepEqual(callbackLog,[
			['sendMessage',{
				action:'initiateNewTabAction',
				tabAction:['ScrapeReportedItemThenCreateIssueTicket',tabId,issueData]
			}],
			['closeWindow'],
		])
	})
	it("writes add reports command on ticket page if there are unread reports in other tab and has both osm and otrs settings+permissions",()=>{
		const [document,$menu]=createDocumentAndMenuPlaceholder()
		const [callbacks,callbackLog]=createCallbacksWithLog()
		const writeNewActionsMenu=makeNewActionsMenuWriter(document,...callbacks)
		const settings={osm:'https://myosm.example.com/',otrs:'https://myotrs.example.com/'}
		const permissions=settings
		const tabId=1
		const issueData={
			osmRoot:'https://myosm.example.com/',
			id:'321',
			url:'https://myosm.example.com/issues/321',
			reportedItem:{
				type:'user',
				ref:'SomeOsmUser',
				name:'SomeOsmUser',
				url:'https://myosm.example.com/user/SomeOsmUser'
			},
			reports:[
				{
					by:'WatchfulUser',
					wasRead:false,
					lead:[['plain','reported by '],['user','WatchfulUser']],
					text:['he did things'],
				}
			]
		}
		const ticketData={
			id:'54321',
			url:`https://myotrs.example.com/otrs/index.pl?Action=AgentTicketZoom;TicketID=54321`
		}
		const tabState={
			type:'ticket',
			ticketData
		}
		const otherTabId=2
		const otherTabState={
			type:'issue',
			issueData
		}
		writeNewActionsMenu($menu,settings,permissions,tabId,tabState,otherTabId,otherTabState)
		const $item=findSubItem($menu,'Add unread reports','note')
		assert($item)
		assert.equal($item.href,`https://myotrs.example.com/otrs/index.pl?Action=AgentTicketNote;TicketID=54321`)
		$item.click()
		assert.deepEqual(callbackLog,[
			['sendMessage',{
				action:'initiateCurrentTabAction',
				tabAction:['AddUnreadReportsToTicket',ticketData.id,'note',issueData,otherTabId],
				tabId
			}],
			['closeWindow'],
		])
	})
	it("doesn't write add reports command on ticket page if there are no unread reports in other tab",()=>{
		const [document,$menu]=createDocumentAndMenuPlaceholder()
		const [callbacks,callbackLog]=createCallbacksWithLog()
		const writeNewActionsMenu=makeNewActionsMenuWriter(document,...callbacks)
		const settings={osm:'https://myosm.example.com/',otrs:'https://myotrs.example.com/'}
		const permissions=settings
		const tabId=1
		const issueData={
			osmRoot:'https://myosm.example.com/',
			id:'321',
			url:'https://myosm.example.com/issues/321',
			reportedItem:{
				type:'user',
				ref:'SomeOsmUser',
				name:'SomeOsmUser',
				url:'https://myosm.example.com/user/SomeOsmUser'
			},
			reports:[
				{
					by:'WatchfulUser',
					wasRead:true,
					lead:[['plain','reported by '],['user','WatchfulUser']],
					text:['he did things'],
				}
			]
		}
		const ticketData={
			id:'54321',
			url:`https://myotrs.example.com/otrs/index.pl?Action=AgentTicketZoom;TicketID=54321`
		}
		const tabState={
			type:'ticket',
			ticketData
		}
		const otherTabId=2
		const otherTabState={
			type:'issue',
			issueData
		}
		writeNewActionsMenu($menu,settings,permissions,tabId,tabState,otherTabId,otherTabState)
		const $item=findSubItem($menu,'Add unread reports','note')
		assert.equal($item,undefined)
	})
})
