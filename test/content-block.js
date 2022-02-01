import {strict as assert} from 'assert'
import {JSDOM} from 'jsdom'

import * as contentScript from '../src/content/block.js'

describe("block content script",()=>{
	it("scrapes the webpage",async()=>{
		const {document}=(await JSDOM.fromFile('test/block.html')).window
		const blockData=contentScript.getBlockData(document)
		assert.equal(blockData.user,'BadUser')
		assert.equal(blockData.isZeroHour,true)
	})
})
