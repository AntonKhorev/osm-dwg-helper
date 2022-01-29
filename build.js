import fs from 'fs-extra'
import * as path from 'path'
import convertSvgToPng from 'convert-svg-to-png'
import { rollup } from 'rollup'
import virtual from '@rollup/plugin-virtual'
import camelcase from 'camelcase'
import * as icon from './src/icon.js'

// copy files
await fs.remove('dist')
await fs.copy('src','dist')
await fs.copy('node_modules/webextension-polyfill/dist/browser-polyfill.js','dist/browser-polyfill.js')

// add browser object polyfill
for (const htmlFilename of ['background.html','sidebar.html','popup.html','options.html']) {
	const filename=path.join('dist',htmlFilename)
	const contents=String(await fs.readFile(filename))
	const patchedContents=contents.replace(/(?=<script)/,'<script type=module src=browser-polyfill.js></script>\n')
	await fs.writeFile(filename,patchedContents)
}

// bundle content scripts
for (const contentScriptDirEntry of await fs.readdir(path.join('src','content'),{withFileTypes:true})) {
	if (contentScriptDirEntry.isDirectory()) continue
	const filename=contentScriptDirEntry.name
	const listenerInstalledFlag=camelcase(`osm-dwg-helper-${filename}-listener-installed`)
	const contentScript=
		`import messageListener from './src/content/${filename}'\n`+
		`if (!window.${listenerInstalledFlag}) {\n`+
		`	browser.runtime.onMessage.addListener(messageListener)\n`+
		`	window.${listenerInstalledFlag}=true\n`+
		`}\n`
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
