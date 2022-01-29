import fs from 'fs-extra'
import path from 'path'
import yaml from 'js-yaml'

if (process.argv[2]===undefined) {
	console.log('need to supply path to OSM website source code')
	process.exit(1)
} else {
	checkBlockHeadingsInAllLocales(process.argv[2])
}

async function checkBlockHeadingsInAllLocales(osmWebsiteDirname) {
	const localesDirname=path.join(osmWebsiteDirname,'config','locales')
	for (const dirEntry of await fs.readdir(localesDirname,{withFileTypes:true})) {
		if (dirEntry.isDirectory()) continue
		await checkBlockHeadingsInLocale(path.join(localesDirname,dirEntry.name))
	}
}

async function checkBlockHeadingsInLocale(localeFilename) {
	try {
		const doc=yaml.load(
			await fs.readFile(localeFilename),
			{json:true} // en.yml has a duplicate key
		)
		const [[locale,root]]=Object.entries(doc)
		const heading=root?.user_blocks?.show?.heading_html
		if (heading==null) return
		const variables=[...heading.matchAll(/%{(.*?)}/g)].map(([_,key])=>key)
		if (variables.length!=2) throw new Error(`unexpected number of variables (${variables.length}`)
		if (variables[0]=='block_on' && variables[1]=='block_by') {
			// ok
		} else if (variables[0]=='block_by' && variables[1]=='block_on') {
			console.log(`reverse user order in locale ${locale}`)
		} else {
			throw new Error(`unexpected variables`)
		}
	} catch (ex) {
		console.log(`exception in locale ${localeFilename}:`,ex)
	}
}
