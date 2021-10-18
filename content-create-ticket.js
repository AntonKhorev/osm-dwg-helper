if (!window.osmDwgHelperCreateTicketListenerInstalled) {
	browser.runtime.onMessage.addListener(messageListener)
	window.osmDwgHelperCreateTicketListenerInstalled=true
}

function messageListener(message) {
	console.log('create ticket received message',message) ///
	if (message.action!='addIssueDataToTicket') return false
	const $form=document.getElementById('NewPhoneTicket')
	if (!$form) return Promise.reject("can't find form") // TODO detect login page
	if (message.issueData.id) $form.Subject.value=`Issue #${message.issueData.id}`
	return Promise.resolve()
}
