if (!window.osmDwgHelperTicketListenerInstalled) {
	browser.runtime.onMessage.addListener(messageListener)
	window.osmDwgHelperTicketListenerInstalled=true
}

function messageListener(message) {
	if (message.action=='getIssueId') {
		return Promise.resolve(
			scrapeIssueId()
		)
	} else if (message.action=='addNote') {
		return Promise.resolve(
			addNote(message.subject,message.text)
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

function addNote(subject,text) {
	// TODO handle login page etc
	const $a=document.querySelector('#nav-Note a')
	if (!$a) return
	console.log('> got menu item',$a)
	$a.dispatchEvent(new Event('click'))
	console.log('> add note',subject,text)
}
