let settings={} // TODO shouldn't be in panel code b/c can have multiple panels

const tabStates={} // TODO shouldn't be in panel code b/c can have multiple panels
const tabActions={} // TODO shouldn't be in panel code b/c can have multiple panels

let updatePanelTimeoutId

document.getElementById('settings-load').addEventListener('change',readSettings)
document.getElementById('settings-sample').addEventListener('click',downloadSampleSettings)

function readSettings() {
	const [file]=this.files
	const reader=new FileReader()
	reader.addEventListener('load',async()=>{
		const newSettings={}
		for (const line of reader.result.split('\n')) {
			let match
			if (match=line.match(/^\s*([a-z]+)\s*=\s*(.*)$/)) {
				const [,key,value]=match
				if (key=='otrs' || key=='osm') newSettings[key]=value
			}
		}
		settings=newSettings
		const [currentTab]=await browser.tabs.query({active:true,currentWindow:true})
		scheduleUpdatePanel(currentTab.id)
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

{
	const [currentTab]=await browser.tabs.query({active:true,currentWindow:true})
	scheduleUpdatePanel(currentTab.id)
}

// TODO handle multiple windows

browser.tabs.onRemoved.addListener((tabId)=>{
	delete tabStates[tabId] // TODO what if onUpdated runs after onRemoved?
	delete tabActions[tabId]
})

browser.tabs.onActivated.addListener(({tabId,windowId})=>{
	// TODO schedule panel update in windowId-window
	scheduleUpdatePanel(tabId)
})

browser.tabs.onUpdated.addListener(async(tabId,changeInfo,tab)=>{
	if (tabStates[tab.id]==null) {
		tabStates[tab.id]={}
	}
	const tabState={}
	const issueId=getOsmIssueIdFromUrl(tab.url)
	if (issueId!=null) {
		tabState.type='issue'
		tabState.issueData={id:issueId}
		const contentIssueData=await addListenerAndSendMessage(tabId,'/content-issue.js',{action:'getIssueData'})
		if (contentIssueData) Object.assign(tabState.issueData,contentIssueData)
	}
	if (!isTabStateEqual(tabStates[tabId],tabState)) {
		tabStates[tabId]=tabState
		scheduleUpdatePanel(tabId)
	}
	const tabAction=tabActions[tabId]
	if (tabAction && tabAction.type=='createIssueTicket' && tab.status=='complete') {
		try {
			await addListenerAndSendMessage(tabId,'/content-create-ticket.js',{action:'addIssueDataToTicket',ticketData:tabAction.ticketData})
			delete tabActions[tabId]
		} catch {
			// TODO possibly on login page
		}
	}
})

async function addListenerAndSendMessage(tabId,contentScript,message) {
	await browser.tabs.executeScript(tabId,{file:contentScript})
	return await browser.tabs.sendMessage(tabId,message)
}

function scheduleUpdatePanel(tabId) {
	if (updatePanelTimeoutId!=null) return
	updatePanelTimeoutId=setTimeout(()=>{
		updatePanelTimeoutId=undefined
		updatePanel(tabId)
	},100)
}

function updatePanel(tabId) {
	if (tabStates[tabId]==null) {
		// TODO update tab state like browser.tabs.onUpdated does
		tabStates[tabId]={}
	}
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
		let issueData
		if (settings.osm==null) {
			ticketType+=" <span title='can only create empty ticket because osm key is not set'>(?)</span>"
		} else {
			if (tabStates[tabId].type=='issue') {
				issueData=tabStates[tabId].issueData
				ticketType=`issue #${issueData.id}`
			}
		}
		$createTicket.innerHTML="Create ticket - "+ticketType
		$createTicket.addEventListener('click',async()=>{
			const url=`${settings.otrs}otrs/index.pl?Action=AgentTicketPhone`
			const ticketTab=await browser.tabs.create({url})
			if (issueData) {
				tabActions[ticketTab.id]={
					type:'createIssueTicket',
					ticketData:convertIssueDataToTicketData(issueData)
				}
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

function convertIssueDataToTicketData(issueData) {
	const ticketData={}
	if (issueData.id!=null) {
		ticketData.Subject=`Issue #${issueData.id}`
	}
	if (issueData.reports) {
		for (const report of issueData.reports) {
			if (report.by!=null) {
				ticketData.FromCustomer=`${report.by} <TODO PUT EMAIL HERE>`
			}
		}
		ticketData.Body=`TODO put <b>html text</b> here`
	}
	return ticketData
}

function isOsmIssueUrl(url) {
	const issueId=getOsmIssueIdFromUrl(url)
	return issueId!=null
}

function getOsmIssueIdFromUrl(url) {
	if (settings.osm==null) return undefined
	const match=url.match(new RegExp('^'+escapeRegex(settings.osm)+'issues/([0-9]+)'))
	if (match) {
		const [,issueId]=match
		return issueId
	}
}

/*
function isOtrsCreateTicketUrl(url) {
	if (settings.otrs==null) return false
	return url==`${settings.otrs}otrs/index.pl?Action=AgentTicketPhone`
}
*/

function escapeRegex(string) { // https://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript/3561711
	return string.replace(/[-\/\\^$*+?.()|[\]{}]/g,'\\$&')
}

function isTabStateEqual(data1,data2) {
	if (data1.type!=data2.type) return false
	if (data1.type=='issue') {
		if (data1.issueData.id!=data2.issueData.id) return false
		// TODO compare other stuff
	}
	return true
}
