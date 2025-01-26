export default class ReportCounter {
	constructor(issueData) {
		this.nSelectedReports=0
		this.userMap=new Map()
		if (issueData.reports) {
			for (const report of issueData.reports) {
				if (!report.selected) continue
				this.nSelectedReports++
				const userName=report.by
				if (userName==null) continue
				let userData={read:0, unread:0, avatarUrl:report.avatarUrl}
				if (this.userMap.has(userName)) {
					userData=this.userMap.get(userName)
				} else {
					this.userMap.set(userName,userData)
				}
				if (report.wasRead) {
					userData.read++
				} else {
					userData.unread++
				}
			}
		}
	}

	get nUsers() {
		return this.userMap.size
	}

	hasUserName(userName) {
		return this.userMap.has(userName)
	}

	userNames() {
		return this.userMap.keys()
	}

	formatUserReportCounts(userName) {
		const userData=this.userMap.get(userName)
		const countTextFragments=[]
		if (userData.unread>0) countTextFragments.push(`${userData.unread} new`)
		if (userData.read>0) countTextFragments.push(`${userData.read} read`)
		const totalUserReportCount=userData.unread+userData.read
		return countTextFragments.join(` and `)+` `+plural(`report`,totalUserReportCount)
	}

	formatOtherUsersCount() {
		const nOtherUsers=this.nUsers-1
		return `${nOtherUsers} other ${plural(`user`,nOtherUsers)}`
	}

	formatSelectedReportsCount() {
		return `${this.nSelectedReports} selected `+plural(`report`,this.nSelectedReports)
	}

	getUserAvatarUrl(userName) {
		const userData=this.userMap.get(userName)
		if (userData) return userData.avatarUrl
	}
}

function plural(w,n) {
	return w+(n>1?'s':'')
}
