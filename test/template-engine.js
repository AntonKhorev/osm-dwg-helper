import {strict as assert} from 'assert'

import * as templateEngine from '../src/template-engine.js'

describe("template engine / evaluate()",()=>{
	it("interpolates a string",()=>{
		const result=templateEngine.evaluate("before(${thing.name})after",{thing:{name:"something"}})
		assert.equal(result,"before(something)after")
	})
	it("interpolates a number",()=>{
		const result=templateEngine.evaluate("before(${thing.id})after",{thing:{id:1357}})
		assert.equal(result,"before(1357)after")
	})
})

describe("template engine / evaluateHtml()",()=>{
	it("interpolates a string",()=>{
		const result=templateEngine.evaluateHtml("before(${thing.name})after",{thing:{name:"something"}})
		assert.equal(result,"before(something)after\n")
	})
	it("interpolates a number",()=>{
		const result=templateEngine.evaluateHtml("before(${thing.id})after",{thing:{id:1357}})
		assert.equal(result,"before(1357)after\n")
	})
})
