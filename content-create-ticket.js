if (!window.osmDwgHelperCreateTicketListenerInstalled) {
	browser.runtime.onMessage.addListener(messageListener)
	window.osmDwgHelperCreateTicketListenerInstalled=true
}

function messageListener(message) {
	if (message.action!='addIssueDataToTicket') return false
	const $form=document.getElementById('NewPhoneTicket')
	if (!$form) return Promise.reject("can't find form") // TODO detect login page
	feedValues($form.FromCustomer,message.ticketData.FromCustomers)
	selectFirstOption($form.Dest)
	if (message.ticketData.Subject!=null) {
		$form.Subject.value=message.ticketData.Subject
		$form.Subject.dispatchEvent(new Event('change'))
	}
	if (message.ticketData.Body!=null) {
		$form.Body.value=message.ticketData.Body

		//// if the above doesn't work, use CKEditor 4 API: https://ckeditor.com/docs/ckeditor4/latest/api/index.html
		// const ckeditorInstance=window.wrappedJSObject.CKEDITOR.instances.RichText
		// ckeditorInstance.setData(message.ticketData.Body)

		//// if don't want privileged access through wrappedJSObject, modify the iframe
		// setTimeout(()=>{
		// 	const $iframe=document.querySelector('#RichTextField iframe')
		// 	$iframe.contentDocument.body.innerHTML=message.ticketData.Body
		// },2000)

		//// can also set up MutationObserver instead of dumb timeout above
	}
	return Promise.resolve()
}

function feedValues($input,values) {
	const $status=document.createElement('span')
	$status.innerHTML='(feeding)'
	$input.after($status)
	attemptToFeedValue()
	function attemptToFeedValue(i=0) {
		if (i>=values.length) {
			$status.remove()
			return
		}
		if ($input.value=='') {
			$input.value=values[i]
			$input.dispatchEvent(new Event('change'))
			i++
		}
		setTimeout(()=>{
			attemptToFeedValue(i)
		},50)
	}	
}

function selectFirstOption($select) {
	for ($option of $select) {
		if ($option.value.match(/^[0-9]/)) {
			$select.value=$option.value
			break
		}
	}
}
