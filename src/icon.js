export default function(type) {
	let content=tabs()
	if (type=='message') content+=envelope()
	return svg(content)
}

function svg(content) {
	return (
		`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32'>`+
		`<g stroke-width='2'>`+
		content+
		`</g>`+
		`</svg>`
	)
}

function tabs() {
	return (
		`<polygon points='1,31 1,5 5,5 5,1 23,1 23,5 27,5' fill='rgb(90%,90%,90%)' stroke='rgb(20%,20%,40%)' />`+
		`<polygon points='31,1 31,27 27,27 27,31 9,31 9,27 1,27' fill='rgb(40%,40%,40%)' stroke='rgb(10%,10%,20%)' />`
	)
}

function envelope() {
	return (
		`<rect x='5' y='9' width='22' height='14' fill='white' stroke='red' />`+
		`<polyline points='5,9 16,18 27,9' fill='none' stroke='red' stroke-linecap='round' stroke-linejoin='round' />`
	)
}
