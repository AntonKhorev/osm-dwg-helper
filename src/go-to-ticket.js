import goToTicketParser from './go-to-ticket-parser.js'
import {makeOtrsTicketUrlFromId, makeOtrsTicketUrlFromNumber} from './utils.js'

export default function ($form,settings,tabId,closeWindow,createTab) {
	if (settings.otrs) {
		$form.hidden=false
		$form.ticket.oninput=()=>{
			const value=$form.ticket.value
			const parsedValue=goToTicketParser(value)
			if (value=="" || parsedValue.id || parsedValue.number) {
				$form.ticket.setCustomValidity("")
			} else {
				$form.ticket.setCustomValidity("ticket id or number required")
			}
		}
		$form.onsubmit=(ev)=>{
			ev.preventDefault()
			const value=$form.ticket.value
			const parsedValue=goToTicketParser(value)
			let url
			if (parsedValue.id) {
				url=makeOtrsTicketUrlFromId(settings.otrs,parsedValue.id)
			} else if (parsedValue.number) {
				url=makeOtrsTicketUrlFromNumber(settings.otrs,parsedValue.number)
			}
			if (url) {
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
