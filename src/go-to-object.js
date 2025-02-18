import goToObjectParser from './go-to-object-parser.js'

export default function ($form,settings,tabId,closeWindow,createTab) {
	if (settings.otrs || settings.osm) {
		$form.hidden=false
		$form.ticket.oninput=()=>{
			const value=$form.ticket.value
			const parsedValue=goToObjectParser(value)
			if (value=="" || parsedValue.site && parsedValue.path) {
				$form.ticket.setCustomValidity("")
			} else {
				$form.ticket.setCustomValidity("ticket id or number required")
			}
		}
		$form.onsubmit=(ev)=>{
			ev.preventDefault()
			const value=$form.ticket.value
			const parsedValue=goToObjectParser(value)
			let url
			if (parsedValue.site=="otrs" && settings.otrs) {
				url=settings.otrs
			} else if (parsedValue.site=="osm" && settings.osm) {
				url=settings.osm
			}
			if (url) {
				url+=parsedValue.path
				createTab({openerTabId:tabId,url})
				closeWindow()
			}
		}
	} else {
		$form.hidden=true
		$form.ticket.oninput=undefined
		$form.onsubmit=(ev)=>{
			ev.preventDefault()
		}
	}
}
