import {strict as assert} from 'assert'
import fs from 'fs-extra'
import {JSDOM} from 'jsdom'

import processReport from '../src/content/issue-report.js'

const issuePageTemplate=String(await fs.readFile('test/issue.html'))

describe("issue report module",()=>{
	it("processes old plaintext reports",()=>{
		const [document,$report]=prepareDocumentAndReport(`<p>old style plaintext</p>`)
		const result=processReport(document,$report)
		assertReportText(result,'<p>old style plaintext</p>')
	})
	it("processes broken richtext single-paragraph reports",()=>{
		const [document,$report]=prepareDocumentAndReport(
			`<p class="richtext text-break"></p>`+
			`<p>broken richtext</p>`+
			`<p></p>`
		)
		const result=processReport(document,$report)
		assertReportText(result,`<p>broken richtext</p>`)
	})
	it("processes broken richtext multi-paragraph reports",()=>{
		const [document,$report]=prepareDocumentAndReport(
			`<p class="richtext text-break"></p>`+
			`<p>one</p>`+
			`<p>two</p>`+
			`<p>three</p>`+
			`<p></p>`
		)
		const result=processReport(document,$report)
		assertReportText(result,`<p>one</p><p>two</p><p>three</p>`)
	})
	it("processes broken richtext multi-paragraph reports with empty paragraphs",()=>{
		const [document,$report]=prepareDocumentAndReport(
			`<p class="richtext text-break"></p>`+
			`<p>one</p>`+
			`<p>two</p>`+
			`<p></p>`+
			`<p></p>`+
			`<p>three</p>`+
			`<p></p>`
		)
		const result=processReport(document,$report)
		assertReportText(result,
			`<p>one</p>`+
			`<p>two</p>`+
			`<p></p>`+
			`<p></p>`+
			`<p>three</p>`
		)
	})
	it("processes richtext single-paragraph reports",()=>{
		const [document,$report]=prepareDocumentAndReport(
			`<div class="richtext text-break">`+
			`<p>ok richtext</p>`+
			`</div>`
		)
		const result=processReport(document,$report)
		assertReportText(result,`<p>ok richtext</p>`)
	})
	it("processes richtext multi-paragraph reports",()=>{
		const [document,$report]=prepareDocumentAndReport(
			`<div class="richtext text-break">`+
			`<p>one</p>`+
			`<p>two</p>`+
			`<p>three</p>`+
			`</div>`
		)
		const result=processReport(document,$report)
		assertReportText(result,`<p>one</p><p>two</p><p>three</p>`)
	})
	it("processes richtext arbitrary html reports",()=>{
		const [document,$report]=prepareDocumentAndReport(
			`<div class="richtext text-break">`+
			`<p>one <strong>marked</strong> thing</p>`+
			`<hr>`+
			`<ul>`+
			`<li>list item</li>`+
			`<li>another list item</li>`+
			`</ul>`+
			`</div>`
		)
		const result=processReport(document,$report)
		assertReportText(result,
			`<p>one <strong>marked</strong> thing</p>`+
			`<hr>`+
			`<ul>`+
			`<li>list item</li>`+
			`<li>another list item</li>`+
			`</ul>`
		)
	})
})

function prepareDocumentAndReport(report) {
	const issuePage=issuePageTemplate.replace('{{report}}',report)
	const {document}=new JSDOM(issuePage).window
	const $report=document.querySelector('#content .row .row .col')
	return [document,$report]
}

function assertReportText(result,text) {
	const lead=[
		['plain', 'Reported as '],
		['category', 'spam'],
		['plain', ' by '],
		['user', 'testuser'],
		['plain', ' on 18 May 2021 at 11:54']
	]
	assert.deepEqual(result,{
		wasRead: false,
		lead,
		text,
		category: 'spam',
		by: 'testuser'
	})
}
