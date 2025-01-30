import {strict as assert} from 'assert'
import {JSDOM} from 'jsdom'

import * as contentScript from '../../src/content/message.js'

describe("message content script",()=>{
	it("scrapes the webpage",async()=>{
		const {document}=(await JSDOM.fromFile('test/message.html')).window
		const messageData=contentScript.getMessageData(document)
		assert.equal(messageData.user,'SomeUserName')
		assert.equal(messageData.body,`<p>Lorem ipsum hello world!</p>\n`)
		assert.equal(messageData.isInbound,true)
	})
})
