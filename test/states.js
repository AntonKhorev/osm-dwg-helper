import {strict as assert} from 'assert'

import {isTabStateEqual} from '../src/states.js'

describe("states module / isTabStateEqual()",()=>{
	it("considers equal two same-id issues w/o reports",async()=>{
		const data1={
			type: 'issue',
			issueData: {
				id: 42,
			}
		}
		const data2={
			type: 'issue',
			issueData: {
				id: 42,
			}
		}
		assert.equal(
			isTabStateEqual(data1,data2),
			true
		)
	})
	it("considers unequal two same-id issues, one with reports",async()=>{
		const data1={
			type: 'issue',
			issueData: {
				id: 42,
			}
		}
		const data2={
			type: 'issue',
			issueData: {
				id: 42,
				reports: [
					{
						wasRead: false,
						selected: true,
						lead:[],text:'blah',
					},
					{
						wasRead: false,
						selected: true,
						lead:[],text:'blah',
					},
				],
				comments: [],
			}
		}
		assert.equal(
			isTabStateEqual(data1,data2),
			false
		)
	})
	it("considers equal two same-id issues, both with reports",async()=>{
		const data1={
			type: 'issue',
			issueData: {
				id: 42,
				reports: [
					{
						wasRead: false,
						selected: true,
						lead:[],text:'blah',
					},
					{
						wasRead: false,
						selected: true,
						lead:[],text:'blah',
					},
				],
				comments: [],
			}
		}
		const data2={
			type: 'issue',
			issueData: {
				id: 42,
				reports: [
					{
						wasRead: false,
						selected: true,
						lead:[],text:'blah',
					},
					{
						wasRead: false,
						selected: true,
						lead:[],text:'blah',
					},
				],
				comments: [],
			}
		}
		assert.equal(
			isTabStateEqual(data1,data2),
			true
		)
	})
	it("considers unequal two same-id issues, with different number of reports",async()=>{
		const data1={
			type: 'issue',
			issueData: {
				id: 42,
				reports: [
					{
						wasRead: false,
						selected: true,
						lead:[],text:'blah',
					},
					{
						wasRead: false,
						selected: true,
						lead:[],text:'blah',
					},
				],
				comments: [],
			}
		}
		const data2={
			type: 'issue',
			issueData: {
				id: 42,
				reports: [
					{
						wasRead: false,
						selected: true,
						lead:[],text:'blah',
					},
					{
						wasRead: false,
						selected: true,
						lead:[],text:'blah',
					},
					{
						wasRead: false,
						selected: true,
						lead:[],text:'blah',
					},
				],
				comments: [],
			}
		}
		assert.equal(
			isTabStateEqual(data1,data2),
			false
		)
	})
	it("considers unequal two same-id issues with reports, with different read state",async()=>{
		const data1={
			type: 'issue',
			issueData: {
				id: 42,
				reports: [
					{
						wasRead: false,
						selected: true,
						lead:[],text:'blah',
					},
					{
						wasRead: false,
						selected: true,
						lead:[],text:'blah',
					},
				],
				comments: [],
			}
		}
		const data2={
			type: 'issue',
			issueData: {
				id: 42,
				reports: [
					{
						wasRead: true,
						selected: true,
						lead:[],text:'blah',
					},
					{
						wasRead: false,
						selected: true,
						lead:[],text:'blah',
					},
				],
				comments: [],
			}
		}
		assert.equal(
			isTabStateEqual(data1,data2),
			false
		)
	})
	it("considers unequal two same-id issues with reports, with different selection",async()=>{
		const data1={
			type: 'issue',
			issueData: {
				id: 42,
				reports: [
					{
						wasRead: false,
						selected: true,
						lead:[],text:'blah',
					},
					{
						wasRead: false,
						selected: true,
						lead:[],text:'blah',
					},
				],
				comments: [],
			}
		}
		const data2={
			type: 'issue',
			issueData: {
				id: 42,
				reports: [
					{
						wasRead: false,
						selected: true,
						lead:[],text:'blah',
					},
					{
						wasRead: false,
						selected: false,
						lead:[],text:'blah',
					},
				],
				comments: [],
			}
		}
		assert.equal(
			isTabStateEqual(data1,data2),
			false
		)
	})
	it("considers unequal two same-id issues with reports, with different number of comments",async()=>{
		const data1={
			type: 'issue',
			issueData: {
				id: 42,
				reports: [
					{
						wasRead: false,
						selected: true,
						lead:[],text:'blah',
					},
					{
						wasRead: false,
						selected: true,
						lead:[],text:'blah',
					},
				],
				comments: [],
			}
		}
		const data2={
			type: 'issue',
			issueData: {
				id: 42,
				reports: [
					{
						wasRead: false,
						selected: true,
						lead:[],text:'blah',
					},
					{
						wasRead: false,
						selected: true,
						lead:[],text:'blah',
					},
				],
				comments: [
					{
						selected: false,
						lead:[],text:'blah',
					},
				],
			}
		}
		assert.equal(
			isTabStateEqual(data1,data2),
			false
		)
	})
})
