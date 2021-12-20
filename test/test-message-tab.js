import {strict as assert} from 'assert'

export default function(testers=[],returners=[]) {
	const listenerCalls=[]
	let i=0
	return [
		async(tabId,script,message)=>{
			const tester=(testers[i] ?? (()=>{}))
			const returner=returners[i]
			i++
			listenerCalls.push(
				()=>tester(tabId,script,message)
			)
			if (typeof returner=='function') {
				return returner()
			} else {
				return returner
			}
		},
		()=>{
			assert.equal(listenerCalls.length,testers.length,`Unexpected number of calls to messageTab()`)
			for (const listenerCall of listenerCalls) {
				listenerCall()
			}
		}
	]
}
