import otrsFallback from './otrs.js'

export function addArticleSubjectAndBody(document,subject,body) {
	const $form=document.getElementById('Compose')
	if ($form) {
		populateArticleForm(document,$form,subject,body)
		return Promise.resolve()
	}
	otrsFallback(document,`Will add an article to a ticket after a successful login.`)
}

function populateArticleForm(document,$form,subject,body) {
	const Event=document.defaultView.Event
	$form.elements.Subject.value=subject
	$form.elements.Subject.dispatchEvent(new Event('change'))
	$form.elements.Body.value=body
	// ckeditor should load after this field is updated
	// TODO but create ticket form required a fallback for early load - maybe need it here too?
}
