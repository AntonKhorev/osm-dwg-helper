export function setMessageSubjectAndBody(document,subject,body) {
	const $subjectInput=document.getElementById('message_title')
	if ($subjectInput) {
		$subjectInput.value=subject
	}
	const $bodyInput=document.getElementById('message_body')
	if ($bodyInput) {
		$bodyInput.value=body
	}
}
