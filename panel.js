console.log('ran panel code')

let settings={} // TODO shouldn't be in panel code b/c can have multiple panels

const createTicketTabs={}

document.getElementById('settings-load').addEventListener('change',readSettings)
document.getElementById('settings-sample').addEventListener('click',downloadSampleSettings)

browser.tabs.onUpdated.addListener(async(tabId,changeInfo,tab)=>{
	console.log('browser.tabs.onUpdated called',tabId,changeInfo,tab.status,tab.url,'!!is it an issue url:',isOsmIssueUrl(tab.url)) ///
	const [currentTab]=await browser.tabs.query({active:true,currentWindow:true})
	if (currentTab.id==tabId) {
		createActions(currentTab)
	}
	
	// { to be ran once maybe from background script
	/*
	if (isOsmIssueUrl(tab.url)) {
		console.log('injecting content-issue.js') ///
		await browser.tabs.executeScript(tabId,{file:'/content-issue.js'})
	}
	if (isOtrsCreateTicketUrl(tab.url)) {
		console.log('injecting content-create-ticket.js') ///
		await browser.tabs.executeScript(tabId,{file:'/content-create-ticket.js'})
	}
	*/
	// } to be ran once maybe from background script

	return ///
	if (tab.status=='complete' && createTicketTabs[tabId]) {
		const issueData=createTicketTabs
		try {
			await browser.tabs.sendMessage(ticketTab.id,{action:'addIssueDataToTicket',issueData})
			delete createTicketTabs[tabId]
		} catch {
			// TODO possibly on login page
		}
	}
})

const [currentTab]=await browser.tabs.query({active:true,currentWindow:true})
createActions(currentTab)

async function createActions(currentTab) {
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
		// console.log('got to ticket adding block') ///
		const $createTicket=document.createElement('a')
		let ticketType="empty"
		const issueData={}
		if (settings.osm==null) {
			ticketType+=" <span title='can only create empty ticket because osm key is not set'>(?)</span>"
		} else {
			const issueId=getOsmIssueIdFromUrl(currentTab.url)
			if (issueId!=null) {
				ticketType=`issue #${issueId}`
				issueData.id=issueId
				//const contentIssueData=await browser.tabs.sendMessage(currentTab.id,{action:'getIssueData'})
				const contentIssueData=await addListenerAndSendMessage(currentTab.id,'/content-issue.js',{action:'getIssueData'})
				if (contentIssueData) Object.assign(issueData,contentIssueData)
			}
		}
		$createTicket.innerHTML="Create ticket - "+ticketType
		$createTicket.addEventListener('click',async()=>{
			const url=`${settings.otrs}otrs/index.pl?Action=AgentTicketPhone`
			const ticketTab=await browser.tabs.create({url})
			if (issueData.id!=null) createTicketTabs[ticketTab.id]=issueData
		})
		addAction($createTicket)
	}

	function addAction($action) {
		const $div=document.createElement('div')
		$div.append($action)
		$actions.append($div)
	}
}

async function addListenerAndSendMessage(tabId,contentScript,message) {
	await browser.tabs.executeScript(tabId,{file:contentScript})
	return await browser.tabs.sendMessage(tabId,message)
}

function isOsmIssueUrl(url) {
	// wtf?
	// return !!url.match(new RegExp('issues/([0-9]+)'))
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

function isOtrsCreateTicketUrl(url) {
	if (settings.otrs==null) return false
	return url==`${settings.otrs}otrs/index.pl?Action=AgentTicketPhone`
}

function escapeRegex(string) { // https://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript/3561711
	return string.replace(/[-\/\\^$*+?.()|[\]{}]/g,'\\$&')
}

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
		createActions(currentTab)
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