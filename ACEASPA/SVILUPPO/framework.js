let contactSearchCallback, platformClient, authToken, userId, employeeId, interactionId, pollingInterval, officialName,
	interactionsMap = {},
	cachedUrl = {},
	queues = [],
	queuesById = {},
	myQueuesById = {},
	allowedTransfer = {},
	evt = 'notset',
	recordEnable = false,
	transferEnable = false,
	dialpadEnable = false,
	npsEnable = false,
	enableCustomLogs = false,
	scheduleCallbackPermission = false,
	mappingGroupsTable = 'd4acb78b-5f94-4e98-9943-07d7aa981fb0',
	organizationIdExternalContact = {
		'42312a91-a35b-4e97-b079-c92f60ace1a1': '43103919-3ecf-46db-9c6f-345d85422b07', // collaudo gori
		'3eba5d1b-7977-4362-86ab-a18ba2e554b6': '43103919-3ecf-46db-9c6f-345d85422b07', // sviluppo vecchio
		'3d608434-3e2c-49c6-99ca-cc83df14e4ad': '43103919-3ecf-46db-9c6f-345d85422b07', // sviluppo
		'e089fe67-d56e-4c3b-84dd-3c86396fc51c': '43103919-3ecf-46db-9c6f-345d85422b07', // produzione gori
		'c06e9463-4852-45cc-a8f3-6601d4f970af': '0e4f2883-a0fa-4a89-848d-661fa687fac8', // collaudo areti
		'07812cbb-b0cb-4237-a6dc-85d7dd5924e5': '0e4f2883-a0fa-4a89-848d-661fa687fac8', // produzione areti
	},
	regexVoicemailEvent = new RegExp('v2\.users\..+?\.voicemail\.messages'),
	regexRoutingStatusEvent = new RegExp('v2\.users\..+?\.routingStatus'),
	groups = [],
	allowedStatus = [],
	presenceDefinitions = {},
	seenInteractions = {},
	externalContacts = [],
	allowedDivisionsExternalContact = [
		'42312a91-a35b-4e97-b079-c92f60ace1a1', // collaudo gori
		'3eba5d1b-7977-4362-86ab-a18ba2e554b6', // sviluppo vecchio
		'3d608434-3e2c-49c6-99ca-cc83df14e4ad', // sviluppo 
		'e089fe67-d56e-4c3b-84dd-3c86396fc51c', // produzione gori
		'c06e9463-4852-45cc-a8f3-6601d4f970af', // collaudo areti
		'07812cbb-b0cb-4237-a6dc-85d7dd5924e5'  // produzione areti
	],
	canSeeExternalContact = false,
	sourceCtx = null,
	canSeeQueue = false,
	onHoldMusicUrl = 'https://elasticbeanstalk-eu-west-1-552944278708.s3.eu-west-1.amazonaws.com/on_hold_music.mp3',
	onHoldMusicBuffer = null,
	queueTenant = null,
	buttonCrmSalesforce = false,
	userdivision = null,
	org = 'acea',
	version = `1.0.27`,
	queueTenantDataTableId = 'fc1c4dab-463e-4429-b6cf-6d1bc5e6a0e4',
	divisions = {},
	canMakeOutboundCalls = true,
	outboundDataTableId = 'ec7f9b28-d998-4267-b0d1-baed16070a76',
	groupNoOutbound = '5eee503a-49a5-46df-97a6-ac2ae9ec5d63',
	groupAddOutboundButton = '10cf2b8f-16c4-461b-bd00-708ea2f65584',
	canUseCustomOutboundButton = false,
	disableHistoryButtons = false;
    serviceNamesToBeRemovedTable = 'b370d220-4cbb-48eb-b89d-989298ad038f',
	serviceNamesToBeRemoved = new Set(),
	audioCtx = new (window.AudioContext || window.webkitAudioContext || window.audioContext),
	// FourProodosLoginUrl             = 'https://devapiacea.4proodos.net/public/login2',
	// FourProodosLoginUrl             = 'https://stageapiacea.4proodos.net/public/login2',
	FourProodosLoginUrl = 'https://apiacea.4proodos.net/public/login2',
	//FourProodosQueueUrl             = 'https://devapiacea.4proodos.net/protected/getQueues';
	// FourProodosQueueUrl             = 'https://stageapiacea.4proodos.net/protected/getQueues';
	FourProodosQueueUrl = 'https://apiacea.4proodos.net/protected/getQueues';



function loadJS(FILE_URL, async = true) {
	let scriptEle = document.createElement("script");

	scriptEle.setAttribute("src", FILE_URL);
	scriptEle.setAttribute("type", "text/javascript");
	scriptEle.setAttribute("async", async);

	document.body.appendChild(scriptEle);

	// success event 
	scriptEle.addEventListener("load", () => {
		console.log("File loaded")
	});
	// error event
	scriptEle.addEventListener("error", (ev) => {
		console.log("Error on loading file", ev);
	});
}


class Interaction {
	constructor(id) {
		this.id = id;
		this.startTime = new Date();
		this.ended = false;
	}

	endInteraction() {
		if (this.ended) {
			return;
		}
		console.log(`Ending interaction ${this.id}`);
		this.endTime = new Date();
		this.ended = true;
	}

	getElapsedSeconds() {
		return {
			time: (this.endTime - this.startTime) / 1000,
			startTime: this.startTime.toISOString(),
			endTime: this.endTime.toISOString()
		}
	}
}

function addInteraction(id) {
	let interaction = new Interaction(id);
	interactionsMap[id] = interaction;
	return interaction;
}




/*function deleteAllCookies() {
	let cookies = document.cookie.split(";");
  
	for (let i = 0; i < cookies.length; i++) {
	  let cookie = cookies[i];
	  let eqPos = cookie.indexOf("=");
	  let name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
	  document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
	}
  }
  
function logout() {
	deleteAllCookies();
	window.location = "https://login.mypurecloud.de/logout";
  }	 */

function endInteraction(id) {
	let interaction = interactionsMap[id];
	if (interaction) {
		interaction.endInteraction();
		return interaction.getElapsedSeconds();
	}
}








function play(audioBuffer) {
	const source = audioCtx.createBufferSource();
	try {
		sourceCtx.stop();
	} catch (e) {
		console.log(e);
	}
	sourceCtx = source
	source.buffer = audioBuffer;
	source.connect(audioCtx.destination);
	source.start();
}

//TODO: create class to store all purecloud functions used
function getConversation(conversationId) {
	let api = new platformClient.ConversationsApi();
	return api.getConversation(conversationId)
}

function setNPS() {
	getParticipant(interactionId, 'agent').then(participant => {
		console.log('participant riga 1442', participant);
		toggleNPS(true);
		npsEnable = true;
		let npsBtn = $('.nps');
		console.log('nps', npsBtn)
		npsBtn.unbind('click');
		npsBtn.click(() => {
			console.log('riga 1638', ($('.consult-participants-container')))
			if ($('.consult-participants-container').is(':visible')) {
				return $('gef-disconnect-control').first().click();
			}
			// tagNodes('nps', interaction)
			replaceParticipant(interactionId, participant.id, flowNPS,)
		});
	}).catch(err => {
		console.log('There was a failure calling getConversation');
		console.error(err);
	});
}


async function postData(url = '', data = {}) {
	const response = await fetch(url, {
		method: 'POST',
		mode: 'cors',
		cache: 'no-cache',
		credentials: 'same-origin',
		headers: { 'Content-Type': 'application/json' },
		redirect: 'follow',
		referrerPolicy: 'no-referrer',
		body: JSON.stringify(data)
	});
	return response.json();
}

function log(message, title = 'Log', type = 'Info') {
	if (enableCustomLogs) {
		console.log(`%c${title}`, 'background: yellow; color: black; font-size: 30px');
		console.log(`${type}: `, message);
	}
}




const toggleCustomLogs = () => {
	enableCustomLogs = !enableCustomLogs;
	return enableCustomLogs ? 'Log per debug Abilitati' : 'Log per debug Disabilitati';
}
const DpLogo = () => 'https://www.technevalue.com/Logos/logo_dp_techne.png';

function setPlatform() {
	platformClient = require('platformClient');
	window.PureCloud.User.getAuthToken(function (token) {
		//console.log('TOKEN: ', token);
		authToken = token;
		const client = platformClient.ApiClient.instance;
		client.setAccessToken(token);
		client.setEnvironment('mypurecloud.de');

		getUserId().then(getPresenceDefinitions).then(() => {
			getDataTable(serviceNamesToBeRemovedTable).then((data) => {
				data.entities.forEach(r => {
					let temp = r['Wrapup Prefix to hide'].split(',').map(e => e.trim()).filter(e => !!e)
					temp.forEach(n => serviceNamesToBeRemoved.add(n.toLowerCase()))
				})
			})
			getDataTable(mappingGroupsTable).then(data => {
				allowedStatus = data.entities &&
					data.entities.filter(s => groups.includes(s['Gruppo ID'])).map(s => s['Stato ID'])
				log(allowedStatus.join(', '), 'GROUP TABLE')
			})
		});
		updateQueuesList();
	});
}


function getPresenceDefinitions() {
	let apiInstance = new platformClient.PresenceApi();
	return apiInstance.getPresencedefinitions({ pageNumber: 1, pageSize: 1000 })
		.then((data) => {
			data.entities.forEach(entity => {
				presenceDefinitions[entity.id] = entity.languageLabels['it']
			})
		})
		.catch((err) => {
			console.log('There was a failure calling getPresencedefinitions');
			console.error(err);
		});
}

function getUserId() {
	let apiInstance = new platformClient.UsersApi();
	return apiInstance
		.getUsersMe({ expand: ['groups', 'employerInfo'] })
		.then(async (data) => {
			let queueTenantTable = await getDataTable(queueTenantDataTableId);
			for (let e of queueTenantTable.entities) {
				divisions[e['key']] = e['TENANT_4P']
			}
			queueTenant = divisions[data.division.id]
			console.log('riga210', queueTenant)
			// Mostrare External Contact e Queue
			userdivision = data.division.id
			console.log('division', data.division.id)
			if (allowedDivisionsExternalContact.includes(data.division.id)) {
				canSeeExternalContact = true
				$('.contactIcon').show()
			}
			if (queueTenant) {
				canSeeQueue = true
				$('.queueIcon').show()
			}
			userId = data.id;
			employeeId = data.employerInfo?.employeeId
			officialName = data.employerInfo?.officialName
			globalUsername = data.name;
			groups = data.groups && data.groups.map(g => g.id);

			if (groups.includes(groupNoOutbound)) {
				canMakeOutboundCalls = false;
			}

			if (groups.includes(groupAddOutboundButton)) {
				canUseCustomOutboundButton = true;
				console.log('custom outbound button', canUseCustomOutboundButton)
			}
			subscribeWebsocket();
		})
		.catch((err) => {
			console.log('There was a failure calling getUsersMe');
			console.error(err);
		});
}

function getDataTable(datatableId) {
	let apiInstance = new platformClient.ArchitectApi();
	let opts = { pageNumber: 1, pageSize: 10000, showbrief: false };
	return apiInstance.getFlowsDatatableRows(datatableId, opts)
}

function setCookie(cname, cvalue, exdays) {
	let d = new Date();
	d.setTime(d.getTime() + exdays * 60 * 60 * 1000);
	let expires = 'expires=' + d.toUTCString();
	document.cookie = cname + '=' + cvalue.toString() + ';' + expires + ';path=/';
}

function openTab(url) {
	if (url.length) {
		window.open(url);
	}
}

function params() {
	return new URL(window.location.href).searchParams;
}

if (!params().get('enableFrameworkClientId')) {
	window.location = window.location.href + '&enableFrameworkClientId=true';
}
let scriptJquery = document.createElement('script');
scriptJquery.src = 'https://code.jquery.com/jquery-3.5.0.min.js';

scriptJquery.type = 'text/javascript';
scriptJquery.onload = function () {
	let stand_alone = params().get('standalone') === 'true';
	console.warn('#########################');
	if (stand_alone) {
	} else {
		$(document).ready(function () {
			$('img[alt="Genesys Cloud Logo"]')
				.attr('src', `${DpLogo()}`)
				.css('zoom', '100%')
				.css('opacity', '0.8')
				.css('cursor', 'auto');

		});
	}
};
let sdkJS = document.createElement('script');
sdkJS.src = 'https://sdk-cdn.mypurecloud.com/javascript/110.0.0/purecloud-platform-client-v2.min.js';

sdkJS.onload = () => {
	//console.log('loaded');
	setPlatform();
};
let styleRecordings = document.createElement('style');
styleRecordings.innerHTML = `
  .list-record, .contact-record {
    cursor:pointer;
    margin: 0;
    border-bottom: 1px solid #bbb;
    border-right: 1px solid #bbb;
    padding: 5px;
    font-size: 14px;
  }
  .contact-record {
  	display: flex;
  	justify-content: space-between;
    align-items: center;
  }
  .contact-record > div {
  	width: 20vw;
    max-width: 240px;
  }
  .contact-record > div > p {
  	margin: 0
  }
  
  #addContactForm {
  	font-size:medium
  }
  
  .addContactInModal {
  	z-index: 100;
  }
  .addContactInModal > div {
  	border: 0;
  }
  
  .external-contacts-wrapper div > .btn,
  .addContactInModal div > .btn
   {
    border: 0;
    border-radius: 4px;
    padding: 6px 20px;
    color: white;
    font-weight: bold;
    background: #76bd76;
    float: right;
    margin-right: 16px;
  }
  
  
  .deleteModalConfirm > div > .btn {
 		float:none;
  }
  
   .external-contacts-wrapper div > .btn.clean,
   .addContactInModal div > .btn.clean {
   	background: #48a3e0;
   }
  
  #addContactForm > div > .btn.danger {
    background: #f55454;
  }
  .contact-record > div > .btn.danger {
    background: #f55454;
  }
  .deleteModalConfirm > div > .btn.danger {
    background: #f55454;
  }

  .ellipsis {
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
  }

  .list-record:hover, .contact-record:hover {
    background-color: #dedede;
  }

  .list-time {
    font-size:10px;
    color:#777
  }

  .rec-list, .transfer-list, .contact-list {
    overflow-y: scroll;
    height: 100%;
    list-style: none;
  }
  
  #queueReportContainer {
  	overflow:scroll
  }

  #queueReport th {
	position: fixed;
  }

  #queueReport > tbody > tr:first-child {
	position: sticky;
    border-bottom: 1px solid black;
    background: white;
    top: 0px
  }


  #queueReport td {
  	border-bottom: 1px solid #ddd;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: larger;
		padding: 10px;
		text-align: left;
	}

  .recordings-wrapper,.transfer-wrapper, .external-contacts-wrapper, .queue-report-wrapper {
    background: white;
    z-index: 99;
    display: flex;
    flex-direction: column;
    position: fixed;
    right: 10px;
    top: 170px;
    border: 1px solid #bbb;
  }
  
  .input-contact {
    display: flex;
    flex-direction: column;
    width: auto;
	}
	
	
  .input-contact > input, #contactSearchInput {
  	margin-bottom: 20px;
    border: 0;
    border-bottom: 1px solid grey;
    text-align: center;
  }
  
  .input-contact > input:focus, #contactSearchInput:focus {
    outline: none;
    border-bottom: 1px solid #48a3e0;
  }
  
  .recordings-wrapper,.transfer-wrapper {
		width: 200px;
    height: 300px;
  }
  
  .external-contacts-wrapper, .queue-report-wrapper {
		width: 70vw;
    height: fit-content;
    max-height: 75vh;
    max-width: 750px;
  }
  
  .addContactInModal, .deleteModalConfirm {
    display: block;
    position: absolute;
    background: white;
    text-align: center;
    padding: 0 20px 20px 20px;
    max-width: 50%;
    border: 1px solid grey;
    top: 50%;
    left: 50%;
    margin-right: -50%;
    transform: translate(-50%, -50%)
  }
  
  .hidden {
    display: none;
  }

  .link {
    color: #337ab7;
    text-decoration: underline;
  }

  .modal-header-btn > i {
    color:white!important;
    margin: 5px;
  }

  .modal-header-btn {
    background: #48a3e0;
    border: 0;
    padding: 4px;
    float: right;
    cursor:pointer;
  }

  .modal-header-btn.modal-close {
      background: #e04d4d;
  }
  
  .text-header-contact {
   	color: white;
   	font-size: medium;
   }
  
  .list-header-recording {
    display:flex;
    justify-content:space-between;
    border-bottom: 1px solid #bbb;
    align-items: center;
  }
  
  .search-contact {
  	font-size: medium;
  	padding: 15px 24px 0 12px;
  	border-bottom: 1px solid #bbb;
    display: flex;
    flex-direction: column;
  }
  
  .search-contact-form {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }
  
  .pagination-container {
    display: flex;
    justify-content: space-between;
  }
  .pagination-container > div > i {
    padding: 10px;
  }
  
  .info-pagination {
    font-size: medium;
    padding: 12px;
  }

  .ml-8 {
    margin:0 0 0 8px!important;
  }
  
  .m-6-8 {
    margin:6px 8px!important;
  }
  
  #modalTitle {
   margin: 20px 0 30px 0;
  }
  
  .queues>a {
    color: transparent!important;
    cursor: auto;
  }
  .string-added-to-interaction.found {
  	font-size: medium;
  }
  .string-added-to-interaction > button {
    padding: 6px 12px;
    color: white;
    background: #0081d0;
    border-radius: 6px;
    border: 0;
  }
  
  .error-input {
      background: red;
    color: white;
    width: fit-content;
    padding: 2px 10px;
    align-self: center;
    border-radius: 4px;
    transform: translateY(-19px);
    border: 0px solid;
  }
  
  .copy-from-interaction {
    color: black;
    background: #b5b5b5;
    padding: 4px;
    display: block;
    width: fit-content;
    cursor: pointer;
    border-radius: 4px;
  }
  
  .button-crm {
    font-weight: bold;
    height: 22px;
    background: #FFFFFF;
    border: 1px solid #e7e7e7;
    border-radius:4px;
    border-color: #ccc;
    display: inline-block;
    margin-top: 2px
}

.button-outbound {
    font-weight: bold;
    height: 22px;
    background: #FFFFFF;
    border: 1px solid #e7e7e7;
    border-radius:4px;
    border-color: #ccc;
    display: inline-block;
    margin-top: 10px
}


.versioning {
	display: grid;
	align-items: center;
	justify-content: center;
	font-weight: bold;
	font-size: 16px;
	color: white;
}
`;
let scriptsToLoad = [scriptJquery, sdkJS, styleRecordings];

function recCall(conversationId, status) {
	let api = new platformClient.ConversationsApi();
	api.getConversation(conversationId)
		.then((data) => {
			let participant;
			data.participants.forEach(p => {
				if (p.purpose === 'agent') participant = p;
			})
			api.patchConversationParticipant(conversationId, participant.id, { recording: status })
				.then(() => status ? startRec(conversationId) : stopRec(conversationId))
				.catch((err) => console.error('err PATCH:' + JSON.stringify(err)));
		})
		.catch((err) => {
			console.log('There was a failure calling getConversation');
			console.error(err);
		});
}

function updateRegistrationList(data) {
	console.log(data.sharingUri);
	if (!cachedUrl[data.id]) {
		cachedUrl[data.id] = data.sharingUri;
	}
}

async function retrieveUserRegistration() {
	let apiInstance = new platformClient.UserRecordingsApi();
	let opts = {
		pageSize: 100, // Number | Page size
		pageNumber: 1, // Number | Page number
		expand: ['conversation'] // [String] | Which fields, if any, to expand.
	};
	return apiInstance
		.getUserrecordings(opts)
		.then((data) => {
			let recordings = data.entities.map((r) => {
				return {
					id: r.id,
					date: moment(r.dateCreated).format('DD/MM/YYYY HH:mm'),
					duration: Math.floor(r.durationMilliseconds / 1000),
					number: r.conversation.participants.find(p => p.purpose !== 'user').address
				};
			});
			mapAllInfoOfRecordings(recordings).then((infoRecordings) => {
				log(infoRecordings, 'infoRecordings');
				$('.rec-list').empty();
				infoRecordings.forEach((r, i) =>
					appendAnchorToList({ ...r, index: i })
				);
			});
			//for (i = 0; i < recordings.length; i++) {
			//  infoRecordings.push(await getURLRecording({...recordings[i], index: i}));
			//}
		})
		.catch((err) => {
			console.log('There was a failure calling getUserrecordings');
			console.error(err);
		});
}

async function mapAllInfoOfRecordings(recordings) {
	let apiInstance = new platformClient.ContentManagementApi();
	let sharingUrls = recordings.map((record) => {
		return new Promise((resolve) => {
			let documentId = record.id; // String | Document ID
			return apiInstance
				.getContentmanagementDocument(documentId, {})
				.then((data) => {
					cachedUrl[record.id] = data.sharingUri;
					record.sharingUri = data.sharingUri;
					resolve(data);
				})
				.catch((err) => {
					console.log('There was a failure calling getContentmanagementDocument');
					console.error(err);
				});
		});
	});
	return Promise.all(sharingUrls).then(() => recordings);
}

function appendAnchorToList(record) {
	$('.rec-list')
		.append(`<li><p class="list-record ellipsis link" onclick="copyToClipboard('${record.sharingUri}', 'Url copiato')">
  <span class="rec-index">${record.index + 1} - </span>${record.number}<br>
  <span class="list-time">${record.date} - ${record.duration}s</span></p></li>`);
}

function copyToClipboard(text, msg) {
	if (window.clipboardData && window.clipboardData.setData) {
		// Internet Explorer-specific code path to prevent textarea being shown while dialog is visible.
		snackbarAlert('Url copiato', 'info', 2000);
		return window.clipboardData.setData('Text', text);
	} else if (document.queryCommandSupported && document.queryCommandSupported('copy')) {
		let textarea = document.createElement('textarea');
		textarea.textContent = text;
		textarea.style.position = 'fixed'; // Prevent scrolling to bottom of page in Microsoft Edge.
		document.body.appendChild(textarea);
		textarea.select();
		try {
			snackbarAlert(msg, 'info', 2000);
			return document.execCommand('copy'); // Security exception may be thrown by some browsers.
		} catch (ex) {
			console.warn('Copy to clipboard failed.', ex);
			return false;
		} finally {
			document.body.removeChild(textarea);
		}
	}
}

function snackbarAlert(message, type, timeout) {
	let payload = { message, type, timeout };
	window.PureCloud.User.Notification.notifyUser(payload);
}

function hideInStatusMenu() {
	$('.btn-group')[1].__vue__.$parent.allStatuses.forEach(s => {
		//angular.element('#statusListArrow_test').scope().allStatuses.forEach(s => {
		if (s.subStatus && s.subStatus.length) {
			let substatuses = s.subStatus.filter(ss => allowedStatus.includes(ss.id))
			s.subStatus = substatuses.length ? substatuses : undefined
		}
	})
}

function addNoteToVoicemail(element, note = '') {
	element.find('.note-content').remove()
	if (note) {
		let notes = note.split('\n').filter(e => e);
		if (notes.length > 1) {
			if (notes[0].slice(10) === notes[1].slice(16)) {
				notes.pop()
			}
		}
		notes.forEach(note => {
			element.find('span.user-voicemail-data').eq(1)
				.after(`<span class="user-voicemail-data note-content ng-binding">${note}</span>`)
		})
	}
}

function replaceParticipant(conversationId, participantId, transferId) {
	let apiInstance = new platformClient.ConversationsApi();
	let body = { 'address': transferId };
	//console.log(conversationId, participantId)
	apiInstance.postConversationParticipantReplace(conversationId, participantId, body)
		.then(() => {
			console.log('postConversationParticipantReplace returned successfully.');
			toggleNPS(false);
		})
		.catch((err) => {
			console.log('There was a failure calling postConversationParticipantReplace');
			console.error(err);
		}).finally(() => {
			setTimeout(() => toggleNPS(false), 5000)
		});
}

function completeInfoVoicemail() {
	const voicemailItems = $('.user-voicemail-item')
	log(`searching... ${voicemailItems.length}`, 'voicemail', 'info')
	if (voicemailItems.length) {
		voicemailItems.each(function (index) {
			let v = angular.element('.user-voicemail-item').eq(index).scope().v
			addNoteToVoicemail($(this), v.note)
			$(this).find('[ng-click="toggleRead(v)"], .user-voicemail-data-block').click(function () {
				if (!angular.element($(this)).scope().v.read || $(this).hasClass('user-voicemail-data-block')) {
					addNote(v.id, v.note).then((voicemail) => {
						v.note = voicemail.note;
						addNoteToVoicemail($(this), voicemail.note)
					}).catch((err) => console.error(err));
				}
			})
		})
	} else {
		setTimeout(completeInfoVoicemail, 1000)
	}
}

function addNote(messageId, currNote) {
	let notes = currNote && currNote.split('\n') || [];
	let newNote = `Ultimo ascolto: ${globalUsername} il ${new Date().toLocaleString()}.`;
	if (notes.length > 0) {
		newNote = notes[0] + '\n' + newNote
	} else {
		newNote = `Aperta da ${globalUsername} il ${new Date().toLocaleString()}.` + '\n' + newNote
	}
	let apiInstance = new platformClient.VoicemailApi();
	let body = {
		'read': true,
		'deleted': false,
		'note': newNote
	}
	return apiInstance.putVoicemailMessage(messageId, body);
}

/// DEBUGGING FUNCTION
function removeNotes() {
	let apiInstance = new platformClient.VoicemailApi();
	let body = {
		'read': false,
		'deleted': false,
		'note': ''
	}
	$('.user-voicemail-item').each(function (index) {
		let v = angular.element($(this)).scope().v;
		apiInstance.putVoicemailMessage(v.id, body).then(() => {
			v.note = '';
			addNoteToVoicemail($(this), '')
		});
	});
}

function checkInteractionHasQueue() {
	let queueInput = $('.dial-queue-input')
	let addressInput = $('.target-address-input')
	let allowed = !!queueInput.val().length && queues.includes(queueInput.val()) && !!addressInput.val().length;
	allowed ? enableAddInteractionButton() : disableAddInteractionButton();
}

function disableAddInteractionButton() {
	$('.add-interaction-button').first().attr('disabled', 'disabled');
}

function enableAddInteractionButton() {
	$('.add-interaction-button').removeAttr('disabled');
}



function enableRec(conversationId) {
	log(undefined, 'enableRec');
	$('li[data-call-control="record"]').html(`
    <i class="fa fa-circle fa-lg" style="font-size: 23px;padding-top: 11px;color:white;cursor:pointer" tooltip-placement="bottom" tooltip-append-to-body="true"></i>
    `);
	let recIcons = $('li[data-call-control="record"] > i');
	recIcons.css('color', 'white');
	recIcons.css('cursor', 'pointer');
	recIcons.removeAttr('ng-click');
	// recIcons.removeAttr('disabled');
	recIcons.unbind('click');
	recIcons.click(e => recCall(conversationId, true, e));
}

function disableRec() {
	log(undefined, 'disableRec');
	let recIcons = $('li[data-call-control="record"] > i');
	recIcons.css('color', '#999');
	recIcons.css('cursor', 'default');
	recIcons.unbind('click');
}

function startRec(conversationId) {
	log(undefined, 'startRec');
	$('li[data-call-control="record"]').html(`
    <i class="fa fa-circle fa-lg" style="font-size: 23px;padding-top: 11px;color:white;cursor:pointer" tooltip-placement="bottom" tooltip-append-to-body="true"></i>
    `);
	let recIcons = $('li[data-call-control="record"] > i');
	recIcons.css('color', 'red');
	recIcons.unbind('click');
	recIcons.click(() =>
		recCall(conversationId, false)
	);
}

function stopRec(conversationId) {
	log(undefined, 'stopRec');
	let recIcons = $('li[data-call-control="record"] > i');
	recIcons.css('color', 'white');
	recIcons.unbind('click');
	recIcons.click(() =>
		recCall(conversationId, true)
	);
}

function toggleRecentRecordings() {
	let wrapper = $('.recordings-wrapper')
	wrapper.toggleClass('hidden');
	if (wrapper.is(':visible')) {
		retrieveUserRegistration();
	}
}

function toggleTransfer() {
	let wrapper = $('.transfer-wrapper')
	wrapper.toggleClass('hidden');
	if (wrapper.is(':visible')) {
		updateTransfer({ id: interactionId });
	}
}

function toggleAddContactModal() {
	if (!canSeeExternalContact) return
	let wrapper = $('.external-contacts-wrapper')
	wrapper.toggleClass('hidden');
	if (wrapper.is(':visible')) {
		if (!externalContacts.length)
			getExternalcontactsContacts().then(data => renderExternalContact(data));
	}
}

function handleResponseStatusAndContentType(response) {
	const contentType = response.headers.get('content-type');
	if (response.status === 401) throw new Error('Request was not authorized.');
	if (contentType === null) return Promise.resolve(null);
	else if (contentType.startsWith('application/json;')) return response.json();
	else if (contentType.startsWith('text/plain;')) return response.text();
	else if (contentType.startsWith('application/csv')) return response.text();
	else throw new Error(`Unsupported response content-type: ${contentType}`);
}

function toggleQueueReport() {
	if (!canSeeQueue) return
	let wrapper = $('.queue-report-wrapper')
	wrapper.toggleClass('hidden');
	if (wrapper.is(':visible')) {
		getQueueReport()
	}
}

function pollingOnQueues() {
	clearInterval(pollingInterval);
	console.log('riga 914', pollingInterval)
	pollingInterval = setInterval(getQueueReport, 3000)
}

function getQueueReport() {
	console.log('riga 918', canSeeQueue)
	if (!canSeeQueue) return
	let body = {
		username: 'dario.andreoli@technevalue.com',
		password: 'dario.andreoli'
	}
	postData(FourProodosLoginUrl, body).then(data => {
		if (!canSeeQueue) return
		console.log('riga925', queueTenant)
		fetch(FourProodosQueueUrl + '?Tenant=' + queueTenant, {
			crossDomain: true, // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
			'Accept': 'text/csv',
			'Content-Type': 'application/csv',
			headers: {
				'X-Auth': data.token,
				'Tenant': queueTenant // acea_areti / acea_gori,
			}
		}).then(res => handleResponseStatusAndContentType(res))
			.then(data => {
				renderQueueReport(data)
				pollingOnQueues();
			});
	})
	console.log('riga 941', 'arrivo qui')
}

function createTable(array) {
	let content = '';
	//let [title2] = array.split('\n').map(r => r.split(','))
	//console.log(`title2: ${title2}`);
	//title2.forEach(function (cell) {
	//	content += '<tr> <th>' + cell + '</th> </tr>';
	//()});
	content += '<tbody>';
	let [title, ...rest] = array.split('\n').map(r => r.split(','))
	rest.sort(function (a, b) {
		let nameA = queuesById[a[0]] ? queuesById[a[0]].toUpperCase() : a[0];
		let nameB = queuesById[b[0]] ? queuesById[b[0]].toUpperCase() : b[0];
		return nameA < nameB ? -1 : 1;
	})

	// Show only my queues 

	rest = rest.filter(r => myQueuesById[r[0]])
	let rows = [title, ...rest]
	rows.forEach(function (row) {
		content += '<tr>';
		row[0] = queuesById[row[0]] || row[0]
		row.forEach(function (cell) {
			content += '<td>' + cell + '</td>';
		});
		content += '</tr>';
	});
	if (!content.length) {
		content = '<tr><td>No data</td></tr>';
	}
	content += '</tbody>';
	$('#queueReport').html(content)
}

function renderQueueReport(data) {
	if (!canSeeQueue) return
	// let array = data.split('\n').map(r => r.split(','))
	createTable(data.trim())
}

function renderExternalContact(data) {
	if (!canSeeExternalContact) return
	externalContacts = mapExternalContacts(data.entities);
	let first = (data.pageSize * (data.pageNumber - 1)) + 1
	let last = Math.min((data.pageSize * data.pageNumber), data.total)
	$('#actualContacts').text(`${first} - ${last}`)
	$('#totalContacts').text(data.total)
	$('#contactsPageCount').val(data.pageCount)
	$('#contactsPageNumber').val(data.pageNumber)
	$('#contactsPageSize').val(data.pageSize)
	$('#contactsTotal').val(data.total)
	console.log(`getExternalcontactsContacts success! data: ${data.entities.length}`);
	console.log(`externalContacts found: ${externalContacts.length}`);
	$('.contact-list').empty();
	if (externalContacts.length) {
		for (let i = 0; i < externalContacts.length; i++) {
			$('.contact-list')
				.append(`
		<li class="contact-record" style="" id="${externalContacts[i].id}">
  	<div>
			<p class="ellipsis">
				<span class="contact-index">${i + 1} - </span>${externalContacts[i].name}
			</p>
		</div>
		<div>
			<p class="ellipsis" onclick="copyToClipboard('${externalContacts[i].tel}', 'Numero copiato')">
			${externalContacts[i].tel}</p>
		</div>
		<div>
			<button class="btn danger" onclick="deleteContact(externalContacts[${i}])">Cancella</button>
			<button class="btn" onclick="editContact(externalContacts[${i}])">Modifica</button>
		</div>
  </li>`);
		}
	} else {
		$('.contact-list')
			.append(`
		<li class="contact-record" style="">
  	<div>
			<p class="ellipsis">
				Nessun Contatto Trovato
			</p>
		</div>
  </li>`);
	}
}

function subscribeWebsocket() {
	try {
		let apiInstance = new platformClient.NotificationsApi();
		let topics_array = [
			{ id: `v2.contentmanagement.workspaces.${userId}.documents` },
			{ id: `v2.users.${userId}.voicemail.messages` },
			{ id: `v2.users.${userId}.routingStatus` }
		];
		apiInstance.postNotificationsChannels().then(data => {
			apiInstance.postNotificationsChannelSubscriptions(data.id, topics_array);
			let websocket = new WebSocket(data.connectUri)
			websocket.onmessage = msg => websocketEvent(JSON.parse(msg.data))
		});
	} catch (ex) {
		console.error(ex);
	}
}

function websocketEvent(event) {
	if (event.eventBody.name === 'Recording' && event.metadata.action === 'create' && event.metadata.status ===
		'complete') {
		log(event, 'WEBSOCKET');
		if (!cachedUrl[event.eventBody.id])
			updateSharingUrl(event.eventBody.id).then((registration) => getSharingUrl(registration));
	}
	// Case change voicemail
	if (regexRoutingStatusEvent.test(event.topicName)) {
		if (event.eventBody.routingStatus?.status === 'IDLE') {
			updateInteractionStatus()
		}
	}
	if (regexVoicemailEvent.test(event.topicName)) {
		if (event.eventBody.action === 'note-modified') {
			$('.user-voicemail-item').each(function (index) {
				let v = angular.element($(this)).scope().v
				if (v.id === event.eventBody.id) {
					addNoteToVoicemail($(this), event.eventBody.note)
				}
			})
		}
	}
}

function getSharingUrl(registration) {
	if (!registration) {
		return;
	}
	let apiInstance = new platformClient.ContentManagementApi();
	let documentId = registration.id; // String | Document ID
	return apiInstance
		.getContentmanagementDocument(documentId, {})
		.then((data) => {
			if (!cachedUrl[data.id]) {
				let newWindow = window.open(
					'',
					`Registrazione`,
					'width=600,height=50,top=30,resizable=no'
				);
				newWindow.document.write(
					moment().format('DD-MM-YYYY HH:mm:ss') +
					': ' +
					data.sharingUri +
					'<br>'
				);
				let info = {
					audioFilePath: data.sharingUri,
					recType: 'test',
					endRec: moment(registration.dateCreated).add(registration.durationMilliseconds, 'ms').utc().format(),
					startRec: moment(registration.dateCreated).utc().format(),
					CallID: registration.conversation.id
				}
				if (true) {
					window.parent.postMessage(
						JSON.stringify({ type: 'newVoicemailRecorded', data: info }),
						'*');
				}
				updateRegistrationList(data);
			}
		})
		.catch((err) => {
			//console.log('There was a failure calling getContentmanagementDocument');
			console.error(err);
		});
}

function getUserRecording(recordingId) {
	let apiInstance = new platformClient.UserRecordingsApi();
	let opts = { expand: ['conversation'] };
	return apiInstance
		.getUserrecording(recordingId, opts)
		.then((data) => {
			//console.log(`getUserrecording success! data: ${JSON.stringify(data, null, 2)}`);
			return data;
		})
		.catch((err) => {
			console.log('There was a failure calling getUserrecording');
			console.error(err);
		});
}

function getConversationAttributes(id) {
	let apiInstance = new platformClient.ConversationsApi();
	return apiInstance.getConversation(id)
		.then((data) => {
			let participant =
				data?.participants.find((participant) => participant.purpose === 'customer') ||
				data?.participants.find((participant) => participant.purpose === 'external');
			return participant && participant.attributes;
		}).catch((err) => {
			console.log('There was a failure calling getConversation');
			console.error(err);
		});
}

async function updateSharingUrl(id) {
	let registration = await getUserRecording(id);
	let attributes = await getConversationAttributes(
		registration?.conversation.id
	);
	let groupId = attributes?.Id_Gruppo;
	if (!groupId) {
		return registration;
	}
	let apiInstance = new platformClient.ContentManagementApi();
	let body = {
		sharedEntityType: 'DOCUMENT',
		sharedEntity: {
			id: id
		},
		memberType: 'GROUP',
		member: {
			id: groupId
		}
	}; // Object | CreateShareRequest - entity id and type and a single member or list of members are required
	return apiInstance
		.postContentmanagementShares(body)
		.then(() => {
			log(undefined, 'postContentmanagementShares');
			return registration;
		})
		.catch((err) => {
			console.log('There was a failure calling postContentmanagementShares');
			console.error(err);
		});
}

function updateQueuesList(pageNumber) {
	let apiInstance = new platformClient.RoutingApi();
	let opts = {
		pageSize: 200, // Number | Page size
		pageNumber: pageNumber || 1, // Number | Page number
		sortBy: 'name' // String | Sort by
	};
	// console.log(opts)
	// get all queues
	apiInstance
		.getRoutingQueues(opts)
		.then((data) => {
			console.log(data)
			queues = queues.concat(data.entities.map((e) => e.name));
			data.entities.forEach((e) => {
				queuesById[e.id] = e.name
			});
			if (data.pageNumber < data.pageCount) {
				updateQueuesList(parseInt(data.pageNumber) + 1)
			}
		})
		.catch((err) => {
			console.log('There was a failure calling getRoutingQueues');
			console.error(err);
		});

	// get my queues
	apiInstance
		.getRoutingQueuesMe(opts)
		.then((data) => {
			console.log(data)
			data.entities.forEach((e) => {
				myQueuesById[e.id] = e.name
			});
			if (data.pageNumber < data.pageCount) {
				updateQueuesList(parseInt(data.pageNumber) + 1)
			}
		})
		.catch((err) => {
			console.log('There was a failure calling getRoutingQueues');
			console.error(err);
		});
}

function hideInBurgerMenu() {
	// Remove Genesys Cloud Button
	if (!scheduleCallbackPermission) {
		$('i.fa-calendar')
			.next(
				'span:contains(\'Agent Schedule\')',
				'span:contains(\'Pianificazione Agente\')'
			)
			.parent()
			.parent()
			.hide();
	}
	$('#navHelp').parent().hide();
	$('[ng-click="getHelpLink($event)"]').parent().remove();
	$('[ng-click="goToPureCloud()"]').parent().remove();


	console.log('Can Make Outbound Calls%c' + canMakeOutboundCalls, 'color: red; font-weight: bold; font-size: 2em;');
	console.log('Can Use Outbound Button%c' + canUseCustomOutboundButton, 'color: red; font-weight: bold; font-size: 2em;');

	if (!canMakeOutboundCalls) {
		$('[ng-click="goToDialpad()"]').parent().remove();
	} // da verificare angular
	if (canUseCustomOutboundButton === true && canMakeOutboundCalls === true) {
		$('.btn.btn-default.btn-xs').css('display', 'none');
	}
	$('#navCallLog').parent().hide();
	$('.dropdown-toggle').not('#statusListArrow_test').unbind('click').click(hideInBurgerMenu);
	$('[ng-click="goToMore($event)"]').unbind('click').click(hideInBurgerMenu); //da verificare angular
	$('li[ng-if="navCategory == \'more\'"] > a').first().unbind('click').click(hideInBurgerMenu); // da verificare angular
}

function completeCallHistoryWithId(count = 0) {
	setTimeout(() => {


		if ($('div.call-history-ui')[0].__vue__.callHistory.length) {
			$('div.call-history-ui')[0].__vue__.callHistory.forEach(function (i, index) {
				let scope = i;
				let callid = scope.call.id;
				$('.call-history-item').eq(index).attr('callid', callid);
			})
			if ($('.call-history-item').length > 0) {
				$('.call-history-item').each(function (index) {
					let id = $(this).attr("callid");
	
					if (canUseCustomOutboundButton === true && canMakeOutboundCalls === true) {
						$('.btn.btn-default.btn-xs').css('display', 'none')
					}
					if (canUseCustomOutboundButton === true && id && !$(this).find('#OutboundButton').length) {
						addOutboundButton($(this), id);
					}
					console.log('id e crm prima dell if', id, $('.call-history-item').find('#crmButton'))
	
					if (id && !$(this).find('#crmButton').length) {
						console.log('id e crm', id, $('.call-history-item').find('#crmButton'))
						completeCallHistoryWithGoToCRMButton($(this), id);
					}
	
					if (!$(this).find('.interaction-id').length) {
						$(this).find('.call-history-content').append(`<span class='copy-from-interaction interaction-id' onclick="copyToClipboard('${id}', 'Valore copiato')">${id}\n</span>`)
					}
					$('.call-history-item').find('.call-history-address > bdi').addClass('copy-from-interaction').click(function () {
						copyToClipboard(this.innerText, 'Valore copiato')
					})
				})
			} else if (count < 10) {
				setTimeout(() => completeCallHistoryWithId(count + 1), 500)
			}
		}
		else {
			setTimeout(1000)
			console.log('non pronti i dati')
			disableHistoryButtons = true;
		}


		

	}, 500)
}


async function addOutboundButton(element, id) {
	let outboundTenantTable = await getDataTable(outboundDataTableId);
	getParticipant(id, 'customer').then(async data => {

		console.log('riga 1277', data);
		let queueOutbound = data.queueId;
		for (let e of outboundTenantTable.entities) {
			if (e['key'] === data.queueName) {
				queueOutbound = e['CodaOutboundID']
				console.log('trovata coda in tabella', queueOutbound)
			}

		}
		try {
			element.find('.call-history-actions').append(`<input type="button" id="OutboundButton" class="button-outbound" title="Make a Call" value="CALL" onclick="window.PureCloud.clickToDial ({
				number:  '${data.address}',
				type: 'call',
				autoPlace: true,
				queueId: '${queueOutbound}'
			});" />`)
		} catch (ex) {
			console.error('riga 1283', ex);
		}
	})
}


function completeCallHistoryWithGoToCRMButton(element, id) {
	// console.log(element, id)
	// let id = scope.data.call.id
	getParticipant(id, 'customer').then(data => {
		let crmUrl = data?.attributes?.crm_urlpop;
		let crmSalesforceUrl = data?.attributes?.link_creazioneCaseSFDC;
		console.log('crmUrl', crmUrl, crmSalesforceUrl)
		if (crmUrl && !crmSalesforceUrl) {
			element.find('.call-history-actions').append(`<input type="button" id="crmButton" class="button-crm" title="Vai a CRM" value="CRM" onclick="openTab('${crmUrl}')" />`)
			// element.find('#crmButton').addClass('button-crm')
		}
		if (crmSalesforceUrl) {
			element.find('.call-history-actions').append(`<input type="button" id="crmButton" class="button-crm" title="Vai a CRM" value="CRM" onclick="openTab('${crmSalesforceUrl}')" />`)
			// element.find('#crmButton').addClass('button-crm')
		}
		crmButton = true;
	})
}

function addCheckOnList() {
	$('.dropdown-menu>li').click(checkInteractionHasQueue);
}

function updateInteraction(status) {
	if (!interactionId) return;
	let payload = {
		action: status,
		id: interactionId
	};
	window.PureCloud.Interaction.updateState(payload);
}

function changeStatus(status) {
	payload = { id: status };
	window.PureCloud.User.updateStatus(payload);
}

function addStringToInteraction(id, string, count) {
	if (seenInteractions[id]) return;
	if (!count) count = 1
	if (count > 10) return;
	let interactionId = id && id.split('_')[0]
	let interactionDiv = getInteractionDiv(interactionId)
	if (!interactionDiv) {
		setTimeout(() => addStringToInteraction(id, string, (count + 1)), 500)
		return
	}
	string.split(';').forEach(e => {
		interactionDiv.find('span.call-queuename>span').first().after(`<span class='copy-from-interaction' onclick="copyToClipboard('${e}', 'Valore copiato')">${e}</span>`)
	})
	interactionDiv.find('span.interaction-data:nth-child(3)>span')
		.click(function () {
			copyToClipboard(this.innerText, 'Valore copiato')
		})
	interactionDiv.find('span.interaction-data:nth-child(3)>span').addClass('copy-from-interaction')
	seenInteractions[id] = true;
}

function searchExternalContact(interaction, count) {
	if (!canSeeExternalContact) return
	if (!count) count = 1
	if (count > 10) return;
	let id = interaction.id
	let interactionDiv = getInteractionDiv(id)
	if (!interactionDiv) {
		return setTimeout(() => searchExternalContact(interaction, (count + 1)), 500)
	}
	getExternalcontactsContacts(interaction.ani).then(data => {
		if (data.entities.length) {
			let contact = data.entities[0]
			let fullname = [contact.firstName, contact.middleName, contact.lastName].join(' ')
			$('.string-added-to-interaction').remove()
			interactionDiv.find('span.call-state>span').first().after(`<br><span class="string-added-to-interaction found">
				${fullname}\n
			</span>`)
		} else {
			interactionDiv.find('span.call-state>span').first().after(`<br><span class="string-added-to-interaction">
				<button onclick="addInteractionNumberToExternalContact('${interaction.ani}')">
				Aggiungi A Rubrica <i class="fa fa-user-plus"></i>
			</span>`)
		}
	})
}

function addInteractionNumberToExternalContact(tel) {
	if (tel)
		addContact({ tel })
}

function toggleNPS(activate) {
	if (activate) {
		$('i.icon-hangup.nps').show();
		$('.hungup').hide();
	} else {
		$('i.icon-hangup.nps').hide();
		$('.hungup').show();
	}
}

function blockQueues(cq, cw) {
	let countQueue = cq || 0;
	let countWatermark = cw || 0;
	let queueScope = $('.purecloud-queues-ui')[0].__vue__._setupState
	let watermarkScope = $('#interactionList')[0].__vue__.$parent

	if (watermarkScope) {
		watermarkScope.doubleClickToInteract = function () {
		}
		watermarkScope.goToPureCloud = function () {
		}
	} else if (countWatermark < 10) {
		setTimeout(() => blockQueues(countQueue, countWatermark + 1), 1000)
	}


	if (queueScope) {
		queueScope.deactivateQueue = function () {
		}
		queueScope.activateQueue = function () {
		}
	} else if (countQueue < 10) {
		setTimeout(() => blockQueues(countQueue + 1, countWatermark), 1000)
	}
}

let changes = 0
//CSS value for font-size
let size = ['smaller', 'small', 'medium', 'large', 'x-large']

function fontSize(bigger) {
	let selectors = ['span.interaction-data.interaction-name > span', '.interaction-data', '.string-added-to-interaction']
	// 'changes' checks if is value from array is out of bound
	if (bigger) {
		if (changes >= 2) return
		changes++;
		for (let i = 0; i < selectors.length; i++) {
			changeStylesheetRule(selectors[i], 'font-size', `${size[changes + 2]}!important`);
		}
	} else {
		if (changes <= -2) return
		changes--;
		for (let i = 0; i < selectors.length; i++) {
			changeStylesheetRule(selectors[i], 'font-size', `${size[changes + 2]}!important`);
		}
	}
}

function startingSetup() {
	loadJS("https://ajax.googleapis.com/ajax/libs/angularjs/1.5.6/angular.js", true);
	$('.target-address-input, .dial-queue-input').on('input', () => {
		checkInteractionHasQueue();
		setTimeout(addCheckOnList, 500);
	});
	$('.dropdown-menu[role="listbox"]').click(checkInteractionHasQueue);
	blockQueues();
	completeCallHistoryWithId();
	// Remove Genesys Cloud Button
	$('.dropdown-toggle').not('#statusListArrow_test').unbind('click').click(hideInBurgerMenu);
	$('[ng-click="goToMore($event)"]').unbind('click').click(hideInBurgerMenu); // da vedere angular
	$('li[ng-if="navCategory == \'more\'"]').first().unbind('click').click(hideInBurgerMenu); // da vedere angular

	$('#navUserInbox').click(function () { completeCallHistoryWithId(); });
	//setTimeout(completeCallHistoryWithId(), 2000);	 
	$('#statusListArrow_test').unbind('click').click(hideInStatusMenu);
	$('[ng-click="returnToStatusMenu($event)"]').unbind('click').click(hideInStatusMenu); // da vedere angular
	$('[ng-click="statusDropDownClicked()"]>li').unbind('click').click(hideInStatusMenu); // da vedere angular
	// Add Versioning after element
	$('.btn-group.top-btn.pull-left.dropdown').after(`<div class="versioning">Version: ${version}</div>`);
	// Add NPS button
	//let hungupBtn = $('[ng-click="disconnect()"]')
	let hungupBtn = $('gef-disconnect-control');
	//$('[ng-if="s.isWrapupRequired"]').click(mapWrapupCodes)
	hungupBtn.addClass('hungup');
	hungupBtn.after(`
	<i class="icon-hangup nps" style="display: none; font-size: 23px;position:absolute;margin: 6px 12px;color:white;cursor:pointer"></i>"
            tooltip-placement="bottom" tooltip-append-to-body="true" uib-tooltip="Disconnetti"`);
	// Add Registrazioni dialog
	log(undefined, 'enableRec');
	// sostituire pulsante recording
	$('li[data-call-control="record"]').html(`
		<i class="fa fa-circle fa-lg" style="font-size: 23px;padding-top: 11px;color:white;cursor:pointer" tooltip-placement="bottom" tooltip-append-to-body="true"></i>
	`);
	$(
		'.interaction-call-control-container > .call-control-list > [data-call-control="record"]'
	).after(`
						<li style="order: 11; display: block;" data-call-control="flag" onclick="toggleRecentRecordings()">
							<i class="fa fa-headphones fa-lg" uib-tooltip="Lista Registrazioni" style="font-size: 23px;padding-top: 11px;color:white;cursor:pointer"
								tooltip-placement="bottom" tooltip-append-to-body="true"></i>
						</li>
            <li style="order: 11; display: none;" data-call-control="flag" onclick="toggleTransfer()">
              <i class="fa fa-arrow-right fa-lg" style="font-size: 23px;padding-top: 11px;color:white;cursor:pointer"
                tooltip-placement="bottom" tooltip-append-to-body="true"></i>
            </li>
            <li style="order: 11; display: ${canSeeExternalContact ? 'block' : 'none'};" data-call-control="flag" class="contactIcon" onclick="toggleAddContactModal()">
              <i class="fa fa-address-card fa-lg" uib-tooltip="Lista Contatti" style="font-size: 23px;padding-top: 11px;color:white;cursor:pointer"
                tooltip-placement="bottom" tooltip-append-to-body="true"></i>
            </li>
            <li style="order: 11; display: ${canSeeQueue ? 'block' : 'none'};" data-call-control="flag" class="queueIcon" onclick="toggleQueueReport()">
              <i class="fa fa-users fa-lg" uib-tooltip="Queue Report" style="font-size: 23px;padding-top: 11px;color:white;cursor:pointer"
                tooltip-placement="bottom" tooltip-append-to-body="true"></i>
            </li>
            <li style="order: 12; display: block;" data-call-control="flag" onclick="fontSize(false)">
              <i class="fa fa-search-minus fa-lg change-font-btn" uib-tooltip="Diminuisci Grandezza Caratteri" style="font-size: 23px;padding-top: 11px;color:white;cursor:pointer"
                tooltip-placement="bottom" tooltip-append-to-body="true"></i>
            </li>
            <li style="order: 13; display: block;" data-call-control="flag" onclick="fontSize(true)">
              <i class="fa fa-search-plus fa-lg change-font-btn" uib-tooltip="Aumenta Grandezza Caratteri" style="font-size: 23px;padding-top: 11px;color:white;cursor:pointer"
                tooltip-placement="bottom" tooltip-append-to-body="true"></i>
            </li>
      `);
	$('.interaction-call-control-container').css('display', 'flex')
	$('body').first().after(`
      <div class="recordings-wrapper hidden" id="draggableList">
          <div class="header" id="draggableListHeader">
              <div class="list-header-recording">
                <h4 class="ml-8">Registrazioni</h4>
                <div onclick="toggleRecentRecordings()" class="modal-header-btn modal-close">
                  <i class="fa fa-close fa-2x"></i>
                </div>
            </div>
          </div>
          <div class="rec-list">
          </div>
      </div>
      
<div class="addContactInModal" hidden id="draggableList3">
			<div class="list-header-recording">
			<h3 id="modalTitle">Aggiungi Nuovo</h3>
			</div>
			<form id="addContactForm">
				<div class="input-contact">
					<label for="contactName">Nome Contatto</label>
					<input type="text" title="Nome e Cognome" id="contactName" placeholder="" required >
					<span class="error-input" hidden>Inserire Nome e Cognome</span>
					<label for="tel">Numero Telefono</label>
					<input type="tel" title="Telefono" id="tel" placeholder="" required>
					<input type="hidden" id="contactId">
				</div>
				<div class="action" id="actionNew">
					<button class="btn" type="submit">Salva</button>
					<button class="btn clean" type="button" onclick="cleanContactForm()">Pulisci</button>
					<button class="btn danger" type="button" onclick="toggleContactInModal()">Annulla</button>
				</div>
			</form>
		</div>
 		<div class="queue-report-wrapper hidden" id="draggableList4">
          <div class="header" id="draggableListHeader">
              <div class="list-header-recording">
              <div>
<!--              <div onclick="getQueueReport()" class="modal-header-btn">-->
<!--                  <span class="text-header-contact">Aggiorna Statistiche</span><i class="fa fa-retweet fa-2x"></i>-->
<!--                </div>-->
             	</div>
                <div onclick="toggleQueueReport()" class="modal-header-btn modal-close">
                  <i class="fa fa-close fa-2x"></i>
                </div>
            </div>
          </div>
          <div id="queueReportContainer">
          	<table id="queueReport"></table>
</div>
      </div>
      <div class="external-contacts-wrapper hidden" id="draggableList2">
          <div class="header" id="draggableListHeader">
              <div class="list-header-recording">
              <div>
              <div onclick="addContact()" class="modal-header-btn" style="background: #76bd76">
                  <span class="text-header-contact">Aggiungi nuovo</span> <i class="fa fa-user-plus fa-2x"></i>
                </div>
              <div onclick="refresh()" class="modal-header-btn">
                  <span class="text-header-contact">Aggiorna</span><i class="fa fa-retweet fa-2x"></i>
                </div>
             	</div>
                <div onclick="toggleAddContactModal()" class="modal-header-btn modal-close">
                  <i class="fa fa-close fa-2x"></i>
                </div>
            </div>
          </div>
					<div class="header" id="draggableListHeader">
						
              <div class="search-contact">
              <label for="contactSearchInput">
              	Cerca Contatto:
              </label>
              <div class="search-contact-form">
              	<input type="text" id="contactSearchInput">
              	<button class="btn clean" type="button" onclick="filterExternalContacts()">Filtra</button>
              </div>
            </div>
          </div>
					<div class="deleteModalConfirm ml-8" hidden>
						<h3 id="modalTitle">Stai per cancellare:<br><span id="deleteContactName"></span></h3>
						<input type="hidden" id="contactToDelete">
						<div class="action">
							<button class="btn" type="button" onclick="closeDeleteModalConfirm()">Annulla</button>
							<button class="btn danger" type="button" onclick="confirmDeleteContact()">OK</button>
						</div>
					</div>
					
						<script>
						chosenAction = 'add'
						$('.addContactInModal').hide()
						$('.deleteModalConfirm').hide()
						let nameInput = $('#contactName')
						let telInput = $('#tel')
						let contactId = $('#contactId')
						 $('#addContactForm').submit(e => {
						 	e.preventDefault();
						 	let name = nameInput.val();
						 	if (!name || name.split(' ').length < 2) {
						 		$('.error-input').show();
						 		return;
						 	}
						 	
						 	let tel = telInput.val();
						 	if (!tel.startsWith('+39')) {
						 		tel = '+39' + tel.replace('+', '')
						 	}
						 	let id = contactId.val();
						 	console.log(chosenAction + ' ' + id + ' ' + name + ' ' + tel)
						 	chosenAction === 'edit' ? putExternalcontactsContact(id, {name, tel}) : postExternalcontactsContacts({name, tel})
						 })
						 
						 function refresh() {
							getExternalcontactsContacts().then(data => renderExternalContact(data))
						 }
						 function filterExternalContacts() {
							let filter = $('#contactSearchInput').val()
							getExternalcontactsContacts(filter).then(data => renderExternalContact(data))
						 }
						 
						 function toggleContactInModal() {
							$('.addContactInModal').hide()
						 }
						 function cleanContactForm() {
						 	nameInput.val('');
						 	telInput.val('')
						 	nameInput.focus()
						 }
						 
						 function editContact(contact) {
							$('.error-input').hide();
							$('.deleteModalConfirm').hide()
							this.chosenAction = 'edit'
							$('#modalTitle').text('Modifica ' + contact.name)
							$('.addContactInModal').show()
							console.log('modifying ' + contact.id)
							nameInput.val(contact.name);
							telInput.val(contact.tel)
							contactId.val(contact.id);
							nameInput.focus()
						 }
						 
						 function addContact(contact) {
							$('.error-input').hide();
							$('.deleteModalConfirm').hide()
							this.chosenAction = 'add'
							$('#modalTitle').text('Aggiungi Nuovo')
							$('.addContactInModal').show()
							nameInput.val(contact?.name);
							telInput.val(contact?.tel)
							nameInput.focus()
						 }
						 
							function deleteContact(contact) {
							$('.addContactInModal').hide()
						 	console.log('deleting ' + contact?.id)
							$('#deleteContactName').text(contact?.name)
							$('#contactToDelete').val(contact?.id)
							$('.deleteModalConfirm').show()
							nameInput.val(contact?.name);
							telInput.val(contact?.tel)
							nameInput.focus()
							}
							function confirmDeleteContact(id) {
								deleteExternalcontactsContact($('#contactToDelete').val())
								$('.deleteModalConfirm').hide()
							}
							
							function closeDeleteModalConfirm() {
								$('.deleteModalConfirm').hide()
								$('#deleteContactName').text('')
								$('#contactToDelete').val('')
							}
							
							function paginate(pos) {
								let filter = $('#contactSearchInput').val()
								let pageNumber = $('#contactsPageNumber').val()
								let pageCount = $('#contactsPageCount').val()
								
								if(pos === 'first' && pageNumber > 1) {
									getExternalcontactsContacts(filter, 1)
									.then(data => renderExternalContact(data))
								}
								if(pos === 'last'  && pageNumber < pageCount) {
									getExternalcontactsContacts(filter, pageCount)
									.then(data => renderExternalContact(data))
								}
								if(pos === 'prev' && pageNumber > 1) {
									getExternalcontactsContacts(filter, parseInt(pageNumber) - 1)
									.then(data => renderExternalContact(data))
								}
								if(pos === 'next' && pageNumber < pageCount) {
									getExternalcontactsContacts(filter, parseInt(pageNumber) + 1)
									.then(data => renderExternalContact(data))
								}
							}
						</script>
          <div class="contact-list">
          </div>
          <div class="pagination-container">
          	<div class="back-pagination">
								<i class="fa fa-angle-double-left fa-3x" onclick="paginate('first')"></i>
          			<i class="fa fa-angle-left fa-3x" onclick="paginate('prev')"></i>
						</div>
						<div class="info-pagination">
							<input type="hidden" id="contactsPageCount">
							<input type="hidden" id="contactsPageNumber">
							<input type="hidden" id="contactsPageSize">
							<input type="hidden" id="contactsTotal">
							<span id="actualContacts"></span> di <span id="totalContacts"></span>
						</div>
          	<div class="front-pagination">
          			<i class="fa fa-angle-right fa-3x" onclick="paginate('next')"></i>
								<i class="fa fa-angle-double-right fa-3x" onclick="paginate('last')"></i>
						</div>
					</div>
      </div>
      
      <div class="transfer-wrapper hidden" id="draggableList5">
          <div class="header" id="draggableListHeader">
              <div class="list-header-recording">
                <h4 class="ml-8">Trasferisci</h4>
                <div onclick="toggleTransfer()" class="modal-header-btn modal-close">
                  <i class="fa fa-close fa-2x"></i>
                </div>
            </div>
          </div>
          <div class="transfer-list">
          </div>
      </div>
      
      `);
	dragElement(document.getElementById('draggableList'));
	dragElement(document.getElementById('draggableList2'));
	dragElement(document.getElementById('draggableList3'));
	dragElement(document.getElementById('draggableList4'));
	dragElement(document.getElementById('draggableList5'));
	//completeInfoVoicemail(); rimosso per provare intanto  a fissare il pb improvviso di barra che nn si carica
	['securePause', 'dtmf', 'scheduleCallback', 'transfer', 'record']
		.forEach(c => $(`[data-call-control="${c}"]`).hide());
	//$('i.icon-logo-genesys-cloud').parent().parent().hide();
}










function waitLoader() {


	let spinner = $('.spinner-container')[0].outerHTML
	//loadJS('https://unpkg.com/vue@3.2.20/dist/vue.global.js',true)
	if (spinner.includes("<div class=\"spinner-container\" style=\"display: none;\"><i class=\"fa fa-spinner fa-spin fa-5x\"></i></div>")) {
		console.log('watermark', document.getElementsByClassName('watermark'))
		/*setTimeout(() => {
			document.getElementsByClassName('watermark')[0].innerHTML= '<img src="https://www.technevalue.com/Logos/logo_dp_techne.png" alt="Genesys Cloud Logo" role="img" style="zoom: 100%; opacity: 0.8; cursor: auto;">';
		  }, "500"); */
		startingSetup();
	}
	//	if (loaded) {
	//		startingSetup();
	//	} 
	else {
		setTimeout(waitLoader, 500)
	}
}

function createInterval(f, dynamicParameter, interval, id) {
	window[`hold_${id}`] = setInterval(function () {
		f(dynamicParameter);
	}, interval);
}

function getInteractionDiv(id) {
	let el
	let interactions = $('.interactions').parent().parent()
	interactions.each(function (index) {
		//let angularElement = angular.element($(this))
		let conversationId = $('input[name="interactionId"]').attr("value")
		//let conversationId = angularElement.scope()?.s?.id
		if (conversationId === id) {
			el = $(this)
		}
	})
	return el;
}

function startCheckOnHold(id) {
	let interactions = $('.interactions').parent().parent()
	let interaction;

	interactions.each(function (index) {
		//	let angularElement = angular.element($(this))
		let conversationId = $('input[name="interactionId"]').attr("value")
		//	let conversationId = angularElement.scope()?.s?.id
		if (conversationId === id) {
			interaction = $(this)
		}
	})
	if (interaction.length) {
		createInterval((interactionEl) => {

			const scope = angular.element(interactionEl).scope();
			const me = scope?.s.me
			if (me?.isHeld) {
				const startHold = me.participantInteraction.startHoldTime;
				let diff = new Date() - new Date(startHold)
				let diffInSeconds = parseInt(diff / 1000)
				if (interactionEl.find('#holdingTime').length) {
					interactionEl.find('#holdingTime').text(` - ${moment.utc(diffInSeconds * 1000).format('mm:ss')} In Attesa\n`)
				} else {
					interactionEl.find('span.salesforce-calltimeelapsed>span').first().after(`<span id="holdingTime"> - ${moment.utc(diffInSeconds *
						1000).format('mm:ss')} In Attesa\n</span>`)
				}
			} else {
				interactionEl.find('#holdingTime').remove()
			}
		}, interaction.first(), 1000, id)

	}
}

function mapWrapupCodes() {
	angular.element('[ng-if="wrapUpCodes && wrapUpCodes.length"]').parent().scope().wrapUpCodes.forEach(wc => {
		console.log('clean wrapup', cleanFromServicesNames(wc.name))
		wc.name = cleanFromServicesNames(wc.name)
	})
}

// QUESTO TOGLIE IL SERVIZIO SOLO SE PRIMA DEL CARATTERE " - "
function cleanFromServicesNames(string) {
	let service = string.split('-')[0].trim()
	let excluded = Array.from(serviceNamesToBeRemoved).map(e => e.toLowerCase())
	console.log('wrapup excluded', service, excluded)
	if (excluded.includes(service.toLowerCase())) {
		let [_, ...rest] = string.split('-')
		return rest.join('-').trim()
	}
	return string
}

function isNewAction(string) {
	let seen = localStorage.getItem(string) && localStorage.getItem(string) === 'true'
	if (!seen) {
		try { localStorage.setItem(string, 'true') }
		catch (err) { console.log('**error on local storage****', err) }
		return true
	}
	console.log('**seen_case_false**', seen)
	return false
}

function startSecureIvrSession(flowId, conversationId, timing = undefined) {
	console.log('entroinaggreeting', conversationId)
	let participantId
	let api = new platformClient.ConversationsApi();
	return api.getConversation(conversationId).then(data => {
		data.participants.forEach(p => {
			if (p.purpose === 'customer') participantId = p.id;
		})
		let apiInstance = new platformClient.ConversationsApi();
		let opts = {
			body: {
				sourceParticipantId: '',
				flowId,
				userData: [employeeId, officialName].filter(e => e).join('-'),
				disconnect: false
			}
		};
		apiInstance.postConversationParticipantSecureivrsessions(conversationId, participantId, opts)
			.then((data) => {
				if (isNewAction(`speak_${conversationId}`)) {
					play(onHoldMusicBuffer)
				}
				snackbarAlert('In corso Agent Greeting, Attendere la fine del messaggio', 'error', 6000);
				console.log(`postConversationParticipantSecureivrsessions success! data: ${JSON.stringify(data, null, 2)}`);
			})
			.catch((err) => {
				console.log('There was a failure calling postConversationParticipantSecureivrsessions');
				console.error(err);
			});
	})
}


function checkIfNotRespondingPopup(i = 0) {
	let isPopupHidden = $('div#notRespondingController_test').css('display')
	if (isPopupHidden == 'block') {
		console.log('riga 1840 dentro if')
		updateInteractionStatus('Not Responding')
		//$('#notRespondingOffQueue_test')[0].click()
		//let changeInterval = setInterval(() => changeStatus('BREAK'), 400);
		//setTimeout(() => clearInterval(changeInterval), 2000)
	} else if (i < 50) {
		console.log('riga 1845 dentro else')
		setTimeout(() => checkIfNotRespondingPopup(i + 1), 50)
	}
}

function checkIfWrapupPopup(i = 0) {
	let isPopupHidden = $('div#notRespondingController_test').css('display')
	if (isPopupHidden == 'block') {
		console.log('wrapup hidden', isPopupHidden)

		mapWrapupCodes()
	} else if (i < 50) {
		setTimeout(() => checkIfWrapupPopup(i + 1), 50)
	}
}

function updateInteractionStatus(status) {
	console.log('updateInteractionStatus')
	let el = $('#interaction_status_span')
	console.log('updateInteractionStatus EL', el)
	if (!el[0]) {
		$('#status_test>span').after(`<span id="interaction_status_span">

</span>`)
		el = $('#interaction_status_span')
		console.log('updateInteractionStatus EL2', el)
	}
	$('.top-bar.status-bar').css('background-color', status === 'Not Responding' ? '#f33' : '')
	console.log('updateInteractionStatus el3', $('.top-bar.status-bar').css('background-color', status === 'Not Responding' ? '#f33' : ''))
	el.text(status ? ` - ${status}` : ``)
	console.log('updateInteractionStatus el4', status)
}

function patchConversationParticipantAttributes(conversationId, participantId, body) {
	let apiInstance = new platformClient.ConversationsApi();
	return apiInstance.patchConversationParticipantAttributes(conversationId, participantId, { 'attributes': body })
		.catch((err) => console.log('There was a failure calling patchConversationParticipantAttributes', err))
}

async function tagNodes(event, interaction) {
	let mapping = {
		connect: { aemkt: `75`, aemkl: `9`, aegas: `132` },
		nps: { aemkt: `76`, aemkl: `10`, aegas: `133` },
		hangup: { aemkt: `83`, aemkl: `175`, aegas: `175` }
	}
	// if (false) return
	if (org !== `ACEA ENERGIA`) return
	else {
		let conversation = await getConversation(interaction.id)
		let customer = conversation.participants.find(p => p.purpose === 'customer')
		// console.log(customer.attributes)
		let value = event === `hangup` ? 'CUSTOMER_DISCONNECT' : ''
		let flagId = mapping[event][customer.attributes['called_service']?.toLowerCase()]
		let string = `${customer.attributes['ELENCO TAG NODI']}\n${flagId},${new Date().toISOString()},${interaction.id},${value},,,,,,,,,,,${customer.ani}`
		let body = { 'ELENCO TAG NODI': string }
		patchConversationParticipantAttributes(interaction.id, customer.id, body)
	}
}

function mapExternalContacts(data) {
	return data.map(e => {
		return {
			id: e.id,
			name: [e.firstName, e.middleName, e.lastName].join(' '),
			tel: e.workPhone?.e164 || e.workPhone?.display?.replace(' ', '')
		}
	})
}

function getExternalcontactsContacts(filter, page) {
	if (!canSeeExternalContact) return
	let apiInstance = new platformClient.ExternalContactsApi();
	let opts = {
		'pageSize': 100, // Number | Page size (limited to fetching first 1,000 records; pageNumber * pageSize must be <= 1,000)
		'pageNumber': page || 1, // Number | Page number (limited to fetching first 1,000 records; pageNumber * pageSize must be <= 1,000)
		//'q': "", // String | User supplied search keywords (no special syntax is currently supported)
		//'sortOrder': "sortOrder_example", // String | Sort order
		'expand': [] // [String] | which fields, if any, to expand
	};
	if (filter) opts.q = filter;
	return apiInstance.getExternalcontactsOrganizationContacts(organizationIdExternalContact[userdivision], opts)
		.catch((err) => {
			console.log('There was a failure calling getExternalcontactsContacts');
			console.error(err);
		});
}

function postExternalcontactsContacts(data) {
	if (!canSeeExternalContact) return
	let apiInstance = new platformClient.ExternalContactsApi();
	[firstName, ...others] = data.name.split(' ');
	let lastName = others.pop()
	let middleName = others.join(' ')
	let body = {
		firstName,
		middleName,
		lastName,
		workPhone: {
			e164: `${data.tel}`,
			display: `${data.tel}`,
			userInput: `${data.tel}`,
			extension: ``,
			acceptsSMS: false,
			countryCode: 'IT'
		},
		workEmail: ``,
		surveyOptOut: false,
		externalOrganization: {
			id: organizationIdExternalContact[userdivision]
		}
	}; // Object | ExternalContact
	return apiInstance.postExternalcontactsContacts(body)
		.then((data) => {
			$('.addContactInModal').hide();
			console.log(`postExternalcontactsContacts success! data: ${JSON.stringify(data, null, 2)}`);
		})
		.catch((err) => {
			console.log('There was a failure calling postExternalcontactsContacts');
			console.error(err);
		});
}

function putExternalcontactsContact(contactId, data) {
	if (!canSeeExternalContact) return
	let apiInstance = new platformClient.ExternalContactsApi();
	[firstName, ...others] = data.name.split(' ');
	let lastName = others.pop()
	let middleName = others.join(' ')
	let body = {
		firstName,
		middleName,
		lastName,
		workPhone: {
			e164: `${data.tel}`,
			display: `${data.tel}`,
			userInput: `${data.tel}`,
			extension: ``,
			acceptsSMS: false,
			countryCode: 'IT'
		},
		externalOrganization: {
			id: organizationIdExternalContact[userdivision]
		}
	}
	apiInstance.putExternalcontactsContact(contactId, body)
		.then((data) => {
			$('.addContactInModal').hide();
			console.log(`putExternalcontactsContact success! data: ${JSON.stringify(data, null, 2)}`);
		})
		.catch((err) => {
			console.log('There was a failure calling putExternalcontactsContact');
			console.error(err);
		});
}

function deleteExternalcontactsContact(contactId) {
	if (!canSeeExternalContact) return
	let apiInstance = new platformClient.ExternalContactsApi();
	return apiInstance.deleteExternalcontactsContact(contactId)
		.then((data) => {
			$('.deleteModalConfirm').hide();
			let total = $('#totalContacts').text()
			$('#totalContacts').text(parseInt(total) - 1)
			$(`.contact-list > li#${contactId}`).remove()
			console.log(`deleteExternalcontactsContact success! data: ${JSON.stringify(data, null, 2)}`);
		})
		.catch((err) => {
			console.log('There was a failure calling deleteExternalcontactsContact');
			console.error(err);
		});
}

function patchConversationParticipant(conversationId) {
	let apiInstance = new platformClient.ConversationsApi();
	apiInstance.getConversation(conversationId)
		.then((data) => {
			let participant = data.participants.find(p => (p.userId === userId))
			let body = {
				wrapup: {
					code: '27bf550a-9735-4f57-a258-621d04b1c3fd'
				}
			};
			apiInstance.patchConversationParticipant(conversationId, participant.id, body)
				.then(() => {
					console.log('patchConversationParticipant returned successfully.');
					getConversation(conversationId).then(data => {
						console.log(`getConversation success! data: ${JSON.stringify(data, null, 2)}`);
					})
				})
				.catch((err) => {
					console.log('There was a failure calling patchConversationParticipant');
					console.error(err);
				});
		})
		.catch((err) => {
			console.log('There was a failure calling getConversation');
			console.error(err);
		});
}

function getParticipant(interactionId, purpose) {
	let api = new platformClient.ConversationsApi();
	return api.getConversation(interactionId).then(data => {
		let participant;
		data.participants.forEach(p => {
			if (p.purpose === purpose) {
				participant = p;
			}
		})
		return participant
	})
}

async function updateTransfer(interaction) {
	console.log(interaction)
	let participant = await getParticipant(interaction.id, 'agent')
	// hide nav nav-pills on click transfer
	$('.transfer-list').empty();
	$('[onclick="toggleTransfer()"]').show();
	Object.values(allowedTransfer).forEach((r, i) =>
		$('.transfer-list').append(`
				<li><p class="list-record ellipsis link" onclick="replaceParticipant('${interaction.id}', '${participant.id}', '${r.id}')">
				<span class="rec-index">${i + 1} - </span>${r.name}<br></li>
		`))
}

function addBtnToCRM(interaction, count = 0) {
	if (seenInteractions[interaction.id + '_btnCrm']) {
		return
	}
	let interactionDiv = getInteractionDiv(interaction.id)
	if (!interactionDiv && count < 10) {
		return setTimeout(() => addBtnToCRM(interaction, count++), 500)
	} else if (!interactionDiv) {
		return console.error('Impossible to find an interaction')
	}
	interactionDiv.find('.right-btn-container').css('min-width', '45px')
	interactionDiv.find('.right-btn-container').append(`<input type="button" id="crmButton" class="button-crm" title="Vai a CRM" value="CRM" onclick="openTab('${interaction.attributes.crm_urlpop}')" />`)
	seenInteractions[interaction.id + '_btnCrm'] = true

}

function addBtnToCRMSALEFORCE(interaction, count = 0) {

	if (seenInteractions[interaction.new.id + '_btnCrmSalesforce']) {
		return
	}
	console.log('crm salesforce', interaction.new.attributes.link_creazionecasesfdc)
	let interactionDiv = getInteractionDiv(interaction.new.id)
	if (!interactionDiv && count < 10) {
		return setTimeout(() => addBtnToCRMSALEFORCE(interaction, count++), 500)
	} else if (!interactionDiv) {
		return console.error('Impossible to find an interaction')
	}
	interactionDiv.find('.right-btn-container').css('min-width', '45px')
	interactionDiv.find('.right-btn-container').append(`<input type="button" id="crmButton" class="button-crm" title="Vai a CRM" value="CRM" onclick="openTab('${interaction.new.attributes.link_creazionecasesfdc}')" />`)
	seenInteractions[interaction.new.id + '_btnCrmSalesforce'] = true

}

window.Framework = {
	config: {
		getUserLanguage: callback => callback('it-IT'),
		name: 'veryInterestingNameApp',
		clientIds: {
			'mypurecloud.com': '',
			'mypurecloud.ie': '',
			'mypurecloud.com.au': '',
			'mypurecloud.jp': '',
			//"mypurecloud.de": "497edd81-8bd5-46ae-9611-650314413b2d", // TECHNEGMBH
			'mypurecloud.de': 'f9621e16-6936-47f5-8b48-eb9dd59b85f4' // ACEA
			//'mypurecloud.de': 'e02b173c-f25a-4384-8630-85290102de16' // ACEA-ENERGIA
		},
		customInteractionAttributes: [
			'PT_URLPop',
			'PT_SearchValue',
			'PT_TransferContext',
			'SF_Action',
			'SF_URLPop',
			'SF_apexClass',
			'SF_methodName',
			'CRM_URLPop',
			'SF_methodParams',
			'Id_Gruppo',
			'enableControls',
			'toBeDisplayedInInteraction',
			'toBeTransferred',
			'send_voicemails',
			'AgentGreeting',
			'ELENCO TAG NODI',
			'EtichetteTrasf',
			'NumeriTrasf',
			'called_service',
			'custom_subchannel',
			'custom_transferred',
			'agentgreetingtotrasf',
			'link_creazioneCaseSFDC',
			'sfi_idchiamata__c',
			'ad_telnrlg_sms__c',
			'CONTRACTACCOUNTID',
			'open_interaction',
			'idaccount',
			'c__interlocutoremail', 
			'c__interlocutornationalidentitynumber',
			'queue__c',
			'callcenterphone__c',
			'company__c'

		],
		settings: {
			embedWebRTCByDefault: true,
			hideWebRTCPopUpOption: true,
			enableCallLogs: true,
			enableCallHistory: true,
			enableTransferContext: true,
			hideCallLogSubject: true,
			hideCallLogContact: false,
			hideCallLogRelation: false,
			searchTargets: ['people', 'queues', 'frameworkcontacts'],
			theme: {
				// primary: "#f82", // local
				// primary: '#e27f7f', // Sviluppo
				// primary: '#b5b5b5', // Collaudo
				primary: "#55bada", // Produzione
				// primary: "#ff8c00", // produzione fix 
				text: '#123'
			}
		}
	},
	initialSetup: function () {
		loadJS("https://ajax.googleapis.com/ajax/libs/angularjs/1.5.6/angular.js", true);
		for (let script of scriptsToLoad) {
			document.getElementsByTagName('head')[0].appendChild(script);
		}
		let elem = document.getElementsByClassName('call-history-actions')
		console.log('element', elem)

		if (!canMakeOutboundCalls) {
			$('.btn.btn-default.btn-xs').css('display', 'none')
		}
		waitLoader();
		window.fetch(onHoldMusicUrl, {
			method: 'GET', // *GET, POST, PUT, DELETE, etc.
			mode: 'cors',
			headers: {
				'Access-Control-Allow-Origin': 'https://apps.mypurecloud.de'
			}
		})
			.then(response => response.arrayBuffer())
			.then(arrayBuffer => audioCtx.decodeAudioData(arrayBuffer))
			.then(audioBuffer => onHoldMusicBuffer = audioBuffer);
		window.PureCloud.subscribe([
			{
				type: 'Interaction',
				callback: function (category, interaction) {
					console.warn('#########################');
					console.log(category, interaction);
					console.log({ type: 'Interaction', ef_category: category, ef_data: interaction });
					// ADD STRING ON INTERACTION
					if (interaction.id) {
						addStringToInteraction(`${interaction.id}_id`, interaction.id)
					}

					if (category === 'add' || category === 'change' ) 
						{
						    $('gef-transfer-control').css('display','none');
						//	$('gef-record-control').css('display','none');
						//	$(`[data-call-control="record"]`).hide();

						   if (transferEnable) {
							$(`[data-call-control="transfer"]`).show();  
							$('gef-transfer-control').css('display','block');
							 }    
						   $('gef-secure-pause-control').css('display','none');
						   $('gef-schedule-callback-control').css('display','none');
						}

					if (category === 'blindTransfer') {
						let id = interaction
						let storedInteraction = localStorage.getItem(`interaction${id}`)
						let parsedInteraction = JSON.parse(storedInteraction)
						getParticipant(id, 'customer').then(customer => {
							let newAttrObj = { custom_transferred: 'true' }
							console.log(newAttrObj)
							patchConversationParticipantAttributes(id, customer.id, newAttrObj)
						})


					}
					// ADD STRING ON INTERACTION
					if (interaction.attributes && interaction.attributes.tobedisplayedininteraction) {
						addStringToInteraction(interaction.id, interaction.attributes.tobedisplayedininteraction)
					}
					// ADD TRANSFER NUMBER
					if (interaction.attributes && interaction.attributes.numeritrasf && interaction.attributes.etichettetrasf) {
						let numeri = interaction.attributes.numeritrasf.split(',').map(e => e.trim())
						let etichette = interaction.attributes.etichettetrasf.split(',').map(e => e.trim())
						for (let i = 0; i < numeri.length; i++) {
							allowedTransfer[etichette[i]] = {
								name: etichette[i],
								id: numeri[i],
							}
						}
						updateTransfer(interaction)
					}
					if (category === 'add' && interaction.ani) {
						if (!canSeeExternalContact) return
						searchExternalContact(interaction)
					}
					// ADD STRING ON INTERACTION
					if (['blindTransfer', 'completeConsultTransfer'].includes(category)) {
						patchConversationParticipant(interaction.id || interaction)
					}
					console.log('**interactionattributes_2076**', interaction.new?.attributes?.agentgreeting)


					if (interaction.new?.attributes?.agentgreeting === 'FINITO') {
						let newEnd = isNewAction(`endAgentGreeting_${interaction.new.id}`)
						console.log('**newEnd**', newEnd)
						console.log('**newAction_2080**', `endAgentGreeting_${interaction.new.id}`)
						if (newEnd) {
							// play(onHoldMusicBuffer)
							console.log('**Row_2083**', sourceCtx)
							sourceCtx.stop()
						} else {
							sourceCtx.stop()
							console.log('**Row_2087 newEnd**', newEnd)
						}
					}

                    
					if ((category === 'add' || category === 'change' || category === 'connect') && interaction.direction === 'Outbound') {
						$(`[data-call-control="record"]`).show();
						$('gef-record-control').removeAttr('disabled');
						$(`[data-call-control="dtmf"]`).show();
						enableRec(interaction.id)
					}


					if (category === 'connect' && interaction.isConnected) {
					$('gef-schedule-callback-control').prop('disabled', true);
					//$('gef-dialpad-control').prop('disabled', true);
					$('gef-secure-pause-control').prop('disabled', true);


						interactionId = interaction.id;
						addInteraction(interactionId);
						localStorage.setItem('interaction' + interaction.id, JSON.stringify(interaction));
						updateInteractionStatus('In Interazione')
						//startCheckOnHold(interactionId); rimosso per barra problemi che nn si carica
						if (interaction.attributes?.enablecontrols) {
							interaction.attributes.enablecontrols.split(';').forEach((c) => {
								$(`[data-call-control="${c}"]`).show();
								if (c === 'scheduleCallback') {
									scheduleCallbackPermission = true;
								}
								if (c === 'record') {
									recordEnable = true;
								}
								if (c === 'transfer') {
									transferEnable = true;
								}
								if (c === 'dtmf') {
									dialpadEnable = true;
								}
							});
						}
						
						if (dialpadEnable)  {
							$('gef-dialpad-control').prop('disabled', false);
						}
						if (interaction.attributes?.agentgreeting && interaction.attributes.agentgreeting.length > 10) {
							let id = interaction.id
							getParticipant(id, 'customer').then(customer => {
								let newAttrObjAgGreet = { agentgreetingtotrasf: interaction.attributes.agentgreeting }
								console.log('newAttrObjAgGreet', newAttrObjAgGreet)
								patchConversationParticipantAttributes(id, customer.id, newAttrObjAgGreet)

							})
							startSecureIvrSession(interaction.attributes.agentgreeting, interaction.id)
						}
						if (interaction.attributes?.agentgreetingtotrasf && interaction.attributes.custom_transferred === 'true') {
							startSecureIvrSession(interaction.attributes.agentgreetingtotrasf, interaction.id)
						}  // if per far ripartire l'agent greeting in caso di trasferta  id 407 
						
						if(interaction.attributes.idaccount) {
							let idaccount = interaction.attributes.idaccount; 
							console.log('idaccount&interaction', interaction , idaccount)
								}

						if (interaction.attributes?.tobetransferred) {
							flowNPS = interaction.attributes.tobetransferred;
							setNPS();
						}
						if (recordEnable) {
							$(`[data-call-control="record"]`).show();
							enableRec(interactionId);
						} else { disableRec(); }
						if (interaction.attributes && interaction.attributes.open_interaction) {
							//console.log('openInteractionopenInteractionopenInteraction')
							let subchannel = interaction.attributes.custom_subchannel || 'Call Center ' + interaction.direction;
							let ad_telnrlg_sms_c = interaction.attributes.ad_telnrlg_sms__c || 'null'; 
					        let idchiamata_sfi = interaction.attributes.sfi_idchiamata__c || 'null';
							let queue_c  = interaction.attributes.queue__c || 'null';
							let callcenterphone_c = interaction.attributes.callcenterphone__c || 'null';
							let company_c = interaction.attributes.company__c || 'null'; 
							let interlocutoremail = interaction.attributes.c__interlocutoremail || 'null';
                        	let interlocutornumber = interaction.attributes.c__interlocutornationalidentitynumber || 'null';
							let contractaccountid = interaction.attributes.contractaccountid;
							let idaccount = interaction.attributes.idaccount || 'null';
							try {
								window.parent.postMessage(
									JSON.stringify({
										type: 'openInteraction',
										data: {
											CallIdCCA__c: interaction.id,
											Direction__c: interaction.direction,
											Status__c: 'New',
											InterlocutorPhone__c: interaction.ani,
											Channel__c: 'Call Center',
											LastModifiedChannel__c: 'Call Center',
											SubChannel__c: subchannel,
											LastModifiedSubChannel__c: subchannel,
											OwnerID: userId,
											Queue__c : queue_c,
											CallCenterPhone__c : callcenterphone_c,
											Company__c : company_c, 
											SFI_IdChiamata__c: idchiamata_sfi,
											AD_TELNRLG_SMS__c: ad_telnrlg_sms_c,
											Contractaccountid : contractaccountid,
											Idaccount : idaccount, 
											InterlocutorEmail__c: interlocutoremail,
											InterlocutorNationalIdentityNumber__c: interlocutornumber
										}
									}), '*');
							} catch (err) {
								console.log('error SF open interaction', err)
							} console.log('sf idrico open interaction', 'int' + interaction.id, 'int direct' + interaction.direction, 'ani' + interaction.ani, 'id chiamata sfi' + idchiamata_sfi,
								'telnrlg' + ad_telnrlg_sms_c, 'userid' + userId, 'ca' + contractaccountid,  'idaccount' + idaccount)
						}
						
					

					}

					// interaction.attributes.crm_urlpop = 'https://google.it'
					// console.log("interaction ----> ", interaction.attributes.crm_urlpop)
					if (interaction.attributes &&
						!interaction.attributes.sf_action && interaction.attributes.crm_urlpop && buttonCrmSalesforce === false) {
						addBtnToCRM(interaction)
					}


					try {

						if (interaction.new.attributes.link_creazionecasesfdc !== 'not_set' && interaction.new.attributes.link_creazionecasesfdc !== interaction.old.attributes.link_creazionecasesfdc) {
							console.log('attributi new', interaction.new.attributes.link_creazionecasesfdc)
							openTab(interaction.new.attributes.link_creazionecasesfdc);

							addBtnToCRMSALEFORCE(interaction);
							buttonCrmSalesforce = true;


						}
					}
					catch (err) { console.log('link creazione case sfdc mancante', err) }

					if (category === 'connect' && interaction.isConnected && interaction.attributes &&
						!interaction.attributes.sf_action && interaction.attributes.crm_urlpop) {
						console.log('primoif')
						if (interaction.attributes.custom_transferred) {
							console.log('riga 2308', interaction.attributes.custom_transferred)
							return
						} else {
							console.log('crm urlpop', interaction.attributes.crm_urlpop)
							openTab(interaction.attributes.crm_urlpop);
						}
					}







					if (category === 'disconnect' && interaction.isDisconnected) {

						clearInterval(window[`hold_${interaction.id}`]);
						// tagNodes('hangup', interaction)
						updateInteractionStatus();
						console.log('riga 2357')
						interactionId = undefined;
						['securePause', 'dtmf', 'scheduleCallback', 'transfer', 'record'].forEach((c) => {
							$(`[data-call-control="${c}"]`).hide();
						});
						$('.transfer-wrapper').hide()
						console.log('riga 2375', $('.transfer-wrapper'))
						$('[onclick="toggleTransfer()"]').hide();
						console.log('riga 2377', $('[onclick="toggleTransfer()"]'))
						scheduleCallbackPermission = false;
						$('gef-record-control').css('display','none');
						disableRec();
						recordEnable = false;
						transferEnable = false; 
						dialpadEnable = false;
						checkIfNotRespondingPopup();
						npsEnable = false;
						//	checkIfWrapupPopup();
						console.log('riga 2303')

						if (interaction.disposition === 'NON RISPONDE' && interaction.isCallback) 
							{
								let obj = endInteraction(interaction.id);
								let subchannel = 'Callback';
								let idaccount = interaction.attributes.idaccount || 'null' ;  
								window.parent.postMessage(
									JSON.stringify({
										type: 'voicemailSubscription', // THIS ONLY CLOSES THE INTERACTION
										data: {
											Call: {
												StartTime: obj.startTime,
												EndCall: obj.endTime,
												Duration: obj.interactionDurationSeconds,
												ElapsedSeconds: parseInt(obj.time),
												CallId: interaction.id,
												Channel__c: 'Call Center',
												LastModifiedChannel__c: 'Call Center',
												SubChannel__c: subchannel,
												idaccount : idaccount,
												CallbackNotComplete_c : 'endcallback'
											},
										},
									}),
									'*',
								); console.log('SF CALLBACK' , parseInt(obj.time), obj.startTime, obj.endTime , idaccount ,  obj.interactionDurationSeconds) 
							} 

						if (userdivision === `07812cbb-b0cb-4237-a6dc-85d7dd5924e5`) {
							let obj = endInteraction(interaction.id);
							let subchannel = interaction.attributes.custom_subchannel || 'Call Center ' + interaction.direction;
							window.parent.postMessage(
								JSON.stringify({
									type: 'voicemailSubscription', // THIS ONLY CLOSES THE INTERACTION
									data: {
										Call: {
											StartTime: obj.startTime,
											EndCall: obj.endTime,
											Duration: obj.interactionDurationSeconds,
											ElapsedSeconds: parseInt(obj.time),
											CallId: interaction.id,
											Channel__c: 'Call Center',
											LastModifiedChannel__c: 'Call Center',
											SubChannel__c: subchannel,
											LastModifiedSubChannel__c: subchannel,
										},
									},
								}),
								'*',
							); console.log('sf areti', parseInt(obj.time), obj.startTime, obj.endTime)
						}
						if (interaction.attributes && interaction.attributes.send_voicemails && data.division.id === `07812cbb-b0cb-4237-a6dc-85d7dd5924e5`) {
							let obj = endInteraction(interaction.id);
							let subchannel = interaction.attributes.custom_subchannel || 'Call Center ' + interaction.direction;
							window.parent.postMessage(
								JSON.stringify({
									type: 'voicemailSubscription', // THIS ONLY CLOSES THE INTERACTION
									data: {
										VocalOrder: {
											NomeCallCenter: 'TEST-ACEA',
											DataRec: interaction.startTime,
											AudioSegs: [],
											NomeFileAudio: ''
										},
										Call: {
											StartTime: obj.startTime,
											EndCall: obj.endTime,
											ElapsedSeconds: parseInt(obj.time),
											CallId: interaction.id,
											Channel__c: 'Call Center',
											LastModifiedChannel__c: 'Call Center',
											SubChannel__c: subchannel,
											LastModifiedSubChannel__c: subchannel,
										},
									},
								}),
								'*',
							); console.log('riga 2251')
						}
						if (interaction.attributes && interaction.attributes.send_voicemails && data.division.id !== `07812cbb-b0cb-4237-a6dc-85d7dd5924e5`) {
							window.parent.postMessage(
								JSON.stringify({
									type: 'voicemailSubscription',
									data: {
										VocalOrder: {
											NomeCallCenter: 'TEST-ACEA',
											DataRec: interaction.startTime,
											AudioSegs: [],
											NomeFileAudio: ''
										},
										Call: {
											EndCall: interaction.endTime,
											CallId: interaction.id
										}
									}
								}),
								'*'); console.log('riga 2270')
						}
						window.parent.postMessage(
							JSON.stringify({
								type: 'interaction_disconnected',
								data: {
									startTime: interaction.startTime,
									endTime: interaction.endTime,
									callId: interaction.id,
									agentId: userId
								}
							})
						);
					}
					window.parent.postMessage(
						JSON.stringify({
							type: 'interactionSubscription',
							data: { category: category, interaction: interaction }
						}),
						'*'
					);
				}
			},
			{
				type: 'UserAction',
				callback: function (category, data) {
					window.parent.postMessage(
						JSON.stringify({
							type: 'userActionSubscription',
							data: { category: category, data: data }
						}),
						'*'
					);
				}
			},
			{
				type: 'Notification',
				callback: function (category, data) {
					window.parent.postMessage(
						JSON.stringify({
							type: 'notificationSubscription',
							data: { category: category, data: data }
						}),
						'*'
					);
				}
			}
		]);

		window.add
		window.addEventListener('click', function (evt) {
			console.log('evt', evt.target.parentElement.parentElement)
			console.log('evt target', evt.target)
			console.log('evt target text content', evt.target.textContent)
			if (evt.target.textContent.includes('Pianificazione agente') || evt.target.textContent.includes('Interazioni')
				|| evt.target.textContent.includes('Nuova interazione') || evt.target.textContent.includes('Inbox utente')
				|| evt.target.textContent.includes('Attivazione coda') || evt.target.textContent.includes('Impostazioni')
				|| evt.target.textContent.includes('Prestazioni agente') ||
				evt.target.outerHTML.includes("<i class=\"fa fa-pencil\"></i>") || evt.target.outerHTML.includes("<i class=\"fa fa-bar-chart fa-lg item-icon\>")
				|| evt.target.outerHTML.includes("<i class=\"icon-interactions item-icon\">")
				|| evt.target.outerHTML.includes("<i class=\"fa fa-inbox fa-lg\">")
				|| evt.target.outerHTML.includes("<i class=\"fa fa-calendar fa-lg fa-icon item-icon\">")
				|| evt.target.outerHTML.includes("<i class=\"fa fa-clipboard fa-lg item-icon\">")
				|| evt.target.outerHTML.includes("<i class=\"fa fa-gear fa-lg item-icon\">")
				|| evt.target.outerHTML.includes("<i class=\"fa fa-plus fa-lg item-icon\">" || evt.target.outerHTML.includes("<i class=\"fa fa-bars\"></i>"))
			) {

				//window.addEventListener('click', function(evt) {
				//console.log('evt', evt.target.parentElement.parentElement)
				//if (evt.target.parentElement.parentElement != 'notset') {
				//window.addEventListener('click', function(evt)  {
				//console.log(alert(evt.target.tagName))	
				// Add NPS button
				console.log('evt entro nel listener', npsEnable, interactionId, recordEnable)
				if (npsEnable) {
					setNPS();
				}

				let queueIconButton = document.getElementsByClassName('queueIcon')
				let outboundButton = document.getElementsByClassName('button-outbound')
				let crmButton = document.getElementsByClassName('button-crm')
				if (queueIconButton.length === 0) {
					//let hungupBtn = $('[ng-click="disconnect()"]')
					let hungupBtn = $('gef-disconnect-control');
					//	$('[ng-if="s.isWrapupRequired"]').click(mapWrapupCodes)
					hungupBtn.addClass('hungup');
					hungupBtn.after(`
		<i class="icon-hangup nps" style="display: none; font-size: 23px;position:absolute;margin: 6px 12px;color:white;cursor:pointer"></i>"
            tooltip-placement="bottom" tooltip-append-to-body="true" uib-tooltip="Disconnetti"`);
					// Add Registrazioni dialog
					log(undefined, 'enableRec');
					// sostituire pulsante recording
					$('li[data-call-control="record"]').html(`
		<i class="fa fa-circle fa-lg" style="font-size: 23px;padding-top: 11px;color:white;cursor:pointer" tooltip-placement="bottom" tooltip-append-to-body="true"></i>
		`);
					$(
						'.interaction-call-control-container > .call-control-list > [data-call-control="record"]'
					).after(`
						<li style="order: 11; display: block;" data-call-control="flag" onclick="toggleRecentRecordings()">
							<i class="fa fa-headphones fa-lg" uib-tooltip="Lista Registrazioni" style="font-size: 23px;padding-top: 11px;color:white;cursor:pointer"
								tooltip-placement="bottom" tooltip-append-to-body="true"></i>
						</li>
            <li style="order: 11; display: none;" data-call-control="flag" onclick="toggleTransfer()">
              <i class="fa fa-arrow-right fa-lg" style="font-size: 23px;padding-top: 11px;color:white;cursor:pointer"
                tooltip-placement="bottom" tooltip-append-to-body="true"></i>
            </li>
            <li style="order: 11; display: ${canSeeExternalContact ? 'block' : 'none'};" data-call-control="flag" class="contactIcon" onclick="toggleAddContactModal()">
              <i class="fa fa-address-card fa-lg" uib-tooltip="Lista Contatti" style="font-size: 23px;padding-top: 11px;color:white;cursor:pointer"
                tooltip-placement="bottom" tooltip-append-to-body="true"></i>
            </li>
            <li style="order: 11; display: ${canSeeQueue ? 'block' : 'none'};" data-call-control="flag" class="queueIcon" onclick="toggleQueueReport()">
              <i class="fa fa-users fa-lg" uib-tooltip="Queue Report" style="font-size: 23px;padding-top: 11px;color:white;cursor:pointer"
                tooltip-placement="bottom" tooltip-append-to-body="true"></i>
            </li>
            <li style="order: 12; display: block;" data-call-control="flag" onclick="fontSize(false)">
              <i class="fa fa-search-minus fa-lg change-font-btn" uib-tooltip="Diminuisci Grandezza Caratteri" style="font-size: 23px;padding-top: 11px;color:white;cursor:pointer"
                tooltip-placement="bottom" tooltip-append-to-body="true"></i>
            </li>
            <li style="order: 13; display: block;" data-call-control="flag" onclick="fontSize(true)">
              <i class="fa fa-search-plus fa-lg change-font-btn" uib-tooltip="Aumenta Grandezza Caratteri" style="font-size: 23px;padding-top: 11px;color:white;cursor:pointer"
                tooltip-placement="bottom" tooltip-append-to-body="true"></i>
            </li>
      `);
					;
					dragElement(document.getElementById('draggableList'));
					dragElement(document.getElementById('draggableList2'));
					dragElement(document.getElementById('draggableList3'));
					dragElement(document.getElementById('draggableList4'));
					dragElement(document.getElementById('draggableList5'));
					//completeInfoVoicemail(); rimosso per barra problemiche nn si carica
					['securePause', 'dtmf', 'scheduleCallback', 'transfer', 'record']
						.forEach(c => $(`[data-call-control="${c}"]`).hide());
				}
				;
			}

			
			$('gef-transfer-control').css('display','none');
			//  $('gef-record-control').css('display','none');
			//	$(`[data-call-control="record"]`).css('display','none');
				$('gef-secure-pause-control').css('display','none');
				$('gef-schedule-callback-control').css('display','none');
			/*if (recordEnable) {
				$(`[data-call-control="record"]`).show();
				enableRec(interactionId);
			} else { disableRec(); } */
			if (transferEnable) {
				$(`[data-call-control="transfer"]`).show();
				$('gef-transfer-control').css('display','block');
				//   											
	}
	
		  if (dialpadEnable)  {
			$('gef-dialpad-control').prop('disabled', false);
		}


		});
		/*aggiunto per risolvere il problema del logout non funzionante da genesys*/
		/*window.addEventListener('click', function(evt) {
			console.log('evt target', evt.target)
		console.log('evt target', evt.target.textContent)
		if (evt.target.firstChild.textContent.includes('Disconnetti') || evt.target.id.includes('logout') )	{
			logout();
	}
	});*/


		window.addEventListener('message', function (event) {
			try {
				let message = JSON.parse(event.data);
				if (message) {
					if (message.type === 'clickToDial') {
						window.PureCloud.clickToDial(message.data);
					} else if (message.type === 'addAssociation') {
						window.PureCloud.addAssociation(message.data);
					} else if (message.type === 'addAttribute') {
						window.PureCloud.addCustomAttributes(message.data);
					} else if (message.type === 'addTransferContext') {
						window.PureCloud.addTransferContext(message.data);
					} else if (message.type === 'sendContactSearch') {
						if (contactSearchCallback) contactSearchCallback(message.data);
					} else if (message.type === 'updateUserStatus') {
						window.PureCloud.User.updateStatus(message.data);
					} else if (message.type === 'updateInteractionState') {
						window.PureCloud.Interaction.updateState(message.data);
					} else if (message.type === 'setView') {
						window.PureCloud.User.setView(message.data);
					} else if (message.type === 'updateAudioConfiguration') {
						window.PureCloud.User.Notification.setAudioConfiguration(message.data);
					} else if (message.type === 'sendCustomNotification') {
						window.PureCloud.User.Notification.notifyUser(message.data);
					}
				}
			} catch {
			}
		});
	},
	screenPop: function (searchString, interaction) {
		window.parent.postMessage(JSON.stringify({
			type: 'screenPop',
			data: { searchString: searchString, interactionId: interaction }
		}), '*')
	},
	processCallLog: function (
		callLog,
		interaction,
		eventName,
		onSuccess,
		onFailure
	) {
		window.parent.postMessage(
			JSON.stringify({
				type: 'processCallLog',
				data: {
					callLog: callLog,
					interactionId: interaction,
					eventName: eventName
				}
			}),
			'*'
		);
		let success = true;
		success ? onSuccess({ id: callLog.id || Date.now() }) : onFailure();
	},
	openCallLog: function (callLog, interaction) {
		window.parent.postMessage(
			JSON.stringify({
				type: 'openCallLog',
				data: { callLog: callLog, interaction: interaction }
			}),
			'*'
		);
	},
	contactSearch: function (searchString, onSuccess, onFailure) {
		contactSearchCallback = onSuccess;
		window.parent.postMessage(
			JSON.stringify({
				type: "contactSearch",
				data: { searchString: searchString },
			}),
			"*"
		);
	},
	/*  contactSearch: function (searchValue, onSuccess, onFailure) {
		  // Search the external CRM system and return results in the following format
		  onSuccess ([{
			  type: "external",
			  name: "",
			  phone: [{
				  number: "",
				  label: "Cell"
			  }],
			  attributes: {example_urlpop: "url"}
		  }]);
	  }, */
};

//------------------------------------------------------
function dragElement(elmnt) {
	let pos1 = 0,
		pos2 = 0,
		pos3 = 0,
		pos4 = 0;
	if (document.getElementById(elmnt.id + 'Header')) {
		// if present, the header is where you move the DIV from:
		document.getElementById(elmnt.id + 'Header').onmousedown = dragMouseDown;
	} else {
		// otherwise, move the DIV from anywhere inside the DIV:
		elmnt.onmousedown = dragMouseDown;
	}

	function dragMouseDown(e) {
		if (['button', 'input'].includes(e.target.localName)) {
			return
		}
		e = e || window.event;
		e.preventDefault();
		// get the mouse cursor position at startup:
		pos3 = e.clientX;
		pos4 = e.clientY;
		document.onmouseup = closeDragElement;
		// call a function whenever the cursor moves:
		document.onmousemove = elementDrag;
	}

	function elementDrag(e) {
		e = e || window.event;
		e.preventDefault();
		// calculate the new cursor position:
		pos1 = pos3 - e.clientX;
		pos2 = pos4 - e.clientY;
		pos3 = e.clientX;
		pos4 = e.clientY;
		// set the element's new position:
		elmnt.style.top = elmnt.offsetTop - pos2 + 'px';
		elmnt.style.left = elmnt.offsetLeft - pos1 + 'px';
	}

	function closeDragElement() {
		// stop moving when mouse button is released:
		document.onmouseup = null;
		document.onmousemove = null;
	}
}

//--------------------------------------------------------------------------------------
const styleSheets = Array.from(document.styleSheets).filter(
	(styleSheet) => !styleSheet.href || styleSheet.href.startsWith(window.location.origin)
);

function changeStylesheetRule(selector, property, value) {
	// Make the strings lowercase
	selector = selector.toLowerCase();
	property = property.toLowerCase();
	value = value.toLowerCase();
	let style = styleSheets[0]
	for (let i = 0; i < style.cssRules.length; i++) {
		if (style.cssRules[i].selectorText === selector) {
			styleSheets[0].deleteRule(i)
		}
	}
	// Add it if it does not
	styleSheets[0].insertRule(selector + ' { ' + property + ': ' + value + '; }', 0);
}

//-----------------------------------------------------------------------------------
