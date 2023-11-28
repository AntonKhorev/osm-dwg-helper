import {strict as assert} from 'assert'

import ActionsManager from '../src/actions-manager.js'

const settings={} // don't care

class MockBrowserTabs {
	constructor() {
		this.log=[]
		this.tabIdCounter=0
	}
	async create(props) {
		this.log.push(['create',props])
		return {id:++this.tabIdCounter}
	}
	async update(id,props) {
		this.log.push(['update',id,props])
	}
	async remove(id) {
		this.log.push(['remove',id])
	}
}

class MockAction {
	constructor(openerTabId,url,entry) {
		this.openerTabId=openerTabId
		this.url=url
		this.entry=entry
	}
	getActionUrl() {
		return this.url
	}
	needToRejectUrl() {
		return false
	}
	getOngoingActionMenuEntry() {
		return this.entry
	}
}

describe("ActionsManager",()=>{
	it("starts with empty action list",async()=>{
		const browserTabs=new MockBrowserTabs()
		const actionsManager=new ActionsManager(browserTabs)
		const tabActionEntries=actionsManager.listTabActionEntries()
		assert.deepEqual(browserTabs.log,[])
		assert.deepEqual(tabActionEntries,[])
	})
	it("adds action in new tab then lists it",async()=>{
		const browserTabs=new MockBrowserTabs()
		const actionsManager=new ActionsManager(browserTabs)
		const action=new MockAction(101,'url(1)','entry(1)')
		await actionsManager.addNewTabAction(settings,action)
		const tabActionEntries=actionsManager.listTabActionEntries()
		assert.deepEqual(browserTabs.log,[
			['create',{openerTabId:101,url:'url(1)'}]
		])
		assert.deepEqual(tabActionEntries,[
			[1,['entry(1)']]
		])
	})
	it("adds two actions in new tabs then lists them",async()=>{
		const browserTabs=new MockBrowserTabs()
		const actionsManager=new ActionsManager(browserTabs)
		const action1=new MockAction(101,'url(1)','entry(1)')
		await actionsManager.addNewTabAction(settings,action1)
		const action2=new MockAction(102,'url(2)','entry(2)')
		await actionsManager.addNewTabAction(settings,action2)
		const tabActionEntries=actionsManager.listTabActionEntries()
		assert.deepEqual(browserTabs.log,[
			['create',{openerTabId:101,url:'url(1)'}],
			['create',{openerTabId:102,url:'url(2)'}]
		])
		assert.deepEqual(tabActionEntries,[
			[1,['entry(1)']],
			[2,['entry(2)']]
		])
	})
	it("adds action in current tab then lists it",async()=>{
		const browserTabs=new MockBrowserTabs()
		const actionsManager=new ActionsManager(browserTabs)
		const action=new MockAction(101,'url(11)','entry(11)')
		await actionsManager.addCurrentTabAction(settings,action,11)
		const tabActionEntries=actionsManager.listTabActionEntries()
		assert.deepEqual(browserTabs.log,[
			['update',11,{url:'url(11)'}]
		])
		assert.deepEqual(tabActionEntries,[
			[11,['entry(11)']]
		])
	})
	it("adds immediate action in current tab then lists it",async()=>{
		const browserTabs=new MockBrowserTabs()
		const actionsManager=new ActionsManager(browserTabs)
		const action=new MockAction(101,'url(11)','entry(11)')
		actionsManager.addImmediateCurrentTabAction(action,11)
		const tabActionEntries=actionsManager.listTabActionEntries()
		assert.deepEqual(browserTabs.log,[])
		assert.deepEqual(tabActionEntries,[
			[11,['entry(11)']]
		])
	})
	it("adds two actions in current tab then lists it",async()=>{
		const browserTabs=new MockBrowserTabs()
		const actionsManager=new ActionsManager(browserTabs)
		const action1=new MockAction(101,'url(1)','entry(1)')
		await actionsManager.addCurrentTabAction(settings,action1,23)
		const action2=new MockAction(101,'url(2)','entry(2)')
		actionsManager.addImmediateCurrentTabAction(action2,23)
		const tabActionEntries=actionsManager.listTabActionEntries()
		assert.deepEqual(browserTabs.log,[
			['update',23,{url:'url(1)'}]
		])
		assert.deepEqual(tabActionEntries,[
			[23,['entry(1)','entry(2)']]
		])
	})
	it("act report no changes if no actions added",async()=>{
		const browserTabs=new MockBrowserTabs()
		const actionsManager=new ActionsManager(browserTabs)
		const isUpdated=await actionsManager.act(settings,42)
		assert.deepEqual(browserTabs.log,[])
		assert.equal(isUpdated,false)
	})
})
