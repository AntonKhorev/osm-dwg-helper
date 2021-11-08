if (!window.osmDwgHelperMailboxListenerInstalled) {
	browser.runtime.onMessage.addListener(messageListener)
	window.osmDwgHelperMailboxListenerInstalled=true
}

function messageListener(message) {
	if (message.action=='getTopMessageId') {
		return Promise.resolve(
			scrapeTopMessageId()
		)
	}
	return false
}

function scrapeTopMessageId() {
	const $content=document.getElementById('content')
	if (!$content) return
	const $table=$content.querySelector('table')
	if (!$table) return
	const $cell=$table.tBodies[0]?.rows[0]?.cells[1]
	if (!$cell) return
	const $a=$cell.querySelector('a')
	if (!$a) return
	const match=$a.href.match(/[0-9]+$/)
	if (!match) return
	const [messageId]=match
	return messageId
}
