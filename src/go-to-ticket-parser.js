/**
 * Find ticket id or number in input string
 * @param {string} value
 * @returns {object} with key id or number and detected value, or empty object if nothing is detected
 */
export default function(value) {
	const sampleTicketNumber="2025012910000012"
	if (value.length<sampleTicketNumber.length) {
		return {id:value}
	} else {
		return {number:value}
	}
	return {}
}
