import {strict as assert} from 'assert'

import StatesManager from '../src/states-manager.js'

describe("StatesManager",()=>{
	it("evaluates tab states of unknown type over clean state",async()=>{
		const statesManager=new StatesManager()
		const tabMessenger=async()=>{}
		const activeTabs=[
			{id:23, url:`http://example.com/23.html`, active:true},
			{id:42, url:`http://example.com/42.html`, active:true},
		]
		const [tabIds,otherTabId,tabStates]=await statesManager.updateTabStatesBecauseSettingsChanged({},{},activeTabs,tabMessenger)
		assert.deepEqual(tabIds,[])
		assert.equal(otherTabId,undefined)
		assert.deepEqual(tabStates,{})
	})
	it("evaluates message tab state over clean state without permissions",async()=>{
		const statesManager=new StatesManager()
		const tabMessenger=async()=>{}
		const settings={
			osm: `https://myosm.org/`,
		}
		const permissions={}
		const activeTabs=[
			{id:23, url:`https://myosm.org/messages/321`, active:true},
		]
		const [tabIds,otherTabId,tabStates]=await statesManager.updateTabStatesBecauseSettingsChanged(settings,permissions,activeTabs,tabMessenger)
		assert.deepEqual(tabIds,[23])
		assert.equal(otherTabId,undefined)
		assert.equal(tabStates[23].type,'message')
		assert.equal(tabStates[23].messageData.id,'321')
		assert.equal(tabStates[23].messageData.url,`https://myosm.org/messages/321`)
	})
})
