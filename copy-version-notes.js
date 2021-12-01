// Copy version notes to clipboard in order to paste them on Add-on Developer Hub > Manage Version
// Allowed HTML: <a href title> <abbr title> <acronym title> <b> <blockquote> <code> <em> <i> <li> <ol> <strong> <ul>

import fs from 'fs-extra'
import clipboard from 'clipboardy'

const lines=await getFileLines('CHANGELOG.md')

let contents=`<ul>\n`
let inList=false
for (const line of lines) {
	const match=line.match(/^-\s+(.*)/)
	if (!inList) {
		if (!match) continue
		inList=true
	}
	if (inList) {
		if (!match) break
		const [,item]=match
		contents+=`<li>${item}\n`
	}
}
contents+=`</ul>\n`

await clipboard.write(contents)

async function getFileLines(filename) {
	return String(
		await fs.readFile(filename)
	).split(/\r\n|\r|\n/)
}
