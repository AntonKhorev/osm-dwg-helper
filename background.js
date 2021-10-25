window.defaultSettingsText=`otrs = https://otrs.openstreetmap.org/
osm = https://www.openstreetmap.org/
osm_api = https://api.openstreetmap.org/
ticket_customer = \${user.name} <fwd@dwgmail.info>
ticket_subject = Issue #\${issue.id}
ticket_subject_user = Issue #\${issue.id} (User "\${user.name}")
ticket_subject_user_id = Issue #\${issue.id} (User "\${user.name}")
ticket_subject_note = Issue #\${issue.id} (Note #\${note.id})
ticket_body_header = <h1><a href='\${issue.url}'>Issue #\${issue.id}</a></h1>
ticket_body_item = <p>Reported item : <a href='\${item.url}'>osm link</a></p>
ticket_body_item_user = <p>User : <a href='\${user.url}'>\${user.name}</a></p>
ticket_body_item_user_id = <p>User : <a href='\${user.url}'>\${user.name}</a> , <a href='\${user.apiUrl}'>#\${user.id}</a></p>
ticket_body_item_note = <p>Note : <a href='\${note.url}'>Note #\${note.id}</a></p>
`

let settings=parseSettingsText(defaultSettingsText)

const tabStates=new Map()
const tabActions=new Map()

window.updateSettings=async(text)=>{
	if (tabActions.size>0) {
		tabActions.clear()
		reactToActionsUpdate()
	}
	tabStates.clear()
	settings=parseSettingsText(text)
	const activeTabs=await browser.tabs.query({active:true})
	for (const tab of activeTabs) {
		updateTabState(tab)
	}
}

window.registerNewPanel=(tab)=>{
	updateTabState(tab,true)
	reactToActionsUpdate()
}

window.addTabAction=(tabId,tabAction)=>{
	tabActions.set(tabId,tabAction)
	reactToActionsUpdate()
}

window.removeTabAction=(tabId)=>{
	if (tabActions.has(tabId)) {
		tabActions.delete(tabId)
		reactToActionsUpdate()
	}
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

function reactToActionsUpdate() {
	browser.runtime.sendMessage({action:'updatePanelActionsOngoing',tabActions})
}

browser.tabs.onRemoved.addListener((tabId)=>{
	tabStates.delete(tabId) // TODO what if onUpdated runs after onRemoved?
	if (tabActions.has(tabId)) {
		tabActions.delete(tabId)
		reactToActionsUpdate()
	}
})

browser.tabs.onActivated.addListener(async({tabId})=>{
	const tabState=tabStates.get(tabId)
	if (tabState) {
		browser.runtime.sendMessage({
			action:'updatePanelActionsNew',
			settings,tabId,tabState
		})
	} else {
		const tab=await browser.tabs.get(tabId)
		updateTabState(tab,true)
	}
})

browser.tabs.onUpdated.addListener(async(tabId,changeInfo,tab)=>{
	const tabState=await updateTabState(tab)
	const tabAction=tabActions.get(tabId)
	if (tabAction && tabAction.type=='scrapeReportedItemThenCreateIssueTicket' && tab.status=='complete') {
		// TODO check if url matches, if not cancel action
		let ticketData
		if (tabState.type=='user' && tabState.userData.id!=null) {
			ticketData=convertIssueDataToTicketData(settings,tabAction.issueData,tabState.userData)
		} else {
			// TODO fetch issue country
			ticketData=convertIssueDataToTicketData(settings,tabAction.issueData)
		}
		tabActions.set(tabId,{
			type:'createIssueTicket',
			ticketData
		})
		browser.tabs.update(tabId,{
			url:`${settings.otrs}otrs/index.pl?Action=AgentTicketPhone`
		})
		reactToActionsUpdate()
	}
	if (tabAction && tabAction.type=='createIssueTicket' && tab.status=='complete') {
		// TODO check if url matches, if not cancel action
		try {
			tabActions.delete(tabId) // remove pending action before await
			await addListenerAndSendMessage(tabId,'/content-create-ticket.js',{action:'addIssueDataToTicket',ticketData:tabAction.ticketData})
		} catch {
			tabActions.set(tabId,tabAction)
		}
		if (!tabActions.has(tabId)) {
			// TODO reschedule get ticket id/url
			reactToActionsUpdate()
		}
	}
})

async function updateTabState(tab,forcePanelUpdate=false) {
	if (tabStates.get(tab.id)==null) {
		tabStates.set(tab.id,{})
	}
	const tabState=await getTabState(tab)
	const tabStateChanged=!isTabStateEqual(tabStates.get(tab.id),tabState)
	if (tabStateChanged) tabStates.set(tab.id,tabState)
	if (forcePanelUpdate || tabStateChanged && tab.active) browser.runtime.sendMessage({
		action:'updatePanelActionsNew',
		settings,tabId:tab.id,tabState
	})
	return tabState
}

function isTabStateEqual(data1,data2) {
	if (data1.type!=data2.type) return false
	if (data1.type=='user') {
		if (data1.userData.id!=data2.userData.id) return false
	}
	if (data1.type=='issue') {
		if (data1.issueData.id!=data2.issueData.id) return false
		// TODO compare other stuff
	}
	if (data1.type=='ticket') {
		if (data1.issueData.id!=data2.issueData.id) return false
		// TODO compare other stuff
	}
	return true
}

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
	if (settings.osm!=null) {
		if (isOsmUserUrl(settings.osm,tab.url)) {
			tabState.type='user'
			tabState.userData={}
			const userId=await addListenerAndSendMessage(tab.id,'/content-user.js',{action:'getUserId'})
			if (userId!=null) {
				let apiUrl='#' // not important for now - only used in templates
				if (settings.osm_api!=null) apiUrl=settings.osm_api+'api/0.6/user/'+encodeURIComponent(userId)
				tabState.userData={
					id:userId,
					apiUrl
				}
			}
		}
	}
	if (settings.osm!=null && settings.otrs!=null) {
		if (isOtrsTicketUrl(settings.otrs,tab.url)) {
			tabState.type='ticket'
			tabState.issueData={}
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

async function addListenerAndSendMessage(tabId,contentScript,message) {
	await browser.tabs.executeScript(tabId,{file:contentScript})
	return await browser.tabs.sendMessage(tabId,message)
}

function convertIssueDataToTicketData(settings,issueData,additionalUserData={}) {
	if (issueData==null) return {}
	const ticketData={}
	ticketData.Body=evaluateHtmlTemplate(settings.ticket_body_header,{issue:issueData})
	if (issueData.reportedItem?.type=='user') {
		const userData=issueData.reportedItem
		if (additionalUserData.id!=null) {
			const values={issue:issueData,user:{...userData,...additionalUserData}}
			ticketData.Subject=evaluateTemplate(settings.ticket_subject_user_id,values)
			ticketData.Body+=evaluateHtmlTemplate(settings.ticket_body_item_user_id,values)
		} else {
			const values={issue:issueData,user:userData}
			ticketData.Subject=evaluateTemplate(settings.ticket_subject_user,values)
			ticketData.Body+=evaluateHtmlTemplate(settings.ticket_body_item_user,values)
		}
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

function getOsmIssueIdFromUrl(osmRoot,url) {
	const match=url.match(new RegExp('^'+escapeRegex(osmRoot)+'issues/([0-9]+)'))
	if (match) {
		const [,issueId]=match
		return issueId
	}
}

function isOsmUserUrl(osmRoot,url) {
	const match=url.match(new RegExp('^'+escapeRegex(osmRoot)+'user/[^/]+$'))
	return !!match
}

function isOsmNoteUrl(osmRoot,url) {
	const match=url.match(new RegExp('^'+escapeRegex(osmRoot)+'note/[0-9]+$'))
	return !!match
}

function isOtrsTicketUrl(otrsRoot,url) {
	const match=url.match(new RegExp('^'+escapeRegex(otrsRoot+'otrs/index.pl?Action=AgentTicketZoom;')))
	return !!match
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
