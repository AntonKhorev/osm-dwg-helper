import otrsFallback from './otrs.js'

export function addArticleSubjectAndBody(document,subject,body) {
	const $form=document.getElementById('Compose')
	if ($form) {
		setFormSubjectAndBody(document,$form,subject,body)
		return
	}
	otrsFallback(document,`Will add an article to a ticket after a successful login.`)
}

export function addArticleSubjectAndBodyWithBlockAction(document,subject,body,actionInputName) {
	const $form=document.getElementById('Compose')
	if ($form) {
		setFormSubjectAndBody(document,$form,subject,body)
		setFormBlockAction(document,$form,actionInputName)
		return
	}
	otrsFallback(document,`Will add an article to a ticket after a successful login.`)
}

function setFormSubjectAndBody(document,$form,subject,body) {
	const Event=document.defaultView.Event
	$form.elements.Subject.value=subject
	$form.elements.Subject.dispatchEvent(new Event('change'))
	$form.elements.Body.value=body
	// ckeditor should load after this field is updated
	// TODO but create ticket form required a fallback for early load - maybe need it here too?
}

function setFormBlockAction(document,$form,actionInputName) {
	const Event=document.defaultView.Event
	if (!actionInputName) return
	const $actionsSelect=$form.elements[actionInputName]
	if (!$actionsSelect) return
	const $blockActionOption=findBlockActionOption($actionsSelect)
	if (!$blockActionOption) return
	if ($blockActionOption.selected) return
	$blockActionOption.selected=true
	$actionsSelect.dispatchEvent(new Event('change'))
}

function findBlockActionOption($actionsSelect) {
	for (const $option of $actionsSelect.options) {
		if ($option.value.includes('block')) return $option
	}
}
