import * as fs from 'fs/promises'
import path from 'path'
import sharp from 'sharp'
import { rollup } from 'rollup'
import virtual from '@rollup/plugin-virtual'
import camelcase from 'camelcase'
import iconData, * as icon from './src/icon.js'

// copy files
await fs.rm('dist',{recursive:true,force:true})
await fs.mkdir('dist')
for (const entry of await fs.readdir('src',{withFileTypes:true})) {
	const srcPath=path.join('src',entry.name)
	const dstPath=path.join('dist',entry.name)
	if (entry.isDirectory()) {
		if (entry.name=='content') continue
		await fs.mkdir(dstPath)
		for (const subEntry of await fs.readdir(srcPath,{withFileTypes:true})) {
			const srcSubPath=path.join(srcPath,subEntry.name)
			const dstSubPath=path.join(dstPath,subEntry.name)
			if (subEntry.isDirectory()) {
				continue
			} else {
				await fs.copyFile(srcSubPath,dstSubPath)
			}
		}
	} else {
		await fs.copyFile(srcPath,dstPath)
	}
}
await fs.copyFile('node_modules/webextension-polyfill/dist/browser-polyfill.js','dist/browser-polyfill.js')

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
		const data=iconData(uiBranding,'branded')
		contents=contents.replace(
			new RegExp(`url\\(/icons/branded/${uiBranding}\\.svg\\)`,'g'),
			`url(${data})`
		)
	}
	await fs.writeFile(outputFilename,contents)
}

// generate sidebar and popup html
{
	const filename=path.join('dist','panel.html')
	await fs.copyFile(filename,path.join('dist','popup.html'))
	await fs.copyFile(filename,path.join('dist','sidebar.html'))
	await fs.rm(filename)
}

// generate table of contents for cookbook
{
	const filename=path.join('dist','cookbook.html')
	const contents=String(await fs.readFile(filename))
	let text=`<nav>\n`
	let depth=0
	let id=``
	for (const line of contents.split('\n')) {
		let match
		match=line.match(`<section id=(.*)>`)
		if (match) {
			[,id]=match
			continue
		}
		match=line.match(`<h([2-6])>(.*)</h`)
		if (!match) continue
		const [,levelString,title]=match
		const level=Number(levelString)-1
		while (depth<level) {
			text+=`<ol>\n`
			depth++
		}
		while (depth>level) {
			text+=`</ol>\n`
			depth--
		}
		text+=`<li><a href=#${id}>${title}</a>\n`
	}
	while (depth>0) {
		text+=`</ol>\n`
		depth--
	}
	text+=`</nav>`
	const patchedContents=contents.replace(`<!-- TOC -->`,text)
	await fs.writeFile(filename,patchedContents)
}

// convert extension icon to png
// chrome doesn't support svg icons in manifest: https://bugs.chromium.org/p/chromium/issues/detail?id=29683
// addons.mozilla.org also asks for png/jpg icon that overrides one specified in manifest
{
	const svgFilename=path.join('dist','icon.svg')
	const pngFilename=path.join('dist','icon.png')
	await sharp(svgFilename).resize(64).toFile(pngFilename)
	await fs.rm(svgFilename)
}

// generate toolbar/sidebar icon svgs
{
	for (const modifier of icon.modifiers) {
		const dirname=path.join('dist','icons',modifier)
		await fs.mkdir(dirname,{recursive:true})
		for (const symbol of icon.symbols) {
			const data=icon.svg(symbol,modifier)
			const filename=path.join(dirname,symbol+'.svg')
			await fs.writeFile(filename,data)
		}
	}
	await fs.writeFile(
		path.join('dist','icon.js'),
		`export default function(symbol,modifier='void') {\n`+
		`	if (!${JSON.stringify(icon.symbols)}.includes(symbol)) symbol='void'\n`+
		`	return 'icons/'+modifier+'/'+symbol+'.svg'\n`+
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
		const callArgsString=['document',...callArgs.map((arg)=>{
			if (arg=='reportStateUpdate') {
				return `()=>browser.runtime.sendMessage({action:'tabStateWasChanged',tabId:message.tabId})`
			} else {
				return `message.${arg}`
			}
		})].join(',')
		const call=`contentScript.${callName}(${callArgsString})`
		// lines.push(`	if (message.action=='${callName}') return new Promise(resolve=>{ ${call} })`)
		lines.push(`	if (message.action=='${callName}') return (async()=>${call})()`)
	}
	lines.push(`	return false`)
	lines.push(`}`,``)
	return lines.join('\n')
}
