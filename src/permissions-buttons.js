export default function makePermissionsButtonPairHandler(idBase,grantTitle,recallTitle,okFn) {
	let grantListener,recallListener
	return (
		grantEnabled,recallEnabled,
		grantPermissions,recallPermissions
	)=>{
		grantListener=handleButton(
			grantListener,`${idBase}-grant`,grantEnabled,
			()=>browser.permissions.request(grantPermissions),
			okFn,
			grantTitle,"Permissions already granted"
		)
		recallListener=handleButton(
			recallListener,`${idBase}-recall`,recallEnabled,
			()=>browser.permissions.remove(recallPermissions),
			okFn,
			recallTitle,"No permissions currently granted"
		)
	}
}

function handleButton(listener,id,enabled,permissionFn,okFn,enabledTitle='',disabledTitle='') {
	const $button=document.getElementById(id)
	if (listener) {
		$button.removeEventListener('click',listener)
		listener=undefined
	}
	if (enabled) {
		$button.disabled=false
		$button.title=enabledTitle
		listener=()=>{
			permissionFn().then(ok=>{
				if (ok) okFn()
			})
		}
		$button.addEventListener('click',listener)
	} else {
		$button.disabled=true
		$button.title=disabledTitle
	}
	return listener
}
