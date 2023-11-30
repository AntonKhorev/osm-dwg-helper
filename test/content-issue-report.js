import {strict as assert} from 'assert'
import * as fs from 'fs/promises'
import {JSDOM} from 'jsdom'

import processReport from '../src/content/issue-report.js'

const issuePageTemplate=String(await fs.readFile('test/issue.html'))

const unmarkedLead=`Reported as spam by <a href="/user/testuser">testuser</a> on 18 May 2021 at 11:54`

describe("issue report module",()=>{
	it("processes old plaintext reports",()=>{
		const [document,$report]=prepareDocumentAndReport(unmarkedLead,`<p>old style plaintext</p>`)
		const result=processReport(document,$report)
		assertReportTextWithUnmarkedLead(result,'<p>old style plaintext</p>')
	})
	it("processes broken richtext single-paragraph reports",()=>{
		const [document,$report]=prepareDocumentAndReport(unmarkedLead,
			`<p class="richtext text-break"></p>`+
			`<p>broken richtext</p>`+
			`<p></p>`
		)
		const result=processReport(document,$report)
		assertReportTextWithUnmarkedLead(result,`<p>broken richtext</p>`)
	})
	it("processes broken richtext multi-paragraph reports",()=>{
		const [document,$report]=prepareDocumentAndReport(unmarkedLead,
			`<p class="richtext text-break"></p>`+
			`<p>one</p>`+
			`<p>two</p>`+
			`<p>three</p>`+
			`<p></p>`
		)
		const result=processReport(document,$report)
		assertReportTextWithUnmarkedLead(result,`<p>one</p><p>two</p><p>three</p>`)
	})
	it("processes broken richtext multi-paragraph reports with empty paragraphs",()=>{
		const [document,$report]=prepareDocumentAndReport(unmarkedLead,
			`<p class="richtext text-break"></p>`+
			`<p>one</p>`+
			`<p>two</p>`+
			`<p></p>`+
			`<p></p>`+
			`<p>three</p>`+
			`<p></p>`
		)
		const result=processReport(document,$report)
		assertReportTextWithUnmarkedLead(result,
			`<p>one</p>`+
			`<p>two</p>`+
			`<p></p>`+
			`<p></p>`+
			`<p>three</p>`
		)
	})
	it("processes richtext single-paragraph reports",()=>{
		const [document,$report]=prepareDocumentAndReport(unmarkedLead,
			`<div class="richtext text-break">`+
			`<p>ok richtext</p>`+
			`</div>`
		)
		const result=processReport(document,$report)
		assertReportTextWithUnmarkedLead(result,`<p>ok richtext</p>`)
	})
	it("processes richtext multi-paragraph reports",()=>{
		const [document,$report]=prepareDocumentAndReport(unmarkedLead,
			`<div class="richtext text-break">`+
			`<p>one</p>`+
			`<p>two</p>`+
			`<p>three</p>`+
			`</div>`
		)
		const result=processReport(document,$report)
		assertReportTextWithUnmarkedLead(result,`<p>one</p><p>two</p><p>three</p>`)
	})
	it("processes richtext arbitrary html reports",()=>{
		const [document,$report]=prepareDocumentAndReport(unmarkedLead,
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
		assertReportTextWithUnmarkedLead(result,
			`<p>one <strong>marked</strong> thing</p>`+
			`<hr>`+
			`<ul>`+
			`<li>list item</li>`+
			`<li>another list item</li>`+
			`</ul>`
		)
	})
	it("processes lead with marked category and time",()=>{
		const [document,$report]=prepareDocumentAndReport(
			`Reported as <strong data-category="other">something other we dunno</strong> by <a href="/user/fred">fred</a> on <time datetime="2022-08-12T15:24:00Z">12 August 2022 at 15:24</time>`,
			`<div class="richtext text-break">`+
			`<p>want to check the lead above</p>`+
			`</div>`
		)
		const result=processReport(document,$report)
		const lead=[
			['plain', 'Reported as '],
			['category', 'something other we dunno'],
			['plain', ' by '],
			['user', 'fred'],
			['plain', ' on 12 August 2022 at 15:24']
		]
		assert.deepEqual(result,{
			lead,
			text: `<p>want to check the lead above</p>`,
			selected: false,
			category: 'other',
			by: 'fred',
			byUrl: '/user/fred'
		})
	})
})

function prepareDocumentAndReport(lead,text) {
	const issuePage=issuePageTemplate
		.replace('{{report-lead}}',lead)
		.replace('{{report-text}}',text)
	const {document}=new JSDOM(issuePage).window
	const $report=document.querySelector('#content .row .row')
	return [document,$report]
}

function assertReportTextWithUnmarkedLead(result,text) {
	const lead=[
		['plain', 'Reported as '],
		['category', 'spam'],
		['plain', ' by '],
		['user', 'testuser'],
		['plain', ' on 18 May 2021 at 11:54']
	]
	assert.deepEqual(result,{
		lead,
		text,
		selected: false,
		category: 'spam',
		by: 'testuser',
		byUrl: '/user/testuser'
	})
}
