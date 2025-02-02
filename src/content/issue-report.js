export default function processReport(document,$report,selected=false) {
	// report render code: https://github.com/openstreetmap/openstreetmap-website/blob/master/app/views/issues/_reports.html.erb
	const [$reportAvatarColumn,$reportMainColumn]=$report.children
	if (!$reportAvatarColumn.querySelector('.osm-dwg-helper-report-checkbox')) {
		const $checkbox=document.createElement('input')
		$checkbox.type='checkbox'
		$checkbox.checked=selected
		$checkbox.classList.add('osm-dwg-helper-report-checkbox')
		const $label=document.createElement('label')
		$label.title=`Add this item to ticket when using "create ticket" and "add to ticket" commands`
		$label.classList.add('osm-dwg-helper-report-checkbox-label')
		$label.append($checkbox)
		$reportAvatarColumn.append($label)
	}
	const report={
		lead:[],
		text:'',
		selected:$reportAvatarColumn.querySelector('.osm-dwg-helper-report-checkbox').checked
	}
	const $avatarImage=$reportAvatarColumn.querySelector('img')
	if ($avatarImage) report.avatarUrl=$avatarImage.src
	let firstParagraph=true
	let lastTextParagraphWasEmpty=false
	for (const $child of $reportMainColumn.children) {
		if ($child.tagName=='P') {
			if (firstParagraph) {
				firstParagraph=false
				Object.assign(report,parseLead($child))
			} else {
				markChangesetLinks($child)
				const currentTextParagraphIsEmpty=$child.innerHTML==''
				if (lastTextParagraphWasEmpty && report.text!='') {
					report.text+=`<p></p>`
				}
				if (!currentTextParagraphIsEmpty) {
					report.text+=$child.outerHTML
				}
				lastTextParagraphWasEmpty=currentTextParagraphIsEmpty
			}
		} else if ($child.tagName=='DIV') {
			markChangesetLinks($child)
			report.text+=$child.innerHTML
		}
	}
	return report
	function markChangesetLinks($reportText) {
		for (const $a of $reportText.querySelectorAll('a[href]')) {
			let match
			if (match=$a.href.match(/\/changeset\/(\d+)/)) {
				const [,changesetId]=match
				$a.dataset.changesetId=changesetId
				$a.classList.add('osm-dwg-helper-changeset-anchor')
			}
		}
	}
	/*
	// old version that was inserting links in plaintext
	function markChangesetLinks($reportText) {
		let input=$reportText.textContent
		$reportText.innerHTML=''
		let match
		while (match=input.match(/(^|.*?\s)(\S*\/changeset\/(\d+))(.*)$/)) {
			const [,before,changesetText,changesetId,after]=match
			if (before) $reportText.append(before)
			const $a=document.createElement('a')
			$a.textContent=changesetText
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
	*/
}

function parseLead($p) {
	const report={
		lead: []
	}
	const $markedCategory=$p.querySelector(":scope > [data-category]")
	if ($markedCategory) {
		report.category=$markedCategory.dataset.category
	}
	for (const pChild of $p.childNodes) {
		if (pChild.nodeType==/*Node.TEXT_NODE*/3) {
			if ($markedCategory) {
				report.lead.push(['plain',pChild.nodeValue])
			} else {
				parsePlainTextWithUnmarkedCategory(pChild.nodeValue)
			}
		} else if (pChild.nodeType==/*Node.ELEMENT_NODE*/1) {
			if (pChild.dataset?.category) {
				report.lead.push(['category',pChild.textContent])
			} else if (pChild.tagName=='A') {
				report.by=pChild.textContent
				report.byUrl=pChild.href
				report.lead.push(['user',report.by])
			} else if (pChild.tagName=='TIME') {
				report.lead.push(['plain',pChild.textContent])
			} else {
				parsePlainTextWithUnmarkedCategory(pChild.textContent)
			}
		}
	}
	for (let i=0;i<report.lead.length-1;) {
		const [type0,text0]=report.lead[i]
		const [type1,text1]=report.lead[i+1]
		if (type0!='plain' || type1!='plain') {
			i++
		} else {
			report.lead.splice(i,2,['plain',text0+text1])
		}
	}
	if (report.lead.length>0) {
		{
			const [type,text]=report.lead[0]
			if (type=='plain') report.lead[0]=[type,text.trimStart()]
		}
		{
			const [type,text]=report.lead[report.lead.length-1]
			if (type=='plain') report.lead[report.lead.length-1]=[type,text.trimEnd()]
		}
	}
	return report
	function parsePlainTextWithUnmarkedCategory(text) {
		const [textBefore,textCategory,textAfter]=splitByReportCategory(text)
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
