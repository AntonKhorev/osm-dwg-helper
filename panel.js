console.log('panel RUN!!!')
document.getElementById('action-create-ticket').addEventListener('click',()=>{
	alert('create ticket CLICK!!')
})
document.getElementById('settings-load').addEventListener('change',readSettings)
document.getElementById('settings-sample').addEventListener('click',downloadSampleSettings)

function readSettings() {
	const [file]=this.files
	console.log('picked file',file)
	const reader=new FileReader()
	reader.addEventListener('load',()=>{
		console.log('read this:',reader.result)
	})
	reader.readAsText(file)
}

function downloadSampleSettings() {
	const blob=new Blob([sampleSettingsFile],{type:'text/plain'})
	const url=URL.createObjectURL(blob)
	browser.downloads.download({url,filename:'osm-dwg-helper-settings.txt',saveAs:true})
}

const sampleSettingsFile=`otrs = https://otrs.example.com/
`