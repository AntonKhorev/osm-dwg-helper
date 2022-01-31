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

function populateTicketForm(document,$form,ticketData) {
	feedValues(document,$form.FromCustomer,ticketData.FromCustomers)
	selectFirstOption($form.Dest)
	if (ticketData.Subject!=null) {
		$form.Subject.value=ticketData.Subject
		$form.Subject.dispatchEvent(new Event('change'))
	}
	if (ticketData.Body!=null) {
		$form.Body.value=ticketData.Body // this is enough if CKEditor is not yet loaded
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

function feedValues(document,$input,values) {
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
