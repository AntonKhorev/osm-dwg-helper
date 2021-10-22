const background=await browser.runtime.getBackgroundPage()

document.getElementById('settings-load').addEventListener('change',readSettingsFile)
document.getElementById('settings-sample').addEventListener('click',downloadSettingsFile)

browser.runtime.onMessage.addListener(message=>{
	if (message.action!='updatePanel') return false
	return scheduleUpdatePanel(message.settings,message.tabId,message.tabState)
})

{
	const [currentTab]=await browser.tabs.query({active:true,currentWindow:true})
	background.registerNewPanel(currentTab)
}

////

function readSettingsFile() {
	const [file]=this.files
	const reader=new FileReader()
	reader.addEventListener('load',()=>{
		background.updateSettings(reader.result)
	})
	reader.readAsText(file)
}

function downloadSettingsFile() {
	const blob=new Blob([background.defaultSettingsText],{type:'text/plain'})
	const url=URL.createObjectURL(blob)
	browser.downloads.download({url,filename:'osm-dwg-helper-settings.txt',saveAs:true})
}

let updatePanelTimeoutId

async function scheduleUpdatePanel(settings,tabId,tabState) {
	const [currentTab]=await browser.tabs.query({active:true,currentWindow:true})
	if (currentTab.id!=tabId) return
	if (updatePanelTimeoutId!=null) clearTimeout(updatePanelTimeoutId)
	updatePanelTimeoutId=setTimeout(()=>{
		updatePanelTimeoutId=undefined
		updatePanel(settings,tabId,tabState)
	},100)
}

function updatePanel(settings,tabId,tabState) {
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
			if (tabState.type=='issue') {
				issueData=tabState.issueData
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
					background.addTabAction(ticketTab.id,{
						type:'createIssueTicket',
						ticketData:convertIssueDataToTicketData(settings,issueData)
					})
				})
			})
		}
		addAction($createTicket)
	}
	if (settings.otrs!=null) {
		if (tabState.type=='issue') {
			const issueData=tabState.issueData
			if (issueData.id!=null) {
				const $search=makeSearchLink(issueData.id)
				$search.innerText=`Search OTRS for issue id "${issueData.id}"`
				addAction($search)
			}
			if (issueData.reportedItem?.type=='user') {
				const $search=makeSearchLink(issueData.reportedItem.name)
				$search.innerText=`Search OTRS for reported user "${issueData.reportedItem.name}"`
				addAction($search)
			}
			if (issueData.reportedItem?.type=='note') {
				const $search=makeSearchLink(issueData.reportedItem.id)
				$search.innerText=`Search OTRS for reported note id "${issueData.reportedItem.id}"`
				addAction($search)
			}
			function makeSearchLink(query) {
				return makeLink(`${settings.otrs}otrs/index.pl?Action=AgentTicketSearch&Subaction=Search&Fulltext=${encodeURIComponent(query)}`)
			}
		}
	}
	if (settings.osm!=null) {
		if (tabState.type=='ticket' && tabState.issueData) {
			const issueData=tabState.issueData
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

function convertIssueDataToTicketData(settings,issueData) {
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

function escapeHtml(string) {
	return string
	.replace(/&/g,"&amp;")
	.replace(/</g,"&lt;")
	.replace(/>/g,"&gt;")
	.replace(/"/g,"&quot;")
	.replace(/'/g,"&#039;")
}
