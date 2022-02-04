import makeActionsMenuWriters from './panel-actions.js'

const scheduleUpdateActionsNew=setupUpdateScheduler(updateActionsNew,updateActionsNewFilter)
const scheduleUpdateActionsOngoing=setupUpdateScheduler(updateActionsOngoing)
const scheduleUpdatePermissions=setupUpdateScheduler(updatePermissions)

browser.runtime.onMessage.addListener(message=>{
	if (message.action=='updatePermissions') {
		return scheduleUpdatePermissions(message.missingOrigins)
	} else if (message.action=='updateActionsNew') {
		return scheduleUpdateActionsNew(
			message.settings,message.permissions,
			message.tabIds,message.otherTabId,
			message.tabStates
		)
	} else if (message.action=='updateActionsOngoing') {
		return scheduleUpdateActionsOngoing(message.tabActionEntries)
	}
	return false
})

;(async()=>{
	// top-level async is supported, but: https://github.com/mozilla/addons-linter/issues/4020
	document.getElementById('extension-options').addEventListener('click',()=>browser.runtime.openOptionsPage())
	const [currentTab]=await browser.tabs.query({active:true,currentWindow:true})
	browser.runtime.sendMessage({action:'registerNewPanel',tab:currentTab})
})()

function setupUpdateScheduler(handlerFn,filterFn) {
	let updateTimeoutId
	return async(...args)=>{
		if (filterFn) {
			args=await filterFn(...args)
			if (!args) return
		}
		if (updateTimeoutId!=null) clearTimeout(updateTimeoutId)
		updateTimeoutId=setTimeout(()=>{
			updateTimeoutId=undefined
			handlerFn(...args)
		},100)
	}
}

function updatePermissions(missingOrigins) {
	const $permissions=document.getElementById('permissions')
	const $permissionsWarning=document.getElementById('permissions-warning')
	$permissions.innerHTML=""
	if ($permissionsWarning) $permissionsWarning.innerHTML=""
	if (missingOrigins.length<=0) return
	const $button=document.createElement('button')
	$button.innerText="Grant access to OSM/OTRS webpages"
	$button.addEventListener('click',()=>{
		browser.permissions.request({
			origins:missingOrigins
		}).then(granted=>{
			if (granted) browser.runtime.sendMessage({action:'reportPermissionsWereChanged'})
		})
	})
	$permissions.append($button)
	if (!$permissionsWarning) return
	const bugHref='https://bugzilla.mozilla.org/show_bug.cgi?id=1493396'
	const $p=document.createElement('p')
	$p.append(
		"Note that the button above won't work in Firefox until ",
		makeLink(bugHref,"this bug",()=>browser.tabs.create({url:bugHref})),
		" is fixed. Please press this button in a ",
		makeLink('#',"popup window",()=>browser.browserAction.openPopup()),
		" or in ",
		makeLink('#',"the extension's options page",()=>browser.runtime.openOptionsPage()),
		"."
	)
	$permissionsWarning.append($p)
	function makeLink(href,text,handler) {
		const $a=document.createElement('a')
		$a.innerText=text
		$a.href=href
		$a.addEventListener('click',ev=>{
			ev.preventDefault()
			handler()
		})
		return $a
	}
}

/**
 * @param tabIds {Array<number>}
 */
async function updateActionsNewFilter(settings,permissions,tabIds,otherTabId,tabStates) {
	const [currentTab]=await browser.tabs.query({active:true,currentWindow:true})
	if (!tabIds.includes(currentTab.id)) return
	return [
		settings,permissions,
		currentTab.id,tabStates[currentTab.id],
		otherTabId,tabStates[otherTabId]??{}
	]
}

const actionsMenuWriters=makeActionsMenuWriters(
	document,
	()=>window.close(),
	(createProperties)=>browser.tabs.create(createProperties),
	(message)=>browser.runtime.sendMessage(message)
)

function updateActionsNew(settings,permissions,tabId,tabState,otherTabId,otherTabState) {
	for (const [i,name] of ['global','this','other'].entries()) {
		const writer=actionsMenuWriters[i]
		const $menu=document.getElementById('actions-'+name)
		$menu.innerHTML=""
		writer($menu,settings,permissions,tabId,tabState,otherTabId,otherTabState)
	}
}

function updateActionsOngoing(tabActionEntries) {
	const $actions=document.getElementById('actions-ongoing')
	$actions.innerHTML=""
	for (const [tabId,menuEntryElements] of tabActionEntries) {
		const $li=document.createElement('li')
		for (const [text,type] of menuEntryElements) {
			if (type=='em') {
				const $em=document.createElement('em')
				$em.innerText=text
				$li.append($em)
			} else {
				$li.append(text)
			}
		}
		$li.append(' ')
		const $switchButton=document.createElement('button')
		$switchButton.innerText='go to'
		$switchButton.addEventListener('click',()=>{
			browser.tabs.update(tabId,{active:true})
		})
		$li.append($switchButton)
		const $cancelButton=document.createElement('button')
		$cancelButton.innerText='cancel'
		$cancelButton.addEventListener('click',()=>{
			browser.runtime.sendMessage({action:'cancelTabAction',tabId})
		})
		$li.append($cancelButton)
		$actions.append($li)
	}
}
