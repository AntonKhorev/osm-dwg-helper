const buildScriptChromePatch=false

const tabStates=new Map()
const tabActions=new Map()

class SettingsManager {
	// specs:
	// string for a header or
	// [key, default value, title, other attributes: {type: input type, state: affects tab state, origin: needs origin permission, note}]
	constructor(specs) {
		this.specs=specs
		this.specKeys={}
		for (const spec of this.getSpecsWithoutHeaders()) {
			const [key]=spec
			this.specKeys[key]=spec
		}
	}
	*getSpecsWithoutHeaders() {
		for (const spec of this.specs) {
			if (typeof spec == 'string') continue
			yield spec
		}
	}
	async read() {
		const kvs=await browser.storage.local.get()
		for (const [k,v] of this.getSpecsWithoutHeaders()) {
			if (kvs[k]==null) kvs[k]=v
		}
		return kvs
	}
	async readSettingsAndPermissions() {
		const settings=await this.read()
		const permissions={}
		const missingOrigins=[]
		for (const [key,,,attrs] of this.getSpecsWithoutHeaders()) {
			if (!settings[key]) continue
			if (!attrs?.origin) continue
			const origin=settings[key]+'*'
			const containsOrigin=await browser.permissions.contains({
				origins:[origin],
			})
			if (containsOrigin) {
				permissions[key]=settings[key]
			} else {
				missingOrigins.push(origin)
			}
		}
		return [settings,permissions,missingOrigins]
	}
	async write(kvs) {
		if (tabActions.size>0) {
			tabActions.clear()
			reactToActionsUpdate()
		}
		await browser.storage.local.set(kvs)
		const needToUpdate=(attr)=>{
			for (const key of Object.keys(kvs)) {
				const [,,,attrs]=this.specKeys[key]
				if (attrs?.[attr]) return true
			}
			return false
		}
		if (needToUpdate('origin')) {
			sendUpdatePanelPermissionsMessage()
		}
		if (needToUpdate('state')) {
			tabStates.clear()
			const activeTabs=await browser.tabs.query({active:true})
			for (const tab of activeTabs) {
				updateTabState(tab)
			}
		}
	}
}

window.settingsManager=new SettingsManager([
	"Main settings",
	['otrs','https://otrs.openstreetmap.org/',"OTRS root URL",{type:'url',state:true,origin:true}],
	['osm','https://www.openstreetmap.org/',"OpenStreetMap root URL",{type:'url',state:true,origin:true}],
	['osm_api','https://api.openstreetmap.org/',"OpenStreetMap API root URL",{type:'url',state:true,note:"to make a link to user id"}],
	"OTRS ticket creation from OSM issues",
	['ticket_customer',`\${user.name} <fwd@dwgmail.info>`,"Customer template",{note:"usually needs to be email-like for OTRS not to complain"}],
	['ticket_subject',`Issue #\${issue.id}`,"Subject template when reported item is unknown"],
	['ticket_subject_user',`Issue #\${issue.id} (User "\${user.name}")`,"Subject template when reported item is user with unknown id"],
	['ticket_subject_user_id',`Issue #\${issue.id} (User "\${user.name}")`,"Subject template when reported item is user with known id"],
	['ticket_subject_note',`Issue #\${issue.id} (Note #\${note.id})`,"Subject template when reported item is note"],
	// TODO textareas for html templates, also need to alter textfile format
	['ticket_body_header',`<h1><a href='\${issue.url}'>Issue #\${issue.id}</a></h1>`,"Body header template",{note:"HTML"}],
	['ticket_body_item',`<p>Reported item : <a href='\${item.url}'>osm link</a></p>`,"Body reported item template when it's unknown",{note:"HTML"}],
	['ticket_body_item_user',`<p>User : <a href='\${user.url}'>\${user.name}</a></p>`,"Body reported item template when it's user with unknown id",{note:"HTML"}],
	['ticket_body_item_user_id',`<p>User : <a href='\${user.url}'>\${user.name}</a> , <a href='\${user.apiUrl}'>#\${user.id}</a></p>`,"Body reported item template when it's user with known id",{note:"HTML"}],
	['ticket_body_item_note',`<p>Note : <a href='\${note.url}'>Note #\${note.id}</a></p>`,"Body reported item template when it's note",{note:"HTML"}],
	"Addition of OSM messages to OTRS tickets",
	['article_message_to_subject',`PM to \${user.name}`,"Subject template for outbound message"],
	['article_message_from_subject',`PM from \${user.name}`,"Subject template for inbound message"],
])

class TabAction {
	getPanelHtml() {
		return `unknown action`
	}
	async act(tab,tabState) {}
}

class ScrapeReportedItemThenCreateIssueTicket extends TabAction {
	constructor(openerTabId,issueData) {
		super()
		this.openerTabId=openerTabId
		this.issueData=issueData
	}
	getPanelHtml() {
		return `scrape reported item then create ticket`
	}
	async act(tab,tabState) {
		const settings=await settingsManager.read()
		let ticketData
		if (tabState.type=='user' && tabState.userData.id!=null) {
			ticketData=convertIssueDataToTicketData(settings,this.issueData,tabState.userData)
		} else {
			// TODO fetch issue country - make another tab action class for this
			ticketData=convertIssueDataToTicketData(settings,this.issueData)
		}
		tabActions.set(tab.id,new CreateIssueTicket(this.openerTabId,ticketData))
		browser.tabs.update(tab.id,{
			url:`${settings.otrs}otrs/index.pl?Action=AgentTicketPhone`
		})
		reactToActionsUpdate()
	}
}

class CreateIssueTicket extends TabAction {
	constructor(openerTabId,ticketData) {
		super()
		this.openerTabId=openerTabId
		this.ticketData=ticketData
	}
	getPanelHtml() {
		return `create ticket <em>${escapeHtml(this.ticketData.Subject)}</em>`
	}
	async act(tab,tabState) {
		try {
			await addListenerAndSendMessage(tab.id,'create-ticket',{action:'addIssueDataToTicket',ticketData:this.ticketData})
		} catch {
			tabActions.set(tab.id,this)
			return
		}
		tabActions.set(tab.id,new CommentIssueWithTicketUrl(this.openerTabId))
		reactToActionsUpdate()
	}
}

class CommentIssueWithTicketUrl extends TabAction {
	constructor(openerTabId) {
		super()
		this.openerTabId=openerTabId
	}
	getPanelHtml() {
		return `add comment to issue for created ticket`
	}
	async act(tab,tabState) {
		const settings=await settingsManager.read()
		const ticketId=getOtrsCreatedTicketId(settings.otrs,tab.url)
		if (!ticketId) {
			tabActions.set(tab.id,this)
			return
		}
		const ticketUrl=`${settings.otrs}otrs/index.pl?Action=AgentTicketZoom;TicketID=${encodeURIComponent(ticketId)}`
		await addListenerAndSendMessage(this.openerTabId,'issue',{
			action:'addComment',
			comment:ticketUrl
		})
		browser.tabs.update(tab.id,{url:ticketUrl})
		reactToActionsUpdate()
	}
}

class GoToLastMessageThenAddMessageToTicket extends TabAction {
	constructor(openerTabId,mailbox,addAs) {
		super()
		this.openerTabId=openerTabId
		this.mailbox=mailbox
		this.addAs=addAs
	}
	getPanelHtml() {
		return `go to last ${this.mailbox} message`
	}
	async act(tab,tabState) {
		const messageId=await addListenerAndSendMessage(tab.id,'mailbox',{action:'getTopMessageId'})
		if (!messageId) {
			// TODO handle login page, empty mailbox
			// tabActions.set(tab.id,this)
			return
		}
		const settings=await settingsManager.read()
		const messageUrl=`${settings.osm}messages/${encodeURIComponent(messageId)}`
		tabActions.set(tab.id,new ScrapeMessageThenAddMessageToTicket(this.openerTabId,this.mailbox,this.addAs))
		browser.tabs.update(tab.id,{url:messageUrl})
		reactToActionsUpdate()
	}
}

class ScrapeMessageThenAddMessageToTicket extends TabAction {
	constructor(openerTabId,mailbox,addAs) {
		super()
		this.openerTabId=openerTabId
		this.mailbox=mailbox
		this.addAs=addAs
	}
	getPanelHtml() {
		return `scrape ${this.mailbox} message`
	}
	async act(tab,tabState) {
		const messageData=await addListenerAndSendMessage(tab.id,'message',{action:'getMessageData'})
		tabActions.set(this.openerTabId,new AddMessageToTicket(this.mailbox,this.addAs,messageData.user,messageData.body))
		browser.tabs.remove(tab.id)
		browser.tabs.update(this.openerTabId,{active:true})
		reactToActionsUpdate()
	}
}

class AddMessageToTicket extends TabAction {
	constructor(mailbox,addAs,messageTo,messageText) {
		super()
		this.mailbox=mailbox
		this.addAs=addAs
		this.messageTo=messageTo
		this.messageText=messageText
	}
	getPanelHtml() {
		return `add message to <em>${escapeHtml(this.messageTo)}</em> as ${this.addAs} article`
	}
	async act(tab,tabState) {
		const settings=await settingsManager.read()
		const ticketId=getOtrsTicketId(settings.otrs,tab.url)
		if (!ticketId) {
			tabActions.set(tab.id,this)
			return
		}
		let otrsAction='AgentTicketNote'
		if (this.addAs=='pending') otrsAction='AgentTicketPending'
		const ticketNoteUrl=`${settings.otrs}otrs/index.pl?Action=${otrsAction};TicketID=${ticketId}`
		let subjectTemplate=settings.article_message_to_subject
		if (this.mailbox=='inbox') subjectTemplate=settings.article_message_from_subject
		let processedMessageText=this.messageText
		processedMessageText=processedMessageText.replaceAll(`<blockquote>`,`<div style="border:none; border-left:solid blue 1.5pt; padding:0cm 0cm 0cm 4.0pt" type="cite">`)
		processedMessageText=processedMessageText.replaceAll(`</blockquote>`,`</div>`)
		tabActions.set(tab.id,new AddTicketArticle(
			evaluateTemplate(subjectTemplate,{user:{name:this.messageTo}}),
			processedMessageText
		))
		browser.tabs.update(tab.id,{url:ticketNoteUrl})
		reactToActionsUpdate()
	}
}

class AddTicketArticle extends TabAction {
	constructor(subject,body) {
		super()
		this.subject=subject
		this.body=body
	}
	getPanelHtml() {
		return `add ticket article <em>${escapeHtml(this.subject)}</em>`
	}
	async act(tab,tabState) {
		try {
			await addListenerAndSendMessage(tab.id,'ticket-article',{
				action:'addArticleSubjectAndBody',
				subject:this.subject,
				body:this.body
			})
		} catch {
			tabActions.set(tab.id,this)
			return
		}
		reactToActionsUpdate()
	}
}

window.TabActions={
	ScrapeReportedItemThenCreateIssueTicket,
	CreateIssueTicket,
	GoToLastMessageThenAddMessageToTicket
}

window.reportPermissionsUpdate=async()=>{
	sendUpdatePanelPermissionsMessage()
}

window.registerNewPanel=(tab)=>{
	sendUpdatePanelPermissionsMessage() // TODO limit the update to this tab
	updateTabState(tab,true)
	reactToActionsUpdate()
}

window.initiateNewTabAction=async(newTabUrl,tabAction)=>{
	const newTab=await browser.tabs.create({
		openerTabId:tabAction.openerTabId,
		url:newTabUrl
	})
	tabActions.set(newTab.id,tabAction)
	reactToActionsUpdate()
}

window.removeTabAction=(tabId)=>{
	if (tabActions.has(tabId)) {
		tabActions.delete(tabId)
		reactToActionsUpdate()
	}
}

function reactToActionsUpdate() {
	const tabActionListItems=[]
	for (const [tabId,action] of tabActions) {
		tabActionListItems.push([tabId,action.getPanelHtml()])
	}
	browser.runtime.sendMessage({action:'updatePanelActionsOngoing',tabActionListItems})
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
		sendUpdatePanelActionsMessage(tabId,tabState)
	} else {
		const tab=await browser.tabs.get(tabId)
		updateTabState(tab,true)
	}
})

browser.tabs.onUpdated.addListener(async(tabId,changeInfo,tab)=>{
	if (tab.url=='about:blank') return // bail on about:blank, when opening new tabs it gets complete status before supplied url is opened
	const tabState=await updateTabState(tab)
	const tabAction=tabActions.get(tabId)
	if (tabAction && (
		changeInfo.status=='complete' || // just loaded
		changeInfo.attention!=null && tab.status=='complete' // switched to already loaded
	)) {
		// TODO check if url matches, if not cancel action
		tabActions.delete(tabId)
		await tabAction.act(tab,tabState)
	}
})

async function updateTabState(tab,forcePanelUpdate=false) {
	if (tabStates.get(tab.id)==null) {
		tabStates.set(tab.id,{})
	}
	const tabState=await getTabState(tab)
	const tabStateChanged=!isTabStateEqual(tabStates.get(tab.id),tabState)
	if (tabStateChanged) tabStates.set(tab.id,tabState)
	if (forcePanelUpdate || tabStateChanged && tab.active) sendUpdatePanelActionsMessage(tab.id,tabState)
	return tabState
}

async function sendUpdatePanelActionsMessage(tabId,tabState) {
	const [settings,permissions]=await settingsManager.readSettingsAndPermissions()
	browser.runtime.sendMessage({
		action:'updatePanelActionsNew',
		settings,permissions,
		tabId,tabState
	})
}

async function sendUpdatePanelPermissionsMessage() { // TODO fix name - it's also for options window
	const [,,missingOrigins]=await settingsManager.readSettingsAndPermissions()
	browser.runtime.sendMessage({
		action:'updatePanelPermissions',
		missingOrigins
	})
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
	const [settings,permissions]=await settingsManager.readSettingsAndPermissions()
	const tabState={}
	if (settings.osm) {
		const issueId=getOsmIssueIdFromUrl(settings.osm,tab.url)
		if (issueId!=null) {
			tabState.type='issue'
			tabState.issueData={
				osmRoot:settings.osm,
				id:issueId,
				url:tab.url
			}
			if (permissions.osm) {
				const contentIssueData=await addListenerAndSendMessage(tab.id,'issue',{action:'getIssueData'})
				if (contentIssueData) Object.assign(tabState.issueData,contentIssueData)
			}
		}
	}
	if (settings.osm) {
		// TODO get username from url - not necessary for now
		if (isOsmUserUrl(settings.osm,tab.url)) {
			tabState.type='user'
			tabState.userData={}
			if (permissions.osm) {
				const userId=await addListenerAndSendMessage(tab.id,'user',{action:'getUserId'})
				if (userId!=null) {
					let apiUrl='#' // not important for now - only used in templates
					if (settings.osm_api) apiUrl=settings.osm_api+'api/0.6/user/'+encodeURIComponent(userId)
					tabState.userData={
						id:userId,
						apiUrl
					}
				}
			}
		}
	}
	if (settings.otrs) {
		if (isOtrsTicketUrl(settings.otrs,tab.url)) {
			tabState.type='ticket'
			tabState.issueData={}
			if (settings.osm && permissions.otrs) {
				const contentIssueId=await addListenerAndSendMessage(tab.id,'ticket',{action:'getIssueId'})
				if (contentIssueId!=null) {
					tabState.issueData={
						osmRoot:settings.osm,
						id:contentIssueId,
						url:`${settings.osm}issues/${encodeURIComponent(contentIssueId)}`
					}
				}
			}
		}
	}
	return tabState
}

async function addListenerAndSendMessage(tabId,contentScript,message) {
	if (buildScriptChromePatch) await browser.tabs.executeScript(tabId,{file:'browser-polyfill.js'})
	await browser.tabs.executeScript(tabId,{file:`content/${contentScript}.js`})
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

function getOtrsTicketId(otrsRoot,url) {
	const match=url.match(new RegExp('^'+escapeRegex(otrsRoot+'otrs/index.pl?Action=AgentTicketZoom;TicketID=')+'([0-9]+)'))
	if (match) {
		const [,ticketId]=match
		return ticketId
	}
}

function getOtrsCreatedTicketId(otrsRoot,url) {
	const match=url.match(new RegExp('^'+escapeRegex(otrsRoot+'otrs/index.pl?Action=AgentTicketPhone;Subaction=Created;TicketID=')+'([0-9]+)'))
	if (match) {
		const [,ticketId]=match
		return ticketId
	}
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
