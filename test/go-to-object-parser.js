import {strict as assert} from 'assert'

import goToObjectParser from '../src/go-to-object-parser.js'

describe("goToObjectParser()",()=>{
	it("rejects empty string",()=>{
		assert.deepEqual(
			goToObjectParser(""),
			{}
		)
	})
	it("rejects string without number",()=>{
		assert.deepEqual(
			goToObjectParser("foo"),
			{}
		)
	})
	it("rejects pure id",()=>{
		assert.deepEqual(
			goToObjectParser("123"),
			{}
		)
	})
	it("parses ticket id",()=>{
		assert.deepEqual(
			goToObjectParser("ticket 123"),
			{site:"otrs", path:"otrs/index.pl?Action=AgentTicketZoom;TicketID=123"}
		)
	})
	it("parses TICKET id",()=>{
		assert.deepEqual(
			goToObjectParser("TICKET 123"),
			{site:"otrs", path:"otrs/index.pl?Action=AgentTicketZoom;TicketID=123"}
		)
	})
	it("parses ticket #id",()=>{
		assert.deepEqual(
			goToObjectParser("ticket #123"),
			{site:"otrs", path:"otrs/index.pl?Action=AgentTicketZoom;TicketID=123"}
		)
	})
	it("parses pure ticket number",()=>{
		assert.deepEqual(
			goToObjectParser("2021031415926535"),
			{site:"otrs", path:"otrs/index.pl?Action=AgentTicketZoom;TicketNumber=2021031415926535"}
		)
	})
	it("parses #ticket number",()=>{
		assert.deepEqual(
			goToObjectParser("#2021031415926535"),
			{site:"otrs", path:"otrs/index.pl?Action=AgentTicketZoom;TicketNumber=2021031415926535"}
		)
	})
	it("parses Ticket#number",()=>{
		assert.deepEqual(
			goToObjectParser("Ticket#2021031415926535"),
			{site:"otrs", path:"otrs/index.pl?Action=AgentTicketZoom;TicketNumber=2021031415926535"}
		)
	})
	it("parses ticket number in email subject",()=>{
		assert.deepEqual(
			goToObjectParser("[Ticket#2025012910000423] Locked Ticket Follow-Up: Whatever"),
			{site:"otrs", path:"otrs/index.pl?Action=AgentTicketZoom;TicketNumber=2025012910000423"}
		)
	})
})
