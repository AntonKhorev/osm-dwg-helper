import otrsFallback from './otrs.js'

export function addArticleSubjectAndBody(document,subject,body) {
	const $form=document.getElementById('Compose')
	if ($form) {
		populateArticleForm($form,message.subject,message.body)
		return Promise.resolve()
	}
	otrsFallback(document,`Will add an article to a ticket after a successful login.`)
}

function populateArticleForm($form,subject,body) {
	$form.Subject.value=subject
	$form.Subject.dispatchEvent(new Event('change'))
	$form.Body.value=body
	// ckeditor should load after this field is updated
	// TODO but create ticket form required a fallback for early load - maybe need it here too?
}
