const background=await browser.runtime.getBackgroundPage()

document.getElementById('settings-load').addEventListener('change',readSettingsFile)
document.getElementById('settings-save').addEventListener('click',()=>downloadSettingsFile(makeCurrentSettingsText))
document.getElementById('settings-sample').addEventListener('click',()=>downloadSettingsFile(makeDefaultSettingsText))

function readSettingsFile() {
	const [file]=this.files
	const reader=new FileReader()
	reader.addEventListener('load',()=>{
		const settings=parseSettingsText(reader.result)
		background.settingsManager.write(settings)
	})
	reader.readAsText(file)
}

async function downloadSettingsFile(getText) {
	const granted=await browser.permissions.request({permissions:["downloads"]})
	if (!granted) return
	const blob=new Blob([await getText()],{type:'text/plain'})
	const url=URL.createObjectURL(blob)
	browser.downloads.download({url,filename:'osm-dwg-helper-settings.txt',saveAs:true})
}

function parseSettingsText(text) {
	const validKeys={}
	for (const [k] of settingsManager.getSpecsWithoutHeaders()) {
		validKeys[k]=true
	}
	const settings={}
	for (const line of text.split('\n')) {
		let match
		if (match=line.match(/^\s*([a-z_]+)\s*=\s*(.*)$/)) {
			const [,key,value]=match
			if (validKeys[key]) settings[key]=value
		}
	}
	return settings
}

async function makeDefaultSettingsText() {
	let text=''
	for (const [k,v] of settingsManager.getSpecsWithoutHeaders()) {
		text+=`${k} = ${v}\n`
	}
	return text
}

async function makeCurrentSettingsText() {
	const settings=await background.settingsManager.read()
	let text=''
	for (const [k] of settingsManager.getSpecsWithoutHeaders()) {
		text+=`${k} = ${settings[k]}\n`
	}
	return text
}
