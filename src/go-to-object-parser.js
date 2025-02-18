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

	if (match=value.match(/\b(ticket|issue|block|redaction|changeset|cset|c)(?:s?\/|\s*)#?(\d+)/i)) {
		let [,name,number]=match
		name=name.toLowerCase()
		if (name[0]=='t') {
			if (number.length==sampleTicketNumber.length) {
				return {site:"otrs", path:"otrs/index.pl?Action=AgentTicketZoom;TicketNumber="+number, icon:"ticket"}
			} else {
				return {site:"otrs", path:"otrs/index.pl?Action=AgentTicketZoom;TicketID="+number, icon:"ticket"}
			}
		} else if (name[0]=='i') {
			return {site:"osm", path:"issues/"+number, icon:"issue"}
		} else if (name[0]=='b') {
			return {site:"osm", path:"user_blocks/"+number, icon:"block"}
		} else if (name=='redaction') {
			return {site:"osm", path:"redactions/"+number, icon:"redaction"}
		} else if (name[0]=='c') {
			return {site:"osm", path:"changeset/"+number}
		}
	}

	if (match=value.match(/\b(node|n|way|w|relation|rel|r)(?:s?\/|\s*)#?(\d+)(?:v(\d+))?/i)) {
		let [,name,number,version]=match
		name=name.toLowerCase()
		let subpath=number
		if (version) subpath+="/history/"+version
		if (name[0]=='n') {
			return {site:"osm", path:"node/"+subpath, icon:"node"}
		} else if (name[0]=='w') {
			return {site:"osm", path:"way/"+subpath}
		} else if (name[0]=='r') {
			return {site:"osm", path:"relation/"+subpath}
		}
	}

	if (match=value.match(/^tickets|issues|blocks|redactions$/i)) {
		let [name]=match
		name=name.toLowerCase()
		if (name=="tickets") {
			return {site:"otrs", path:"otrs/index.pl?Action=AgentTicketStatusView", icon:"ticket"}
		} else if (name=="issues") {
			return {site:"osm", path:"issues?status=open", icon:"issue"}
		} else if (name=="blocks") {
			return {site:"osm", path:"user_blocks", icon:"block"}
		} else if (name=="redactions") {
			return {site:"osm", path:"redactions", icon:"redaction"}
		}
	}

	if (match=value.match(/\d+/)) {
		const [number]=match
		if (number.length==sampleTicketNumber.length) {
			return {site:"otrs", path:"otrs/index.pl?Action=AgentTicketZoom;TicketNumber="+number, icon:"ticket"}
		}
	}

	return {}
}
