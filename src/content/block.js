export function getBlockData(document) {
	const blockData={}
	const $content=document.getElementById('content')
	if (!$content) return blockData
	const $userLink=$content.querySelector('h1 a')
	if ($userLink) {
		blockData.user=$userLink.textContent
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
