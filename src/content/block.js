export default function messageListener(message) {
	if (message.action=='getBlockData') {
		return Promise.resolve(
			scrapeBlockData()
		)
	}
	return false
}

function scrapeBlockData() {
	const blockData={}
	const $content=document.getElementById('content')
	return blockData
}
