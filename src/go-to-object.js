import goToObjectParser from './go-to-object-parser.js'

export default function ($form,$sliceIcon,settings,tabId,closeWindow,createTab) {
	if (settings.otrs || settings.osm || settings.osm_api) {
		$form.hidden=false
		$form.query.oninput=()=>{
			const value=$form.query.value
			const parsedValue=goToObjectParser(value)
			if (value=="" || parsedValue) {
				$form.query.setCustomValidity("")
			} else {
				$form.query.setCustomValidity("ticket id or number required")
			}
			if (parsedValue?.icon) {
				const $icon=document.createElement('img')
				$icon.width=$icon.height=16
				$icon.src=getSymbolIconSrc(parsedValue.icon)
				$sliceIcon.replaceChildren($icon)
			} else {
				const $a=document.createElement('a')
				$a.href="go-to-object.html"
				$a.target="_blank"
				$a.textContent="?"
				$sliceIcon.replaceChildren($a)
			}
		}
		$form.onsubmit=(ev)=>{
			ev.preventDefault()
			const value=$form.query.value
			const parsedValue=goToObjectParser(value)
			if (!parsedValue) return
			let url
			if (parsedValue.site=="otrs" && settings.otrs) {
				url=settings.otrs
			} else if (parsedValue.site=="osm" && settings.osm) {
				url=settings.osm
			} else if (parsedValue.site=="osm_api" && settings.osm_api) {
				url=settings.osm_api
			}
			if (url) {
				url+=parsedValue.path
				createTab({openerTabId:tabId,url})
				closeWindow()
			}
		}
		$form.query.oninput();
	} else {
		$form.hidden=true
		$form.query.oninput=undefined
		$form.onsubmit=(ev)=>{
			ev.preventDefault()
		}
	}
}

function getSymbolIconSrc(symbol) {
	return `icons/void/${symbol}.svg`
}
