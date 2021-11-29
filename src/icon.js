export default function(type) {
	let content=tabs()
	if (type=='message') content+=envelope()
	return svg(content)
}

function svg(content) {
	return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='-16 -16 32 32' stroke-width='2'>${content}</svg>`
}

function tabs() {
	return (
		`<polygon points='-15,15 -15,-11 -11,-11 -11,-15 7,-15 7,-11 11,-11' fill='rgb(90%,90%,90%)' stroke='rgb(20%,20%,40%)' />`+
		`<polygon points='15,-15 15,11 11,11 11,15 -7,15 -7,11 -11,11' fill='rgb(40%,40%,40%)' stroke='rgb(10%,10%,20%)' />`
	)
}

function envelope() {
	return (
		`<rect x='-11' y='-7' width='22' height='14' fill='white' stroke='red' />`+
		`<polyline points='-11,-7 0,2 11,-7' fill='none' stroke='red' stroke-linecap='round' stroke-linejoin='round' />`
	)
}
