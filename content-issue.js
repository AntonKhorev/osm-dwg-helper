if (!window.osmDwgHelperIssueListenerInstalled) {
	browser.runtime.onMessage.addListener(messageListener)
	window.osmDwgHelperIssueListenerInstalled=true
}

function messageListener(message) {
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
	if (!$newReportsHeader) return Promise.resolve({})
	const $newReports=$newReportsHeader.parentElement
	const reportedByUsernameSet={}
	const reportedByUsernames=[]
	// for (const $report of $newReports.children) {
	// 	if (!$report.classList.contains('report')) continue
	for (const $report of $newReports.querySelectorAll('.report')) {
		const $reportedBy=$report.querySelector('p a')
		const reportedByUsername=$reportedBy.innerText
		if (reportedByUsernameSet[reportedByUsername]==null) {
			reportedByUsernameSet[reportedByUsername]=true
			reportedByUsernames.unshift(reportedByUsername)
		}
	}
	return Promise.resolve({
		reportedByUsernames
	})
}
