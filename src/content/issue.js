import processReport from './issue-report.js'

export function getIssueDataAndInjectItemPanes(document,reportStateUpdate,osmcha) { // do both things at once to avoid extra messages
	const issueData=scrapeIssueData(document,reportStateUpdate)
	injectReportedItemPanes(document,issueData,osmcha)
	return issueData
}

function scrapeIssueData(document,reportStateUpdate) {
	// issue render code: https://github.com/openstreetmap/openstreetmap-website/tree/master/app/views/issues
	const $content=document.getElementById('content')
	if (!$content) return {}
	const issueData={
		reports:[],
		comments:[],
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
	}{
		const $contentBodyInner=$content.querySelector('.content-body .content-inner')
		if ($contentBodyInner) {
			const [$readReports,$newReports,$comments]=getReportsAndComments($contentBodyInner)
			processReportsOrComments($newReports,true,false)
			processReportsOrComments($readReports,true,true)
			processReportsOrComments($comments,false)
		}
	}
	return issueData
	function processReportsOrComments($reports,areReports,wereRead) {
		if (!$reports) return
		for (const $report of $reports.querySelectorAll('.row')) {
			const report=processReport(document,$report,areReports&&!wereRead)
			if (areReports) report.wasRead=wereRead
			if (!$report.dataset.osmDwgHelperListenersInstalled) {
				$report.dataset.osmDwgHelperListenersInstalled=true
				$report.addEventListener('click',reportLinkClickListener)
				$report.addEventListener('input',reportCheckboxInputListener)
			}
			if (areReports) {
				issueData.reports.push(report)
			} else {
				issueData.comments.push(report)
			}
		}
	}
	function reportLinkClickListener(ev) { // TODO decouple from pane code - maybe install capture phase handler later, when panes are injected
		const $osmchaPane=document.getElementById('osm-dwg-helper-reported-item-pane-osmcha')
		if (!$osmchaPane) return
		const $a=ev.target.closest('a')
		if (!$a) return
		const changesetId=$a.dataset.changesetId
		if (changesetId==null) return
		ev.preventDefault()
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
	function reportCheckboxInputListener(ev) {
		if (!ev.target.classList.contains('osm-dwg-helper-report-checkbox')) return
		reportStateUpdate()
	}
}

function getReportsAndComments($contentBodyInner) {
	const [$reportsAndOtherIssues,,$comments]=$contentBodyInner.children
	const [$allReports]=$reportsAndOtherIssues.children
	let $readReports,$newReports
	for (const $reports of $allReports.children) {
		if ($reports.tagName!='DIV') continue
		if ($reports.classList.contains('text-muted')) {
			$readReports=$reports
		} else {
			$newReports=$reports
		}
	}
	return [$readReports,$newReports,$comments]
}

function injectReportedItemPanes(document,issueData,osmcha) {
	const item=issueData.reportedItem
	if (item?.type!='note' && item?.type!='user') {
		removePane(document,'osm-dwg-helper-reported-item-pane')
		removePane(document,'osm-dwg-helper-reported-item-pane-osmcha')
		return
	}
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

export function submitComment(document) {
	const $commentForm=document.getElementById('new_issue_comment')
	if (!$commentForm) return
	$commentForm.submit()
}

export function resolveIssue(document) {
	const $resolveLink=document.querySelector('.secondary-actions a[href$="/resolve"]')
	if (!$resolveLink) return
	$resolveLink.click()
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
