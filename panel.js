const defaultSettingsText=`otrs = https://otrs.openstreetmap.org/
osm = https://www.openstreetmap.org/
ticket_customer = \${user.name} <fwd@dwgmail.info>
ticket_subject = Issue #\${issue.id}
ticket_subject_user = Issue #\${issue.id} (User "\${user.name}")
ticket_subject_note = Issue #\${issue.id} (Note #\${note.id})
ticket_body_header = <h1><a href='\${issue.url}'>Issue #\${issue.id}</a></h1>
ticket_body_item = <p>Reported item : <a href='\${item.url}'>osm link</a></p>
ticket_body_item_user = <p>User : <a href='\${user.url}'>\${user.name}</a></p>
ticket_body_item_note = <p>Note : <a href='\${note.url}'>Note #\${note.id}</a></p>
`

// { TODO shouldn't be in panel code b/c can have multiple panels
let settings=parseSettingsText(defaultSettingsText)

const tabStates={}
const tabActions={}
// }

let updatePanelTimeoutId

document.getElementById('settings-load').addEventListener('change',readSettingsFile)
document.getElementById('settings-sample').addEventListener('click',downloadSettingsFile)

function readSettingsFile() {
	const [file]=this.files
	const reader=new FileReader()
	reader.addEventListener('load',async()=>{
		settings=parseSettingsText(reader.result)
		const [currentTab]=await browser.tabs.query({active:true,currentWindow:true})
		scheduleUpdatePanel(currentTab.id)
	})
	reader.readAsText(file)
}

function parseSettingsText(text) {
	const settings={}
	for (const line of text.split('\n')) {
		let match
		if (match=line.match(/^\s*([a-z_]+)\s*=\s*(.*)$/)) {
			const [,key,value]=match
			settings[key]=value
		}
	}
	return settings
}

function downloadSettingsFile() {
	const blob=new Blob([defaultSettingsText],{type:'text/plain'})
	const url=URL.createObjectURL(blob)
	browser.downloads.download({url,filename:'osm-dwg-helper-settings.txt',saveAs:true})
}

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
			delete tabActions[tabId] // remove pending action before await
			await addListenerAndSendMessage(tabId,'/content-create-ticket.js',{action:'addIssueDataToTicket',ticketData:tabAction.ticketData})
		} catch {
			// TODO possibly on login page
			tabActions[tabId]=tabAction
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
				url:tab.url
			}
			const contentIssueData=await addListenerAndSendMessage(tab.id,'/content-issue.js',{action:'getIssueData'})
			if (contentIssueData) Object.assign(tabState.issueData,contentIssueData)
		}
	}
	if (settings.osm!=null && settings.otrs!=null) {
		if (isOtrsTicketUrl(settings.otrs,tab.url)) {
			tabState.type='ticket'
			const contentIssueId=await addListenerAndSendMessage(tab.id,'/content-ticket.js',{action:'getIssueId'})
			if (contentIssueId!=null) {
				tabState.issueData={
					osmRoot:settings.osm,
					id:contentIssueId,
					url:`${settings.osm}issues/${encodeURIComponent(contentIssueId)}`
				}
			}
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

function isOtrsTicketUrl(otrsRoot,url) {
	const match=url.match(new RegExp('^'+escapeRegex(otrsRoot+'otrs/index.pl?Action=AgentTicketZoom;')))
	return !!match
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
		const $goToIssues=makeLink(`${settings.osm}issues?status=open`)
		$goToIssues.innerText="Go to open OSM issues"
		addAction($goToIssues)
	}
	if (settings.otrs!=null) {
		const $goToTickets=makeLink(settings.otrs)
		$goToTickets.innerText="Go to OTRS"
		addAction($goToTickets)
	}
	if (settings.otrs!=null) {
		const $createTicket=makeLink(`${settings.otrs}otrs/index.pl?Action=AgentTicketPhone`)
		let ticketType="empty"
		let issueData
		if (settings.osm==null) {
			ticketType+=" <span title='can only create empty ticket because osm key is not set'>(?)</span>"
		} else {
			if (tabStates[tabId].type=='issue') {
				issueData=tabStates[tabId].issueData
				ticketType=`issue #${issueData.id}`
				if (issueData.reportedItem) {
					ticketType+=` - ${issueData.reportedItem.type} ${issueData.reportedItem.ref}`
				}
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
	if (settings.osm!=null) {
		if (tabStates[tabId].type=='ticket' && tabStates[tabId].issueData) {
			const issueData=tabStates[tabId].issueData
			const $goToIssue=makeLink(issueData.url)
			$goToIssue.innerText=`Go to ticket issue #${issueData.id}`
			addAction($goToIssue)
		}
	}
	function makeLink(href) {
		const $a=document.createElement('a')
		$a.href=href
		return $a
	}
	function addAction($action) {
		const $li=document.createElement('li')
		$li.append($action)
		$actions.append($li)
	}
}

function convertIssueDataToTicketData(issueData) {
	if (issueData==null) return {}
	const ticketData={}
	ticketData.Body=evaluateHtmlTemplate(settings.ticket_body_header,{issue:issueData})
	if (issueData.reportedItem?.type=='user') {
		const values={issue:issueData,user:issueData.reportedItem}
		ticketData.Subject=evaluateTemplate(settings.ticket_subject_user,values)
		ticketData.Body+=evaluateHtmlTemplate(settings.ticket_body_item_user,values)
	} else if (issueData.reportedItem?.type=='note') {
		const values={issue:issueData,note:issueData.reportedItem}
		ticketData.Subject=evaluateTemplate(settings.ticket_subject_note,values)
		ticketData.Body+=evaluateHtmlTemplate(settings.ticket_body_item_note,values)
	} else {
		const values={issue:issueData}
		ticketData.Subject=evaluateTemplate(settings.ticket_subject,values)
		ticketData.Body+=evaluateHtmlTemplate(settings.ticket_body_item,values)
	}
	ticketData.FromCustomers=[]
	if (issueData.reports) {
		const addedCustomers={}
		for (const report of issueData.reports) {
			if (report.wasRead) continue
			const user={} // TODO save user url in content script
			if (report.by!=null) {
				user.name=report.by
				user.url=issueData.osmRoot+'user/'+encodeURIComponent(report.by)
				if (!addedCustomers[user.name]) {
					addedCustomers[user.name]=true
					ticketData.FromCustomers.push(evaluateTemplate(settings.ticket_customer,{user}))
				}
			}
			if (report.lead.length==0 && report.text.length==0) continue
			ticketData.Body+=`<hr>\n`
			if (report.lead.length>0) {
				const c0=`<span style='color:#6c757d'>` // "text-muted" color from osm website
				const c1=`</span>`
				ticketData.Body+=`<p>`
				for (const [fragmentType,fragmentText] of report.lead) {
					const t=escapeHtml(fragmentText)
					if (fragmentType=='user') {
						ticketData.Body+=`<a href='${escapeHtml(user.url)}'>${t}</a>`
					} else if (fragmentType=='category') {
						ticketData.Body+=`${c0}<strong>${t}</strong>${c1}`
					} else {
						ticketData.Body+=`${c0}${t}${c1}`
					}
				}
				ticketData.Body+=`</p>\n`
			}
			for (const paragraph of report.text) {
				ticketData.Body+=`<p>${escapeHtml(paragraph)}</p>\n`
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

function evaluateTemplate(template,values,escapeFn=s=>s) {
	if (template==null) return ''
	const templateChunks=template.split(/\${([^}]*)}/)
	let result=''
	for (let i=0;i<templateChunks.length;i++) {
		if (i%2==0) {
			result+=templateChunks[i]
		} else {
			let value=values
			for (const key of templateChunks[i].split('.')) {
				value=value[key]
			}
			if (!value) continue
			result+=escapeFn(value)
		}
	}
	return result
}

function evaluateHtmlTemplate(template,values) {
	return evaluateTemplate(template,values,escapeHtml)+'\n'
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
