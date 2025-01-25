export default function makePermissionsButtonPairHandler(idBase,grantTitle,revokeTitle,okFn) {
	let grantListener,revokeListener
	return (
		grantEnabled,revokeEnabled,
		grantPermissions,revokePermissions
	)=>{
		grantListener=handleButton(
			grantListener,`${idBase}-grant`,grantEnabled,
			()=>browser.permissions.request(grantPermissions),
			okFn,
			grantTitle,"Permissions already granted"
		)
		revokeListener=handleButton(
			revokeListener,`${idBase}-revoke`,revokeEnabled,
			()=>browser.permissions.remove(revokePermissions),
			okFn,
			revokeTitle,"No permissions currently granted"
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
