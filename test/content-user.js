import {strict as assert} from 'assert'
import {JSDOM} from 'jsdom'

import * as contentScript from '../src/content/user.js'

describe("user content script",()=>{
	it("scrapes the webpage",async()=>{
		const {document}=(await JSDOM.fromFile('test/user.html')).window
		const userId=contentScript.getUserId(document)
		assert.equal(userId,'11068')
	})
})
