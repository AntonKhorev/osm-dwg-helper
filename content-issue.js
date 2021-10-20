if (!window.osmDwgHelperIssueListenerInstalled) {
	browser.runtime.onMessage.addListener(messageListener)
	window.osmDwgHelperIssueListenerInstalled=true
}

function messageListener(message) {
	if (message.action!='getIssueData') return false
	// issue render code: https://github.com/openstreetmap/openstreetmap-website/tree/70d7d8d850148f714b70a3297c02a8203214dec6/app/views/issues
	const $content=document.getElementById('content')
	//if (!$content) return Promise.reject("can't find content")
	if (!$content) return Promise.resolve({})
	const issueData={
		reports:[]
	}
	const $header=$content.querySelector('h2')
	if ($header) {
		const $reportedParagraph=$header.nextElementSibling
		if ($reportedParagraph) {
			const $reportedLink=$reportedParagraph.querySelector('a')
			if ($reportedLink) {
				const reportedItem=parseReportedLink($reportedLink)
				if (reportedItem) issueData.reportedItem=reportedItem
			}
		}
	}
	for (const $report of $content.querySelectorAll('.report')) {
		const report={
			wasRead:$report.parentElement.classList.contains('text-muted'),
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
	return Promise.resolve(issueData)
}

function parseReportedLink($repotedLink) {
	const href=$repotedLink.href
	let match
	if (match=href.match(/\/note\/([0-9]+)$/)) {
		const [,id]=match
		return {
			type:'note',
			ref:'#'+id,
			href,
			id
		}
	} else if ($repotedLink.href.match(/\/user\/[^/]+$/)) {
		const name=$repotedLink.innerText
		return {
			type:'user',
			ref:name,
			name,
			href
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
