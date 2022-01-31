export default function otrsFallback(document,message) {
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
