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
				let userReportCounts={read:0, unread:0}
				if (this.userMap.has(userName)) {
					userReportCounts=this.userMap.get(userName)
				} else {
					this.userMap.set(userName,userReportCounts)
				}
				if (report.wasRead) {
					userReportCounts.read++
				} else {
					userReportCounts.unread++
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
		const userReportCounts=this.userMap.get(userName)
		const countTextFragments=[]
		if (userReportCounts.unread>0) countTextFragments.push(`${userReportCounts.unread} new`)
		if (userReportCounts.read>0) countTextFragments.push(`${userReportCounts.read} read`)
		const totalUserReportCount=userReportCounts.unread+userReportCounts.read
		return countTextFragments.join(` and `)+` `+plural(`report`,totalUserReportCount)
	}

	formatOtherUsersCount() {
		const nOtherUsers=reportCounter.nUsers-1
		return `${nOtherUsers} other ${plural(`user`,nOtherUsers)}`
	}

	formatSelectedReportsCount() {
		return `${this.nSelectedReports} selected `+plural(`report`,this.nSelectedReports)
	}
}

function plural(w,n) {
	return w+(n>1?'s':'')
}
