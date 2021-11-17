if (!window.osmDwgHelperUserListenerInstalled) {
	browser.runtime.onMessage.addListener(messageListener)
	window.osmDwgHelperUserListenerInstalled=true
}

function messageListener(message) {
	if (message.action!='getUserId') return false
	const userId=scrapeUserId()
	return Promise.resolve(userId)
}

function scrapeUserId() {
	const $userInfo=document.querySelector('.content-heading')
	if (!$userInfo) return
	// need to find this link: https://www.openstreetmap.org/reports/new?reportable_id=${id}&reportable_type=User
	for (const $a of $userInfo.querySelectorAll('a')) {
		const url=new URL($a.href)
		const params=new URLSearchParams(url.search)
		const uid=params.get('reportable_id')
		if (uid!=null) return uid
	}
}
