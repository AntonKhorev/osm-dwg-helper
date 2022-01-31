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
	it("populates the form",()=>{
		const {document}=new JSDOM(
			`<!DOCTYPE html>`+
			`<form action="/otrs/index.pl" method="post" enctype="multipart/form-data" name="compose" id="NewPhoneTicket" class="Validate PreventMultipleSubmits">`+
			`<input id="FromCustomer" type="text" name="FromCustomer" value="" class="CustomerAutoComplete W75pc " autocomplete="off" />`+
			`<select name="Dest" id="Dest" class="Validate_Required Modernize" data-tree="true"   >`+
			`<option value="||-">-</option>`+
			`<option value="5||Data Working Group">Data Working Group</option>`+
			`<option value="37||Data Working Group::API Misuse">&nbsp;&nbsp;API Misuse</option>`+
			`</select>`+
			`<input class="W75pc Validate_Required " type="text" name="Subject" id="Subject" value=""/>`+
			`<textarea id="RichText" class="RichText Validate_Required " name="Body" title="Message body" rows="15" cols="78"></textarea>`+
			`</form>`
		).window
		contentScript.addIssueDataToTicket(document,{
			Subject:`Problem!`,
			Body:`<p>Issue report here!</p>`,
			FromCustomers:[`Some One <someone@example.com>`]
		})
		assert.equal(
			document.getElementById('Subject').value,
			"Problem!"
		)
		assert.equal(
			document.getElementById('RichText').value,
			"<p>Issue report here!</p>"
		)
		assert.equal(
			document.getElementById('Dest').value,
			"5||Data Working Group"
		)
	})
})
