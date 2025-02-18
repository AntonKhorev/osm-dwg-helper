import {strict as assert} from 'assert'

import goToObjectParser from '../src/go-to-object-parser.js'

describe("goToObjectParser()",()=>{
	it("rejects empty string",()=>{
		assert.deepEqual(
			goToObjectParser(""),
			null
		)
	})
	it("rejects string without number",()=>{
		assert.deepEqual(
			goToObjectParser("foo"),
			null
		)
	})
	it("rejects pure id",()=>{
		assert.deepEqual(
			goToObjectParser("123"),
			null
		)
	})

	it("parses tickets",()=>{
		assert.deepEqual(
			goToObjectParser("tickets"),
			{site:"otrs", path:"otrs/index.pl?Action=AgentTicketStatusView", icon:"ticket"}
		)
	})
	it("parses ticket id",()=>{
		assert.deepEqual(
			goToObjectParser("ticket 123"),
			{site:"otrs", path:"otrs/index.pl?Action=AgentTicketZoom;TicketID=123", icon:"ticket"}
		)
	})
	it("parses TICKET id",()=>{
		assert.deepEqual(
			goToObjectParser("TICKET 123"),
			{site:"otrs", path:"otrs/index.pl?Action=AgentTicketZoom;TicketID=123", icon:"ticket"}
		)
	})
	it("parses ticket #id",()=>{
		assert.deepEqual(
			goToObjectParser("ticket #123"),
			{site:"otrs", path:"otrs/index.pl?Action=AgentTicketZoom;TicketID=123", icon:"ticket"}
		)
	})
	it("parses pure ticket number",()=>{
		assert.deepEqual(
			goToObjectParser("2021031415926535"),
			{site:"otrs", path:"otrs/index.pl?Action=AgentTicketZoom;TicketNumber=2021031415926535", icon:"ticket"}
		)
	})
	it("parses #ticket number",()=>{
		assert.deepEqual(
			goToObjectParser("#2021031415926535"),
			{site:"otrs", path:"otrs/index.pl?Action=AgentTicketZoom;TicketNumber=2021031415926535", icon:"ticket"}
		)
	})
	it("parses Ticket#number",()=>{
		assert.deepEqual(
			goToObjectParser("Ticket#2021031415926535"),
			{site:"otrs", path:"otrs/index.pl?Action=AgentTicketZoom;TicketNumber=2021031415926535", icon:"ticket"}
		)
	})
	it("parses ticket number in email subject",()=>{
		assert.deepEqual(
			goToObjectParser("[Ticket#2025012910000423] Locked Ticket Follow-Up: Whatever"),
			{site:"otrs", path:"otrs/index.pl?Action=AgentTicketZoom;TicketNumber=2025012910000423", icon:"ticket"}
		)
	})

	it("parses changeset id",()=>{
		assert.deepEqual(
			goToObjectParser("changeset 1234567"),
			{site:"osm", path:"changeset/1234567", icon:"changeset"}
		)
	})
	it("parses changeset #id",()=>{
		assert.deepEqual(
			goToObjectParser("changeset #1234567"),
			{site:"osm", path:"changeset/1234567", icon:"changeset"}
		)
	})
	it("parses cset id",()=>{
		assert.deepEqual(
			goToObjectParser("cset 1234567"),
			{site:"osm", path:"changeset/1234567", icon:"changeset"}
		)
	})
	it("parses c+id",()=>{
		assert.deepEqual(
			goToObjectParser("c1234567"),
			{site:"osm", path:"changeset/1234567", icon:"changeset"}
		)
	})
	it("parses changesets/id",()=>{
		assert.deepEqual(
			goToObjectParser("changesets/1234567"),
			{site:"osm", path:"changeset/1234567", icon:"changeset"}
		)
	})
	it("parses changeset/id",()=>{
		assert.deepEqual(
			goToObjectParser("changeset/1234567"),
			{site:"osm", path:"changeset/1234567", icon:"changeset"}
		)
	})
	it("parses changeset id xml",()=>{
		assert.deepEqual(
			goToObjectParser("changeset 1234567 xml"),
			{site:"osm_api", path:"api/0.6/changeset/1234567.xml", icon:"changeset"}
		)
	})
	it("parses changeset id.xml",()=>{
		assert.deepEqual(
			goToObjectParser("changeset 1234567.xml"),
			{site:"osm_api", path:"api/0.6/changeset/1234567.xml", icon:"changeset"}
		)
	})
	it("parses changeset id json",()=>{
		assert.deepEqual(
			goToObjectParser("changeset 1234567 json"),
			{site:"osm_api", path:"api/0.6/changeset/1234567.json", icon:"changeset"}
		)
	})

	it("parses node id",()=>{
		assert.deepEqual(
			goToObjectParser("node 11223344"),
			{site:"osm", path:"node/11223344", icon:"node"}
		)
	})
	it("parses n+id",()=>{
		assert.deepEqual(
			goToObjectParser("n11223344"),
			{site:"osm", path:"node/11223344", icon:"node"}
		)
	})
	it("parses nodes/id",()=>{
		assert.deepEqual(
			goToObjectParser("nodes/11223344"),
			{site:"osm", path:"node/11223344", icon:"node"}
		)
	})
	it("parses node/id",()=>{
		assert.deepEqual(
			goToObjectParser("node/11223344"),
			{site:"osm", path:"node/11223344", icon:"node"}
		)
	})
	it("parses node id with version",()=>{
		assert.deepEqual(
			goToObjectParser("node 11223344v7"),
			{site:"osm", path:"node/11223344/history/7", icon:"node"}
		)
	})
	it("parses node id with version (with space)",()=>{
		assert.deepEqual(
			goToObjectParser("node 11223344 v7"),
			{site:"osm", path:"node/11223344/history/7", icon:"node"}
		)
	})
	it("parses node id with version (spelled out)",()=>{
		assert.deepEqual(
			goToObjectParser("node 11223344 version 7"),
			{site:"osm", path:"node/11223344/history/7", icon:"node"}
		)
	})
	it("parses node id with version (with slash)",()=>{
		assert.deepEqual(
			goToObjectParser("node 11223344/7"),
			{site:"osm", path:"node/11223344/history/7", icon:"node"}
		)
	})
	it("parses node id xml",()=>{
		assert.deepEqual(
			goToObjectParser("node 44332211 xml"),
			{site:"osm_api", path:"api/0.6/node/44332211.xml", icon:"node"}
		)
	})
	it("parses node id.xml",()=>{
		assert.deepEqual(
			goToObjectParser("node 44332211.xml"),
			{site:"osm_api", path:"api/0.6/node/44332211.xml", icon:"node"}
		)
	})
	it("parses node id with version xml",()=>{
		assert.deepEqual(
			goToObjectParser("node 44332211v5 xml"),
			{site:"osm_api", path:"api/0.6/node/44332211/5.xml", icon:"node"}
		)
	})
	it("parses node id json",()=>{
		assert.deepEqual(
			goToObjectParser("node 44332211 json"),
			{site:"osm_api", path:"api/0.6/node/44332211.json", icon:"node"}
		)
	})
	it("parses way id",()=>{
		assert.deepEqual(
			goToObjectParser("way 11223344"),
			{site:"osm", path:"way/11223344", icon:"way"}
		)
	})
	it("parses w+id",()=>{
		assert.deepEqual(
			goToObjectParser("w11223344"),
			{site:"osm", path:"way/11223344", icon:"way"}
		)
	})
	it("parses ways/id",()=>{
		assert.deepEqual(
			goToObjectParser("ways/11223344"),
			{site:"osm", path:"way/11223344", icon:"way"}
		)
	})
	it("parses way/id",()=>{
		assert.deepEqual(
			goToObjectParser("way/11223344"),
			{site:"osm", path:"way/11223344", icon:"way"}
		)
	})
	it("parses way id with version",()=>{
		assert.deepEqual(
			goToObjectParser("way 11223344v7"),
			{site:"osm", path:"way/11223344/history/7", icon:"way"}
		)
	})
	it("parses relation id",()=>{
		assert.deepEqual(
			goToObjectParser("relation 11223344"),
			{site:"osm", path:"relation/11223344", icon:"relation"}
		)
	})
	it("parses rel id",()=>{
		assert.deepEqual(
			goToObjectParser("rel 11223344"),
			{site:"osm", path:"relation/11223344", icon:"relation"}
		)
	})
	it("parses r+id",()=>{
		assert.deepEqual(
			goToObjectParser("r11223344"),
			{site:"osm", path:"relation/11223344", icon:"relation"}
		)
	})
	it("parses relations/id",()=>{
		assert.deepEqual(
			goToObjectParser("relations/11223344"),
			{site:"osm", path:"relation/11223344", icon:"relation"}
		)
	})
	it("parses relation/id",()=>{
		assert.deepEqual(
			goToObjectParser("relation/11223344"),
			{site:"osm", path:"relation/11223344", icon:"relation"}
		)
	})
	it("parses relation id with version",()=>{
		assert.deepEqual(
			goToObjectParser("relation 11223344v7"),
			{site:"osm", path:"relation/11223344/history/7", icon:"relation"}
		)
	})

	it("parses issues",()=>{
		assert.deepEqual(
			goToObjectParser("issues"),
			{site:"osm", path:"issues?status=open", icon:"issue"}
		)
	})
	it("parses issue id",()=>{
		assert.deepEqual(
			goToObjectParser("issue 12"),
			{site:"osm", path:"issues/12", icon:"issue"}
		)
	})

	it("parses blocks",()=>{
		assert.deepEqual(
			goToObjectParser("blocks"),
			{site:"osm", path:"user_blocks", icon:"block"}
		)
	})
	it("parses block id",()=>{
		assert.deepEqual(
			goToObjectParser("block 12"),
			{site:"osm", path:"user_blocks/12", icon:"block"}
		)
	})
	it("parses blocks/id",()=>{
		assert.deepEqual(
			goToObjectParser("blocks/13"),
			{site:"osm", path:"user_blocks/13", icon:"block"}
		)
	})

	it("parses redactions",()=>{
		assert.deepEqual(
			goToObjectParser("redactions"),
			{site:"osm", path:"redactions", icon:"redaction"}
		)
	})
	it("parses redaction id",()=>{
		assert.deepEqual(
			goToObjectParser("redaction 12"),
			{site:"osm", path:"redactions/12", icon:"redaction"}
		)
	})
})
