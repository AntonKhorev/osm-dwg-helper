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

	if (match=value.match(/^tickets|issues$/i)) {
		let [name]=match
		name=name.toLowerCase()
		if (name=="tickets") {
			return {site:"otrs", path:"otrs/index.pl?Action=AgentTicketStatusView"}
		} else if (name=="issues") {
			return {site:"osm", path:"issues?status=open"}
		}
	}

	if (match=value.match(/\b(ticket|issue|changeset|cset|cs|c|node|n|way|w|relation|rel|r)\s*#?(\d+)/i)) {
		let [,name,number]=match
		name=name.toLowerCase()
		if (name[0]=='t') {
			if (number.length==sampleTicketNumber.length) {
				return {site:"otrs", path:"otrs/index.pl?Action=AgentTicketZoom;TicketNumber="+number}
			} else {
				return {site:"otrs", path:"otrs/index.pl?Action=AgentTicketZoom;TicketID="+number}
			}
		} else if (name[0]=='i') {
			return {site:"osm", path:"issues/"+number}
		} else if (name[0]=='c') {
			return {site:"osm", path:"changeset/"+number}
		} else if (name[0]=='n') {
			return {site:"osm", path:"node/"+number}
		} else if (name[0]=='w') {
			return {site:"osm", path:"way/"+number}
		} else if (name[0]=='r') {
			return {site:"osm", path:"relation/"+number}
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
