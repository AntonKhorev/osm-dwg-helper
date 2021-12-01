import {strict as assert} from 'assert'

import icon from '../src/icon.js'

describe("icon",()=>{
	it("doesn't contain spaces",async()=>{
		const iconPath=icon()
		assert(!iconPath.includes(' '))
	})
})
