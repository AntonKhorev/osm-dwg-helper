import { addInvalidOtrsPageFallback, setOtrsFormBody } from './otrs.js'

export function addArticleSubjectAndBody(document,subject,body) {
	const $form=document.getElementById('Compose')
	if ($form) {
		// setTimeout(()=>{ // for testing CKEditor loading race conditions
		setFormSubjectAndBody(document,$form,subject,body)
		// },1000)
		return
	}
	addInvalidOtrsPageFallback(document,`Will add an article to a ticket after a successful login.`)
}

export function addArticleSubjectAndBodyWithBlockAction(document,subject,body,actionInputName) {
	const $form=document.getElementById('Compose')
	if ($form) {
		setFormSubjectAndBody(document,$form,subject,body)
		setFormBlockAction(document,$form,actionInputName)
		return
	}
	addInvalidOtrsPageFallback(document,`Will add an article to a ticket after a successful login.`)
}

function setFormSubjectAndBody(document,$form,subject,body) {
	const Event=document.defaultView.Event
	$form.elements.Subject.value=subject
	$form.elements.Subject.dispatchEvent(new Event('change'))
	setOtrsFormBody(document,$form,body)
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
