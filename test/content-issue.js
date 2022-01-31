import {strict as assert} from 'assert'
import {JSDOM} from 'jsdom'

import * as contentScript from '../src/content/issue.js'

describe("issue content script",()=>{
	it("adds comment",()=>{
		const {document}=new JSDOM(
			`<!DOCTYPE html>`+
			`<form role="form" class="new_issue_comment" id="new_issue_comment" action="/issues/18381/comments" accept-charset="UTF-8" method="post">`+
			`<textarea cols="80" rows="20" class="form-control form-control" data-preview-url="https://www.openstreetmap.org/preview/markdown" name="issue_comment[body]" id="issue_comment_body">Already written.</textarea>`,
			`</form>`
		).window
		contentScript.addComment(document,"Something else.")
		assert.equal(
			document.getElementById('issue_comment_body').value,
			"Already written.\n\nSomething else."
		)
	})
})
