const background=await browser.runtime.getBackgroundPage()

document.getElementById('settings-load').addEventListener('change',readSettingsFile)
document.getElementById('settings-sample').addEventListener('click',downloadSettingsFile)

function readSettingsFile() {
	const [file]=this.files
	const reader=new FileReader()
	reader.addEventListener('load',()=>{
		background.updateSettings(reader.result)
	})
	reader.readAsText(file)
}

async function downloadSettingsFile() {
	const granted=await browser.permissions.request({permissions:["downloads"]})
	if (!granted) return
	const blob=new Blob([background.defaultSettingsText],{type:'text/plain'})
	const url=URL.createObjectURL(blob)
	browser.downloads.download({url,filename:'osm-dwg-helper-settings.txt',saveAs:true})
}
