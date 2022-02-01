import {strict as assert} from 'assert'
import {JSDOM} from 'jsdom'

import makeActionsMenuWriters from '../src/panel-actions.js'

const createDocumentAndMenuPlaceholders=()=>{
	const {document}=(new JSDOM()).window
	const $newMenu=document.createElement('ul')
	document.body.append($newMenu)
	const $otherMenu=document.createElement('ul')
	document.body.append($otherMenu)
	return [document,$newMenu,$otherMenu]
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
const assertItem=($menu,text)=>{
	const $item=findItem($menu,text)
	assert($item,`no expected menu entry "${text}"`)
	return $item
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
const assertSubItem=($menu,text,subText)=>{
	const $item=findSubItem($menu,text,subText)
	assert($item,`no expected menu entry "${text} > ${subText}"`)
	return $item
}

describe("panel-actions-new",()=>{
	it("writes nothing without settings/permissions",()=>{
		const [document,$newMenu,$otherMenu]=createDocumentAndMenuPlaceholders()
		const [callbacks,callbackLog]=createCallbacksWithLog()
		const [writeNewActionsMenu,writeOtherActionsMenu]=makeActionsMenuWriters(document,...callbacks)
		const settings={}
		const permissions={}
		const tabId=1
		const tabState={}
		const otherTabId=2
		const otherTabState={}
		writeNewActionsMenu($newMenu,settings,permissions,tabId,tabState)
		writeOtherActionsMenu($otherMenu,settings,permissions,tabId,tabState,otherTabId,otherTabState)
		assert.equal($newMenu.childElementCount,0)
		assert.equal($otherMenu.childElementCount,0)
	})
	it("writes open issues link if has osm settings",()=>{
		const [document,$newMenu]=createDocumentAndMenuPlaceholders()
		const [callbacks,callbackLog]=createCallbacksWithLog()
		const [writeNewActionsMenu]=makeActionsMenuWriters(document,...callbacks)
		const settings={osm:'https://myosm.example.com/'}
		const permissions={}
		const tabId=1
		const tabState={}
		writeNewActionsMenu($newMenu,settings,permissions,tabId,tabState)
		const $item=assertItem($newMenu,'open OSM issues')
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
		const [document,$newMenu]=createDocumentAndMenuPlaceholders()
		const [callbacks,callbackLog]=createCallbacksWithLog()
		const [writeNewActionsMenu]=makeActionsMenuWriters(document,...callbacks)
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
		writeNewActionsMenu($newMenu,settings,permissions,tabId,tabState)
		const $item=assertSubItem($newMenu,'Create ticket','issue #321')
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
		const [document,,$otherMenu]=createDocumentAndMenuPlaceholders()
		const [callbacks,callbackLog]=createCallbacksWithLog()
		const [,writeOtherActionsMenu]=makeActionsMenuWriters(document,...callbacks)
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
		writeOtherActionsMenu($otherMenu,settings,permissions,tabId,tabState,otherTabId,otherTabState)
		const $item=assertSubItem($otherMenu,'Add unread reports','note')
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
		const [document,,$otherMenu]=createDocumentAndMenuPlaceholders()
		const [callbacks,callbackLog]=createCallbacksWithLog()
		const [,writeOtherActionsMenu]=makeActionsMenuWriters(document,...callbacks)
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
		writeOtherActionsMenu($otherMenu,settings,permissions,tabId,tabState,otherTabId,otherTabState)
		const $item=findSubItem($otherMenu,'Add unread reports','note')
		assert.equal($item,undefined)
	})
})
