export default function(symbol,modifier='void') {
	const data=svg(symbol,modifier)
	const encodedData=(typeof btoa !== 'undefined'
		? btoa(data) // browser
		: Buffer.from(data).toString('base64') // node.js
	)
	return "data:image/svg+xml;charset=utf-8;base64,"+encodedData
}

export const modifiers=['void','branded']

export const symbols=['void','message','message-add','issue','issue-add','note','changeset','node','way','relation','user','block','block-add','redaction','ticket','ticket-add','search','translate']

export const uiBrandings=['closed','open','ticket']

export function svg(symbol,modifier) {
	let content=''
	if (modifier=='branded') content+=tabs()
	if (symbol=='message' || symbol=='message-add') content+=envelope()
	if (symbol=='issue' || symbol=='issue-add') content+=flag()
	if (symbol=='note') content+=note()
	if (symbol=='changeset') content+=changeset()
	if (symbol=='node' || symbol=='way' || symbol=='relation') content+=element()
	if (symbol=='node') content+=node()
	if (symbol=='way') content+=way()
	if (symbol=='relation') content+=relation()
	if (symbol=='user' || symbol=='block' || symbol=='block-add') content+=avatar()
	if (symbol=='block' || symbol=='block-add') content+=cross()
	if (symbol=='redaction') content+=redaction()
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

function note() {
	return (
		`<path d="M0,16 L8.91,-1.45 A10,10 0 1 0 -8.91,-1.45 Z" fill="#48C" stroke="#26A"/>`+
		`<path d="M-5,-6 A5,5 0 0 1 5,-6 A5,5 0 0 1 -5,-6" fill="#FFF" stroke="#26A"/>`
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

function redaction() {
	return (
		`<rect x="-15" y="-9" width="30" height="18" fill="#000" stroke="#444" />`+
		`<path d="M-8,-5 h-3 v10 h3 M8,-5 h3 v10 h-3" fill="none" stroke="#CCC" />`+
		`<circle r="2" fill="#CCC" />`+
		`<circle r="2" fill="#CCC" cx="-6" />`+
		`<circle r="2" fill="#CCC" cx="6" />`
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

function changeset() {
	return (
		`<path d="M-15,-9 Q3,-15 15,-11 Q-3,5 -15,-9 Z" fill="#411" stroke="#612" stroke-linejoin="round" />`+
		`<rect x="-9" y="-11" width="6" height="6" fill="#FFF" stroke="#F22" />`+
		`<rect x="3" y="-15" width="6" height="6" fill="#FFF" stroke="#F22" />`+
		`<path d="M-15,-9 Q-6,0 -9,11 Q-5,13 -1,13 Q1,0 -3,-5 Q-7,-5 -15,-9Z" fill="#C44" stroke="#612" stroke-linejoin="round" />`+
		`<path d="M-1,13 Q1,0 -3,-5 Q6,-4 15,-11 Q9,-3 13,7 Q7,13 -1,13 Z" fill="#A33" stroke="#612" stroke-linejoin="round" />`
	)
}

function element() {
	return (
		`<rect width="30" height="30" stroke="#8888" fill="#fffc" ry="4" x="-15" y="-15"/>`
	)
}

function node() {
	return (
		`<circle r="3" fill="#bee6be" stroke="black" stroke-width="1.5"/>`
	)
}

function way() {
	return (
		`<path stroke="#888" fill="none" d="M 5.125 -8.75 L -8.875 2.125 L 8.375 8.875"/>`+
		`<circle cx="5.125" cy="-8.75" r="3" fill="black"/>`+
		`<circle cx="-8.875" cy="2.125" r="3" fill="black"/>`+
		`<circle cx="8.375" cy="8.875" r="3" fill="black"/>`
	)
}

function relation() {
	return (
		`<path d="M -7.5 -7.5 L 8.5 -8.25" stroke="#888"/>`+
		`<path d="M -7.5 -7.5 L 8.5 1.75" stroke="#888"/>`+
		`<path d="M -7.5 -7.5 L -8.25 8.5" stroke="#888"/>`+
		`<path d="M -7.5 -7.5 L 1.75 8.5" stroke="#888"/>`+
		`<circle cx="8.5" cy="-8.25" r="3" fill="black"/>`+
		`<circle cx="8.5" cy="1.75" r="3" fill="black"/>`+
		`<circle cx="-8.25" cy="8.5" r="3" fill="black"/>`+
		`<circle cx="1.75" cy="8.5" r="3" fill="black"/>`+
		`<circle cx="-7" cy="-7" r="4" fill="#bee6be" stroke="black" stroke-width="1.5"/>`
	)
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
