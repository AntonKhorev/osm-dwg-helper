export default function(symbol,modifier='void') {
	const data=svg(symbol,modifier)
	const encodedData=(typeof btoa !== 'undefined'
		? btoa(data) // browser
		: Buffer.from(data).toString('base64') // node.js
	)
	return "data:image/svg+xml;charset=utf-8;base64,"+encodedData
}

export const modifiers=['void','branded']

export const symbols=['void','message','message-add','issue','issue-add','user','block','block-add','ticket','ticket-add','search','translate']

export const uiBrandings=['closed','open','ticket']

export function svg(symbol,modifier) {
	let content=''
	if (modifier=='branded') content+=tabs()
	if (symbol=='message' || symbol=='message-add') content+=envelope()
	if (symbol=='issue' || symbol=='issue-add') content+=flag()
	if (symbol=='user' || symbol=='block' || symbol=='block-add') content+=avatar()
	if (symbol=='block' || symbol=='block-add') content+=cross()
	if (symbol=='ticket' || symbol=='ticket-add') content+=ticket()
	if (symbol=='ticket-add' || symbol=='message-add' || symbol=='issue-add' || symbol=='block-add') content+=add()
	if (symbol=='search') content+=search()
	if (symbol=='translate') content+=translate()
	if (symbol=='closed') content+=closedMarker()
	if (symbol=='open') content+=openMarker()
	return `<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='-16 -16 32 32' stroke-width='2'>${content}</svg>`
}

function tabs() {
	return (
		`<polygon points='-15,15 -15,-11 -11,-11 -11,-15 7,-15 7,-11 11,-11' fill='rgb(90%,90%,90%)' stroke='rgb(20%,20%,40%)' />`+
		`<polygon points='15,-15 15,11 11,11 11,15 -7,15 -7,11 -11,11' fill='rgb(40%,40%,40%)' stroke='rgb(10%,10%,20%)' />`
	)
}

function envelope() {
	return (
		`<rect x='-11' y='-7' width='22' height='14' fill='#FFF' stroke='#F00' />`+
		`<polyline points='-11,-7 0,2 11,-7' fill='none' stroke='#F00' stroke-linecap='round' stroke-linejoin='round' />`
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

function cross() {
	const size=10
	return (
		`<line x1='-${size}' y1='-${size}' x2='${size}' y2='${size}' stroke='#F00' stroke-width='6' />`+
		`<line x1='-${size}' y1='${size}' x2='${size}' y2='-${size}' stroke='#F00' stroke-width='6' />`
	)
}

function ticket() {
	return (
		`<path d='M -7,0 ${halfTicketPath(1)} ${halfTicketPath(0)}' fill='rgb(100%,70%,0%)' stroke='rgb(70%,40%,0%)' />`
	)
	function halfTicketPath(isUpper) {
		const m=isUpper?'-':''
		const p=isUpper?'':'-'
		//return `V ${m}5 A 2 2 0 0 0 ${m}7,${m}9 V ${m}11 H ${m}3 A 3 3 0 0 0 ${p}3,${m}11 H ${p}7 V ${m}9 A 2 2 0 0 0 ${p}7,${m}5 V 0`
		return `V ${m}3 A 2 2 0 0 0 ${m}7,${m}7 V ${m}11 H ${m}3 A 3 3 0 0 0 ${p}3,${m}11 H ${p}7 V ${m}7 A 2 2 0 0 0 ${p}7,${m}3 V 0`
	}
}

function add() {
	const size=5
	const x=-8
	return (
		`<line x1='${x-size}' y1='0' x2='${x+size}' y2='0' stroke='#44F' stroke-width='4' />`+
		`<line x1='${x}' y1='-${size}' x2='${x}' y2='${size}' stroke='#44F' stroke-width='4' />`
	)
}

function search() {
	const r=10
	const s=4
	const h=(r*.5**.5-s).toFixed(2)
	return (
		`<circle cx='${-s}' cy='${-s}' r='${r}' stroke='#755' fill='#44C4' />`+
		`<line x1='${h}' y1='${h}' x2='14' y2='14' stroke='#755' stroke-width='4' />`
	)
}

function translate() {
	return `<path d='M-14,-11 H4 M-5,-11 V-14 M1,-11 Q0,0 -14,3 M-11,-11 Q-10,0 4,3 M-2,14 L4,0 C6,-4 6,-4 8,0 L14,14 M1,7 H11' stroke='#888' fill='none' />`
}

function closedMarker() {
	return `<polygon points='-7,-7 11,0 -7,7' stroke='#F44' fill='#FCC' />`
}

function openMarker() {
	return `<polygon points='-7,-7 7,-7 0,11' stroke='#F44' fill='#FCC' />`
}
