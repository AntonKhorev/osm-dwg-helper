let settings={}

document.getElementById('settings-load').addEventListener('change',readSettings)
document.getElementById('settings-sample').addEventListener('click',downloadSampleSettings)
createActions()

function createActions() {
	const $actions=document.getElementById('actions')
	$actions.innerHTML=""
	if (settings.otrs==null) {
		$actions.innerHTML="<p>Please load a settings file</p>"
		return
	}
	
	const $createTicket=document.createElement('a')
	$createTicket.innerHTML='Create ticket'
	$createTicket.addEventListener('click',runCreateTicket)
	addAction($createTicket)

	function addAction($action) {
		const $div=document.createElement('div')
		$div.append($action)
		$actions.append($div)
	}
}

function runCreateTicket() {
	const url=`${settings.otrs}otrs/index.pl?Action=AgentTicketPhone`
	browser.tabs.create({url})
}

function readSettings() {
	const [file]=this.files
	console.log('picked file',file)
	const reader=new FileReader()
	reader.addEventListener('load',()=>{
		const newSettings={}
		for (const line of reader.result.split('\n')) {
			let match
			if (match=line.match(/^\s*otrs\s*=\s*(.*)$/)) {
				const [,value]=match
				newSettings.otrs=value
			}
		}
		settings=newSettings
		createActions()
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