export function getIssueDataAndInjectItemPanes(document,osmcha) { // do both things at once to avoid extra messages
	const issueData=scrapeIssueData(document)
	injectReportedItemPanes(document,issueData,osmcha)
	return issueData
}

function scrapeIssueData(document) {
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
				markChangesetLinks($p)
			}
			iParagraph++
		}
		issueData.reports.push(report)
	}
	return issueData
	function markChangesetLinks($reportText) {
		let input=$reportText.innerText
		$reportText.innerHTML=''
		let match
		while (match=input.match(/(^|.*?\s)(\S*\/changeset\/(\d+))(.*)$/)) {
			const [,before,changesetText,changesetId,after]=match
			if (before) $reportText.append(before)
			const $a=document.createElement('a')
			$a.innerText=changesetText
			$a.classList.add('osm-dwg-helper-changeset-anchor')
			$a.dataset.changesetId=changesetId
			try {
				const validUrl=new URL(changesetText)
				$a.href=changesetText
			} catch {}
			$a.addEventListener('click',markedChangesetLinkClickHandler)
			$reportText.append($a)
			input=after
		}
		if (input) $reportText.append(input)
	}
	function markedChangesetLinkClickHandler(ev) { // TODO decouple from pane code - maybe install capture phase handler later, when panes are injected
		const $osmchaPane=document.getElementById('osm-dwg-helper-reported-item-pane-osmcha')
		if (!$osmchaPane) return
		ev.preventDefault()
		const changesetId=this.dataset.changesetId
		const osmcha=$osmchaPane.dataset.osmcha
		const osmchaFilter=$osmchaPane.dataset.osmchaFilter
		const osmchaUrl=`${osmcha}changesets/${encodeURIComponent(changesetId)}/?filters=${encodeURIComponent(osmchaFilter)}`
		const $oldOsmchaFrame=$osmchaPane.querySelector('iframe')
		const $osmchaFrame=document.createElement('iframe')
		$osmchaFrame.src=osmchaUrl
		$oldOsmchaFrame.replaceWith($osmchaFrame) // have to replace the iframe, otherwise scr change may get rejected by CSP
		$osmchaPane.open=true
		$osmchaPane.scrollIntoView()
	}
}

function injectReportedItemPanes(document,issueData,osmcha) {
	const item=issueData.reportedItem
	if (item?.type!='note' && item?.type!='user') {
		removePane(document,'osm-dwg-helper-reported-item-pane')
		removePane(document,'osm-dwg-helper-reported-item-pane-osmcha')
		return
	}
	injectStyle(document,'osm-dwg-helper-style')
	if (item?.type=='note') {
		injectPane(document,'osm-dwg-helper-reported-item-pane',1,item.url,{},`Note #${item.id}`)
		removePane(document,'osm-dwg-helper-reported-item-pane-osmcha')
	} else if (item?.type=='user') {
		injectPane(document,'osm-dwg-helper-reported-item-pane',2,item.url,{},`User ${item.name}`)
		if (osmcha) {
			const osmchaFilter=getOsmchaFilterByUserName(item.name)
			const osmchaUrl=`${osmcha}?filters=${encodeURIComponent(osmchaFilter)}`
			injectPane(document,
				'osm-dwg-helper-reported-item-pane-osmcha',0,osmchaUrl,{osmcha,osmchaFilter},
				`OSMCha for user ${item.name}`,`The contents won't load unless web request permission is granted in the options or the browser is configured in some way to ignore x-frame-options headers`
			)
		} else {
			removePane(document,'osm-dwg-helper-reported-item-pane-osmcha')
		}
	}
}

function injectStyle(document,id) {
	const paneColor='#7ebc6f'
	const paneHoverColor='#dcedd7'
	const paneBorderWidth=2
	const $existingStyle=document.getElementById(id)
	if ($existingStyle) return
	const $head=document.querySelector('head')
	if (!$head) return
	const $style=document.createElement('style')
	$style.id=id
	$style.innerHTML=`
		.osm-dwg-helper-pane {
			background: ${paneColor};
			user-select: none;
		}
		.osm-dwg-helper-pane > summary {
			list-style: none;
		}
		.osm-dwg-helper-pane > summary > span {
			display: block;
			max-width: 960px;
			padding: ${paneBorderWidth}px 20px;
			margin: auto;
			background: no-repeat left url(${makeIcon('closed')});
		}
		.osm-dwg-helper-pane[open] > summary > span {
			background-image: url(${makeIcon('open')});
		}
		.osm-dwg-helper-pane > div {
			overflow: auto;
			resize: vertical;
			background: #eee;
			border: solid ${paneColor};
			border-width: 0 ${paneBorderWidth}px ${paneBorderWidth}px;
			height: 50vh;
		}
		.osm-dwg-helper-pane > div > iframe {
			display: block;
			width: 100%;
			height: 100%;
			border: none;
		}
		.osm-dwg-helper-pane:hover {
			background: ${paneHoverColor};
		}
		.osm-dwg-helper-pane:hover > div {
			border-color: ${paneHoverColor};
		}
		.osm-dwg-helper-changeset-anchor {
			text-decoration: underline dashed;
		}
		.osm-dwg-helper-changeset-anchor:hover {
			cursor: pointer;
			text-decoration: underline;
		}
	`
	$head.append($style)
}

function removePane(document,id) {
	const $existingPane=document.getElementById(id)
	if (!$existingPane) return
	$existingPane.remove()
}

function injectPane(document,id,frameProcessingLevel,url,data,title,info) {
	const $existingPane=document.getElementById(id)
	if ($existingPane) return
	const $contentBody=document.querySelector('.content-body')
	if (!$contentBody) return
	const $pane=document.createElement('details')
	$pane.id=id
	$pane.classList.add('osm-dwg-helper-pane')
	const $paneSummary=document.createElement('summary')
	const $paneSummaryText=document.createElement('span')
	$paneSummaryText.innerText=title
	if (info!=null) {
		$paneSummaryInfo=document.createElement('span')
		$paneSummaryInfo.innerText='ℹ️'
		$paneSummaryInfo.title=info
		$paneSummaryText.append(' ',$paneSummaryInfo)
	}
	$paneSummary.append($paneSummaryText)
	$pane.append($paneSummary)
	const $paneContainer=document.createElement('div')
	if (frameProcessingLevel>=2) $paneContainer.dataset.shrinkable='yes'
	const $paneFrame=document.createElement('iframe')
	$pane.addEventListener('toggle',()=>{
		if (!$pane.open) return
		if ($paneFrame.src) return
		$paneFrame.src=url
	})
	if (frameProcessingLevel>=1) $paneFrame.addEventListener('load',frameLoadListener)
	$paneContainer.append($paneFrame)
	$pane.append($paneContainer)
	for (const [k,v] of Object.entries(data)) {
		$pane.dataset[k]=v
	}
	$contentBody.before($pane)
}

function frameLoadListener() {
	const paneBorderWidth=2
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

export function addComment(document,comment) {
	const Event=document.defaultView.Event
	const $commentTextarea=document.getElementById('issue_comment_body')
	if (!$commentTextarea) return
	if ($commentTextarea.value=='') {
		$commentTextarea.value=comment
	} else {
		$commentTextarea.value+='\n\n'+comment
	}
	$commentTextarea.dispatchEvent(new Event('change')) // otherwise preview doesn't work
}

function getOsmchaFilterByUserId(uid) {
	return `{"uids":${escapeOsmchaFilterValue(uid)},"date__gte":${escapeOsmchaFilterValue('')}}`
}

function getOsmchaFilterByUserName(userName) {
	return `{"users":${escapeOsmchaFilterValue(userName)},"date__gte":${escapeOsmchaFilterValue('')}}`
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
