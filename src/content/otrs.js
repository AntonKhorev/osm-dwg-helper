export function addInvalidOtrsPageFallback(document,message) {
	const $loginBox=document.getElementById('LoginBox')
	if ($loginBox) {
		informOnLoginScreen(document,$loginBox,message)
		throw new Error("on login page")
	}
	throw new Error("met unknown webpage content")
}

function informOnLoginScreen(document,$loginBox,message) {
	const id='osmDwgHelperLoginInformBox'
	if (document.getElementById(id)) return
	const $informBox=document.createElement('div')
	$informBox.id=id
	$informBox.classList.add('ErrorBox')
	const $span=document.createElement('span')
	$span.textContent=message
	$informBox.append($span)
	$loginBox.prepend($informBox)
}

export function setOtrsFormBody(document,$form,body) {
	$form.elements.Body.value=body // this is enough if CKEditor is not yet loaded
	// if CKEditor is loaded, need to update its state too
	// could have used CKEditor 4 API: https://ckeditor.com/docs/ckeditor4/latest/api/index.html
		// const ckeditorInstance=window.wrappedJSObject.CKEDITOR.instances.RichText
		// ckeditorInstance.setData(body)
	// that requires privileged access through wrappedJSObject
	// instead modify the iframe inside CKEditor
	const $richTextEditorIframe=document.querySelector('#RichTextField iframe')
	if ($richTextEditorIframe) {
		$richTextEditorIframe.contentDocument.body.innerHTML=body
	}
}

export function addToOtrsFormBody(document,$form,body) {
	$form.elements.Body.value+=body // this is enough if CKEditor is not yet loaded
	// modify the iframe inside CKEditor - see setOtrsFormBody() for reasons
	const $richTextEditorIframe=document.querySelector('#RichTextField iframe')
	if ($richTextEditorIframe) {
		$richTextEditorIframe.contentDocument.body.innerHTML+=body
	}
}
