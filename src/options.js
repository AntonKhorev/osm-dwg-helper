import settingsData from './settings-data.js'
import SettingsManager from './settings-manager.js'
import makePermissionsButtonPairHandler from './permissions-buttons.js'

const settingsManager=new SettingsManager(settingsData)

async function settingsWriteWrapper(settings) {
	if (Object.keys(settings).length==0) return
	await browser.runtime.sendMessage({action:'reportSettingsWillChange'})
	const needToReport=await settingsManager.write(settings)
	if (needToReport.origin) {
		await browser.runtime.sendMessage({action:'reportPermissionsWereChanged'})
	} else if (needToReport.state) {
		await browser.runtime.sendMessage({action:'reportStateChangingSettingsWereChanged'}) // don't need to do this if reportPermissionsWereChanged was sent
	}
}

document.getElementById('settings-load').addEventListener('change',readSettingsFile)
document.getElementById('settings-save').addEventListener('click',()=>downloadSettingsFile(makeCurrentSettingsText))
document.getElementById('settings-sample').addEventListener('click',()=>downloadSettingsFile(makeDefaultSettingsText))

let updateTimeoutId
let updateInputValues={}

browser.runtime.onMessage.addListener(message=>{
	if (message.action=='updatePermissions') {
		updateOriginPermissionsUI(message.missingOrigins,message.existingOrigins)
		return Promise.resolve()
	} else if (message.action=='updateActionsOngoing') {
		updateOngoingActionsWarning(message.tabActionEntries)
		return Promise.resolve()
	}
	return false
})
window.addEventListener('unload',()=>{
	clearTimeout(updateTimeoutId)
	flushInputs()
})
function inputEventHandler() {
	const $input=this
	const $reset=this.nextElementSibling
	updateResetButton($reset,$input)
	clearTimeout(updateTimeoutId)
	updateInputValues[$input.name]=$input.value
	updateTimeoutId=setTimeout(flushInputs,500)
}
function flushInputs() {
	updateTimeoutId=undefined
	const writePromise=settingsWriteWrapper(updateInputValues)
	updateInputValues={} // don't need to wait for write completion 
	// TODO or maybe not and it's the source of "TypeError: can't access dead object"
	// or it's fixed already b/c window.addEventListener('unload') not clears timeout
	return writePromise
}

function resetEventHandler() {
	const $reset=this
	const $input=this.previousElementSibling
	if ($reset.dataset.value!=null) {
		const storedValue=$input.value
		$input.value=$reset.dataset.value
		if (storedValue!=$input.placeholder) {
			$reset.dataset.value=storedValue
		} else {
			delete $reset.dataset.value
		}
		$input.dispatchEvent(new Event('input'))
	} else if ($input.value!=$input.placeholder) {
		const storedValue=$input.value
		$input.value=$input.placeholder
		$reset.dataset.value=storedValue
		$input.dispatchEvent(new Event('input'))
	}
}
function updateResetButton($reset,$input) {
	if ($input.value!=$input.placeholder && $reset.dataset.value!=null) {
		delete $reset.dataset.value
	}
	if ($reset.dataset.value!=null) {
		$reset.innerText='restore previous value: '+$reset.dataset.value
	} else if ($input.value!=$input.placeholder) {
		$reset.innerText='reset to default value: '+$input.placeholder
	} else {
		$reset.innerText='has default value'
	}
}

updateSettingsUI()
browser.runtime.sendMessage({action:'registerNewOptionsPage'})
updateWebRequestPermissionsUI()

function readSettingsFile() {
	const [file]=this.files
	const reader=new FileReader()
	reader.addEventListener('load',async()=>{
		const settings=parseSettingsText(reader.result)
		await flushInputs()
		await settingsWriteWrapper(settings)
		updateSettingsUI()
	})
	reader.readAsText(file)
}

async function downloadSettingsFile(getText) {
	const granted=await browser.permissions.request({permissions:["downloads"]})
	if (!granted) return
	const blob=new Blob([await getText()],{type:'text/plain'})
	const url=URL.createObjectURL(blob)
	browser.downloads.download({url,filename:'osm-dwg-helper-settings.txt',saveAs:true})
}

function parseSettingsText(text) {
	const validKeys={}
	for (const [k] of settingsManager.getSpecsWithoutHeaders()) {
		validKeys[k]=true
	}
	const settings={}
	for (const line of text.split('\n')) {
		let match
		if (match=line.match(/^\s*([a-z_]+)\s*=\s*(.*)$/)) {
			const [,key,value]=match
			if (validKeys[key]) settings[key]=value
		}
	}
	return settings
}

async function makeDefaultSettingsText() {
	let text=''
	for (const [k,v] of settingsManager.getSpecsWithoutHeaders()) {
		text+=`${k} = ${v}\n`
	}
	return text
}

async function makeCurrentSettingsText() {
	await flushInputs()
	const settings=await settingsManager.read()
	let text=''
	for (const [k] of settingsManager.getSpecsWithoutHeaders()) {
		text+=`${k} = ${settings[k]}\n`
	}
	return text
}

async function updateSettingsUI() {
	const [settings,,missingOrigins,existingOrigins]=await settingsManager.readSettingsAndPermissions()
	updateOriginPermissionsUI(missingOrigins,existingOrigins)
	const $settings=document.getElementById('settings')
	$settings.innerHTML=""
	for (const spec of settingsManager.specs) {
		if (typeof spec == 'string') {
			const sectionName=spec
			const $h=document.createElement('h2')
			$h.innerText=sectionName
			$settings.append($h)
		} else {
			const [key,defaultValue,title,attrs]=spec
			const $optionContainer=document.createElement('div')
			$optionContainer.className='option'
			
			const $label=document.createElement('label')
			$label.innerText=title
			$label.htmlFor='option-'+key
			$optionContainer.append($label)

			// datalist popup doesn't work on firefox, despite "VERIFIED FIXED": https://bugzilla.mozilla.org/show_bug.cgi?id=1387624
			// they screwed it up again: https://bugzilla.mozilla.org/show_bug.cgi?id=1595158

			// const $datalist=document.createElement('datalist')
			// $datalist.id='list-'+key
			// const $datalistOption=document.createElement('option')
			// $datalistOption.value=defaultValue
			// $datalist.append($datalistOption)
			// $optionContainer.append($datalist)

			const $input=document.createElement('input')
			$input.id='option-'+key
			$input.name=key
			if (attrs?.type=='url') {
				$input.type='url'
			} else {
				$input.type='text'
			}
			$input.value=settings[key]
			$input.placeholder=defaultValue
			//$input.setAttribute('list','list-'+key)
			$input.addEventListener('input',inputEventHandler)
			$optionContainer.append($input)

			const $reset=document.createElement('button')
			$reset.classList.add('reset')
			updateResetButton($reset,$input)
			$reset.addEventListener('click',resetEventHandler)
			$optionContainer.append($reset)
			
			$settings.append($optionContainer)
		}
	}
}

const originButtonPairHandler=makePermissionsButtonPairHandler(
	'origin',
	"Required for most operations",
	"Useful after changing settings",
	()=>browser.runtime.sendMessage({action:'reportPermissionsWereChanged'})
)

function updateOriginPermissionsUI(missingOrigins,existingOrigins) {
	originButtonPairHandler(
		missingOrigins.length>0,existingOrigins.length>0,
		{origins:missingOrigins},{origins:existingOrigins}
	)
	const $currentList=document.getElementById('origin-current')
	$currentList.innerHTML=''
	for (const origin of existingOrigins) {
		const $li=document.createElement('li')
		$li.innerText=origin
		$currentList.append($li)
	}
}

const webRequestButtonPairHandler=makePermissionsButtonPairHandler(
	'webrequest',
	"Required to inject OSMCha panes in OSM issue pages",
	"Useful for security and performance reasons",
	()=>{
		browser.runtime.sendMessage({action:'reportPermissionsWereChanged'})
		updateWebRequestPermissionsUI()
	}
)

async function updateWebRequestPermissionsUI() {
	const permissions={permissions:['webRequest','webRequestBlocking']}
	const hasPermissions=await browser.permissions.contains(permissions)
	webRequestButtonPairHandler(
		!hasPermissions,hasPermissions,
		permissions,permissions
	)
}

function updateOngoingActionsWarning(tabActionEntries) {
	const $warning=document.getElementById('warning')
	$warning.innerHTML=''
	const n=tabActionEntries.length
	if (n==0) return
	$warning.innerText=`Changing the settings will cancel ${n} ongoing action${n>1?'s':''}`
}
