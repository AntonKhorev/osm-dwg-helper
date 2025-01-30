import {makeOtrsTicketUrlFromId, makeOtrsTicketUrlFromNumber} from './utils.js'

export default function ($form,settings,tabId,closeWindow,createTab) {
	if (settings.otrs) {
		$form.hidden=false
		$form.onsubmit=(ev)=>{
			ev.preventDefault()
			const sampleTicketNumber="2025012910000012"
			const value=ev.target.ticket.value
			let url
			if (value.length<sampleTicketNumber.length) {
				url=makeOtrsTicketUrlFromId(settings.otrs,value)
			} else {
				url=makeOtrsTicketUrlFromNumber(settings.otrs,value)
			}
			createTab({openerTabId:tabId,url})
			closeWindow()
		}
	} else {
		$form.hidden=true
		$form.onsubmit=(ev)=>{
			ev.preventDefault()
		}
	}
}
