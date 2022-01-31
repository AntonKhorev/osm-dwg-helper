export function getIssueId(document) {
	const $h1=document.querySelector('h1')
	if (!$h1) return
	const match=$h1.innerText.match(/issue\s*#?([0-9]+)/i)
	if (!match) return
	const [,issueId]=match
	return issueId
}
