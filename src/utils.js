export function getOsmIssueIdFromUrl(osmRoot,url) {
	const match=url.match(new RegExp('^'+escapeRegex(osmRoot)+'issues/([0-9]+)'))
	if (match) {
		const [,issueId]=match
		return issueId
	}
}

export function isOsmUserUrl(osmRoot,url) {
	const match=url.match(new RegExp('^'+escapeRegex(osmRoot)+'user/[^/]+$'))
	return !!match
}

export function isOsmNoteUrl(osmRoot,url) {
	const match=url.match(new RegExp('^'+escapeRegex(osmRoot)+'note/[0-9]+$'))
	return !!match
}

export function isOtrsTicketUrl(otrsRoot,url) {
	const match=url.match(new RegExp('^'+escapeRegex(otrsRoot+'otrs/index.pl?Action=AgentTicketZoom;')))
	return !!match
}

export function getOtrsTicketId(otrsRoot,url) {
	const match=url.match(new RegExp('^'+escapeRegex(otrsRoot+'otrs/index.pl?Action=AgentTicketZoom;TicketID=')+'([0-9]+)'))
	if (match) {
		const [,ticketId]=match
		return ticketId
	}
}

export function getOtrsCreatedTicketId(otrsRoot,url) {
	const match=url.match(new RegExp('^'+escapeRegex(otrsRoot+'otrs/index.pl?Action=AgentTicketPhone;Subaction=Created;TicketID=')+'([0-9]+)'))
	if (match) {
		const [,ticketId]=match
		return ticketId
	}
}

export function escapeHtml(string) {
	return string
	.replace(/&/g,"&amp;")
	.replace(/</g,"&lt;")
	.replace(/>/g,"&gt;")
	.replace(/"/g,"&quot;")
	.replace(/'/g,"&#039;")
}

export function escapeRegex(string) { // https://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript/3561711
	return string.replace(/[-\/\\^$*+?.()|[\]{}]/g,'\\$&')
}
