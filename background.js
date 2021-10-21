window.defaultSettingsText=`otrs = https://otrs.openstreetmap.org/
osm = https://www.openstreetmap.org/
ticket_customer = \${user.name} <fwd@dwgmail.info>
ticket_subject = Issue #\${issue.id}
ticket_subject_user = Issue #\${issue.id} (User "\${user.name}")
ticket_subject_note = Issue #\${issue.id} (Note #\${note.id})
ticket_body_header = <h1><a href='\${issue.url}'>Issue #\${issue.id}</a></h1>
ticket_body_item = <p>Reported item : <a href='\${item.url}'>osm link</a></p>
ticket_body_item_user = <p>User : <a href='\${user.url}'>\${user.name}</a></p>
ticket_body_item_note = <p>Note : <a href='\${note.url}'>Note #\${note.id}</a></p>
`

window.settings=parseSettingsText(defaultSettingsText)

const tabStates={}
const tabActions={}

function parseSettingsText(text) {
	const settings={}
	for (const line of text.split('\n')) {
		let match
		if (match=line.match(/^\s*([a-z_]+)\s*=\s*(.*)$/)) {
			const [,key,value]=match
			settings[key]=value
		}
	}
	return settings
}
