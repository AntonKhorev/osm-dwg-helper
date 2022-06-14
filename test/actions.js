import {strict as assert} from 'assert'

import makeMessageTabTest from './test-message-tab.js'
import * as Actions from '../src/actions.js'

const testSequence=async(input,sequence)=>{
	for (const item of sequence) {
		assert.notEqual(input,undefined)
		input=await item(input)
	}
	assert.equal(input,undefined)
}

const testAct=async(action,settings,tab,tabState,testers)=>{
	const [messageTab,testAfterMessageTab]=makeMessageTabTest(testers)
	const actResult=await action.act(settings,tab,tabState,messageTab)
	testAfterMessageTab()
	return actResult
}

describe("Actions.CreateIssueTicket",()=>{
	it("works with Create Ticket after New Ticket settings",async()=>{
		const settings={
			otrs:'OTRS/',
			osm:'OSM/',
			ticket_subject:`Issue #\${issue.id}`,
			issue_comment_ticket_created:`OTRS ticket created: \${ticket.url}`,
		}
		const openerTabId=12
		const issueData={
			id:2021,
			url:'OSM/issues/2021'
		}
		const newTabId=23
		const ticketId=7
		await testSequence(new Actions.CreateIssueTicket(openerTabId,issueData),[
		async(action)=>{ // CreateIssueTicket
			const url='OTRS/otrs/index.pl?Action=AgentTicketPhone'
			assert.equal(action.getActionUrl(settings),url)
			assert.equal(action.needToRejectUrl(settings,url),false)
			const [tabId2,action2]=await testAct(
				action,settings,
				{id:newTabId,url},{},
				[(tabId,script,message)=>{
					assert.equal(tabId,newTabId)
					assert.equal(script,'create-ticket')
					assert.equal(message?.action,'addIssueDataToTicket')
					assert.equal(message?.ticketData?.Subject,"Issue #2021")
				}]
			)
			assert.equal(tabId2,newTabId)
			return action2
		},async(action)=>{ // CommentIssueWithTicketUrl
			const url=`OTRS/otrs/index.pl?Action=AgentTicketPhone;Subaction=Created;TicketID=${ticketId}`
			assert.equal(action.getActionUrl(settings),undefined)
			assert.equal(action.needToRejectUrl(settings,url),false)
			const [tabId2,action2]=await testAct(
				action,settings,
				{id:newTabId,url},{},
				[(tabId,script,message)=>{
					assert.equal(tabId,openerTabId)
					assert.equal(script,'issue')
					assert.deepEqual(message,{
						action:'addComment',
						comment:`OTRS ticket created: OTRS/otrs/index.pl?Action=AgentTicketZoom;TicketID=${ticketId}`,
					})
				}]
			)
			assert.equal(tabId2,newTabId)
			return action2
		},async(action)=>{ // GoToUrl
			const url=`OTRS/otrs/index.pl?Action=AgentTicketZoom;TicketID=${ticketId}`
			assert.equal(action.getActionUrl(settings),url)
			assert.equal(action.needToRejectUrl(settings,url),false)
			const actResult=await testAct(
				action,settings,
				{id:newTabId,url},{},
				[]
			)
			assert.equal(actResult,undefined)
		}])
	})
	it("works with Ticket Zoom after New Ticket settings",async()=>{
		const settings={
			otrs:'OTRS/',
			osm:'OSM/',
			ticket_subject:`Issue #\${issue.id}`,
			issue_comment_ticket_created:`OTRS ticket created: \${ticket.url}`,
		}
		const openerTabId=11
		const issueData={
			id:2022,
			url:'OSM/issues/2022'
		}
		const newTabId=24
		const ticketId=777
		await testSequence(new Actions.CreateIssueTicket(openerTabId,issueData),[
		async(action)=>{ // CreateIssueTicket
			const url='OTRS/otrs/index.pl?Action=AgentTicketPhone'
			assert.equal(action.getActionUrl(settings),url)
			assert.equal(action.needToRejectUrl(settings,url),false)
			const [tabId2,action2]=await testAct(
				action,settings,
				{id:newTabId,url},{},
				[(tabId,script,message)=>{
					assert.equal(tabId,newTabId)
					assert.equal(script,'create-ticket')
					assert.equal(message?.action,'addIssueDataToTicket')
					assert.equal(message?.ticketData?.Subject,"Issue #2022")
				}]
			)
			assert.equal(tabId2,newTabId)
			return action2
		},async(action)=>{ // CommentIssueWithTicketUrlForCreatedTicket
			const url=`OTRS/otrs/index.pl?Action=AgentTicketZoom;Subaction=Created;TicketID=${ticketId}`
			assert.equal(action.getActionUrl(settings),undefined)
			assert.equal(action.needToRejectUrl(settings,url),false)
			const actResult=await testAct(
				action,settings,
				{id:newTabId,url},{},
				[(tabId,script,message)=>{
					assert.equal(tabId,openerTabId)
					assert.equal(script,'issue')
					assert.deepEqual(message,{
						action:'addComment',
						comment:`OTRS ticket created: OTRS/otrs/index.pl?Action=AgentTicketZoom;TicketID=${ticketId}`,
					})
				}]
			)
			assert.equal(actResult,undefined)
		}])
	})
})

describe("Actions.AddSelectedReportsAndCommentsToTicket",()=>{
	it("adds from note issue",async()=>{
		const settings={
			otrs:'OTRS/',
			osm:'OSM/',
			ticket_subject_note:`Issue #\${issue.id} - Note #\${note.id}`,
			issue_comment_ticket_reports_added:`Added to ticket: \${ticket.url}`,
		}
		const otherTabId=11
		const issueData={
			id:2024,
			url:'OSM/issues/2024',
			reportedItem:{
				type:'note',
				ref:'#789',
				url:'OSM/note/789',
				id:789
			},
			reports:[
				{
					by:'WatchfulUser',
					wasRead:false,
					lead:[['plain','reported by '],['user','WatchfulUser']],
					text:`<p>he did things</p>`,
					selected:false,
				}
			],
			comments:[
				{
					by:'BoredModerator',
					lead:[['plain','comment from '],['user','BoredModerator']],
					text:`<p>who cares</p>`,
					selected:true,
				}
			],
		}
		const openerTabId=24
		const ticketId=777
		await testSequence(new Actions.AddSelectedReportsAndCommentsToTicket(ticketId,'note',issueData,otherTabId),[
		async(action)=>{ // AddSelectedReportsAndCommentsToTicket
			const url=`OTRS/otrs/index.pl?Action=AgentTicketNote;TicketID=${ticketId}`
			assert.equal(action.getActionUrl(settings),url)
			assert.equal(action.needToRejectUrl(settings,url),false)
			const [tabId2,action2]=await testAct(
				action,settings,
				{id:openerTabId,url},{},
				[(tabId,script,message)=>{
					assert.equal(tabId,openerTabId)
					assert.equal(script,'ticket-article')
					assert.equal(message?.action,'addArticleSubjectAndBody')
					assert.equal(message?.subject,"Issue #2024 - Note #789")
					assert(!message?.body.includes('WatchfulUser'))
					assert(message?.body.includes('BoredModerator'))
				}]
			)
			assert.equal(tabId2,openerTabId)
			return action2
		},async(action)=>{ // CommentIssueWithTicketUrlForAddedReports
			const url=`OTRS/otrs/index.pl?Action=AgentTicketZoom;TicketID=${ticketId}`
			assert.equal(action.getActionUrl(settings),undefined)
			assert.equal(action.needToRejectUrl(settings,url),false)
			const actResult=await testAct(
				action,settings,
				{id:openerTabId,url},{},
				[(tabId,script,message)=>{
					assert.equal(tabId,otherTabId)
					assert.equal(script,'issue')
					assert.deepEqual(message,{
						action:'addComment',
						comment:`Added to ticket: OTRS/otrs/index.pl?Action=AgentTicketZoom;TicketID=${ticketId}`,
					})
				}]
			)
			assert.equal(actResult,undefined)
		}])
	})
})
