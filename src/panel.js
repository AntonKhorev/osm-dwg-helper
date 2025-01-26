import makeActionsMenuWriters from './panel-actions.js'
import MenuWriter from './menu-writer.js'

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

;(async()=>{ // top-level async is supported, but: https://github.com/mozilla/addons-linter/issues/4020
	{
		document.getElementById('options-button').onclick=()=>browser.runtime.openOptionsPage()
	}{
		const $name=document.getElementById('extension-name')
		const $version=document.getElementById('extension-version')
		const manifest=browser.runtime.getManifest()
		$name.textContent=manifest.name
		$version.textContent="v"+manifest.version
		$version.href=manifest.homepage_url
	}{
		const [currentTab]=await browser.tabs.query({active:true,currentWindow:true})
		browser.runtime.sendMessage({action:'registerNewPanel',tab:currentTab})
	}
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
	const missing=missingOrigins.length>0
	const $permissionsButton=document.getElementById('permissions-button')
	const $grantedPermissionsSpan=document.getElementById('granted-permissions-span')
	$permissionsButton.hidden=!($grantedPermissionsSpan.hidden=missing)
	$permissionsButton.onclick=!missing?null:()=>{
		browser.permissions.request({
			origins:missingOrigins
		}).then(granted=>{
			if (granted) browser.runtime.sendMessage({action:'reportPermissionsWereChanged'})
		})
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
	()=>{
		if (location.href.endsWith("/popup.html")) {
			window.close()
		}
	},
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
	const menuWriter=new MenuWriter(document,$actions)
	for (const [tabId,singleTabActionEntries] of tabActionEntries) {
		for (const [tabActionIndex,menuEntryElements] of singleTabActionEntries.entries()) {
			const $elements=[]
			for (const [text,type] of menuEntryElements) {
				if (type=='em') {
					const $em=document.createElement('em')
					$em.textContent=text
					$elements.push($em)
				} if (type=='button') {
					const $button=document.createElement('button')
					$button.textContent=text
					$button.addEventListener('click',()=>{
						browser.runtime.sendMessage({action:'runTabMenuAction',tabId,tabActionIndex})
					})
					$elements.push($button)
				} else {
					$elements.push(text)
				}
			}
			const $switchButton=document.createElement('button')
			$switchButton.textContent='open tab'
			$switchButton.addEventListener('click',()=>{
				browser.tabs.update(tabId,{active:true})
			})
			const $cancelButton=document.createElement('button')
			$cancelButton.textContent='cancel'
			$cancelButton.addEventListener('click',()=>{
				browser.runtime.sendMessage({action:'cancelTabAction',tabId,tabActionIndex}) // TODO actually use the index
			})
			$elements.push(` `,$switchButton,` `,$cancelButton)
			menuWriter.addPassiveEntry(null,$elements)
		}
	}
}
