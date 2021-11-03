if (!window.osmDwgHelperTicketArticleListenerInstalled) {
	browser.runtime.onMessage.addListener(messageListener)
	window.osmDwgHelperTicketArticleListenerInstalled=true
}

function messageListener(message) {
	if (message.action=='addArticleSubjectAndBody') {
		const $form=document.getElementById('Compose')
		if ($form) {
			populateArticleForm($form,message.subject,message.body)
			return Promise.resolve()
		}
		const $loginBox=document.getElementById('LoginBox')
		if ($loginBox) {
			informOnLoginScreen($loginBox)
			return Promise.reject("on login page")
		}
		return Promise.reject("met unknown webpage content")
	}
	return false
}

function populateArticleForm($form,subject,body) {
	$form.Subject.value=subject
	$form.Subject.dispatchEvent(new Event('change'))
	$form.Body.value=body
	// ckeditor should load after this field is updated
}

function informOnLoginScreen($loginBox) {
	const id='osmDwgHelperLoginInformBox'
	if (document.getElementById(id)) return
	const $informBox=document.createElement('div')
	$informBox.id=id
	$informBox.classList.add('ErrorBox')
	$informBox.innerHTML="<span>Will open a new phone ticket form after a successful login.</span>"
	$loginBox.prepend($informBox)
}
