import fs from 'fs-extra'
import path from 'path'
import convertSvgToPng from 'convert-svg-to-png'
import { rollup } from 'rollup'
import virtual from '@rollup/plugin-virtual'
import camelcase from 'camelcase'
import iconData, * as icon from './src/icon.js'

// copy files
await fs.remove('dist')
for (const entry of await fs.readdir('src',{withFileTypes:true})) {
	if (entry.isDirectory()) continue
	await fs.copy(
		path.join('src',entry.name),
		path.join('dist',entry.name)
	)
}
await fs.copy('node_modules/webextension-polyfill/dist/browser-polyfill.js','dist/browser-polyfill.js')

// add browser object polyfill
for (const htmlFilename of ['background.html','panel.html','options.html']) {
	const filename=path.join('dist',htmlFilename)
	const contents=String(await fs.readFile(filename))
	const patchedContents=contents.replace(/(?=<script)/,'<script type=module src=browser-polyfill.js></script>\n')
	await fs.writeFile(filename,patchedContents)
}

// bundle content scripts
const contentScriptsData=JSON.parse(
	await fs.readFile(path.join('src','content','scripts.json'))
)
for (const [contentScriptName,contentScriptCalls] of Object.entries(contentScriptsData)) {
	const filename=`${contentScriptName}.js`
	const contentScript=generateContentScript(contentScriptName,contentScriptCalls)
	const bundle=await rollup({
		input: "contentScript",
		plugins: [
			virtual({contentScript})
		]
	})
	bundle.write({
		file: path.join('dist','content',filename)
	})
	bundle.close()
}
{
	const inputFilename='src/content/issue.css'
	const outputFilename='dist/content/issue.css'
	let contents=String(await fs.readFile(inputFilename))
	for (const uiBranding of icon.uiBrandings) {
		const data=iconData(uiBranding)
		contents=contents.replace(
			new RegExp(`url\\(/icons/${uiBranding}\\.svg\\)`,'g'),
			`url(${data})`
		)
	}
	await fs.writeFile(outputFilename,contents)
}

// generate sidebar and popup html
{
	const filename=path.join('dist','panel.html')
	const contents=String(await fs.readFile(filename))
	await fs.writeFile(path.join('dist','popup.html'),contents)
	const patchedContents=contents.replace(/<!--\s+(.*permissions-warning.*)\s+-->/,'$1')
	await fs.writeFile(path.join('dist','sidebar.html'),patchedContents)
	await fs.remove(filename)
}

// convert extension icon to png
// chrome doesn't support svg icons in manifest: https://bugs.chromium.org/p/chromium/issues/detail?id=29683
// addons.mozilla.org also asks for png/jpg icon that overrides one specified in manifest
{
	const filename=path.join('dist','icon.svg')
	await convertSvgToPng.convertFile(filename,{width:64,height:64})
	await fs.remove(filename)
}

// generate toolbar/sidebar icon svgs
{
	const dirname=path.join('dist','icons')
	await fs.mkdir(dirname)
	await generateIconFile('default')
	for (const type of icon.types) {
		await generateIconFile(type,type)
	}
	async function generateIconFile(stringType,type) {
		const data=icon.svg(type)
		const filename=path.join(dirname,stringType+'.svg')
		await fs.writeFile(filename,data)
	}
	await fs.writeFile(
		path.join('dist','icon.js'),
		`export default function(type) {\n`+
		`	if (${JSON.stringify(icon.types)}.includes(type)) {\n`+
		`		return 'icons/'+type+'.svg'\n`+
		`	} else {\n`+
		`		return 'icons/default.svg'\n`+
		`	}\n`+
		`}\n`
	)
}

function generateContentScript(scriptName,scriptCalls) {
	const listenerInstalledFlag=camelcase(`osm-dwg-helper-${scriptName}-listener-installed`)
	const lines=[
		`import * as contentScript from './src/content/${scriptName}.js'`,
		``,
		`if (!window.${listenerInstalledFlag}) {`,
		`	browser.runtime.onMessage.addListener(messageListener)`,
		`	window.${listenerInstalledFlag}=true`,
		`}`,
		``,
	]
	lines.push(`function messageListener(message) {`)
	for (const [callName,callArgs] of Object.entries(scriptCalls)) {
		const callArgsString=['document',...callArgs.map(arg=>`message.${arg}`)].join(',')
		const call=`contentScript.${callName}(${callArgsString})`
		// lines.push(`	if (message.action=='${callName}') return new Promise(resolve=>{ ${call} })`)
		lines.push(`	if (message.action=='${callName}') return (async()=>${call})()`)
	}
	lines.push(`	return false`)
	lines.push(`}`,``)
	return lines.join('\n')
}
