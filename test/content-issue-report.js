import {strict as assert} from 'assert'
import fs from 'fs-extra'
import {JSDOM} from 'jsdom'

import processReport from '../src/content/issue-report.js'

const issuePageTemplate=String(await fs.readFile('test/issue.html'))
const expectedLead=[
	['plain', 'Reported as '],
	['category', 'spam'],
	['plain', ' by '],
	['user', 'testuser'],
	['plain', ' on 18 May 2021 at 11:54']
]

describe("issue report module",()=>{
	it("processes old plaintext reports",()=>{
		const [document,$report]=prepareDocumentAndReport(`<p>old style plaintext</p>`)
		const result=processReport(document,$report,()=>{})
		assert.deepEqual(result,{
			wasRead: false,
			lead: expectedLead,
			text: ['old style plaintext'],
			category: 'spam',
			by: 'testuser'
		})
	})
	it("processes broken richtext single-paragraph reports",()=>{
		const [document,$report]=prepareDocumentAndReport(
			`<p class="richtext text-break"></p>`+
			`<p>broken richtext</p>`+
			`<p></p>`
		)
		const result=processReport(document,$report,()=>{})
		assert.deepEqual(result,{
			wasRead: false,
			lead: expectedLead,
			text: ['broken richtext'],
			category: 'spam',
			by: 'testuser'
		})
	})
	it("processes broken richtext multi-paragraph reports",()=>{
		const [document,$report]=prepareDocumentAndReport(
			`<p class="richtext text-break"></p>`+
			`<p>one</p>`+
			`<p>two</p>`+
			`<p>three</p>`+
			`<p></p>`
		)
		const result=processReport(document,$report,()=>{})
		assert.deepEqual(result,{
			wasRead: false,
			lead: expectedLead,
			text: ['one','two','three'],
			category: 'spam',
			by: 'testuser'
		})
	})
})

function prepareDocumentAndReport(report) {
	const issuePage=issuePageTemplate.replace('{{report}}',report)
	const {document}=new JSDOM(issuePage).window
	const $report=document.querySelector('#content .row .row .col')
	return [document,$report]
}
