import {strict as assert} from 'assert'
import * as fs from 'fs/promises'
import {JSDOM} from 'jsdom'

import * as contentScript from '../src/content/issue.js'

import processReport from '../src/content/issue-report.js'

const issuePageTemplate=String(await fs.readFile('test/issue.html'))

const unmarkedLead=`Reported as spam by <a href="/user/testuser">testuser</a> on 18 May 2021 at 11:54`

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
	it("processes lead with unmarked category and marked time",()=>{
		const [document,$report]=prepareDocumentAndReport(
			`Reported as vandal by <a href="/user/fred">fred</a> on <time datetime="2021-08-12T15:24:00Z">12 August 2021 at 15:24</time>`,
			`<div class="richtext text-break">`+
			`<p>want to check the lead above</p>`+
			`</div>`
		)
		const result=processReport(document,$report)
		const lead=[
			['plain', 'Reported as '],
			['category', 'vandal'],
			['plain', ' by '],
			['user', 'fred'],
			['plain', ' on 12 August 2021 at 15:24']
		]
		assert.deepEqual(result,{
			lead,
			text: `<p>want to check the lead above</p>`,
			selected: false,
			category: 'vandal',
			by: 'fred',
			byUrl: '/user/fred'
		})
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
	const issueReportBlock=`
		<div>
			<h4>New Reports</h4>
			<div class="row">
				<div class="col-auto">
					<a href="/user/testuser"><img class="user_thumbnail border border-grey" alt="" width="50" height="50" src="/assets/avatar_small-d6bb1741f052ec0a1e536f01ad31c551aa25e42f35194bdc037e084382f0f278.png" /></a>
				</div>
				<div class="col">
					<p class="text-muted">
					{{report-lead}}
					</p>
					{{report-text}}
				</div>
			</div>
			<hr>
		</div>
	`
	const issuePage=issuePageTemplate.replace(
		'{{report-blocks}}',
		issueReportBlock
			.replace('{{report-lead}}',lead)
			.replace('{{report-text}}',text)
	)
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
