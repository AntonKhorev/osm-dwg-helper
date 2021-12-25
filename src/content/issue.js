if (!window.osmDwgHelperIssueListenerInstalled) {
	browser.runtime.onMessage.addListener(messageListener)
	window.osmDwgHelperIssueListenerInstalled=true
}

var paneColor='#7ebc6f'
var paneBorderWidth=2

function messageListener(message) {
	if (message.action=='getIssueDataAndInjectItemPanes') { // do both things at once to avoid extra messages
		const issueData=scrapeIssueData()
		injectReportedItemPanes(issueData,message.osmcha)
		return Promise.resolve(issueData)
	} else if (message.action=='addComment') {
		addComment(message.comment)
		return Promise.resolve()
	}
	return false
}

function scrapeIssueData() {
	// issue render code: https://github.com/openstreetmap/openstreetmap-website/tree/master/app/views/issues
	const $content=document.getElementById('content')
	if (!$content) return {}
	const issueData={
		reports:[]
	}
	{
		const $reportedParagraph=$content.querySelector('p')
		if ($reportedParagraph) {
			const $reportedLink=$reportedParagraph.querySelector('a')
			if ($reportedLink) {
				const reportedItem=parseReportedLink($reportedLink)
				if (reportedItem) issueData.reportedItem=reportedItem
			}
		}
	}
	for (const $report of $content.querySelectorAll('.row .row .col')) {
		const report={
			wasRead:$report.parentElement.parentElement.classList.contains('text-muted'),
			lead:[],
			text:[],
		}
		let iParagraph=0
		for (const $p of $report.children) {
			if ($p.tagName!='P') continue
			if (iParagraph==0) {
				for (const pChild of $p.childNodes) {
					if (pChild.nodeType==Node.TEXT_NODE) {
						const [textBefore,textCategory,textAfter]=splitByReportCategory(pChild.nodeValue)
						if (textBefore.length>0) {
							report.lead.push(['plain',textBefore])
						}
						if (textCategory.length>0) {
							report.category=textCategory
							report.lead.push(['category',textCategory])
						}
						if (textAfter.length>0) {
							report.lead.push(['plain',textAfter])
						}
					} else if (pChild.nodeType==Node.ELEMENT_NODE) {
						// TODO check if it's <a>, process as plaintext otherwise
						report.by=pChild.innerText
						report.lead.push(['user',report.by])
					}
				}
			} else {
				report.text.push($p.innerText)
			}
			iParagraph++
		}
		issueData.reports.push(report)
	}
	return issueData
}

function injectReportedItemPanes(issueData,osmcha) {
	const item=issueData.reportedItem
	if (item?.type=='note') {
		injectPane('osm-dwg-helper-reported-item-pane',item.url,`Note #${item.id}`,1)
	} else if (item?.type=='user') {
		if (osmcha) {
			injectPane('osm-dwg-helper-reported-item-pane-osmcha',getOsmchaUrlByUserName(osmcha,item.name),`OSMCha for user ${item.name}`)
		}
		injectPane('osm-dwg-helper-reported-item-pane',item.url,`User ${item.name}`,2)
	}
}

function injectPane(id,url,title,frameProcessingLevel=0) {
	const $existingPane=document.getElementById(id)
	if ($existingPane) return
	const $heading=document.querySelector('.content-heading')
	if (!$heading) return
	const $pane=document.createElement('details')
	$pane.id=id
	$pane.style.background=paneColor
	$pane.style.userSelect='none'
	const $paneSummary=document.createElement('summary')
	$paneSummary.style.listStyle='none'
	const $paneSummaryText=document.createElement('span')
	$paneSummaryText.innerText=title
	$paneSummaryText.style.display='block'
	$paneSummaryText.style.maxWidth='960px'
	$paneSummaryText.style.padding=`${paneBorderWidth}px 20px`
	$paneSummaryText.style.margin='auto'
	$paneSummaryText.style.background=`no-repeat left url(${makeIcon('closed')})`
	$paneSummary.append($paneSummaryText)
	$pane.append($paneSummary)
	const $paneContainer=document.createElement('div')
	if (frameProcessingLevel>=2) $paneContainer.dataset.shrinkable='yes'
	$paneContainer.style.overflow='auto'
	$paneContainer.style.resize='vertical'
	$paneContainer.style.background='#eee'
	$paneContainer.style.border=`solid ${paneColor}`
	$paneContainer.style.borderWidth=`0 ${paneBorderWidth}px ${paneBorderWidth}px`
	$paneContainer.style.height='50vh'
	const $paneFrame=document.createElement('iframe')
	$pane.addEventListener('toggle',()=>{
		$paneSummaryText.style.backgroundImage=`url(${makeIcon($pane.open?'open':'closed')})`
		if (!$pane.open) return
		if ($paneFrame.src) return
		$paneFrame.src=url
	})
	if (frameProcessingLevel>=1) $paneFrame.addEventListener('load',frameLoadListener)
	$paneFrame.style.display='block'
	$paneFrame.style.width='100%'
	$paneFrame.style.height='100%'
	$paneFrame.style.border='none'
	$paneContainer.append($paneFrame)
	$pane.append($paneContainer)
	$heading.after($pane)
}

function frameLoadListener() {
	const $paneFrame=this
	const $=$paneFrame.contentDocument
	const $header=$.querySelector('header')
	const $content=$.getElementById('content')
	if (!$header || !$content) return
	$header.style.display='none'
	$content.style.top=0
	const $paneContainer=$paneFrame.parentElement
	if (!$paneContainer.dataset.shrinkable) return
	const $contentBody=$.querySelector('.content-body')
	if ($contentBody && $contentBody.innerText=='') {
		$contentBody.style.display='none'
	}
	if ($paneContainer.clientHeight>$.body.clientHeight) {
		$paneContainer.style.height=`${$.body.clientHeight+paneBorderWidth}px`
	}
}

function parseReportedLink($repotedLink) {
	const url=$repotedLink.href
	let match
	if (match=url.match(/\/note\/([0-9]+)$/)) {
		const [,id]=match
		return {
			type:'note',
			ref:'#'+id,
			url,
			id
		}
	} else if ($repotedLink.href.match(/\/user\/[^/]+$/)) {
		const name=$repotedLink.innerText
		return {
			type:'user',
			ref:name,
			name,
			url
		}
	}
}

function splitByReportCategory(text) {
	// report categories: https://github.com/openstreetmap/openstreetmap-website/blob/70d7d8d850148f714b70a3297c02a8203214dec6/app/models/report.rb#L33
	// for user: spam offensive threat vandal other
	// for note: spam personal abusive other
	for (const category of ['spam','offensive','threat','personal','abusive','vandal','other']) {
		const [first,...rest]=text.split(category)
		if (rest.length>0) return [first,category,rest.join(category)]
	}
	return [text,'','']
}

function addComment(comment) {
	const $commentTextarea=document.getElementById('issue_comment_body')
	if (!$commentTextarea) return
	if ($commentTextarea.value=='') {
		$commentTextarea.value=comment
	} else {
		$commentTextarea.value+='\n\n'+comment
	}
	$commentTextarea.dispatchEvent(new Event('change')) // otherwise preview doesn't work
}

function getOsmchaUrlByUserId(osmcha,uid) {
	const osmchaFilter=`{"uids":${escapeOsmchaFilterValue(uid)},"date__gte":${escapeOsmchaFilterValue('')}}`
	return `${osmcha}?filters=${encodeURIComponent(osmchaFilter)}`

}

function getOsmchaUrlByUserName(osmcha,userName) {
	const osmchaFilter=`{"users":${escapeOsmchaFilterValue(userName)},"date__gte":${escapeOsmchaFilterValue('')}}`
	return `${osmcha}?filters=${encodeURIComponent(osmchaFilter)}`
}

function escapeOsmchaFilterValue(value) {
	if (!Array.isArray(value)) value=[value]
	return '['+value.map(singleValue=>{
		const cEscapedValue=String(singleValue).replace(/\\/g,'\\\\').replace(/"/g,'\\"')
		return `{"label":"${cEscapedValue}","value":"${cEscapedValue}"}`
	}).join(',')+']'
}

// contains copypaste from icon.js
function makeIcon(type) {
	const data=makeSvg(type)
	return "data:image/svg+xml;charset=utf-8;base64,"+btoa(data)
}

function makeSvg(type) {
	let content=drawTabs()
	if (type=='closed') content+=drawClosedMarker()
	if (type=='open') content+=drawOpenMarker()
	return `<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='-16 -16 32 32' stroke-width='2'>${content}</svg>`
}

function drawTabs() {
	return (
		`<polygon points='-15,15 -15,-11 -11,-11 -11,-15 7,-15 7,-11 11,-11' fill='rgb(90%,90%,90%)' stroke='rgb(20%,20%,40%)' />`+
		`<polygon points='15,-15 15,11 11,11 11,15 -7,15 -7,11 -11,11' fill='rgb(40%,40%,40%)' stroke='rgb(10%,10%,20%)' />`
	)
}

function drawClosedMarker() {
	return `<polygon points='-7,-7 11,0 -7,7' stroke='#F44' fill='#FCC' />`
}

function drawOpenMarker() {
	return `<polygon points='-7,-7 7,-7 0,11' stroke='#F44' fill='#FCC' />`
}
