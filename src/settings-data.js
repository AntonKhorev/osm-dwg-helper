export default [
	"Main settings",
	['otrs','https://otrs.openstreetmap.org/',"OTRS root URL",{type:'url',state:true,origin:true}],
	['otrs_email','data@otrs.openstreetmap.org',"Inbound email for OTRS tickets"],
	['osm','https://www.openstreetmap.org/',"OpenStreetMap root URL",{type:'url',state:true,origin:true}],
	['osm_api','https://api.openstreetmap.org/',"OpenStreetMap API root URL",{type:'url',state:true,note:"to make a link to user id"}],
	['osmcha','https://osmcha.org/',"OSMCha root URL",{type:'url',state:true,origin:true,note:"for frame embeds on issue page"}],
	"OTRS ticket creation from OSM issues",
	['ticket_customer',`\${user.name} <fwd@dwgmail.info>`,"Customer template",{note:"usually needs to be email-like for OTRS not to complain"}],
	['ticket_subject',`Issue #\${issue.id}`,"Subject template for generic reported item"],
	['ticket_subject_user',`Issue #\${issue.id} (User "\${user.name}")`,"Subject template for reported user with unknown id"],
	['ticket_subject_user_id',`Issue #\${issue.id} (User "\${user.name}")`,"Subject template for reported user with known id"],
	['ticket_subject_note',`Issue #\${issue.id} (Note #\${note.id})`,"Subject template for reported note"],
	// TODO textareas for html templates, also need to alter textfile format
	['ticket_body_header',`<h1><a href='\${issue.url}'>Issue #\${issue.id}</a></h1>`,"Body header template",{note:"HTML"}],
	['ticket_body_item',`<p>Reported item : <a href='\${item.url}'>osm link</a></p>`,"Body reported item template when item type unknown",{note:"HTML"}],
	['ticket_body_item_user',`<p>User : <a href='\${user.url}'>\${user.name}</a></p>`,"Body reported item template when item is a user with unknown id",{note:"HTML"}],
	['ticket_body_item_user_id',`<p>User : <a href='\${user.url}'>\${user.name}</a> , <a href='\${user.apiUrl}'>#\${user.id}</a></p>`,"Body reported item template when item is a user with known id",{note:"HTML"}],
	['ticket_body_item_note',`<p>Note : <a href='\${note.url}'>Note #\${note.id}</a></p>`,"Body reported item template when item is a note",{note:"HTML"}],
	['issue_comment_ticket_created',`OTRS ticket created: \${ticket.url}`,"Issue comment about new ticket"],
	['issue_comment_ticket_reports_added',`New reports added to OTRS ticket: \${ticket.url}`,"Issue comment about reports added to an existing ticket"],
	"Addition of OSM blocks to OTRS tickets",
	['article_subject_block',`Block of user "\${user.name}"`,"Subject template for user block"],
	['article_subject_block_zero',`0-hour block of user "\${user.name}"`,"Subject template for 0-hour user block"],
	['article_body_block',`<p><a href='\${block.url}'>Block #\${block.id}</a> of user <a href='\${user.url}'>\${user.name}</a></p>`,"Body template for user block",{note:"HTML"}],
	['article_input_action',`DynamicField_DWGAction`,"Name of 'DWG action' free field input",{note:"has to be a multiple select with one of the options containing a 'block' substring"}],
	"Addition of OSM messages to OTRS tickets",
	['article_message_to_subject',`PM to \${user.name}`,"Ticket subject template for outbound message"], // TODO article_message_to_subject -> article_subject_message_to
	['article_message_from_subject',`PM from \${user.name}`,"Ticket subject template for inbound message"],
	"Quick messages from OSM issues",
	['issue_message_subject',`reported issue`,"Subject template for generic reported item"],
	['issue_message_subject_user',`reported user "\${user.name}"`,"Subject template for reported user"],
	['issue_message_subject_note',`reported note #\${note.id}`,"Subject template for reported note"],
	['issue_message_body_item',`[Item](\${item.url})`,"Body reported item template when item type unknown",{note:"kramdown"}],
	['issue_message_body_item_user',`User [\${user.name}](\${user.url})`,"Body reported item template when item is a user",{note:"kramdown"}],
	['issue_message_body_item_note',`Note [#\${note.id}](\${note.url})`,"Body reported item template when item is a note",{note:"kramdown"}],
	['issue_comment_message_sent',`OSM message sent to user <a href='\${user.url}'>\${user.name}</a>`,"Issue comment about quick messages sent to users",{note:"HTML"}], // TODO kramdown
]
