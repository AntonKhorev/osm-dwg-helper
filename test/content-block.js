import {strict as assert} from 'assert'
import {JSDOM} from 'jsdom'

describe("block content script",()=>{
	it("scrapes the webpage",async()=>{
		const dom=await JSDOM.fromFile('test/block.html')
		// console.log('doc:',dom.window.document.body.innerHTML)
		// TODO
	})
})
