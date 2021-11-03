if (!window.osmDwgHelperTicketListenerInstalled) {
	browser.runtime.onMessage.addListener(messageListener)
	window.osmDwgHelperTicketListenerInstalled=true
}

function messageListener(message) {
	if (message.action=='getIssueId') {
		return Promise.resolve(
			scrapeIssueId()
		)
	}
	return false
}

function scrapeIssueId() {
	const $h1=document.querySelector('h1')
	if (!$h1) return
	const match=$h1.innerText.match(/issue\s*#?([0-9]+)/i)
	if (!match) return
	const [,issueId]=match
	return issueId
}
