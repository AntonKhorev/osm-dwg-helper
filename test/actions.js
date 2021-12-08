import {strict as assert} from 'assert'

import * as Actions from '../src/actions.js'

describe("Actions.CreateIssueTicket",()=>{
	it("works with Create Ticket after New Ticket settings",async()=>{
		const settings={
			otrs:'OTRS/',
		}
		const openerTabId=12
		const issueData={}
		// CreateIssueTicket
		const action1=new Actions.CreateIssueTicket(openerTabId,issueData)
		const url1='OTRS/otrs/index.pl?Action=AgentTicketPhone'
		assert.equal(action1.getActionUrl(settings),url1)
		const newTabId=23
		const tab1={id:newTabId,url:url1}
		const tabState1={}
		assert.equal(action1.needToRejectUrl(settings,url1),false)
		let listenerTabId1,listenerScript1,listenerMessage1
		const listener1=async(tabId,script,message)=>{
			listenerTabId1=tabId
			listenerScript1=script
			listenerMessage1=message
		}
		const [tabId2,action2]=await action1.act(settings,tab1,tabState1,listener1)
		assert.equal(listenerTabId1,newTabId)
		assert.equal(listenerScript1,'create-ticket')
		assert.equal(listenerMessage1?.action,'addIssueDataToTicket')
		// assert.equal(listenerMessage1?.ticketData, ...)
		assert.equal(tabId2,newTabId)
		// CommentIssueWithTicketUrl
		// TODO
	})
	it("works with Ticket Zoom after New Ticket settings",async()=>{
		// TODO
	})
})
