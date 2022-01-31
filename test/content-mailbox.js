import {strict as assert} from 'assert'
import {JSDOM} from 'jsdom'

import * as contentScript from '../src/content/mailbox.js'

describe("mailbox content script",()=>{
	it("scrapes the webpage",async()=>{
		const {document}=(await JSDOM.fromFile('test/mailbox.html')).window
		const messageId=contentScript.getTopMessageId(document)
		assert.equal(messageId,'44')
	})
})
