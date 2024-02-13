import {strict as assert} from 'assert'
import {JSDOM} from 'jsdom'

import * as contentScript from '../src/content/ticket-article.js'

const otrsPageHtml = (
	`<!DOCTYPE html>`+
	`<form action="/otrs/index.pl" method="post" enctype="multipart/form-data" name="compose" id="Compose" class="Validate PreventMultipleSubmits">`+
	`<input type="text" id="Subject" name="Subject" value="" class="W75pc Validate  Validate_Required"/>`+
	`<textarea id="RichText" class="RichText Validate  Validate_Required" name="Body" rows="15" cols="78"></textarea>`+
	`</form>`
)

const otrsPageWithRteHtml = (
	otrsPageHtml +
	`<div id="RichTextField" class="RichTextField">`+
	`<iframe></iframe>`+
	`</div>`
)

describe("ticket article content script",()=>{
	it("throws on unknown webpage",()=>{
		const {document}=new JSDOM(`<!DOCTYPE html><p>wrong page!`).window
		assert.throws(()=>{
			contentScript.addArticleSubjectAndBody(document,"Hello","<p>Hello!</p>")
		})
	})
	it("inserts login message and throws on login page",()=>{
		const {document}=new JSDOM(`<!DOCTYPE html><div id=LoginBox>login form here</div>`).window
		assert.throws(()=>{
			contentScript.addArticleSubjectAndBody(document,"Hello","<p>Hello!</p>")
		})
		const $informBox=document.querySelector('#LoginBox .ErrorBox')
		assert($informBox)
		assert($informBox.innerHTML.includes('ticket'))
	})
	it("populates the form before CKEditor is loaded",()=>{
		const {document}=new JSDOM(otrsPageHtml).window
		contentScript.addArticleSubjectAndBody(document,"Hello","<p>Hello!</p>")
		assert.equal(
			document.getElementById('Subject').value,
			"Hello"
		)
		assert.equal(
			document.getElementById('RichText').value,
			"<p>Hello!</p>"
		)
	})
	it("populates the form after CKEditor is loaded",()=>{
		const {document}=new JSDOM(otrsPageWithRteHtml).window
		contentScript.addArticleSubjectAndBody(document,"Hello","<p>Hello!</p>")
		assert.equal(
			document.getElementById('Subject').value,
			"Hello"
		)
		assert.equal(
			document.getElementById('RichText').value,
			"<p>Hello!</p>"
		)
		const $rteIframe=document.querySelector('#RichTextField iframe')
		assert.equal(
			$rteIframe.contentDocument.body.innerHTML,
			"<p>Hello!</p>"
		)
	})
})
