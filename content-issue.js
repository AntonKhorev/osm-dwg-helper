if (!window.osmDwgHelperIssueListenerInstalled) {
	browser.runtime.onMessage.addListener(messageListener)
	window.osmDwgHelperIssueListenerInstalled=true
}

function messageListener(message) {
	console.log('issue received message',message) ///
	if (message.action!='getIssueData') return false
	const $content=document.getElementById('content')
	if (!$content) return Promise.reject("can't find content")
	let $newReportsHeader
	for (const $h4 of $content.getElementsByTagName('h4')) {
		if ($h4.innerText.startsWith('New')) {
			$newReportsHeader=$h4
			break
		}
	}
	console.log('the header:',$newReportsHeader) ///
	return Promise.resolve({})
}
