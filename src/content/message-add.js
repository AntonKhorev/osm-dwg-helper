export function getUserData(document) {
	const userData={}
	const $content=document.getElementById('content')
	if (!$content) return userData
	const $userLink=$content.querySelector('h1 a')
	if ($userLink) {
		userData.name=$userLink.textContent
		userData.url=$userLink.href
	}
	return userData
}

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

export function addMessageSubjectAndBody(document,subject,body) {
	const $subjectInput=document.getElementById('message_title')
	if ($subjectInput) {
		$subjectInput.value+='; '+subject
	}
	const $bodyInput=document.getElementById('message_body')
	if ($bodyInput) {
		$bodyInput.value+=body
	}
}
