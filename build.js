import fs from 'fs-extra'
import * as path from 'path'
import convertSvgToPng from 'convert-svg-to-png'
import * as icon from './src/icon.js'

// load manifest
const manifest=JSON.parse(
	await fs.readFile(path.join('src','manifest.json'))
)

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

// add flag to execute polyfill
{
	const filename=path.join('dist','background.js')
	const contents=String(await fs.readFile(filename))
	const patchedContents=contents.replace(/(?<=const\s+buildScriptChromePatch\s*=\s*)false/,'true')
	await fs.writeFile(filename,patchedContents)
}

// wrap with async fn to avoid linter errors about top-level asyncs
for (const jsFilename of ['panel.js','options.js']) {
	const filename=path.join('dist',jsFilename)
	const contents=String(await fs.readFile(filename))
	const patchedContents=contents.replace(/(?=const\s+background)/,'(async()=>{')+'\n})() // https://github.com/mozilla/addons-linter/issues/4020\n'
	await fs.writeFile(filename,patchedContents)
}

// convert extension icon to png
{
	const filename=path.join('dist','icon.svg')
	await convertSvgToPng.convertFile(filename,{width:64,height:64})
	await fs.remove(filename)
	manifest.icons['64']='icon.png'
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
	manifest.browser_action.default_icon='icons/default.svg'
	manifest.sidebar_action.default_icon='icons/default.svg'
}

// update manifest
{
	await fs.writeFile(
		path.join('dist','manifest.json'),
		JSON.stringify(manifest,null,'\t')
	)
}
