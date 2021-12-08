import {strict as assert} from 'assert'

import * as Actions from '../src/actions.js'

const testSequence=async(input,sequence)=>{
	for (const item of sequence) {
		assert.notEqual(input,undefined)
		input=await item(input)
	}
	assert.equal(input,undefined)
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
		await testSequence(new Actions.CreateIssueTicket(openerTabId,issueData),[
		async(action)=>{ // CreateIssueTicket
			const url='OTRS/otrs/index.pl?Action=AgentTicketPhone'
			assert.equal(action.getActionUrl(settings),url)
			const tab={id:newTabId,url}
			const tabState={}
			assert.equal(action.needToRejectUrl(settings,url),false)
			let listenerTabId,listenerScript,listenerMessage
			const listener=async(tabId,script,message)=>{
				listenerTabId=tabId
				listenerScript=script
				listenerMessage=message
			}
			const [tabId2,action2]=await action.act(settings,tab,tabState,listener)
			assert.equal(listenerTabId,newTabId)
			assert.equal(listenerScript,'create-ticket')
			assert.equal(listenerMessage?.action,'addIssueDataToTicket')
			assert.equal(listenerMessage?.ticketData?.Subject,"Issue #2021")
			assert.equal(tabId2,newTabId)
			return action2
		},async(action)=>{ // CommentIssueWithTicketUrl
			const ticketId=7
			const url=`OTRS/otrs/index.pl?Action=AgentTicketPhone;Subaction=Created;TicketID=${ticketId}`
			assert.equal(action.getActionUrl(settings),undefined)
			const tab={id:newTabId,url}
			const tabState={}
			assert.equal(action.needToRejectUrl(settings,url),false)
			let listenerTabId,listenerScript,listenerMessage
			const listener=async(tabId,script,message)=>{
				listenerTabId=tabId
				listenerScript=script
				listenerMessage=message
			}
			const [tabId2,action2]=await action.act(settings,tab,tabState,listener)
			assert.equal(listenerTabId,openerTabId)
			assert.equal(listenerScript,'issue')
			assert.deepEqual(listenerMessage,{
				action:'addComment',
				comment:`OTRS ticket created: OTRS/otrs/index.pl?Action=AgentTicketZoom;TicketID=${ticketId}`,
			})
			assert.equal(tabId2,newTabId)
			return action2
		},async(action)=>{ // GoToUrl
			// const url=`OTRS/otrs/index.pl?Action=AgentTicketZoom;TicketID=${ticketId}`
			// assert.equal(action.getActionUrl(settings),url)
			// assert.equal(action.needToRejectUrl(settings,url),false)
		}])
	})
	it("works with Ticket Zoom after New Ticket settings",async()=>{
		// TODO
	})
})
