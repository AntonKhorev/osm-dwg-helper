import {strict as assert} from 'assert'

import goToTicketParser from '../src/go-to-ticket-parser.js'

describe("goToTicketParser()",()=>{
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
})
