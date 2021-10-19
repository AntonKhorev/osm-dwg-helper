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
		// uses CKEditor 4: https://ckeditor.com/docs/ckeditor4/latest/api/index.html
		//$form.Body.value=message.ticketData.Body
		// TODO this is privileged access - actually simulate typing/pasting instead

		// const ckeditorInstance=window.wrappedJSObject.CKEDITOR.instances.RichText
		// ckeditorInstance.setData(message.ticketData.Body)
		
		setTimeout(()=>{
			const $iframe=document.querySelector('#RichTextField iframe')
			$iframe.contentDocument.body.innerHTML=message.ticketData.Body
			$form.Body.value=message.ticketData.Body
		},2000)
	}
	return Promise.resolve()
}
