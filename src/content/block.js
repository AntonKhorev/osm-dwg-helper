export function getBlockData(document) {
	const blockData={}
	const $content=document.getElementById('content')
	if (!$content) return blockData
	const $userLinks=$content.querySelectorAll('h1 a')
	const $userLink=getUserLink($userLinks,document.head.dataset.locale)
	if ($userLink) {
		blockData.user=$userLink.textContent
		blockData.userUrl=$userLink.href
	}
	const $blockInfo=$content.querySelector('.content-body .content-inner dl')
	if ($blockInfo) {
		const [,$blockDuration]=$blockInfo.querySelectorAll('dd')
		if ($blockDuration) {
			const value=$blockDuration.textContent
			blockData.isZeroHour=(value[0]=='0')
		}
	}
	return blockData
}

function getUserLink($userLinks,locale) {
	if (['diq','hu','ja'].includes(locale)) {
		return $userLinks[1]
	} else {
		return $userLinks[0]
	}
}
