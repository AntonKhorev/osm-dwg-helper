import otrsFallback from './otrs.js'

export function addIssueDataToTicket(document,ticketData) {
	const $form=document.getElementById('NewPhoneTicket')
	if ($form) {
		//setTimeout(()=>{ // for testing CKEditor loading race conditions
		populateTicketForm(document,$form,ticketData)
		//},1000)
		return
	}
	otrsFallback(document,`Will open a new phone ticket form after a successful login.`)
}

export function addMoreIssueDataToTicket(document,ticketData) {
	const $form=document.getElementById('NewPhoneTicket')
	if ($form) {
		//setTimeout(()=>{ // for testing CKEditor loading race conditions
		populateMoreTicketForm(document,$form,ticketData)
		//},1000)
		return
	}
	otrsFallback(document,`Will add data to a new phone ticket form after a successful login.`)
}

function populateTicketForm(document,$form,ticketData) {
	const Event=document.defaultView.Event
	feedCustomers(document,$form,ticketData.FromCustomers)
	selectFirstOption($form.elements.Dest)
	if (ticketData.Subject!=null) {
		$form.elements.Subject.value=ticketData.Subject
		$form.elements.Subject.dispatchEvent(new Event('change'))
	}
	if (ticketData.Body!=null) {
		$form.elements.Body.value=ticketData.Body // this is enough if CKEditor is not yet loaded
		// if CKEditor is loaded, need to update its state too
		// could have used CKEditor 4 API: https://ckeditor.com/docs/ckeditor4/latest/api/index.html
			// const ckeditorInstance=window.wrappedJSObject.CKEDITOR.instances.RichText
			// ckeditorInstance.setData(ticketData.Body)
		// that requires privileged access through wrappedJSObject
		// instead modify the iframe inside CKEditor
		const $richTextEditorIframe=document.querySelector('#RichTextField iframe')
		if ($richTextEditorIframe) {
			$richTextEditorIframe.contentDocument.body.innerHTML=ticketData.Body
		}
	}
}

function populateMoreTicketForm(document,$form,ticketData) {
	const Event=document.defaultView.Event
	feedCustomers(document,$form,ticketData.FromCustomers)
	// selectFirstOption($form.elements.Dest) // should already be selected
	// TODO add to subject
	// if (ticketData.Subject!=null) {
	// 	$form.elements.Subject.value=ticketData.Subject
	// 	$form.elements.Subject.dispatchEvent(new Event('change'))
	// }
	if (ticketData.Body!=null) {
		$form.elements.Body.value+=ticketData.Body // this is enough if CKEditor is not yet loaded
		// modify the iframe inside CKEditor - see populateTicketForm() for reasons
		const $richTextEditorIframe=document.querySelector('#RichTextField iframe')
		if ($richTextEditorIframe) {
			$richTextEditorIframe.contentDocument.body.innerHTML+=ticketData.Body
		}
	}
}

function feedCustomers(document,$form,values) {
	const Event=document.defaultView.Event
	const $input=$form.elements.FromCustomer
	const $status=document.createElement('span')
	$status.innerHTML='(feeding)'
	$input.after($status)
	attemptToFeedValue()
	function attemptToFeedValue(i=0) {
		if (i>=values.length) {
			$status.remove()
			return
		}
		const targetValue=values[i]
		if ($input.value=='') {
			if (!alreadyHasValue(targetValue)) {
				$input.value=targetValue
				$input.dispatchEvent(new Event('change'))
			}
			i++
		}
		setTimeout(()=>{
			attemptToFeedValue(i)
		},50)
	}
	function alreadyHasValue(targetValue) {
		const $receivedInputs=$form.querySelectorAll('input.CustomerTicketText')
		for (const $receivedInput of $receivedInputs) {
			if ($receivedInput.value==targetValue) return true
		}
		return false
	}
}

function selectFirstOption($select) {
	for (const $option of $select) {
		if ($option.value.match(/^[0-9]/)) {
			$select.value=$option.value
			break
		}
	}
}
