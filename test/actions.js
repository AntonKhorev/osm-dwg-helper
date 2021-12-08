import {strict as assert} from 'assert'

import * as Actions from '../src/actions.js'

const testSequence=async(input,sequence)=>{
	for (const item of sequence) {
		assert.notEqual(input,undefined)
		input=await item(input)
	}
	assert.equal(input,undefined)
}

const makeListener=(testers)=>{
	const listenerCalls=[]
	let i=0
	return [
		async(tabId,script,message)=>{
			const tester=(testers[i++] ?? (()=>{}))
			listenerCalls.push(
				()=>tester(tabId,script,message)
			)
		},
		()=>{
			assert.equal(listenerCalls.length,testers.length)
			for (const listenerCall of listenerCalls) {
				listenerCall()
			}
		}
	]
}

const testAct=async(action,settings,tab,tabState,testers)=>{
	const [listener,testAfterListener]=makeListener(testers)
	const actResult=await action.act(settings,tab,tabState,listener)
	testAfterListener()
	return actResult
}

describe("Actions.CreateIssueTicket",()=>{
	it("works with Create Ticket after New Ticket settings",async()=>{
		const settings={
			otrs:'OTRS/',
			osm:'OSM/',
			ticket_subject:`Issue #\${issue.id}`,
			issue_comment_ticket:`OTRS ticket created: \${ticket.url}`,
		}
		const openerTabId=12
		const issueData={
			id:2021,
			url:'OSM/note/2021'
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
			issue_comment_ticket:`OTRS ticket created: \${ticket.url}`,
		}
		const openerTabId=11
		const issueData={
			id:2022,
			url:'OSM/note/2022'
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
		},async(action)=>{ // CommentIssueWithTicketUrl
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
