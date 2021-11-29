export default function(type) {
	let content=tabs()
	if (type=='message') content+=envelope()
	if (type=='issue') content+=flag()
	if (type=='user') content+=avatar()
	return svg(content)
}

// when read as data url, firefox won't interpret #CCC colors? they work ok when read as file

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

function flag() {
	return (
		`<polygon points='-11,-7 11,-7 4,0 11,7 -11,7' fill='rgb(100%,20%,20%)' stroke='rgb(70%,0%,0%)' />`+
		`<line x1='-11' y1='-8' x2='-11' y2='12' stroke='brown' stroke-linecap='round' />`
	)
}

function avatar() {
	return (
		`<g fill='rgb(70%,70%,100%)' stroke='rgb(50%,50%,100%)'>`+
		`<circle cx='0' cy='-4' r='5' />`+
		`<path d='M -8,11 A 8 8 0 0 1 8,11 Z' />`+
		`</g>`
	)
}
