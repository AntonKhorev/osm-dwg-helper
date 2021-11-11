import fs from 'fs-extra'
import * as path from 'path'

await fs.remove('dist')
await fs.copy('src','dist')
await fs.copy('node_modules/webextension-polyfill/dist/browser-polyfill.js','dist/browser-polyfill.js')

for (const htmlFilename of ['background.html','sidebar.html','popup.html','options.html']) {
	const filename=path.join('dist',htmlFilename)
	const contents=String(await fs.readFile(filename))
	const patchedContents=contents.replace(/(?=<script)/,'<script type=module src=browser-polyfill.js></script>\n')
	await fs.writeFile(filename,patchedContents)
}

{
	const filename=path.join('dist','background.js')
	const contents=String(await fs.readFile(filename))
	const patchedContents=contents.replace(/(?<=const\s+buildScriptChromePatch\s*=\s*)false/,'true')
	await fs.writeFile(filename,patchedContents)
}

for (const jsFilename of ['panel.js','options.js']) {
	const filename=path.join('dist',jsFilename)
	const contents=String(await fs.readFile(filename))
	const patchedContents=`(async()=>{${contents}\n})() // https://github.com/mozilla/addons-linter/issues/4020\n`
	await fs.writeFile(filename,patchedContents)
}
