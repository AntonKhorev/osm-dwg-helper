import {strict as assert} from 'assert'

import makeMessageTabTest from './test-message-tab.js'
import StatesManager from '../src/states-manager.js'

describe("StatesManager",()=>{
	it("evaluates tab states of unknown type over clean state then reevaluates them",async()=>{
		const [tabMessenger,testAfterTabMessenger]=makeMessageTabTest()
		const statesManager=new StatesManager(tabMessenger)
		const activeTabs=[
			{id:23, url:`http://example.com/23.html`, active:true},
			{id:42, url:`http://example.com/42.html`, active:true},
		]
		{
			const [tabIds,otherTabId,tabStates]=await statesManager.updateTabStatesBecauseSettingsChanged({},{},activeTabs)
			testAfterTabMessenger()
			assert.deepEqual(tabIds,[23,42])
			assert.equal(otherTabId,undefined)
		}
		{
			const [tabIds,otherTabId,tabStates]=await statesManager.updateTabStatesBecauseSettingsChanged({},{},activeTabs)
			testAfterTabMessenger()
			assert.deepEqual(tabIds,[])
			assert.equal(otherTabId,undefined)
		}
	})
	it("evaluates message tab state over clean state without permissions",async()=>{
		const settings={
			osm: `https://myosm.org/`,
		}
		const permissions={}
		const activeTabs=[
			{id:23, url:`https://myosm.org/messages/321`, active:true},
		]
		const [tabMessenger,testAfterTabMessenger]=makeMessageTabTest()
		const statesManager=new StatesManager(tabMessenger)
		const [tabIds,otherTabId,tabStates]=await statesManager.updateTabStatesBecauseSettingsChanged(settings,permissions,activeTabs)
		testAfterTabMessenger()
		assert.deepEqual(tabIds,[23])
		assert.equal(otherTabId,undefined)
		assert.equal(tabStates[23].type,'message')
		assert.equal(tabStates[23].messageData.id,'321')
		assert.equal(tabStates[23].messageData.url,`https://myosm.org/messages/321`)
		assert.equal(tabStates[23].messageData.extraStuff,undefined)
	})
	it("evaluates message tab state over clean state with permissions",async()=>{
		const settings={
			osm: `https://myosm.org/`,
		}
		const permissions={
			osm: `https://myosm.org/`,
		}
		const activeTabs=[
			{id:23, url:`https://myosm.org/messages/321`, active:true},
		]
		const [tabMessenger,testAfterTabMessenger]=makeMessageTabTest([(tabId,script,message)=>{
			assert.equal(tabId,23)
			assert.equal(script,'message')
			assert.equal(message.action,'getMessageData')
		}],[
			{extraStuff:'Extra stuff!!'}
		])
		const statesManager=new StatesManager(tabMessenger)
		const [tabIds,otherTabId,tabStates]=await statesManager.updateTabStatesBecauseSettingsChanged(settings,permissions,activeTabs)
		testAfterTabMessenger()
		assert.deepEqual(tabIds,[23])
		assert.equal(otherTabId,undefined)
		assert.equal(tabStates[23].type,'message')
		assert.equal(tabStates[23].messageData.id,'321')
		assert.equal(tabStates[23].messageData.url,`https://myosm.org/messages/321`)
		assert.equal(tabStates[23].messageData.extraStuff,'Extra stuff!!')
	})
	it("switches tabs",async()=>{
		const settings={
			osm: `https://myosm.org/`,
		}
		const permissions={}
		const [tabMessenger,testAfterTabMessenger]=makeMessageTabTest()
		const statesManager=new StatesManager(tabMessenger)
		{
			const tab={id:12, url:`http://example.com/`, active:true}
			const [tabIds,otherTabId,tabStates]=await statesManager.updateTabStatesBecauseBrowserTabActivated(settings,permissions,tab)
			testAfterTabMessenger()
			assert.deepEqual(tabIds,[12])
			assert.equal(otherTabId,undefined)
		}
		{
			const tab={id:23, url:`https://myosm.org/messages/321`, active:true}
			const [tabIds,otherTabId,tabStates]=await statesManager.updateTabStatesBecauseBrowserTabActivated(settings,permissions,tab)
			testAfterTabMessenger()
			assert.deepEqual(tabIds,[23])
			assert.equal(otherTabId,12)
			assert.equal(tabStates[23].type,'message')
		}
	})
	it("switches tabs from startup state",async()=>{
		const settings={
			osm: `https://myosm.org/`,
		}
		const permissions={}
		const [tabMessenger,testAfterTabMessenger]=makeMessageTabTest()
		const statesManager=new StatesManager(tabMessenger)
		{
			const activeTabs=[
				{id:12, url:`http://example.com/`, active:true}
			]
			const [tabIds,otherTabId,tabStates]=await statesManager.updateTabStatesOnStartup(settings,permissions,activeTabs,activeTabs)
			testAfterTabMessenger()
			assert.deepEqual(tabIds,[12])
			assert.equal(otherTabId,undefined)
		}
		{
			const tab={id:23, url:`https://myosm.org/messages/321`, active:true}
			const [tabIds,otherTabId,tabStates]=await statesManager.updateTabStatesBecauseBrowserTabActivated(settings,permissions,tab)
			testAfterTabMessenger()
			assert.deepEqual(tabIds,[23])
			assert.equal(otherTabId,12)
			assert.equal(tabStates[23].type,'message')
		}
	})
	it("doesn't set other tab to previous when activating the same tab",async()=>{
		const settings={
			osm: `https://myosm.org/`,
		}
		const permissions={}
		const [tabMessenger,testAfterTabMessenger]=makeMessageTabTest()
		const statesManager=new StatesManager(tabMessenger)
		{
			const tab={id:12, url:`http://example.com/`, active:true}
			const [tabIds,otherTabId,tabStates]=await statesManager.updateTabStatesBecauseBrowserTabActivated(settings,permissions,tab)
			testAfterTabMessenger()
			assert.deepEqual(tabIds,[12])
			assert.equal(otherTabId,undefined)
		}
		{
			const tab={id:12, url:`http://example.com/`, active:true}
			const [tabIds,otherTabId,tabStates]=await statesManager.updateTabStatesBecauseBrowserTabActivated(settings,permissions,tab)
			testAfterTabMessenger()
			assert.deepEqual(tabIds,[12])
			assert.equal(otherTabId,undefined)
		}
	})
	it("clears other tab when removing highlight",async()=>{
		const settings={
			osm: `https://myosm.org/`,
		}
		const permissions={}
		const [tabMessenger,testAfterTabMessenger]=makeMessageTabTest()
		const statesManager=new StatesManager(tabMessenger)
		{
			const tab={id:12, url:`http://example.com/`, active:true}
			const otherTab={id:23, url:`https://myosm.org/messages/321`, active:true}
			const [tabIds,otherTabId,tabStates]=await statesManager.updateTabStatesBecauseBrowserTabActivated(settings,permissions,tab,otherTab)
			testAfterTabMessenger()
			assert.deepEqual(tabIds,[12])
			assert.equal(otherTabId,23)
			assert.equal(tabStates[23].type,'message')
		}
		{
			const tab={id:12, url:`http://example.com/`, active:true}
			const [tabIds,otherTabId,tabStates]=await statesManager.updateTabStatesBecauseBrowserTabActivated(settings,permissions,tab)
			testAfterTabMessenger()
			assert.deepEqual(tabIds,[12])
			assert.equal(otherTabId,undefined)
		}
	})
	it("sets tab to previous activated when removing highlight and activating new tab",async()=>{
		const settings={
			osm: `https://myosm.org/`,
		}
		const permissions={}
		const [tabMessenger,testAfterTabMessenger]=makeMessageTabTest()
		const statesManager=new StatesManager(tabMessenger)
		{
			const tab={id:12, url:`http://example.com/`, active:true}
			const otherTab={id:23, url:`https://myosm.org/messages/321`, active:false}
			const [tabIds,otherTabId,tabStates]=await statesManager.updateTabStatesBecauseBrowserTabActivated(settings,permissions,tab,otherTab)
			testAfterTabMessenger()
			assert.deepEqual(tabIds,[12])
			assert.equal(otherTabId,23)
			assert.equal(tabStates[23].type,'message')
		}
		{
			const tab={id:42, url:`https://myosm.org/issues/654`, active:true}
			const [tabIds,otherTabId,tabStates]=await statesManager.updateTabStatesBecauseBrowserTabActivated(settings,permissions,tab)
			testAfterTabMessenger()
			assert.deepEqual(tabIds,[42])
			assert.equal(otherTabId,12)
			assert.equal(tabStates[42].type,'issue')
		}
	})
})
