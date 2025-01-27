import {strict as assert} from 'assert'
import {JSDOM} from 'jsdom'

import makeActionsMenuWriters from '../src/panel-actions.js'

const createDocumentAndMenuPlaceholders=()=>{
	const {document}=(new JSDOM()).window
	const result=[document]
	for (const name of ['global','this','other']) {
		const $menu=document.createElement('ul')
		$menu.id='actions-'+name
		document.body.append($menu)
		result.push($menu)
	}
	return result
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

const getSliceLink=($slice)=>{
	return $slice.querySelector('.slice-entry a[href]')
}
const getItemSlice=($li)=>{
	const $slice=$li.firstElementChild
	if (!$slice) return
	if (!$slice.classList.contains('slice')) return
	return $slice
}
const getItemLink=($li)=>{
	const $slice=getItemSlice($li)
	if (!$slice) return
	return getSliceLink($slice)
}
const findItem=($menu,text)=>{
	for (const $li of $menu.children) {
		const $slice=getItemSlice($li)
		if (!$slice) continue
		const $sliceEntry=$slice.querySelector('.slice-entry')
		if (!$sliceEntry) continue
		if ($sliceEntry.textContent.includes(text)) return $li
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
	const $subMenu=$superItem.querySelector('ul')
	if (!$subMenu) return
	return findItem($subMenu,subText)
}
const assertSubItem=($menu,text,subText)=>{
	const $item=findSubItem($menu,text,subText)
	assert($item,`no expected menu entry "${text} > ${subText}"`)
	return $item
}

describe("panel-actions-new",()=>{
	it("writes nothing without settings/permissions",()=>{
		const [document,$globalMenu,$thisMenu,$otherMenu]=createDocumentAndMenuPlaceholders()
		const [callbacks,callbackLog]=createCallbacksWithLog()
		const [writeGlobalActionsMenu,writeThisActionsMenu,writeOtherActionsMenu]=makeActionsMenuWriters(document,...callbacks)
		const settings={}
		const permissions={}
		const tabId=1
		const tabState={}
		const otherTabId=2
		const otherTabState={}
		writeGlobalActionsMenu($globalMenu,settings,permissions,tabId)
		writeThisActionsMenu($thisMenu,settings,permissions,tabId,tabState)
		writeOtherActionsMenu($otherMenu,settings,permissions,tabId,tabState,otherTabId,otherTabState)
		assert.equal($globalMenu.childElementCount,0)
		assert.equal($thisMenu.childElementCount,0)
		assert.equal($otherMenu.childElementCount,0)
	})
	it("writes open issues link if has osm settings",()=>{
		const [document,$globalMenu]=createDocumentAndMenuPlaceholders()
		const [callbacks,callbackLog]=createCallbacksWithLog()
		const [writeGlobalActionsMenu]=makeActionsMenuWriters(document,...callbacks)
		const settings={osm:'https://myosm.example.com/'}
		const permissions={}
		const tabId=1
		writeGlobalActionsMenu($globalMenu,settings,permissions,tabId)
		const $a=getItemLink(assertItem($globalMenu,'open OSM issues'))
		assert.equal($a.href,`https://myosm.example.com/issues?status=open`)
		$a.click()
		assert.deepEqual(callbackLog,[
			['createTab',{
				openerTabId:tabId,
				url:`https://myosm.example.com/issues?status=open`
			}],
			['closeWindow'],
		])
	})
	it("writes create ticket command on issue page if has both osm and otrs settings+permissions",()=>{
		const [document,,$thisMenu]=createDocumentAndMenuPlaceholders()
		const [callbacks,callbackLog]=createCallbacksWithLog()
		const [,writeThisActionsMenu]=makeActionsMenuWriters(document,...callbacks)
		const settings={osm:'https://myosm.example.com/',otrs:'https://myotrs.example.com/'}
		const permissions=settings
		const tabId=1
		const issueData={
			id:'321',
			url:'https://myosm.example.com/issues/321',
			reportedItem:{
				type:'user',
				ref:'SomeOsmUser',
				name:'SomeOsmUser',
				url:'https://myosm.example.com/user/SomeOsmUser'
			},
			reports:[],
			comments:[],
		}
		const tabState={
			type:'issue',
			issueData
		}
		writeThisActionsMenu($thisMenu,settings,permissions,tabId,tabState)
		const $a=getItemLink(assertSubItem($thisMenu,'Create ticket','issue #321'))
		assert.equal($a.href,`https://myotrs.example.com/otrs/index.pl?Action=AgentTicketPhone`)
		$a.click()
		assert.deepEqual(callbackLog,[
			['sendMessage',{
				action:'initiateNewTabAction',
				tabAction:['ScrapeReportedItemThenCreateIssueTicket',tabId,issueData]
			}],
			['closeWindow'],
		])
	})
	it("writes add reports command on ticket page if there are selected reports in other tab and has both osm and otrs settings+permissions",()=>{
		const [document,,,$otherMenu]=createDocumentAndMenuPlaceholders()
		const [callbacks,callbackLog]=createCallbacksWithLog()
		const [,,writeOtherActionsMenu]=makeActionsMenuWriters(document,...callbacks)
		const settings={osm:'https://myosm.example.com/',otrs:'https://myotrs.example.com/'}
		const permissions=settings
		const tabId=1
		const issueData={
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
					byUrl:'https://myosm.example.com/user/WatchfulUser',
					wasRead:false,
					lead:[['plain','reported by '],['user','WatchfulUser']],
					text:`<p>he did things</p>`,
					selected:true,
				}
			],
			comments:[],
		}
		const ticketData={
			id:'54321',
			url:`https://myotrs.example.com/otrs/index.pl?Action=AgentTicketZoom;TicketID=54321`
		}
		const ticketIssueData={
			id:'321'
		}
		const tabState={
			type:'ticket',
			ticketData,
			issueData:ticketIssueData
		}
		const otherTabId=2
		const otherTabState={
			type:'issue',
			issueData
		}
		writeOtherActionsMenu($otherMenu,settings,permissions,tabId,tabState,otherTabId,otherTabState)
		const $a=getItemLink(assertSubItem($otherMenu,'Add 1 selected report','note'))
		assert.equal($a.href,`https://myotrs.example.com/otrs/index.pl?Action=AgentTicketNote;TicketID=54321`)
		$a.click()
		assert.deepEqual(callbackLog,[
			['sendMessage',{
				action:'initiateCurrentTabAction',
				tabAction:['AddSelectedReportsAndCommentsToTicket',ticketData.id,'note',issueData,otherTabId],
				tabId
			}],
			['closeWindow'],
		])
	})
	it("writes add comments command on ticket page if there are selected comments in other tab and has both osm and otrs settings+permissions",()=>{
		const [document,,,$otherMenu]=createDocumentAndMenuPlaceholders()
		const [callbacks,callbackLog]=createCallbacksWithLog()
		const [,,writeOtherActionsMenu]=makeActionsMenuWriters(document,...callbacks)
		const settings={osm:'https://myosm.example.com/',otrs:'https://myotrs.example.com/'}
		const permissions=settings
		const tabId=1
		const issueData={
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
					byUrl:'https://myosm.example.com/user/WatchfulUser',
					wasRead:false,
					lead:[['plain','reported by '],['user','WatchfulUser']],
					text:`<p>he did things</p>`,
					selected:false,
				}
			],
			comments:[
				{
					by:'BoredModerator',
					byUrl:'https://myosm.example.com/user/BoredModerator',
					lead:[['plain','comment from '],['user','BoredModerator']],
					text:`<p>who cares</p>`,
					selected:true,
				}
			],
		}
		const ticketData={
			id:'54321',
			url:`https://myotrs.example.com/otrs/index.pl?Action=AgentTicketZoom;TicketID=54321`
		}
		const ticketIssueData={
			id:'321'
		}
		const tabState={
			type:'ticket',
			ticketData,
			issueData:ticketIssueData
		}
		const otherTabId=2
		const otherTabState={
			type:'issue',
			issueData
		}
		writeOtherActionsMenu($otherMenu,settings,permissions,tabId,tabState,otherTabId,otherTabState)
		const $a=getItemLink(assertSubItem($otherMenu,'Add 1 selected comment','note'))
		assert.equal($a.href,`https://myotrs.example.com/otrs/index.pl?Action=AgentTicketNote;TicketID=54321`)
		$a.click()
		assert.deepEqual(callbackLog,[
			['sendMessage',{
				action:'initiateCurrentTabAction',
				tabAction:['AddSelectedReportsAndCommentsToTicket',ticketData.id,'note',issueData,otherTabId],
				tabId
			}],
			['closeWindow'],
		])
	})
	it("doesn't write add reports command on ticket page if there are no selected reports in other tab",()=>{
		const [document,,,$otherMenu]=createDocumentAndMenuPlaceholders()
		const [callbacks,callbackLog]=createCallbacksWithLog()
		const [,,writeOtherActionsMenu]=makeActionsMenuWriters(document,...callbacks)
		const settings={osm:'https://myosm.example.com/',otrs:'https://myotrs.example.com/'}
		const permissions=settings
		const tabId=1
		const issueData={
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
					byUrl:'https://myosm.example.com/user/WatchfulUser',
					wasRead:false,
					lead:[['plain','reported by '],['user','WatchfulUser']],
					text:`<p>he did things</p>`,
					selected:false,
				}
			],
			comments:[],
		}
		const ticketData={
			id:'54321',
			url:`https://myotrs.example.com/otrs/index.pl?Action=AgentTicketZoom;TicketID=54321`
		}
		const ticketIssueData={
			id:'321'
		}
		const tabState={
			type:'ticket',
			ticketData,
			issueData:ticketIssueData
		}
		const otherTabId=2
		const otherTabState={
			type:'issue',
			issueData
		}
		writeOtherActionsMenu($otherMenu,settings,permissions,tabId,tabState,otherTabId,otherTabState)
		const $item=findSubItem($otherMenu,'selected reports','note')
		assert.equal($item,undefined)
	})
	it("writes add block command on ticket page",()=>{
		const [document,,,$otherMenu]=createDocumentAndMenuPlaceholders()
		const [callbacks,callbackLog]=createCallbacksWithLog()
		const [,,writeOtherActionsMenu]=makeActionsMenuWriters(document,...callbacks)
		const settings={osm:'https://myosm.example.com/',otrs:'https://myotrs.example.com/'}
		const permissions=settings
		const tabId=1
		const blockData={
			id:'789',
			url:'https://myosm.example.com/user_blocks/789',
			user:'BadUser',
			isZeroHour:false,
		}
		const ticketData={
			id:'43215',
			url:`https://myotrs.example.com/otrs/index.pl?Action=AgentTicketZoom;TicketID=43215`
		}
		const tabState={
			type:'ticket',
			ticketData
		}
		const otherTabId=2
		const otherTabState={
			type:'block',
			blockData
		}
		writeOtherActionsMenu($otherMenu,settings,permissions,tabId,tabState,otherTabId,otherTabState)
		const $a=getItemLink(assertSubItem($otherMenu,'block record','note'))
		assert.equal($a.href,`https://myotrs.example.com/otrs/index.pl?Action=AgentTicketNote;TicketID=43215`)
		$a.click()
		assert.deepEqual(callbackLog,[
			['sendMessage',{
				action:'initiateCurrentTabAction',
				tabAction:['AddBlockToTicket',ticketData.id,'note',blockData],
				tabId
			}],
			['closeWindow'],
		])
	})
})
