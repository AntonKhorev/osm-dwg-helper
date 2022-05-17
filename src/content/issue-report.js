export default function processReport(document,$report,markedChangesetLinkClickHandler) {
	// report render code: https://github.com/openstreetmap/openstreetmap-website/blob/master/app/views/issues/_reports.html.erb
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
	return report
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
			if (markedChangesetLinkClickHandler) {
				$a.addEventListener('click',markedChangesetLinkClickHandler)
			}
			$reportText.append($a)
			input=after
		}
		if (input) $reportText.append(input)
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
