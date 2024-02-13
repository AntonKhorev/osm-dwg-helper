import { addInvalidOtrsPageFallback, setOtrsFormBody, addToOtrsFormBody } from './otrs.js'

export function addIssueDataToTicket(document,ticketData) {
	const $form=document.getElementById('NewPhoneTicket')
	if ($form) {
		//setTimeout(()=>{ // for testing CKEditor loading race conditions
		populateTicketForm(document,$form,ticketData)
		//},1000)
		return
	}
	addInvalidOtrsPageFallback(document,`Will open a new phone ticket form after a successful login.`)
}

export function addMoreIssueDataToTicket(document,ticketData) {
	const $form=document.getElementById('NewPhoneTicket')
	if ($form) {
		//setTimeout(()=>{ // for testing CKEditor loading race conditions
		populateMoreTicketForm(document,$form,ticketData)
		//},1000)
		return
	}
	addInvalidOtrsPageFallback(document,`Will add data to a new phone ticket form after a successful login.`)
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
		setOtrsFormBody(document,$form,ticketData.Body)
	}
}

function populateMoreTicketForm(document,$form,ticketData) {
	const Event=document.defaultView.Event
	feedCustomers(document,$form,ticketData.FromCustomers)
	// selectFirstOption($form.elements.Dest) // should already be selected
	if (ticketData.Subject!=null) {
		if ($form.elements.Subject.value=='') {
			$form.elements.Subject.value=ticketData.Subject
		} else {
			$form.elements.Subject.value+='; '+ticketData.Subject
		}
		$form.elements.Subject.dispatchEvent(new Event('change'))
	}
	if (ticketData.Body!=null) {
		addToOtrsFormBody(document,$form,ticketData.Body)
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
