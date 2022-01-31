import {strict as assert} from 'assert'
import {JSDOM} from 'jsdom'

import * as contentScript from '../src/content/create-ticket.js'

describe("create ticket content script",()=>{
	it("throws on unknown webpage",()=>{
		const {document}=new JSDOM(`<!DOCTYPE html><p>wrong page!`).window
		assert.throws(()=>{
			contentScript.addIssueDataToTicket(document,{})
		})
	})
	it("inserts login message and throws on login page",()=>{
		const {document}=new JSDOM(`<!DOCTYPE html><div id=LoginBox>login form here</div>`).window
		assert.throws(()=>{
			contentScript.addIssueDataToTicket(document,{})
		})
		const $informBox=document.querySelector('#LoginBox .ErrorBox')
		assert($informBox)
		assert($informBox.innerHTML.includes('ticket'))
	})
})
