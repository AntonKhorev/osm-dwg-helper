import * as issueHandler from './issue.js'
import * as templateEngine from './template-engine.js'
import {
	getOtrsTicketId,
	getOtrsCreatedTicketIdAndAction
} from './utils.js'

export class Action {
	/**
	 * @returns {Array<[text:string,type?:'em'|'button']>} array of [text,type] items to be concatenated
	 */
	getOngoingActionMenuEntry() {
		return [[`unknown action`]]
	}
	/**
	 * @returns {?Action} immediate action to perform if button is pressed
	 */
	getOngoingActionMenuButtonResponse() {}
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
	async act(settings,tab,tabState,messageTab) {}
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

class RemindToResolveIssue extends Action {
	constructor(haveToResolveIssue) {
		super()
		this.haveToResolveIssue=haveToResolveIssue
	}
	getOngoingActionMenuEntry() {
		if (this.haveToResolveIssue) {
			return [[`update issue `],[`resolve issue`,'button']]
		} else {
			return [[`update issue `],[`comment issue`,'button'],[` (no auto-resolve because some new reports weren't copied)`]]
		}
	}
	getOngoingActionMenuButtonResponse() {
		return new ResolveIssue(true,this.haveToResolveIssue)
	}
}

class ResolveIssue extends Action {
	constructor(haveToSubmitComment,haveToResolveIssue) {
		super()
		this.haveToSubmitComment=haveToSubmitComment
		this.haveToResolveIssue=haveToResolveIssue
	}
	getOngoingActionMenuEntry() {
		const items=[]
		if (this.haveToSubmitComment) items.push(`submit comment`)
		if (this.haveToResolveIssue) items.push(`resolve issue`)
		return [[items.join(` then `)]]
	}
	async act(settings,tab,tabState,messageTab) {
		if (this.haveToSubmitComment) {
			try {
				const submittedComment=await messageTab(tab.id,'issue',{action:'submitComment'})
				if (submittedComment) {
					if (this.haveToResolveIssue) {
						return [tab.id,new ResolveIssue(false,true)]
					} else {
						return
					}
				}
			} catch {}
		}
		if (this.haveToResolveIssue) {
			await messageTab(tab.id,'issue',{action:'resolveIssue'})
		}
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
	async act(settings,tab,tabState,messageTab) {
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
	async act(settings,tab,tabState,messageTab) {
		try {
			await messageTab(tab.id,'create-ticket',this.getCreateTicketMessage(settings))
		} catch {
			return [tab.id,this]
		}
		return [tab.id,new CommentIssueWithTicketUrlForCreatedTicket(this.openerTabId,issueHandler.areAllNewReportsSelected(this.issueData))]
	}
	getCreateTicketMessage(settings) {
		const ticketData=issueHandler.convertToTicketData(settings,this.issueData,this.additionalUserData)
		return {action:'addIssueDataToTicket',ticketData}
	}
}

export class AddToCreateIssueTicket extends CreateIssueTicket { // TODO not actually an offshoot, "openerTab" should be "otherTab"
	constructor(openerTabId,issueData,additionalUserData) {
		super(openerTabId,issueData,additionalUserData)
	}
	getOngoingActionMenuEntry() {
		return [[`add `],[` issue #${this.issueData.id}`,'em'],[` to create ticket form`]]
	}
	getCreateTicketMessage(settings) {
		const ticketData=issueHandler.convertToTicketData(settings,this.issueData,this.additionalUserData)
		return {action:'addMoreIssueDataToTicket',ticketData}
	}
}

class CommentIssueWithTicketUrl extends OffshootAction {
	constructor(openerTabId,haveToResolveIssue) {
		super(openerTabId)
		this.haveToResolveIssue=haveToResolveIssue
	}
	getOngoingActionMenuEntry() {
		return [[`add comment to issue for created ticket`]]
	}
	// getActionUrl: exact action url is unknown b/c it contains server response
	async act(settings,tab,tabState,messageTab) {
		const [ticketId,ticketAction]=this.getOtrsTicketIdAndAction(settings,tab)
		if (!ticketId) {
			return [tab.id,this]
		}
		const ticketUrl=`${settings.otrs}otrs/index.pl?Action=AgentTicketZoom;TicketID=${encodeURIComponent(ticketId)}`
		await messageTab(this.openerTabId,'issue',{
			action:'addComment',
			comment:this.getComment(settings,ticketUrl)
		})
		if (ticketAction=='Phone') {
			return [
				tab.id,new GoToUrl(ticketUrl),
				this.openerTabId,new RemindToResolveIssue(this.haveToResolveIssue)
			]
		} else {
			return [
				,,
				this.openerTabId,new RemindToResolveIssue(this.haveToResolveIssue)
			]
		}
	}
	// abstract getOtrsTicketIdAndAction(settings,tab) {}
	// abstract getComment(settings,ticketUrl) {}
}

class CommentIssueWithTicketUrlForCreatedTicket extends CommentIssueWithTicketUrl {
	getOtrsTicketIdAndAction(settings,tab) {
		return getOtrsCreatedTicketIdAndAction(settings.otrs,tab.url)
	}
	getComment(settings,ticketUrl) {
		return templateEngine.evaluate(settings.issue_comment_ticket_created,{ticket:{url:ticketUrl}})
	}
}

class CommentIssueWithTicketUrlForAddedReports extends CommentIssueWithTicketUrl {
	// TODO here openerTabId is not really an opener tab, but an "other tab"; thus the class is not an "offshoot action", but for now it shouldn't cause any problems
	getOtrsTicketIdAndAction(settings,tab) {
		return [getOtrsTicketId(settings.otrs,tab.url),'Zoom']
	}
	getComment(settings,ticketUrl) {
		return templateEngine.evaluate(settings.issue_comment_ticket_reports_added,{ticket:{url:ticketUrl}})
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
	async act(settings,tab,tabState,messageTab) {
		const messageId=await messageTab(tab.id,'mailbox',{action:'getTopMessageId'}) // TODO use tabState
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
	async act(settings,tab,tabState,messageTab) {
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
		const what=this.getOngoingActionMenuEntryWhatPart()
		const insert=[...what]
		if (what.length>0) insert.push(` as `)
		return [[`add `],...insert,[this.addAs,'em'],[`-article to `],[`ticket #${this.ticketId}`,'em']]
	}
	getOngoingActionMenuEntryWhatPart() {
		return []
	}
	getActionUrl(settings) {
		let otrsAction='AgentTicketNote'
		if (this.addAs=='pending') otrsAction='AgentTicketPending'
		return `${settings.otrs}otrs/index.pl?Action=${otrsAction};TicketID=${encodeURIComponent(this.ticketId)}`
	}
	async act(settings,tab,tabState,messageTab) {
		const [subject,body]=this.getSubjectAndBody(settings)
		try {
			await messageTab(tab.id,'ticket-article',this.getTabMessage(settings,subject,body))
			return this.actAfterMessaging(settings,tab)
		} catch {
			return [tab.id,this]
		}
	}
	getTabMessage(settings,subject,body) {
		return {
			action:'addArticleSubjectAndBody',
			subject,body
		}
	}
	actAfterMessaging(settings,tab) {
		// usually don't need to anything the message is submitted
	}
}

export class AddSelectedReportsAndCommentsToTicket extends AddArticleToTicket {
	constructor(ticketId,addAs,issueData,otherTabId) {
		super(ticketId,addAs)
		this.issueData=issueData
		this.otherTabId=otherTabId
	}
	getOngoingActionMenuEntryWhatPart() {
		return [[`add selected reports/comments from `],[`issue #${this.issueData.id}`,'em']]
	}
	getSubjectAndBody(settings) {
		const ticketData=issueHandler.convertToTicketData(settings,this.issueData)
		return [ticketData.Subject,ticketData.Body]
	}
	actAfterMessaging(settings,tab) {
		return [tab.id,new CommentIssueWithTicketUrlForAddedReports(this.otherTabId,issueHandler.areAllNewReportsSelected(this.issueData))]
	}
}

export class AddMessageToTicket extends AddArticleToTicket {
	constructor(ticketId,addAs,messageData) {
		super(ticketId,addAs)
		this.messageData=messageData
	}
	getOngoingActionMenuEntryWhatPart() {
		return [[`add message ${this.messageDirection} `],[this.messageData.user,'em']]
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

export class AddBlockToTicket extends AddArticleToTicket {
	constructor(ticketId,addAs,blockData) {
		super(ticketId,addAs)
		this.blockData=blockData
	}
	getOngoingActionMenuEntryWhatPart() {
		return [[`add block record of `],[this.blockData.user,'em']]
	}
	getSubjectAndBody(settings) {
		const subjectTemplate=settings[`article_subject_block${this.blockData.isZeroHour?'_zero':''}`]
		const bodyTemplate=settings.article_body_block
		const context={
			user:{
				name: this.blockData.user,
				url: this.blockData.userUrl,
			},
			block:this.blockData
		}
		return [
			templateEngine.evaluate(subjectTemplate,context),
			templateEngine.evaluate(bodyTemplate,context),
		]
	}
	getTabMessage(settings,subject,body) {
		return {
			action:'addArticleSubjectAndBodyWithBlockAction',
			subject,body,
			actionInputName:settings.article_input_action
		}
	}
}

export class SendMessageFromIssueReports extends OffshootAction {
	constructor(openerTabId,issueData,userName) {
		super(openerTabId)
		this.issueData=issueData
		this.userName=userName
	}
	getOngoingActionMenuEntry() {
		return [[`quick message to `],[this.userName,'em']]
	}
	getActionUrl(settings) {
		return `${settings.osm}message/new/${encodeURIComponent(this.userName)}`
	}
	async act(settings,tab,tabState,messageTab) {
		await messageTab(tab.id,'message-add',{
			action: 'setMessageSubjectAndBody',
			subject: issueHandler.getUserMessageSubject(settings,this.issueData),
			body: issueHandler.getUserMessageBody(settings,this.issueData,this.userName)
		})
	}
}
