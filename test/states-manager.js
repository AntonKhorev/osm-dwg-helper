import {strict as assert} from 'assert'

import StatesManager from '../src/states-manager.js'

describe("StatesManager",()=>{
	/*
	it("doesn't try to get state of undefined tab",async()=>{
		const statesManager=new StatesManager()
		const activeTabId=342
		const tabGetterCalls=[]
		const tabGetter=async(tabId)=>{
			tabGetterCalls.push(tabId)
			return {
				id:tabId,
				url:`http://example.com/${tabId}.html`,
				active:tabId==activeTabId
			}
		}
		const tabMessenger=async()=>{}
		await statesManager.updateTabStatesBecauseBrowserTabActivated({},{},342,tabGetter,tabMessenger)
		assert.deepEqual(tabGetterCalls,[342])
	})
	*/
})
