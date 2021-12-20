import {strict as assert} from 'assert'

import StatesManager from '../src/states-manager.js'

describe("StatesManager",()=>{
	it("reevaluates tab states of unknown type over clean state",async()=>{
		const statesManager=new StatesManager()
		const tabMessenger=async()=>{}
		const activeTabs=[
			{id:23, url:`http://example.com/23.html`, active:true},
			{id:42, url:`http://example.com/42.html`, active:true},
		]
		await statesManager.updateTabStatesBecauseSettingsChanged({},{},activeTabs,tabMessenger)
	})
})
