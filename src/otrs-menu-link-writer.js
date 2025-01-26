export default class OtrsMenuLinkWriter {
	constructor(menuLinkWriter,otrs) {
		this.menuLinkWriter=menuLinkWriter
		this.otrs=otrs
	}

	/**
	 * @param query {string}
	 * @param otrs {string}
	 * @returns {HTMLAnchorElement}
	 */
	makeSearchLink(query) {
		return this.menuLinkWriter.makePageLink(
			query,
			`${this.otrs}otrs/index.pl?Action=AgentTicketSearch&Subaction=Search&Fulltext=${encodeURIComponent(query)}`
		)
	}

	/**
	 * @param addAs {string}
	 * @param ticketId {number}
	 * @param tabAction {array}
	 * @returns {HTMLAnchorElement}
	 */
	makeAddToTicketLink(addAs,ticketId,tabAction) {
		let otrsAction='AgentTicketNote'
		if (addAs=='pending') otrsAction='AgentTicketPending'
		return this.menuLinkWriter.makeCurrentTabActionLink(
			'as '+addAs,
			`${this.otrs}otrs/index.pl?Action=${otrsAction};TicketID=${encodeURIComponent(ticketId)}`,
			tabAction
		)
	}
}
