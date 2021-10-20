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
	const tabState=await getTabState(tab)
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

async function getTabState(tab) {
	const tabState={}
	if (settings.osm!=null) {
		const issueId=getOsmIssueIdFromUrl(settings.osm,tab.url)
		if (issueId!=null) {
			tabState.type='issue'
			tabState.issueData={
				osmRoot:settings.osm,
				id:issueId,
			}
			const contentIssueData=await addListenerAndSendMessage(tab.id,'/content-issue.js',{action:'getIssueData'})
			if (contentIssueData) Object.assign(tabState.issueData,contentIssueData)
		}
	}
	return tabState
}

function getOsmIssueIdFromUrl(osmRoot,url) {
	const match=url.match(new RegExp('^'+escapeRegex(osmRoot)+'issues/([0-9]+)'))
	if (match) {
		const [,issueId]=match
		return issueId
	}
}

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
		$createTicket.href=`${settings.otrs}otrs/index.pl?Action=AgentTicketPhone`
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
		if (issueData) {
			$createTicket.addEventListener('click',(ev)=>{
				ev.preventDefault()
				browser.tabs.create({
					openerTabId:tabId,
					url:$createTicket.href
				}).then((ticketTab)=>{
					tabActions[ticketTab.id]={
						type:'createIssueTicket',
						ticketData:convertIssueDataToTicketData(issueData)
					}
				})
			})
		}
		addAction($createTicket)
	}
	function addAction($action) {
		const $div=document.createElement('div')
		$div.append($action)
		$actions.append($div)
	}
}

function convertIssueDataToTicketData(issueData) {
	if (issueData==null) return {}
	const ticketData={}
	ticketData.Subject=`Issue #${issueData.id}`
	const issueUrl=issueData.osmRoot+'issues/'+encodeURIComponent(issueData.id)
	ticketData.Body=`<h1><a href='${escapeHtml(issueUrl)}'>${escapeHtml(ticketData.Subject)}</a></h1>\n`
	if (issueData.reports) {
		for (const report of issueData.reports) {
			if (report.by!=null) {
				ticketData.FromCustomer=`${report.by} <TODO PUT EMAIL HERE>`
			}
			if (report.wasRead || report.lead.length==0 && report.text.length==0) continue
			ticketData.Body+=`<hr>\n`
			if (report.lead.length>0) {
				const userUrl=issueData.osmRoot+'user/'+encodeURIComponent(report.by)
				ticketData.Body+=`<p>`
				for (const [fragmentType,fragmentText] of report.lead) {
					if (fragmentType=='user') {
						ticketData.Body+=`<a href='${escapeHtml(userUrl)}'>${escapeHtml(fragmentText)}</a>`
					} else if (fragmentType=='category') {
						ticketData.Body+=`<strong>${escapeHtml(fragmentText)}</strong>`
					} else {
						ticketData.Body+=escapeHtml(fragmentText)
					}
				}
				ticketData.Body+=`\n`
			}
			for (const paragraph of report.text) {
				ticketData.Body+=`<p>${escapeHtml(paragraph)}\n`
			}
		}
	}
	return ticketData
}

function isTabStateEqual(data1,data2) {
	if (data1.type!=data2.type) return false
	if (data1.type=='issue') {
		if (data1.issueData.id!=data2.issueData.id) return false
		// TODO compare other stuff
	}
	return true
}

function escapeRegex(string) { // https://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript/3561711
	return string.replace(/[-\/\\^$*+?.()|[\]{}]/g,'\\$&')
}

function escapeHtml(string) {
	return string
	.replace(/&/g,"&amp;")
	.replace(/</g,"&lt;")
	.replace(/>/g,"&gt;")
	.replace(/"/g,"&quot;")
	.replace(/'/g,"&#039;")
}
