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
		const issueData={}
		if (settings.osm==null) {
			ticketType+=" <span title='can only create empty ticket because osm key is not set'>(?)</span>"
		} else {
			let match
			if (match=currentTab.url.match(new RegExp('^'+escapeRegex(settings.osm)+'issues/([0-9]+)'))) {
				const [,issueId]=match
				ticketType=`issue #${issueId}`
				issueData.id=issueId
			}
			//const issueData=await browser.tabs.sendMessage(currentTab.id,{action:'getIssueData'})
		}
		$createTicket.innerHTML="Create ticket - "+ticketType
		$createTicket.addEventListener('click',async()=>{
			const url=`${settings.otrs}otrs/index.pl?Action=AgentTicketPhone`
			const ticketTab=await browser.tabs.create({url})
			const ticketListener=async()=>{
				if (ticketTab.status!='complete') return
				browser.tabs.onUpdated.removeListener(ticketListener) // TODO only clear it on successful page opening
				await browser.tabs.executeScript(ticketTab.id,{file:'/content-create-ticket.js'})
				await browser.tabs.sendMessage(ticketTab.id,{action:'addIssueDataToTicket',issueData})
				// TODO: wait for activation, inject script, wait for loading, send message - this won't require <all_urls> permission
			}
			if (issueData.id!=null) {
				browser.tabs.onUpdated.addListener(ticketListener,{tabId:ticketTab.id})
			}
		})
		addAction($createTicket)
	}

	function addAction($action) {
		const $div=document.createElement('div')
		$div.append($action)
		$actions.append($div)
	}
}

function escapeRegex(string) { // https://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript/3561711
	return string.replace(/[-\/\\^$*+?.()|[\]{}]/g,'\\$&')
}

function readSettings() {
	const [file]=this.files
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