// Copy version notes to clipboard in order to paste them on Add-on Developer Hub > Manage Version
// Allowed HTML: <a href title> <abbr title> <acronym title> <b> <blockquote> <code> <em> <i> <li> <ol> <strong> <ul>

import fs from 'fs-extra'
import clipboard from 'clipboardy'
import {escapeHtml} from './src/utils.js'

const lines=await getFileLines('CHANGELOG.md')

let contents=''
let inList=false
for (const line of lines) {
	let match
	if (match=line.match(/^##\s+(.*)/)) {
		if (inList) {
			inList=false
			contents+=`</ul>\n`
		}
		const [,header]=match
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

await clipboard.write(contents)

/**
 * @param s {string} Markdown string
 * @returns {string} HTML string
 */
function processMarkdown(s) {
	return s.replace(/\[([^\]]*)\]\(([^\)]*)\)/g,(_,text,href)=>`<a href='${escapeHtml(href)}'>${escapeHtml(text)}</a>`)
}

async function getFileLines(filename) {
	return String(
		await fs.readFile(filename)
	).split(/\r\n|\r|\n/)
}
