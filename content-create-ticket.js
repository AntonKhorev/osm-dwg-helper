if (!window.osmDwgHelperCreateTicketListenerInstalled) {
	browser.runtime.onMessage.addListener(messageListener)
	window.osmDwgHelperCreateTicketListenerInstalled=true
}

function messageListener(message) {
	if (message.action!='addIssueDataToTicket') return false
	const $form=document.getElementById('NewPhoneTicket')
	if (!$form) return Promise.reject("can't find form") // TODO detect login page
	if (message.ticketData.FromCustomer!=null) {
		$form.FromCustomer.value=message.ticketData.FromCustomer
		$form.FromCustomer.dispatchEvent(new Event('change'))
	}
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
