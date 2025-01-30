import {strict as assert} from 'assert'

import goToTicketParser from '../src/go-to-ticket-parser.js'

describe("goToTicketParser()",()=>{
	it("parses empty string",()=>{
		assert.deepEqual(
			goToTicketParser(""),
			{}
		)
	})
	it("parses string without number",()=>{
		assert.deepEqual(
			goToTicketParser("foo"),
			{}
		)
	})
	it("parses pure id",()=>{
		assert.deepEqual(
			goToTicketParser("123"),
			{id:"123"}
		)
	})
	it("parses pure number",()=>{
		assert.deepEqual(
			goToTicketParser("2021031415926535"),
			{number:"2021031415926535"}
		)
	})
	it("parses #number",()=>{
		assert.deepEqual(
			goToTicketParser("#2021031415926535"),
			{number:"2021031415926535"}
		)
	})
	it("parses Ticket#number",()=>{
		assert.deepEqual(
			goToTicketParser("Ticket#2021031415926535"),
			{number:"2021031415926535"}
		)
	})
	it("parses number in email subject",()=>{
		assert.deepEqual(
			goToTicketParser("[Ticket#2025012910000423] Locked Ticket Follow-Up: Whatever"),
			{number:"2025012910000423"}
		)
	})
})
