import {strict as assert} from 'assert'

export default function(testers) {
	const listenerCalls=[]
	let i=0
	return [
		async(tabId,script,message)=>{
			const tester=(testers[i++] ?? (()=>{}))
			listenerCalls.push(
				()=>tester(tabId,script,message)
			)
		},
		()=>{
			assert.equal(listenerCalls.length,testers.length)
			for (const listenerCall of listenerCalls) {
				listenerCall()
			}
		}
	]
}
