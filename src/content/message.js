if (!window.osmDwgHelperMessageListenerInstalled) {
	browser.runtime.onMessage.addListener(messageListener)
	window.osmDwgHelperMessageListenerInstalled=true
}

function messageListener(message) {
	if (message.action=='getMessageData') {
		return Promise.resolve(
			scrapeMessageData()
		)
	}
	return false
}

function scrapeMessageData() {
	const messageData={}
	const $content=document.getElementById('content')
	if (!$content) return messageData
	const $contentBody=$content.querySelector('.content-body')
	if (!$contentBody) return messageData
	const $userLink=$contentBody.querySelector('.info-line a')
	if ($userLink) {
		messageData.user=$userLink.innerText
	}
	const $messageBody=$contentBody.querySelector('.richtext')
	if ($messageBody) {
		messageData.body=$messageBody.innerHTML
	}
	messageData.isInbound=hasReplyButton($contentBody)
	return messageData
}

function hasReplyButton($) {
	return !!$.querySelector('a.btn[href$="/reply"]')
}
