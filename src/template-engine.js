import {
	escapeHtml
} from './utils.js'

/**
 * @param template {string} - Template string with js-like placeholders ${keypath}; keypath is usually something like object.property
 * @param values {Object} - Object with possible values to substitute
 * @param escapeFn {(s:string)=>string} - Function to apply to values before substitution
 */
export function evaluate(template,values,escapeFn=s=>s) {
	if (template==null) return ''
	const templateChunks=template.split(/\${([^}]*)}/)
	let result=''
	for (let i=0;i<templateChunks.length;i++) {
		if (i%2==0) {
			result+=templateChunks[i]
		} else {
			let value=values
			for (const key of templateChunks[i].split('.')) {
				value=value[key]
			}
			if (!value) continue
			result+=escapeFn(String(value))
		}
	}
	return result
}

/**
 * @param template {string} - Template string with js-like placeholders ${keypath}; keypath is usually something like object.property
 * @param values {Object} - Object with possible values to substitute; this function escapes all values before substituting
 */
export function evaluateHtml(template,values) {
	return evaluate(template,values,escapeHtml)+'\n'
}

/**
 * @param template {string} - Template string with js-like placeholders ${keypath}; keypath is usually something like object.property
 * @param values {Object} - Object with possible values to substitute; this function escapes all values before substituting
 */
export function evaluateKramdown(template,values) {
	return evaluate(template,values,s=>escapeHtml(s.replaceAll('[','\\[').replaceAll(']','\\]')))+'\n'
}
