if (!window.osmDwgHelperCreateTicketListenerInstalled) {
	browser.runtime.onMessage.addListener(messageListener)
	window.osmDwgHelperCreateTicketListenerInstalled=true
}

function messageListener(message) {
	if (message.action!='addIssueDataToTicket') return false
	const $form=document.getElementById('NewPhoneTicket')
	if ($form) {
		populateTicketForm($form,message.ticketData)
		return Promise.resolve()
	}
	const $loginBox=document.getElementById('LoginBox')
	if ($loginBox) {
		informOnLoginScreen($loginBox)
		return Promise.reject("on login page")
	}
	return Promise.reject("met unknown webpage content")
}

function populateTicketForm($form,ticketData) {
	feedValues($form.FromCustomer,ticketData.FromCustomers)
	selectFirstOption($form.Dest)
	if (ticketData.Subject!=null) {
		$form.Subject.value=ticketData.Subject
		$form.Subject.dispatchEvent(new Event('change'))
	}
	if (ticketData.Body!=null) {
		$form.Body.value=ticketData.Body

		//// if the above doesn't work, use CKEditor 4 API: https://ckeditor.com/docs/ckeditor4/latest/api/index.html
		// const ckeditorInstance=window.wrappedJSObject.CKEDITOR.instances.RichText
		// ckeditorInstance.setData(ticketData.Body)

		//// if don't want privileged access through wrappedJSObject, modify the iframe
		// setTimeout(()=>{
		// 	const $iframe=document.querySelector('#RichTextField iframe')
		// 	$iframe.contentDocument.body.innerHTML=ticketData.Body
		// },2000)

		//// can also set up MutationObserver instead of dumb timeout above
	}
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
