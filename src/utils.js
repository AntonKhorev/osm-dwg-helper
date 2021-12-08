export function getOsmMessageIdFromUrl(osmRoot,url) {
	return getIdFromUrl(osmRoot+'messages/',url)
}

export function getOsmIssueIdFromUrl(osmRoot,url) {
	return getIdFromUrl(osmRoot+'issues/',url)
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
	return getIdFromUrl(otrsRoot+'otrs/index.pl?Action=AgentTicketZoom;TicketID=',url)
}

export function getOtrsCreatedTicketIdAndAction(otrsRoot,url) {
	const match=url.match(new RegExp('^'+escapeRegex(otrsRoot+'otrs/index.pl?Action=AgentTicket')+'(Phone|Zoom);Subaction=Created;TicketID=([0-9]+)'))
	if (match) {
		const [,action,id]=match
		return [id,action]
	} else {
		return []
	}
}

function getIdFromUrl(path,url) {
	const match=url.match(new RegExp('^'+escapeRegex(path)+'([0-9]+)'))
	if (match) {
		const [,id]=match
		return id
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
