import {strict as assert} from 'assert'

import makeMessageTabTest from './test-message-tab.js'
import StatesManager from '../src/states-manager.js'

describe("StatesManager",()=>{
	it("evaluates tab states of unknown type over clean state",async()=>{
		const statesManager=new StatesManager()
		const [tabMessenger,testAfterTabMessenger]=makeMessageTabTest()
		const activeTabs=[
			{id:23, url:`http://example.com/23.html`, active:true},
			{id:42, url:`http://example.com/42.html`, active:true},
		]
		const [tabIds,otherTabId,tabStates]=await statesManager.updateTabStatesBecauseSettingsChanged({},{},activeTabs,tabMessenger)
		testAfterTabMessenger()
		assert.deepEqual(tabIds,[])
		assert.equal(otherTabId,undefined)
		assert.deepEqual(tabStates,{})
	})
	it("evaluates message tab state over clean state without permissions",async()=>{
		const settings={
			osm: `https://myosm.org/`,
		}
		const permissions={}
		const activeTabs=[
			{id:23, url:`https://myosm.org/messages/321`, active:true},
		]
		const statesManager=new StatesManager()
		const [tabMessenger,testAfterTabMessenger]=makeMessageTabTest()
		const [tabIds,otherTabId,tabStates]=await statesManager.updateTabStatesBecauseSettingsChanged(settings,permissions,activeTabs,tabMessenger)
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
		const statesManager=new StatesManager()
		const [tabMessenger,testAfterTabMessenger]=makeMessageTabTest([(tabId,script,message)=>{
			assert.equal(tabId,23)
			assert.equal(script,'message')
			assert.equal(message.action,'getMessageData')
		}],[
			{extraStuff:'Extra stuff!!'}
		])
		const [tabIds,otherTabId,tabStates]=await statesManager.updateTabStatesBecauseSettingsChanged(settings,permissions,activeTabs,tabMessenger)
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
		const statesManager=new StatesManager()
		{
			const tab={id:12, url:`http://example.com/`, active:true}
			const [tabMessenger,testAfterTabMessenger]=makeMessageTabTest()
			const [tabIds,otherTabId,tabStates]=await statesManager.updateTabStatesBecauseBrowserTabActivated(settings,permissions,tab,tabMessenger)
			testAfterTabMessenger()
			assert.deepEqual(tabIds,[12])
			assert.equal(otherTabId,undefined)
		}
		{
			const tab={id:23, url:`https://myosm.org/messages/321`, active:true}
			const [tabMessenger,testAfterTabMessenger]=makeMessageTabTest()
			const [tabIds,otherTabId,tabStates]=await statesManager.updateTabStatesBecauseBrowserTabActivated(settings,permissions,tab,tabMessenger)
			testAfterTabMessenger()
			assert.deepEqual(tabIds,[23])
			assert.equal(otherTabId,12)
			assert.equal(tabStates[23].type,'message')
		}
	})
})
