/**
 * Go-to-object parse result
 * @typedef {Object} GoToObjectParseResult
 * @property {?("otrs"|"osm")} site
 * @property {?string} path
 * /

/**
 * Find ticket id or number in input string
 * @param {string} value
 * @returns {GoToObjectParseResult} result - detected value or empty object if nothing is detected
 */
export default function(value) {
	const sampleTicketNumber="2025012910000012"
	let match

	if (match=value.match(/^tickets$/i)) {
		return {site:"otrs", path:"otrs/index.pl?Action=AgentTicketStatusView"}
	}

	if (match=value.match(/ticket\s*#?(\d+)/i)) {
		const [,number]=match
		if (number.length==sampleTicketNumber.length) {
			return {site:"otrs", path:"otrs/index.pl?Action=AgentTicketZoom;TicketNumber="+number}
		} else {
			return {site:"otrs", path:"otrs/index.pl?Action=AgentTicketZoom;TicketID="+number}
		}
	}

	if (match=value.match(/\d+/)) {
		const [number]=match
		if (number.length==sampleTicketNumber.length) {
			return {site:"otrs", path:"otrs/index.pl?Action=AgentTicketZoom;TicketNumber="+number}
		}
	}

	return {}
}
