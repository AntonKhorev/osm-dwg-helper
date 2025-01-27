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

describe("template engine / evaluateMarkdown()",()=>{
	it("escapes brackets",()=>{
		const result=templateEngine.evaluateKramdown("User [${user.name}](${user.url})",{user:{name:"Bobby ] Brackets",url:"https://example.com/bobby_brackets"}})
		assert.equal(result,"User [Bobby \\] Brackets](https://example.com/bobby_brackets)\n")
	})
	it("escapes multiple brackets",()=>{
		const result=templateEngine.evaluateKramdown("User [${user.name}](${user.url})",{user:{name:"Bobby [[ Lotsa ]] Brackets",url:"https://example.com/bobby_brackets"}})
		assert.equal(result,"User [Bobby \\[\\[ Lotsa \\]\\] Brackets](https://example.com/bobby_brackets)\n")
	})
})
