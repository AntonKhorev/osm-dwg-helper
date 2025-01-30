import goToTicketParser from './go-to-ticket-parser.js'
import {makeOtrsTicketUrlFromId, makeOtrsTicketUrlFromNumber} from './utils.js'

export default function ($form,settings,tabId,closeWindow,createTab) {
	if (settings.otrs) {
		$form.hidden=false
		$form.onsubmit=(ev)=>{
			ev.preventDefault()
			const parsedValue=goToTicketParser(ev.target.ticket.value)
			let url
			if (parsedValue.id) {
				url=makeOtrsTicketUrlFromId(settings.otrs,parsedValue.id)
			} else if (parsedValue.number) {
				url=makeOtrsTicketUrlFromNumber(settings.otrs,parsedValue.number)
			}
			if (url) {
				createTab({openerTabId:tabId,url})
			}
			closeWindow()
		}
	} else {
		$form.hidden=true
		$form.onsubmit=(ev)=>{
			ev.preventDefault()
		}
	}
}
