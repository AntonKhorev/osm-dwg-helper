export function getUserId(document) {
	const $userInfo=document.querySelector('.content-heading')
	if (!$userInfo) return
	// need to find this link: https://www.openstreetmap.org/reports/new?reportable_id=${id}&reportable_type=User
	for (const $a of $userInfo.querySelectorAll('a')) {
		const url=new URL($a.href)
		const params=new URLSearchParams(url.search)
		const uid=params.get('reportable_id')
		if (uid!=null) return uid
	}
}
