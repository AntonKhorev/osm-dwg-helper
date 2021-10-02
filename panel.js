let settings={}

document.getElementById('settings-load').addEventListener('change',readSettings)
document.getElementById('settings-sample').addEventListener('click',downloadSampleSettings)

browser.tabs.onActivated.addListener(createActions)
browser.tabs.onUpdated.addListener(createActions)
createActions()

async function createActions() {
	const [currentTab]=await browser.tabs.query({active:true,currentWindow:true})
	const $actions=document.getElementById('actions')
	$actions.innerHTML=""
	if (settings.otrs==null) {
		$actions.innerHTML="<p>Please load a settings file</p>"
		return
	}
	
	if (settings.osm!=null) {
		const $goToIssues=document.createElement('a')
		$goToIssues.href=`${settings.osm}issues?status=open`
		$goToIssues.innerHTML="Go to open OSM issues"
		addAction($goToIssues)
	}

	if (settings.otrs!=null) {
		const $goToTickets=document.createElement('a')
		$goToTickets.href=settings.otrs
		$goToTickets.innerHTML="Go to OTRS"
		addAction($goToTickets)
	}

	if (settings.otrs!=null) {
		const $createTicket=document.createElement('a')
		let ticketType="empty"
		if (settings.osm==null) {
			ticketType+=" <span title='can only create empty ticket because osm key is not set'>(?)</span>"
		} else {
			let match
			if (match=currentTab.url.match(new RegExp('^'+escapeRegex(settings.osm)+'issues/([0-9]+)'))) {
				const [,issueId]=match
				ticketType=`issue #${issueId}`
			}
		}
		$createTicket.innerHTML="Create ticket - "+ticketType
		$createTicket.addEventListener('click',runCreateTicket)
		addAction($createTicket)
	}

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

function escapeRegex(string) { // https://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript/3561711
	return string.replace(/[-\/\\^$*+?.()|[\]{}]/g,'\\$&')
}

function readSettings() {
	const [file]=this.files
	console.log('picked file',file)
	const reader=new FileReader()
	reader.addEventListener('load',()=>{
		const newSettings={}
		for (const line of reader.result.split('\n')) {
			let match
			if (match=line.match(/^\s*([a-z]+)\s*=\s*(.*)$/)) {
				const [,key,value]=match
				if (key=='otrs' || key=='osm') newSettings[key]=value
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
osm = https://www.openstreetmap.org/
`