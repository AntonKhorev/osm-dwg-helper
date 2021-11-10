const background=await browser.runtime.getBackgroundPage()

document.getElementById('settings-load').addEventListener('change',readSettingsFile)
document.getElementById('settings-save').addEventListener('click',()=>downloadSettingsFile(makeCurrentSettingsText))
document.getElementById('settings-sample').addEventListener('click',()=>downloadSettingsFile(makeDefaultSettingsText))

let inputTimeoutId
let inputUpdateValues={}
window.addEventListener('unload',flushInputs)
function inputEventHandler() {
	clearTimeout(inputTimeoutId)
	inputUpdateValues[this.name]=this.value
	inputTimeoutId=setTimeout(flushInputs,500)
}
function flushInputs() {
	inputTimeoutId=undefined
	const writePromise=background.settingsManager.write(inputUpdateValues)
	inputUpdateValues={} // don't need to wait for write completion
	return writePromise
}

updateSettingsUI()

function readSettingsFile() {
	const [file]=this.files
	const reader=new FileReader()
	reader.addEventListener('load',async()=>{
		const settings=parseSettingsText(reader.result)
		await flushInputs()
		await background.settingsManager.write(settings)
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
	for (const [k] of background.settingsManager.getSpecsWithoutHeaders()) {
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
	for (const [k,v] of background.settingsManager.getSpecsWithoutHeaders()) {
		text+=`${k} = ${v}\n`
	}
	return text
}

async function makeCurrentSettingsText() {
	await flushInputs()
	const settings=await background.settingsManager.read()
	let text=''
	for (const [k] of background.settingsManager.getSpecsWithoutHeaders()) {
		text+=`${k} = ${settings[k]}\n`
	}
	return text
}

async function updateSettingsUI() {
	const $settings=document.getElementById('settings')
	$settings.innerHTML=""
	const settings=await background.settingsManager.read()
	for (const spec of background.settingsManager.specs) {
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
			
			$settings.append($optionContainer)
		}
	}
}
