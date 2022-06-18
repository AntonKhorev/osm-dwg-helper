export function isTabStateEqual(data1,data2) {
	if (data1.type!=data2.type) return false
	if (data1.type=='message') {
		if (data1.messageData.id!=data2.messageData.id) return false
	}
	if (data1.type=='user') {
		if (data1.userData.id!=data2.userData.id) return false
	}
	if (data1.type=='issue') {
		if (data1.issueData.id!=data2.issueData.id) return false
		if (!areReportsOrCommentsEqual(data1.issueData.reports,data2.issueData.reports)) return false
		if (!areReportsOrCommentsEqual(data1.issueData.comments,data2.issueData.comments)) return false
	}
	if (data1.type=='ticket') {
		if (data1.issueData.id!=data2.issueData.id) return false
		// TODO compare other stuff
	}
	return true
}

function areReportsOrCommentsEqual(rocs1,rocs2) {
	if (!Array.isArray(rocs1) && !Array.isArray(rocs2)) return true
	if (!Array.isArray(rocs1)) return false
	if (!Array.isArray(rocs2)) return false
	if (rocs1.length!=rocs2.length) return false
	for (let i=0;i<rocs1.length;i++) {
		if (rocs1[i].wasRead!=rocs2[i].wasRead) return false
		if (rocs1[i].selected!=rocs2[i].selected) return false
	}
	return true
}
