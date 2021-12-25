let headersReceivedInstalledForOsm,headersReceivedInstalledForOsmcha

export default function installOrUninstallHeadersReceivedListener(settings,permissions,hasWebRequestPermission) {
	if (!hasWebRequestPermission) {
		// can't do real uninstall because access to browser.webRequest is lost
		// assume that handler uninstalls when permission gets removed
		headersReceivedInstalledForOsm=undefined
		headersReceivedInstalledForOsmcha=undefined
		return
	}
	if (permissions.osm && permissions.osmcha) {
		if (
			headersReceivedInstalledForOsm!=settings.osm ||
			headersReceivedInstalledForOsmcha!=settings.osmcha
		) {
			uninstall()
		}
		install()
	} else {
		if (
			headersReceivedInstalledForOsm!=null ||
			headersReceivedInstalledForOsmcha!=null
		) {
			uninstall()
		}
	}
	function uninstall() {
		browser.webRequest.onHeadersReceived.removeListener(headersReceivedListener)
		headersReceivedInstalledForOsm=undefined
		headersReceivedInstalledForOsmcha=undefined
	}
	function install() {
		headersReceivedInstalledForOsm=settings.osm
		headersReceivedInstalledForOsmcha=settings.osmcha
		const osmchaOrigin=settings.osmcha+'*'
		browser.webRequest.onHeadersReceived.addListener(
			headersReceivedListener,
			{urls:[osmchaOrigin],types:['sub_frame']},
			['blocking','responseHeaders']
		)
	}
}

function headersReceivedListener({documentUrl,initiator,responseHeaders}) {
	if (documentUrl!=null) { // Firefox
		if (!documentUrl.startsWith(headersReceivedInstalledForOsm)) return {}
	} else if (initiator!=null) { // Chrome
		const installedForOsmOrigin=new URL(headersReceivedInstalledForOsm).origin
		if (initiator!=installedForOsmOrigin) return {}
	}
	const newResponseHeaders=responseHeaders.filter(({name})=>name.toLowerCase()!='x-frame-options')
	return {responseHeaders:newResponseHeaders}
}
