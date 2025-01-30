/**
 * Find ticket id or number in input string
 * @param {string} value
 * @returns {object} with key id or number and detected value, or empty object if nothing is detected
 */
export default function(value) {
	const [idOrNumber]=value.match(/\d+/)
	if (!idOrNumber) return {}
	const sampleTicketNumber="2025012910000012"
	if (idOrNumber.length<sampleTicketNumber.length) {
		return {id:idOrNumber}
	} else {
		return {number:idOrNumber}
	}
}
