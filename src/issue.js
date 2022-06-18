import * as templateEngine from './template-engine.js'
import {escapeHtml} from './utils.js'

export function areAllNewReportsSelected(issueData) {
	if (!issueData.reports) return true
	for (const report of issueData.reports) {
		if (report.wasRead) continue
		if (!report.selected) return false
	}
	return true
}

export function getUserMessageSubject(settings,issueData) {
	if (issueData.reportedItem?.type=='user') {
		return templateEngine.evaluate(settings.issue_message_subject_user,{user:issueData.reportedItem})
	} else if (issueData.reportedItem?.type=='note') {
		return templateEngine.evaluate(settings.issue_message_subject_note,{note:issueData.reportedItem})
	} else {
		return templateEngine.evaluate(settings.issue_message_subject,{})
	}
}

export function getUserMessageBody(settings,issueData,userName) {
	if (!issueData.reports) return ''
	let body=''
	for (const report of issueData.reports) {
		if (!report.selected) continue
		if (report.by!=userName) continue
		if (report.lead.length>0) {
			for (const [fragmentType,fragmentText] of report.lead) {
				const t=escapeHtml(fragmentText)
				if (fragmentType=='user') {
					body+=`[${userName}](${escapeHtml(report.byUrl)})` // TODO escape userName in [] because it can include these chars
				} else if (fragmentType=='category') {
					body+=`**${t}**`
				} else {
					body+=t
				}
			}
			body+=`:\n`
		} else {
			body+=`${userName} wrote:\n` // fallback, this shouldn't happen
		}
		body+=`<blockquote>\n${report.text}</blockquote>\n\n`
	}
	return body
}

export function convertToTicketData(settings,issueData,additionalUserData) {
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
	ticketData.FromCustomers=processReportsOrComments(issueData.reports)
	processReportsOrComments(issueData.comments)
	return ticketData
	function processReportsOrComments(reports) {
		if (!reports) return []
		const addedCustomers={}
		const addedCustomersList=[]
		for (const report of reports) {
			if (!report.selected) continue
			const user={}
			if (report.by!=null) {
				user.name=report.by
				user.url=report.byUrl??'#'
				if (!addedCustomers[user.name]) {
					addedCustomers[user.name]=true
					addedCustomersList.push(templateEngine.evaluate(settings.ticket_customer,{user}))
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
			ticketData.Body+=report.text
		}
		return addedCustomersList
	}
}
