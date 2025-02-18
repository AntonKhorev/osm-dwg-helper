/**
 * Go-to-object parse result
 * @typedef {Object} GoToObjectParseResult
 * @property {"otrs"|"osm"} site
 * @property {string} path
 */

const idPattern="(?:s?/|\\s*)#?(\\d+)"
const versionPattern="(?:\\s*(?:v|ver|version|/)\\s*(\\d+))?"
const formatPattern="(?:(?:\\.|\\s*)(xml|json)\\b)?"

/**
 * Convert object query into path on otrs or osm website
 * @param {string} value
 * @returns {?GoToObjectParseResult} result - detected value
 */
export default function(value) {
	const sampleTicketNumber="2025012910000012"
	let match

	if (match=value.match(new RegExp(`\\b(ticket|issue|block|redaction|changeset|cset|c)${idPattern}${formatPattern}`,'i'))) {
		let [,name,number,format]=match
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
			return getInFormat(format,"block",number,null,"user_blocks")
		} else if (name=='redaction') {
			return {site:"osm", path:"redactions/"+number, icon:"redaction"}
		} else if (name[0]=='c') {
			return getInFormat(format,"changeset",number)
		}
	}

	if (match=value.match(new RegExp(`\\b(node|n|way|w|relation|rel|r)${idPattern}${versionPattern}${formatPattern}`,'i'))) {
		let [,name,id,version,format]=match
		name=name.toLowerCase()
		let type
		if (name[0]=='n') {
			type="node"
		} else if (name[0]=='w') {
			type="way"
		} else if (name[0]=='r') {
			type="relation"
		} else {
			return null
		}
		return getInFormat(format,type,id,version)
	}

	if (match=value.match(/\buser\s*(.*)/i)) {
		const [,username]=match
		return {site:"osm", path:"user/"+encodeURIComponent(username), icon:"user"}
	}
	if (match=value.match(new RegExp(`\\buid${idPattern}${formatPattern}`,'i'))) {
		const [,id,format]=match
		if (format) {
			return getInFormat(format,"user",id)
		} else {
			return {site:"osm_api", path:"api/0.6/user/"+id, icon:"user"}
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

	return null
}

function getInFormat(format,type,id,version,pathPart=type) {
	let site
	let path
	if (format=="xml") {
		site="osm_api"
		path="api/0.6/"+pathPart+"/"+id
		if (version) path+="/"+version
		path+=".xml"
	} else if (format=="json") {
		site="osm_api"
		path="api/0.6/"+pathPart+"/"+id
		if (version) path+="/"+version
		path+=".json"
	} else {
		site="osm"
		path=pathPart+"/"+id
		if (version) path+="/history/"+version
	}
	return {site, path, icon:type}
}
