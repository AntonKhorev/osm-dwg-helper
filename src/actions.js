import * as templateEngine from './template-engine.js'
import {
	getOtrsCreatedTicketId,
	escapeHtml
} from './utils.js'

export class Action {
	/**
	 * @returns {Array<[text:string,type:?'em']>} array of [text,type] items to be concatenated
	 */
	getOngoingActionMenuEntry() {
		return [[`unknown action`]]
	}
	/**
	 * @returns {?string} undefined/null or url to direct the current tab to right after action creation
	 */
	getActionUrl(settings) {}
	/**
	 * @returns {boolean} true if the url doesn't match the action
	 */
	needToRejectUrl(settings,url) {
		const requiredUrl=this.getActionUrl(settings)
		return (requiredUrl!=null && url!=requiredUrl)
	}
	/**
	  * @returns {Promise<?[tabId:number,Action]>} undefined/null or [tabId,TabAction] to schedule another action
	  */
	async act(settings,tab,tabState,addListenerAndSendMessage) {}
}

/**
 * Actions that start or continue the sequence of new tab updates
 */
export class OffshootAction extends Action {
	constructor(openerTabId) {
		super()
		this.openerTabId=openerTabId
	}
}

class GoToUrl extends Action {
	constructor(url) {
		super()
		this.url=url
	}
	getOngoingActionMenuEntry() {
		return [[`go to `],[this.url,'em']]
	}
	getActionUrl(settings) {
		return this.url
	}
}

export class ScrapeReportedItemThenCreateIssueTicket extends OffshootAction {
	constructor(openerTabId,issueData) {
		super(openerTabId)
		this.issueData=issueData
	}
	getOngoingActionMenuEntry() {
		return [[`scrape reported item then create ticket`]]
	}
	getActionUrl(settings) {
		return this.issueData.reportedItem.url
	}
	async act(settings,tab,tabState,addListenerAndSendMessage) {
		const getNextAction=()=>{
			if (tabState.type=='user' && tabState.userData.id!=null) {
				return new CreateIssueTicket(this.openerTabId,this.issueData,tabState.userData)
			} else {
				// TODO fetch issue country - make another tab action class for this
				return new CreateIssueTicket(this.openerTabId,this.issueData)
			}
		}
		return [tab.id,getNextAction()]
	}
}

export class CreateIssueTicket extends OffshootAction {
	constructor(openerTabId,issueData,additionalUserData) {
		super(openerTabId)
		this.issueData=issueData
		this.additionalUserData=additionalUserData
	}
	getOngoingActionMenuEntry() {
		return [[`create ticket for `],[`issue #${this.issueData.id}`,'em']]
	}
	getActionUrl(settings) {
		return `${settings.otrs}otrs/index.pl?Action=AgentTicketPhone`
	}
	async act(settings,tab,tabState,addListenerAndSendMessage) {
		const ticketData=convertIssueDataToTicketData(settings,this.issueData,this.additionalUserData)
		try {
			await addListenerAndSendMessage(tab.id,'create-ticket',{action:'addIssueDataToTicket',ticketData})
		} catch {
			return [tab.id,this]
		}
		return [tab.id,new CommentIssueWithTicketUrl(this.openerTabId)]
	}
}

class CommentIssueWithTicketUrl extends OffshootAction {
	constructor(openerTabId) {
		super(openerTabId)
	}
	getOngoingActionMenuEntry() {
		return [[`add comment to issue for created ticket`]]
	}
	// getActionUrl: exact action url is unknown b/c it contains server response
	async act(settings,tab,tabState,addListenerAndSendMessage) {
		// TODO support OTRS Personal Preferences > Miscellaneous > Screen after new ticket > Ticket Zoom
		// https://new.demo.otrsce.com/otrs/index.pl?Action=AgentTicketZoom;Subaction=Created;TicketID=5
		const ticketId=getOtrsCreatedTicketId(settings.otrs,tab.url)
		if (!ticketId) {
			return [tab.id,this]
		}
		const ticketUrl=`${settings.otrs}otrs/index.pl?Action=AgentTicketZoom;TicketID=${encodeURIComponent(ticketId)}`
		await addListenerAndSendMessage(this.openerTabId,'issue',{
			action:'addComment',
			comment:templateEngine.evaluate(settings.issue_comment_ticket,{ticket:{url:ticketUrl}})
		})
		return [tab.id,new GoToUrl(ticketUrl)]
	}
}

export class GoToLastMessageThenAddMessageToTicket extends OffshootAction {
	constructor(openerTabId,ticketId,addAs,mailbox) {
		super(openerTabId)
		this.ticketId=ticketId
		this.addAs=addAs
		this.mailbox=mailbox
	}
	getOngoingActionMenuEntry() {
		return [[`go to last `],[this.mailbox,'em'],[` message`]]
	}
	getActionUrl(settings) {
		return `${settings.osm}messages/${this.mailbox}`
	}
	async act(settings,tab,tabState,addListenerAndSendMessage) {
		const messageId=await addListenerAndSendMessage(tab.id,'mailbox',{action:'getTopMessageId'}) // TODO use tabState
		if (!messageId) {
			// TODO handle login page, empty mailbox
			// return [tab.id,this]
			return
		}
		return [tab.id,new ScrapeMessageThenAddMessageToTicket(this.openerTabId,this.ticketId,this.addAs,messageId)]
	}
}

class ScrapeMessageThenAddMessageToTicket extends OffshootAction {
	constructor(openerTabId,ticketId,addAs,messageId) {
		super(openerTabId)
		this.ticketId=ticketId
		this.addAs=addAs
		this.messageId=messageId
	}
	getOngoingActionMenuEntry() {
		return [[`scrape `],[`message #${this.messageId}`,'em']]
	}
	getActionUrl(settings) {
		return `${settings.osm}messages/${encodeURIComponent(this.messageId)}`
	}
	async act(settings,tab,tabState,addListenerAndSendMessage) {
		return [this.openerTabId,new AddMessageToTicket(this.ticketId,this.addAs,tabState.messageData)]
	}
}

class AddArticleToTicket extends Action {
	/**
	 * @param addAs {'note'|'pending'}
	 */
	constructor(ticketId,addAs) {
		super()
		this.ticketId=ticketId
		this.addAs=addAs
	}
	getOngoingActionMenuEntry() {
		return [[`add `],[this.addAs,'em'],[`-article to `],[`ticket #${this.ticketId}`,'em']]
	}
	getActionUrl(settings) {
		let otrsAction='AgentTicketNote'
		if (this.addAs=='pending') otrsAction='AgentTicketPending'
		return `${settings.otrs}otrs/index.pl?Action=${otrsAction};TicketID=${encodeURIComponent(this.ticketId)}`
	}
	async act(settings,tab,tabState,addListenerAndSendMessage) {
		const [subject,body]=this.getSubjectAndBody(settings)
		try {
			await addListenerAndSendMessage(tab.id,'ticket-article',{
				action:'addArticleSubjectAndBody',
				subject,body
			})
		} catch {
			return [tab.id,this]
		}
	}
}

export class AddMessageToTicket extends AddArticleToTicket {
	constructor(ticketId,addAs,messageData) {
		super(ticketId,addAs)
		this.messageData=messageData
	}
	getOngoingActionMenuEntry() {
		return [
			[`add message ${this.messageDirection} `],[this.messageData.user,'em'],[` as `],
			...super.getOngoingActionMenuEntry().slice(1)
		]
	}
	getSubjectAndBody(settings) {
		const subjectTemplate=settings[`article_message_${this.messageDirection}_subject`]
		let processedMessageText=this.messageData.body
		processedMessageText=processedMessageText.replaceAll(`<blockquote>`,`<div style="border:none; border-left:solid blue 1.5pt; padding:0cm 0cm 0cm 4.0pt" type="cite">`)
		processedMessageText=processedMessageText.replaceAll(`</blockquote>`,`</div>`)
		return [
			templateEngine.evaluate(subjectTemplate,{user:{name:this.messageData.user}}),
			processedMessageText
		]
	}
	get messageDirection() {
		return this.messageData.isInbound?'from':'to'
	}
}

function convertIssueDataToTicketData(settings,issueData,additionalUserData) {
	if (issueData==null) return {}
	const ticketData={}
	ticketData.Body=templateEngine.evaluateHtml(settings.ticket_body_header,{issue:issueData})
	if (issueData.reportedItem?.type=='user') {
		const userData=issueData.reportedItem
		if (additionalUserData?.id!=null) {
			const values={issue:issueData,user:{...userData,...additionalUserData}}
			ticketData.Subject=templateEngine.evaluate(settings.ticket_subject_user_id,values)
			ticketData.Body+=templateEngine.evaluateHtml(settings.ticket_body_item_user_id,values)
		} else {
			const values={issue:issueData,user:userData}
			ticketData.Subject=templateEngine.evaluate(settings.ticket_subject_user,values)
			ticketData.Body+=templateEngine.evaluateHtml(settings.ticket_body_item_user,values)
		}
	} else if (issueData.reportedItem?.type=='note') {
		const values={issue:issueData,note:issueData.reportedItem}
		ticketData.Subject=templateEngine.evaluate(settings.ticket_subject_note,values)
		ticketData.Body+=templateEngine.evaluateHtml(settings.ticket_body_item_note,values)
	} else {
		const values={issue:issueData}
		ticketData.Subject=templateEngine.evaluate(settings.ticket_subject,values)
		ticketData.Body+=templateEngine.evaluateHtml(settings.ticket_body_item,values)
	}
	ticketData.FromCustomers=[]
	if (issueData.reports) {
		const addedCustomers={}
		for (const report of issueData.reports) {
			if (report.wasRead) continue
			const user={} // TODO save user url in content script
			if (report.by!=null) {
				user.name=report.by
				user.url=issueData.osmRoot+'user/'+encodeURIComponent(report.by)
				if (!addedCustomers[user.name]) {
					addedCustomers[user.name]=true
					ticketData.FromCustomers.push(templateEngine.evaluate(settings.ticket_customer,{user}))
				}
			}
			if (report.lead.length==0 && report.text.length==0) continue
			ticketData.Body+=`<hr>\n`
			if (report.lead.length>0) {
				const c0=`<span style='color:#6c757d'>` // "text-muted" color from osm website
				const c1=`</span>`
				ticketData.Body+=`<p>`
				for (const [fragmentType,fragmentText] of report.lead) {
					const t=escapeHtml(fragmentText)
					if (fragmentType=='user') {
						ticketData.Body+=`<a href='${escapeHtml(user.url)}'>${t}</a>`
					} else if (fragmentType=='category') {
						ticketData.Body+=`${c0}<strong>${t}</strong>${c1}`
					} else {
						ticketData.Body+=`${c0}${t}${c1}`
					}
				}
				ticketData.Body+=`</p>\n`
			}
			for (const paragraph of report.text) {
				ticketData.Body+=`<p>${escapeHtml(paragraph)}</p>\n`
			}
		}
	}
	return ticketData
}
