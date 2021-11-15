class TabAction {
	/**
	 * @returns array of [text,type] items to be concatenated; type is either undefined or "em"
	 */
	getOngoingActionMenuEntry() {
		return [[`unknown action`]]
	}
	/**
	  * @returns undefined/null or [tabId,TabAction] to schedule another action
	  */
	async act(tab,tabState,addListenerAndSendMessage) {}
}

export class ScrapeReportedItemThenCreateIssueTicket extends TabAction {
	constructor(openerTabId,issueData) {
		super()
		this.openerTabId=openerTabId
		this.issueData=issueData
	}
	getOngoingActionMenuEntry() {
		return [[`scrape reported item then create ticket`]]
	}
	async act(tab,tabState,addListenerAndSendMessage) {
		const settings=await settingsManager.read()
		let ticketData
		if (tabState.type=='user' && tabState.userData.id!=null) {
			ticketData=convertIssueDataToTicketData(settings,this.issueData,tabState.userData)
		} else {
			// TODO fetch issue country - make another tab action class for this
			ticketData=convertIssueDataToTicketData(settings,this.issueData)
		}
		browser.tabs.update(tab.id,{
			url:`${settings.otrs}otrs/index.pl?Action=AgentTicketPhone`
		})
		return [tab.id,new CreateIssueTicket(this.openerTabId,ticketData)]
	}
}

export class CreateIssueTicket extends TabAction {
	constructor(openerTabId,ticketData) {
		super()
		this.openerTabId=openerTabId
		this.ticketData=ticketData
	}
	getOngoingActionMenuEntry() {
		return [[`create ticket `],[this.ticketData.Subject,'em']]
	}
	async act(tab,tabState,addListenerAndSendMessage) {
		try {
			await addListenerAndSendMessage(tab.id,'create-ticket',{action:'addIssueDataToTicket',ticketData:this.ticketData})
		} catch {
			return [tab.id,this]
		}
		return [tab.id,new CommentIssueWithTicketUrl(this.openerTabId)]
	}
}

class CommentIssueWithTicketUrl extends TabAction {
	constructor(openerTabId) {
		super()
		this.openerTabId=openerTabId
	}
	getOngoingActionMenuEntry() {
		return [[`add comment to issue for created ticket`]]
	}
	async act(tab,tabState,addListenerAndSendMessage) {
		const settings=await settingsManager.read()
		const ticketId=getOtrsCreatedTicketId(settings.otrs,tab.url)
		if (!ticketId) {
			return [tab.id,this]
		}
		const ticketUrl=`${settings.otrs}otrs/index.pl?Action=AgentTicketZoom;TicketID=${encodeURIComponent(ticketId)}`
		await addListenerAndSendMessage(this.openerTabId,'issue',{
			action:'addComment',
			comment:ticketUrl
		})
		browser.tabs.update(tab.id,{url:ticketUrl})
	}
}

export class GoToLastMessageThenAddMessageToTicket extends TabAction {
	constructor(openerTabId,mailbox,addAs) {
		super()
		this.openerTabId=openerTabId
		this.mailbox=mailbox
		this.addAs=addAs
	}
	getOngoingActionMenuEntry() {
		return [[`go to last `],[this.mailbox,'em'],[` message`]]
	}
	async act(tab,tabState,addListenerAndSendMessage) {
		const messageId=await addListenerAndSendMessage(tab.id,'mailbox',{action:'getTopMessageId'})
		if (!messageId) {
			// TODO handle login page, empty mailbox
			// return [tab.id,this]
			return
		}
		const settings=await settingsManager.read()
		const messageUrl=`${settings.osm}messages/${encodeURIComponent(messageId)}`
		browser.tabs.update(tab.id,{url:messageUrl})
		return [tab.id,new ScrapeMessageThenAddMessageToTicket(this.openerTabId,this.mailbox,this.addAs)]
	}
}

class ScrapeMessageThenAddMessageToTicket extends TabAction {
	constructor(openerTabId,mailbox,addAs) {
		super()
		this.openerTabId=openerTabId
		this.mailbox=mailbox
		this.addAs=addAs
	}
	getOngoingActionMenuEntry() {
		return [[`scrape `],[this.mailbox,'em'],[` message`]]
	}
	async act(tab,tabState,addListenerAndSendMessage) {
		const messageData=await addListenerAndSendMessage(tab.id,'message',{action:'getMessageData'})
		browser.tabs.remove(tab.id)
		browser.tabs.update(this.openerTabId,{active:true})
		return [this.openerTabId,new AddMessageToTicket(this.mailbox,this.addAs,messageData.user,messageData.body)]
	}
}

class AddMessageToTicket extends TabAction {
	constructor(mailbox,addAs,messageTo,messageText) {
		super()
		this.mailbox=mailbox
		this.addAs=addAs
		this.messageTo=messageTo
		this.messageText=messageText
	}
	getOngoingActionMenuEntry() {
		return [[`add message to `],[this.messageTo,'em'],[` as `],[this.addAs,'em'],[` article`]]
	}
	async act(tab,tabState,addListenerAndSendMessage) {
		const settings=await settingsManager.read()
		const ticketId=getOtrsTicketId(settings.otrs,tab.url)
		if (!ticketId) {
			return [tab.id,this]
		}
		let otrsAction='AgentTicketNote'
		if (this.addAs=='pending') otrsAction='AgentTicketPending'
		const ticketNoteUrl=`${settings.otrs}otrs/index.pl?Action=${otrsAction};TicketID=${ticketId}`
		let subjectTemplate=settings.article_message_to_subject
		if (this.mailbox=='inbox') subjectTemplate=settings.article_message_from_subject
		let processedMessageText=this.messageText
		processedMessageText=processedMessageText.replaceAll(`<blockquote>`,`<div style="border:none; border-left:solid blue 1.5pt; padding:0cm 0cm 0cm 4.0pt" type="cite">`)
		processedMessageText=processedMessageText.replaceAll(`</blockquote>`,`</div>`)
		browser.tabs.update(tab.id,{url:ticketNoteUrl})
		return [tab.id,new AddTicketArticle(
			evaluateTemplate(subjectTemplate,{user:{name:this.messageTo}}),
			processedMessageText
		)]
	}
}

class AddTicketArticle extends TabAction {
	constructor(subject,body) {
		super()
		this.subject=subject
		this.body=body
	}
	getOngoingActionMenuEntry() {
		return [[`add ticket article `],[this.subject,'em']]
	}
	async act(tab,tabState,addListenerAndSendMessage) {
		try {
			await addListenerAndSendMessage(tab.id,'ticket-article',{
				action:'addArticleSubjectAndBody',
				subject:this.subject,
				body:this.body
			})
		} catch {
			return [tab.id,this]
		}
	}
}

function convertIssueDataToTicketData(settings,issueData,additionalUserData={}) {
	if (issueData==null) return {}
	const ticketData={}
	ticketData.Body=evaluateHtmlTemplate(settings.ticket_body_header,{issue:issueData})
	if (issueData.reportedItem?.type=='user') {
		const userData=issueData.reportedItem
		if (additionalUserData.id!=null) {
			const values={issue:issueData,user:{...userData,...additionalUserData}}
			ticketData.Subject=evaluateTemplate(settings.ticket_subject_user_id,values)
			ticketData.Body+=evaluateHtmlTemplate(settings.ticket_body_item_user_id,values)
		} else {
			const values={issue:issueData,user:userData}
			ticketData.Subject=evaluateTemplate(settings.ticket_subject_user,values)
			ticketData.Body+=evaluateHtmlTemplate(settings.ticket_body_item_user,values)
		}
	} else if (issueData.reportedItem?.type=='note') {
		const values={issue:issueData,note:issueData.reportedItem}
		ticketData.Subject=evaluateTemplate(settings.ticket_subject_note,values)
		ticketData.Body+=evaluateHtmlTemplate(settings.ticket_body_item_note,values)
	} else {
		const values={issue:issueData}
		ticketData.Subject=evaluateTemplate(settings.ticket_subject,values)
		ticketData.Body+=evaluateHtmlTemplate(settings.ticket_body_item,values)
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
					ticketData.FromCustomers.push(evaluateTemplate(settings.ticket_customer,{user}))
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

function evaluateTemplate(template,values,escapeFn=s=>s) {
	if (template==null) return ''
	const templateChunks=template.split(/\${([^}]*)}/)
	let result=''
	for (let i=0;i<templateChunks.length;i++) {
		if (i%2==0) {
			result+=templateChunks[i]
		} else {
			let value=values
			for (const key of templateChunks[i].split('.')) {
				value=value[key]
			}
			if (!value) continue
			result+=escapeFn(value)
		}
	}
	return result
}

function evaluateHtmlTemplate(template,values) {
	return evaluateTemplate(template,values,escapeHtml)+'\n'
}

function getOtrsTicketId(otrsRoot,url) {
	const match=url.match(new RegExp('^'+escapeRegex(otrsRoot+'otrs/index.pl?Action=AgentTicketZoom;TicketID=')+'([0-9]+)'))
	if (match) {
		const [,ticketId]=match
		return ticketId
	}
}

function getOtrsCreatedTicketId(otrsRoot,url) {
	const match=url.match(new RegExp('^'+escapeRegex(otrsRoot+'otrs/index.pl?Action=AgentTicketPhone;Subaction=Created;TicketID=')+'([0-9]+)'))
	if (match) {
		const [,ticketId]=match
		return ticketId
	}
}

function escapeHtml(string) {
	return string
	.replace(/&/g,"&amp;")
	.replace(/</g,"&lt;")
	.replace(/>/g,"&gt;")
	.replace(/"/g,"&quot;")
	.replace(/'/g,"&#039;")
}
