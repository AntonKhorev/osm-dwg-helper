// Copy version notes to clipboard in order to paste them on Add-on Developer Hub > Manage Version
// Allowed HTML: <a href title> <abbr title> <acronym title> <b> <blockquote> <code> <em> <i> <li> <ol> <strong> <ul>

import * as fs from 'fs/promises'
import clipboard from 'clipboardy'
import {escapeHtml} from './src/utils.js'

const lines=await getFileLines('CHANGELOG.md')

let contents=''
let inList=false
const majorMinorVersionSet=new Set()
for (const line of lines) {
	let match
	if (match=line.match(/^##\s+((\d+\.\d+)\.\d+)/)) {
		if (inList) {
			inList=false
			contents+=`</ul>\n`
		}
		const [,header,majorMinorVersion]=match
		majorMinorVersionSet.add(majorMinorVersion)
		if (majorMinorVersionSet.size>2) break
		contents+=`<strong>${processMarkdown(header)}</strong>\n`
	} else if (match=line.match(/^-\s+(.*)/)) {
		if (!inList) {
			inList=true
			contents+=`<ul>\n`
		}
		const [,item]=match
		contents+=`<li>${processMarkdown(item)}</li>\n`
	}
}
if (inList) {
	contents+=`</ul>\n`
}
contents+=`<a href="https://raw.githubusercontent.com/AntonKhorev/osm-dwg-helper/master/CHANGELOG.md">Full changelog</a>\n`

await clipboard.write(contents)

/**
 * @param s {string} Markdown string
 * @returns {string} HTML string
 */
function processMarkdown(s) {
	s=s.replace(/\[([^\]]*)\]\(([^\)]*)\)/g,(_,text,href)=>`<a href='${escapeHtml(href)}'>${text}</a>`)
	s=s.replace(/\*([^*]*)\*/g,(_,text)=>`<em>${text}</em>`)
	s=s.replace(/`([^`]*)`/g,(_,text)=>`<code>${text}</code>`)
	return s
}

async function getFileLines(filename) {
	return String(
		await fs.readFile(filename)
	).split(/\r\n|\r|\n/)
}
