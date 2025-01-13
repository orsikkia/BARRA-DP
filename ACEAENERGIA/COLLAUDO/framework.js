let contactSearchCallback;
let platformClient;
let authToken;
let userId, employeeId, officialName;
let cachedUrl = {};
let queues = [];
let evt = 'notset';
let actionToConfirm;
let enableCustomLogs = false;
let scheduleCallbackPermission = false;
// let mappingGroupsTable = 'd4acb78b-5f94-4e98-9943-07d7aa981fb0';
let regexVoicemailEvent = new RegExp('v2.users..+?.voicemail.messages');
let regexRoutingStatusEvent = new RegExp('v2.users..+?.routingStatus');
let groups = [];
let allowedStatus = [];
let flowNPS; 
let transferEnable = false; 
let presenceDefinitions = {};
let recordEnable= false; 
let allowedTransfer = {};
let interactionId;
let seenInteractions = {};
let queuesById = {};
let recReasons = {};
let npsEnable = false; 
let org = `ACEA ENERGIA`;
let consultantNumber = '';
let postMessageEndInteraction = false;
let version = `1.0.29 - Collaudo`;
let interactionsMap = {};
let queuesWithSharingUrlVisible = ['a15988f7-6d20-45a8-89dd-ca7de2321de2', ]

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
            console.log('SF_END riga 38', this.ended);
            return;
        }
        console.log(`SF_END riga 41 ${this.id}`);
        this.endTime = new Date();
        console.log('SF_END riga 43', this.endTime)
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


function deleteAllCookies() {
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
  }	
  
function addInteraction(id) {
    let interaction = new Interaction(id);
    interactionsMap[id] = interaction;
    console.log('SF_ADD riga 59', interactionsMap[id]);
    return interaction;
}

function endInteraction(id) {
    let interaction = interactionsMap[id];
    if (interaction) {
        console.log('SF_END riga 64', interaction)
        interaction.endInteraction();
        return interaction.getElapsedSeconds();
    }
}

function log(message, title = 'Log', type = 'Info') {
    if (enableCustomLogs) {
        console.log(`%c${title}`, 'background: yellow; color: black; font-size: 30px', );
        console.log(`${type}: `, message);
    }
}

const toggleCustomLogs = () => {
    enableCustomLogs = !enableCustomLogs;
    return enableCustomLogs ? 'Log per debug Abilitati' : 'Log per debug Disabilitati';
};

function getDpLogo() {
    return 'https://www.technevalue.com/Logos/logo_dp_techne.png';
}

function setPlatform() {
    platformClient = require('platformClient');
    window.PureCloud.User.getAuthToken(function(token) {
        //console.log('TOKEN: ', token);
        authToken = token;
        const client = platformClient.ApiClient.instance;
        client.setAccessToken(token);
        client.setEnvironment('mypurecloud.de');
        getUserId().then(getPresenceDefinitions).then(() => { // getDataTable(mappingGroupsTable).then(data => {
            // 	allowedStatus = data.entities && data.entities.filter(s => groups.includes(s['Gruppo ID'])).map(s => s['Stato ID'])
            // 	log(allowedStatus.join(', '), 'GROUP TABLE')
            // })
        });
        updateQueuesList();
        // if (org === 'acea')
    });
}

function getPresenceDefinitions() {
    let apiInstance = new platformClient.PresenceApi();
    return apiInstance.getPresencedefinitions({
        pageNumber: 1,
        pageSize: 1000
    }).then(data => {
        data.entities.forEach(entity => (presenceDefinitions[entity.id] = entity.languageLabels['it']), );
    }).catch(err => {
        console.log('There was a failure calling getPresencedefinitions');
        console.error(err);
    });
}

function getUserId() {
    let apiInstance = new platformClient.UsersApi();

    return apiInstance.getUsersMe({
        expand: ['groups', 'employerInfo']
    }).then(data => {
        userId = data.id;
        employeeId = data.employerInfo?.employeeId;
        officialName = data.employerInfo?.officialName;
        globalUsername = data.name;
        groups = data.groups && data.groups.map(g => g.id);
        subscribeWebsocket();
    }).catch(err => {
        console.log('There was a failure calling getUsersMe');
        console.error(err);
    });
}

// function getDataTable(datatableId) {
// 	let apiInstance = new platformClient.ArchitectApi();
// 	let opts = {pageNumber: 1, pageSize: 10000, showbrief: false};
// 	return apiInstance.getFlowsDatatableRows(datatableId, opts)
// }

// function setCookie(cname, cvalue, exdays) {
// 	let d = new Date();
// 	d.setTime(d.getTime() + exdays * 60 * 60 * 1000);
// 	let expires = 'expires=' + d.toUTCString();
// 	document.cookie = cname + '=' + cvalue.toString() + ';' + expires + ';path=/';
// }

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
scriptJquery.onload = function() {
    let stand_alone = params().get('standalone') === 'true';
    console.warn('#########################');

    if (stand_alone) {} else {
        $(document).ready(function() {
            $('img[alt="Genesys Cloud Logo"]').attr('src', `${getDpLogo()}`).css('zoom', '100%').css('opacity', '0.8').css('cursor', 'auto');
            $(".btn.btn-primary.add-interaction-button.ng-binding").click(function() {
                //setTastierino();
            })

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
  .list-record {
    cursor:pointer;
    margin: 0;
    border-bottom: 1px solid #bbb;
    border-right: 1px solid #bbb;
    padding: 5px;
    font-size: 14px;
  }

  .ellipsis {
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
  }

  .list-record:hover {
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

  
  .recordings-wrapper,.transfer-wrapper {
		width: fit-content;
    height: 300px;
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

  .close-btn > i {
    color:white!important;
    margin: 5px;
  }

  .close-btn {
    background: #e04d4d;
    border: 0;
    padding: 4px;
    float: right;
    cursor:pointer;
    height: 1.8;
  }

  .list-header-recording {
    display:flex;
    justify-content:space-between;
    border-bottom: 1px solid #bbb;
    align-items: center;
  }

  .ml-8 {
    margin:0 0 0 8px!important;
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
  
  #recReasonDialog {
    position: absolute;
    padding: 0;
    width: 150px;
    background-color: rgba(255,255,255,0.9);
    z-index: 999;
  }
  
  #recReasonDialog > ul{
  	text-align: center;
  	list-style: none;
  	padding: 0;
  	margin: 0;
  }
  
  #recReasonDialog li{
    border: 1px solid;
    border-top: 0;
    padding: 6px;
    cursor: pointer;
  }
  
  #recReasonDialog li:first-child {
    border-top: 1px solid;
  }
  
  #recReasonDialog li:hover{
    background-color: rgba(225,225,225,0.9);
  }
  
  .interaction-edit {
  	display: none;
  }
  
  #confirmation-dialog {
  
    position: fixed;
    top: 10vh;
    transform: translateX(-50%);
    left: 50vw;
    padding: 15px;
    border: 1px solid #BBB;
    background: rgba(255,255,255,0.7);
    z-index: 9999;
   }
   
   .confirmation-header {
   	text-align: center;
   }
   .confirmation-dialog-action {
    display: flex;
    justify-content: space-around;
   }
   
   .confirmation-dialog-action button {
   		font-size: 16px;
   		color: white;
   		border: 0;
   		padding: 8px;
   		width: 80px;
   		background: green;
   }
   
   .bg-red {
   	background: red!important;
   }
	
  #consultInputSearch {
    margin: 6px 1px;
    border: 0;
    border-bottom: 1px solid grey;
    font-size: 15px;
  }
  
  #consultInputSearch:focus {
    outline: none;
    border-bottom: 1px solid #48a3e0;
  }
  
  @media (max-width: 550px) {
		#recReasonDialog {
				top: 0!important;
				left: 0!important;
				width: 100vw!important;
		}
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

function recCall(conversationId, status, e = undefined) {
    let api = new platformClient.ConversationsApi();
    api.getConversation(conversationId).then(data => {
        let participant;
        let attributes;
        data.participants.forEach(p => {
            if (p.purpose === 'agent')
                participant = p;
            if (p.purpose === 'customer')
                attributes = p.attributes;
        });

        // choose reason to record if attributes has more than one element
        let list = attributes.rec_reasons ? attributes.rec_reasons.split(';').map(e => e.trim()) : [];
        if (status && list.length > 1) {
            $(`#recReasonDialog`).remove();

            let $reasonsDiv = $(`
					<div class="container" id="recReasonDialog" style="top: ${e.pageY}px;left: ${e.pageX}px;">
						<ul>
							<li onclick="chooseRecReason('${conversationId}', '${participant.id}', {recording: ${status}}, null)">Annulla</li>
							${list.map(reason=>`<li onclick="chooseRecReason('${conversationId}', '${participant.id}', {recording: ${status}}, '${reason}')">${reason}</li>`, ).join('')}
						</ul>
					</div>
				`);
            $(`body`).append($reasonsDiv);
        } else {
            if (status) {
                recReasons[conversationId] = list[0] || 'empty';
            }
            api.patchConversationParticipant(conversationId, participant.id, {
                recording: status,
            }).then(() => status ? startRec(conversationId) : stopRec(conversationId), ).catch(err => console.error('err PATCH:' + JSON.stringify(err)));
        }
    }).catch(err => {
        console.log('There was a failure calling getConversation');
        console.error(err);
    });
}

function updateRegistrationList(data) {
    // console.log(data.sharingUri);
    if (!cachedUrl[data.id]) {
        cachedUrl[data.id] = data.sharingUri;
    }
}

async function retrieveUserRegistration() {
    let apiInstance = new platformClient.UserRecordingsApi();

    let opts = {
        pageSize: 100,
        // Number | Page size
        pageNumber: 1,
        // Number | Page number
        expand: ['conversation'],
        // [String] | Which fields, if any, to expand.
    };

    return apiInstance.getUserrecordings(opts).then(data => {
        let recordings = data.entities.map(r => {
            return {
                id: r.id,
                date: moment(r.dateCreated).format('DD/MM/YYYY HH:mm'),
                duration: Math.floor(r.durationMilliseconds / 1000),
                number: r.conversation.participants.find(p => p.purpose !== 'user').address,
            };
        });
        mapAllInfoOfRecordings(recordings).then(infoRecordings => {
            log(infoRecordings, 'infoRecordings');
            $('.rec-list').empty();
            infoRecordings.forEach((r, i) => appendAnchorToList({
                ...r,
                index: i
            }), );
        });
        //for (i = 0; i < recordings.length; i++) {
        //  infoRecordings.push(await getURLRecording({...recordings[i], index: i}));
        //}
    }).catch(err => {
        console.log('There was a failure calling getUserrecordings');
        console.error(err);
    });
}

async function mapAllInfoOfRecordings(recordings) {
    let apiInstance = new platformClient.ContentManagementApi();

    let sharingUrls = recordings.map(record => {
        return new Promise(resolve => {
            let documentId = record.id;
            // String | Document ID
            return apiInstance.getContentmanagementDocument(documentId, {}).then(data => {
                cachedUrl[record.id] = data.sharingUri;
                record.sharingUri = data.sharingUri;
                resolve(data);
            }).catch(err => {
                console.log('There was a failure calling getContentmanagementDocument', );
                console.error(err);
            });
        });
    });
    return Promise.all(sharingUrls).then(() => recordings);
}

function appendAnchorToList(record) {
    $('.rec-list').append(`<li><p class="list-record ellipsis link" onclick="copyToClipboard('${record.sharingUri}', 'Url copiato')">
  <span class="rec-index">${record.index + 1} - </span>${record.number}<br>
  <span class="list-time">${record.date} - ${record.duration}s</span></p></li>`);
}

function copyToClipboard(text, alertMsg = 'Url copiato') {
    if (window.clipboardData && window.clipboardData.setData) {
        // Internet Explorer-specific code path to prevent textarea being shown while dialog is visible.
        snackbarAlert('Url copiato', 'info', 2000);
        return window.clipboardData.setData('Text', text);
    } else if (document.queryCommandSupported && document.queryCommandSupported('copy')) {
        let textarea = document.createElement('textarea');
        textarea.textContent = text;
        textarea.style.position = 'fixed';
        // Prevent scrolling to bottom of page in Microsoft Edge.
        document.body.appendChild(textarea);
        textarea.select();
        try {
            snackbarAlert(alertMsg, 'info', 2000);
            return document.execCommand('copy');
            // Security exception may be thrown by some browsers.
        } catch (ex) {
            console.warn('Copy to clipboard failed.', ex);
            return false;
        } finally {
            document.body.removeChild(textarea);
        }
    }
}

function snackbarAlert(message, type, timeout) {
    let payload = {
        message,
        type,
        timeout
    };
    window.PureCloud.User.Notification.notifyUser(payload);
}

function hideInStatusMenu() {
    angular.element('#statusListArrow_test').scope().allStatuses.forEach(s => {
        if (s.subStatus && s.subStatus.length) {
            let substatuses = s.subStatus.filter(ss => allowedStatus.includes(ss.id), );
            s.subStatus = substatuses.length ? substatuses : undefined;
        }
    });
}

function addNoteToVoicemail(element, note = '') {
    element.find('.note-content').remove();
    if (note) {
        let notes = note.split('\n').filter(e => e);
        if (notes.length > 1) {
            if (notes[0].slice(10) === notes[1].slice(16)) {
                notes.pop();
            }
        }
        notes.forEach(n => {
            element.find('span.user-voicemail-data').eq(1).after('<span class="user-voicemail-data note-content ng-binding">' + n + '</span>', );
        });
    }
}

function replaceParticipant(conversationId, participantId, transferId) {
    let apiInstance = new platformClient.ConversationsApi();
    let body = {
        address: transferId,
    };
    //console.log(conversationId, participantId)
    apiInstance.postConversationParticipantReplace(conversationId, participantId, body).then(() => {
        disconnectConsultant(conversationId);
        toggleNPS(false);
    }).catch(err => console.log('There was a failure calling postConversationParticipantReplace', err, ), ).finally(() => {
        setTimeout(() => toggleNPS(false), 5000);
    });
}

function disconnectConsultant(conversationId) {}

function consultParticipant(conversationId, customerPartecipantId, agentParticipantId, transferId, ) {
    let apiInstance = new platformClient.ConversationsApi();
    $('.transfer-wrapper').addClass('hidden');
    toggleConfirmationDialog();
    let body = {
        destination: {
            address: transferId
        }
    };
    consultantNumber = transferId;
    return apiInstance.postConversationsCallParticipantConsult(conversationId, customerPartecipantId, body, ).then(() => {
        $('li[onclick="toggleTransfer()"]').attr('onclick', `toggleConfirmationDialog('Vuoi trasferire la chiamata?', function() {
				updateParticipant('${conversationId}', '${agentParticipantId}', {state:'disconnected'})
				})`, );
    });
}


function updateParticipant(conversationId, customerPartecipantId, body) {
    let apiInstance = new platformClient.ConversationsApi();
    //console.log(conversationId, participantId)
    return apiInstance.patchConversationParticipant(conversationId, customerPartecipantId, body).then(() => {
        $('li[onclick^="toggleConfirmationDialog("]').attr('onclick', 'toggleTransfer()', );
    });
}

function completeInfoVoicemail() {
    const voicemailItems = $('.user-voicemail-item');
    log(`searching... ${voicemailItems.length}`, 'voicemail', 'info');
    if (voicemailItems.length) {
        voicemailItems.each(function(index) {
            let v = angular.element('.user-voicemail-item').eq(index).scope().v;
            addNoteToVoicemail($(this), v.note);
            $(this).find('[ng-click="toggleRead(v)"], .user-voicemail-data-block').click(function() {
                if (!angular.element($(this)).scope().v.read || $(this).hasClass('user-voicemail-data-block')) {
                    addNote(v.id, v.note).then(voicemail => {
                        v.note = voicemail.note;
                        addNoteToVoicemail($(this), voicemail.note);
                    }).catch(err => console.error(err));
                }
            });
        });
    } else {
        setTimeout(completeInfoVoicemail, 1000);
    }
}

function addNote(messageId, currNote) {
    let notes = (currNote && currNote.split('\n')) || [];
    let newNote = `Ultimo ascolto: ${globalUsername} il ${new Date().toLocaleString()}.`;
    if (notes.length > 0) {
        newNote = notes[0] + '\n' + newNote;
    } else {
        newNote = `Aperta da ${globalUsername} il ${new Date().toLocaleString()}.` + '\n' + newNote;
    }
    let apiInstance = new platformClient.VoicemailApi();
    let body = {
        read: true,
        deleted: false,
        note: newNote,
    };
    return apiInstance.putVoicemailMessage(messageId, body);
}

/// DEBUGGING FUNCTION
function removeNotes() {
    let apiInstance = new platformClient.VoicemailApi();
    let body = {
        read: false,
        deleted: false,
        note: '',
    };
    $('.user-voicemail-item').each(function(index) {
        let v = angular.element($(this)).scope().v;
        apiInstance.putVoicemailMessage(v.id, body).then(() => {
            v.note = '';
            addNoteToVoicemail($(this), '');
        });
    });
}

function checkInteractionHasQueue() {
    let queueInput = $('.dial-queue-input');
    let addressInput = $('.target-address-input');
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
    console.log('recIcons new', recIcons)
    recIcons.css('color', 'white');
    recIcons.css('cursor', 'pointer');
    recIcons.removeAttr('ng-click');
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
    console.log('recIcons', recIcons)
    recIcons.css('color', 'red');
    recIcons.unbind('click');
    recIcons.click(e => recCall(conversationId, false, e));
}

function stopRec(conversationId) {
    log(undefined, 'stopRec');
    let recIcons = $('li[data-call-control="record"] > i');
    recIcons.css('color', 'white');
    recIcons.unbind('click');
    recIcons.click(e => recCall(conversationId, true, e));
}

function toggleRecentRecordings() {
    let wrapper = $('.recordings-wrapper');
    wrapper.toggleClass('hidden');
    if (wrapper.is(':visible')) {
        retrieveUserRegistration();
    }
}

function toggleTransfer(forceClose = false) {
    let wrapper = $('.transfer-wrapper');
    if (forceClose) {
        return wrapper.addClass('hidden');
    }
    wrapper.toggleClass('hidden');
    if (wrapper.is(':visible')) {
        $('#consultInputSearch').keyup(e => filterConsultant(e));
        updateTransfer({
            id: interactionId
        });
    }
}
function toggleTransferQueue(forceClose = false) {
    let wrapper = $('.transfer-wrapper');
    if (forceClose) {
        return wrapper.addClass('hidden');
    }
    wrapper.toggleClass('hidden');
    if (wrapper.is(':visible')) {
      
        updateTransferQueueId({
            id: interactionId
        });
    }
}

function hideControl(selector) {
    let wrapper = $(selector);
    if (wrapper.is(':visible')) {
        wrapper.hide();
    }
    setTimeout(() => {
        if (wrapper.is(':visible')) {
            hideControl(selector);
        }
    }, 1000);
}

function subscribeWebsocket() {
    try {
        let apiInstance = new platformClient.NotificationsApi();
        let topics_array = [{
            id: `v2.contentmanagement.workspaces.${userId}.documents`
        }, {
            id: `v2.users.${userId}.voicemail.messages`
        }, {
            id: `v2.users.${userId}.routingStatus`
        }, ];
        apiInstance.postNotificationsChannels().then(data => {
            apiInstance.postNotificationsChannelSubscriptions(data.id, topics_array);
            let websocket = new WebSocket(data.connectUri);
            websocket.onmessage = msg => websocketEvent(JSON.parse(msg.data));
        });
    } catch (ex) {
        console.error(ex);
    }
}

function websocketEvent(event) {
    if (event.eventBody.name === 'Recording' && event.metadata.action === 'create' && event.metadata.status === 'complete') {
        log(event, 'WEBSOCKET');
        if (!cachedUrl[event.eventBody.id])
            updateSharingUrl(event.eventBody.id).then(registration => {
                console.log('registration', registration);
                let queue
                try {
                    queue = registration.conversation.participants.filter(p => p.purpose === 'customer')[0].queueId;
                } catch (e) {
                    console.error(e);
                }
                return getSharingUrl(registration, queue)
            });
    }
    // Case change voicemail
    if (regexRoutingStatusEvent.test(event.topicName)) {
        if (event.eventBody.routingStatus?.status === 'IDLE') {
            updateInteractionStatus();
        }
    }
  /*  if (regexVoicemailEvent.test(event.topicName)) {
        if (event.eventBody.action === 'note-modified') {
            $('.user-voicemail-item').each(function(index) {
                let v = angular.element($(this)).scope().v;
                if (v.id === event.eventBody.id) {
                    addNoteToVoicemail($(this), event.eventBody.note);
                }
            });
        }
    } rimosso per problemi barra che nn si carica*/ 
}

function getSharingUrl(registration, queue) {
    if (!registration) {
        return;
    }
    let apiInstance = new platformClient.ContentManagementApi();

    let documentId = registration.id;
    // String | Document ID

    return apiInstance.getContentmanagementDocument(documentId, {}).then(data => {
        if (!cachedUrl[data.id]) {
            let msg = ': Registrazione Completata con Successo.'
            if (queue && queuesWithSharingUrlVisible.includes(queue)) {
                msg += '<br><a href=' + data.sharingUri + '>Scarica Registrazione</a>'
            }
            let newWindow = window.open('', `Registrazione`, 'width=600,height=50,top=30,resizable=no', );
            newWindow.document.write(moment().format('DD-MM-YYYY HH:mm:ss') + msg + '<br>', );
            let info = {
                audioFilePath: data.sharingUri,
                recType: recReasons[registration.conversation.id] || '',
                endRec: moment(registration.dateCreated).add(registration.durationMilliseconds, 'ms').utc().format(),
                startRec: moment(registration.dateCreated).utc().format(),
                CallID: registration.conversation.id,
            };
            console.log('SF_REC ', 'AudioPath ' + info.audioFilePath, 'RecType ' + info.recType, 'EndRec ' + info.endRec, 'StartRec ' + info.startRec, 'CallIDRec ' + info.CallID)
            if (org === `ACEA ENERGIA`) {
                window.parent.postMessage(JSON.stringify({
                    type: 'newVoicemailRecorded',
                    data: info
                }), '*', );
            }
            updateRegistrationList(data);
        }
    }).catch(err => console.error(err));
}

function getUserRecording(recordingId) {
    let apiInstance = new platformClient.UserRecordingsApi();

    let opts = {
        expand: ['conversation']
    };

    return apiInstance.getUserrecording(recordingId, opts).then(data => data).catch(err => {
        console.log('There was a failure calling getUserrecording');
        console.error(err);
    });
}

function getConversationAttributes(id) {
    let apiInstance = new platformClient.ConversationsApi();
    return apiInstance.getConversation(id).then(data => {
        let participant = data?.participants.find(participant => participant.purpose === 'customer', ) || data?.participants.find(participant => participant.purpose === 'external', );
        return participant && participant.attributes;
    }).catch(err => {
        console.log('There was a failure calling getConversation');
        console.error(err);
    });
}

async function updateSharingUrl(id) {
    let registration = await getUserRecording(id);
    ///////////ERROR 500
    //return registration
    /////////////
    let attributes = await getConversationAttributes(registration?.conversation.id, );
    let groupId = attributes?.Id_Gruppo;
    if (!groupId)
        return registration;
    let apiInstance = new platformClient.ContentManagementApi();
    let body = {
        sharedEntityType: 'DOCUMENT',
        sharedEntity: {
            id: id
        },
        memberType: 'GROUP',
        member: {
            id: groupId
        },
    };
    // Object | CreateShareRequest - entity id and type and a single member or list of members are required

    return apiInstance.postContentmanagementShares(body).then(() => {
        log(undefined, 'postContentmanagementShares');
        return registration;
    }).catch(err => {
        console.log('There was a failure calling postContentmanagementShares');
        console.error(err);
    });
}

function updateQueuesList(pageNumber) {
    let apiInstance = new platformClient.RoutingApi();

    let opts = {
        pageSize: 200,
        // Number | Page size
        pageNumber: pageNumber || 1,
        // Number | Page number
        sortBy: 'name',
        // String | Sort by
    };

    // console.log(opts)
    apiInstance.getRoutingQueues(opts).then(data => {
        queues = queues.concat(data.entities.map(e => e.name));
        data.entities.forEach(e => {
            queuesById[e.id] = e.name;
        });
        if (data.pageNumber < data.pageCount) {
            updateQueuesList(parseInt(data.pageNumber) + 1);
        }
    }).catch(err => {
        console.log('There was a failure calling getRoutingQueues');
        console.error(err);
    });
}

function hideInBurgerMenu() {
    // Remove Genesys Cloud Button
    if (!scheduleCallbackPermission) {
        $('i.fa-calendar').next("span:contains('Agent Schedule')", "span:contains('Pianificazione Agente')", ).parent().parent().hide();
    }
    $('[ng-click="getHelpLink($event)"]').parent().remove();
    $('[ng-click="goToPureCloud()"]').parent().remove();
    $('#navCallLog').parent().hide();
    $('.dropdown-toggle').not('#statusListArrow_test').unbind('click').click(hideInBurgerMenu);
    $('[ng-click="goToMore($event)"]').unbind('click').click(hideInBurgerMenu);
    $('li[ng-if="navCategory == \'more\'"] > a').first().unbind('click').click(hideInBurgerMenu);
}

function completeCallHistoryWithId(count = 0) {
    setTimeout(() => {
        if ($('div.call-history-ui')[0].__vue__.callHistory.length) {
            $('div.call-history-ui')[0].__vue__.callHistory.forEach(function (i, index) {
                let scope = i;
                let callid = scope.call.id;
                $('.call-history-item').eq(index).attr('callid', callid);
                    })
                 }
                else {console.log('non pronti i dati')}
                 if ($('.call-history-item').length > 0) {
                 $('.call-history-item').each(function (index) {												 
                let id = $(this).attr("callid");
    
    
                 $(this).find('.call-history-content').append(`<span class='copy-from-interaction interaction-id' onclick="copyToClipboard('${id}', 'Valore copiato')">${id}\n</span>`)
                 
                $('.call-history-item').find('.call-history-address > bdi').addClass('copy-from-interaction').click(function () {
                    copyToClipboard(this.innerText, 'Valore copiato')
                   }) 
            })  
        } else if (count < 10) {
            setTimeout(() => completeCallHistoryWithId(count + 1), 500)
         } 
    }, 500)}


function addCheckOnList() {
    $('.dropdown-menu>li').click(checkInteractionHasQueue);
}

function updateInteraction(status) {
    if (!interactionId)
        return;
    let payload = {
        action: status,
        id: interactionId,
    };
    window.PureCloud.Interaction.updateState(payload);
}

function changeStatus(status) {
    payload = {
        id: status
    };
    window.PureCloud.User.updateStatus(payload);
}

function addStringToInteraction(id, string, count) {
    let interactionId = id && id.split('_')[0];
    let interactionDiv = getInteractionDiv(interactionId);
    if (seenInteractions[id])
        return;
    if (!count)
        count = 1;
    if (count > 10)
        return;
    if (!interactionDiv) {
        setTimeout(() => addStringToInteraction(id, string, count + 1), 500);
        return;
    }
    interactionDiv.find('span.call-queuename>span').first().after(`<br><span class='copy-from-interaction' onclick="copyToClipboard('${string}', 'Valore copiato')">${string}\n</span>`, );
    interactionDiv.find('span.interaction-data:nth-child(3)>span').click(function() {
        copyToClipboard(this.innerText, 'Valore copiato');
    });
    interactionDiv.find('span.interaction-data:nth-child(3)>span').addClass('copy-from-interaction');

    seenInteractions[id] = true;
}

function toggleNPS(activate) {
    if (activate) {
        $('i.icon-hangup.nps').show();
        $('.hungup').hide();
        console.log('activate nps')
    } else {
        $('i.icon-hangup.nps').hide();
        $('.hungup').show();
        console.log('non activate nps')
    }
}

function blockQueues(cq, cw) {
	let countQueue = cq || 0;
	let countWatermark = cw || 0;
	let queueScope = $('.purecloud-queues-ui')[0].__vue__._setupState
    let watermarkScope =  $('#interactionList')[0].__vue__.$parent
			
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

let changes = 0;
//CSS value for font-size
let size = ['smaller', 'small', 'medium', 'large', 'x-large'];

function fontSize(bigger) {
    let selector1 = '.interaction-data';
    let selector2 = 'span.interaction-data.interaction-name > span';
    // 'changes' checks if is value from array is out of bound
    if (bigger) {
        if (changes >= 2)
            return;
        changes++;
        changeStylesheetRule(selector1, 'font-size', `${size[changes + 2]}!important`, );
        changeStylesheetRule(selector2, 'font-size', `${size[changes + 2]}!important`, );
    } else {
        if (changes <= -2)
            return;
        changes--;
        changeStylesheetRule(selector1, 'font-size', `${size[changes + 2]}!important`, );
        changeStylesheetRule(selector2, 'font-size', `${size[changes + 2]}!important`, );
    }
}

function chooseRecReason(conversationId, participantId, body, reason) {
    $(`#recReasonDialog`).remove();
    if (!reason)
        return;
    recReasons[conversationId] = reason;
    let api = new platformClient.ConversationsApi();
    return api.patchConversationParticipant(conversationId, participantId, body).then(() => body.recording ? startRec(conversationId) : stopRec(conversationId), ).catch(err => console.error('err PATCH:' + JSON.stringify(err)));
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
    $('[ng-click="goToMore($event)"]').unbind('click').click(hideInBurgerMenu);
    $('li[ng-if="navCategory == \'more\'"]').first().unbind('click').click(hideInBurgerMenu);
    $('#navUserInbox').click(function () { completeCallHistoryWithId(); });
  //  $('[ng-click="goToUserInbox()"]').click(() => completeCallHistoryWithId());
   // $('[ng-click="goToCallHistory()"]').click(() => completeCallHistoryWithId());
    $('#statusListArrow_test').unbind('click').click(hideInStatusMenu);
    $('[ng-click="returnToStatusMenu($event)"]').unbind('click').click(hideInStatusMenu);
    $('[ng-click="statusDropDownClicked()"]>li').unbind('click').click(hideInStatusMenu);
    // Add Versioning after element
    $('.btn-group.top-btn.pull-left.dropdown').after(`<div class="versioning">Version: ${version}</div>`, );
    // Add NPS button
  //  let hungupBtn = $('[ng-click="disconnect()"]');
    let hungupBtn = $('gef-disconnect-control');
    hungupBtn.addClass('hungup');
    hungupBtn.after(`
	<i class="icon-hangup nps" style="display: none; font-size: 23px;position:absolute;margin: 6px 12px;color:white;cursor:pointer"></i>"
            tooltip-placement="bottom" tooltip-append-to-body="true" uib-tooltip="Disconnetti"`);
    // Add Registrazioni dialog
    //$('li[data-call-control="record"]').html(`
//		<i class="fa fa-circle fa-lg" style="font-size: 23px;padding-top: 11px;color:white;cursor:pointer" tooltip-placement="bottom" tooltip-append-to-body="true"></i>
//	`);
    $('.interaction-call-control-container > .call-control-list > [data-call-control="record"]', ).after(`
<!--            <li style="order: 3; display: block;" data-call-control="flag" onclick="toggleRecentRecordings()">-->
<!--              <i class="fa fa-headphones fa-lg" uib-tooltip="Lista Registrazioni" style="font-size: 23px;padding-top: 11px;color:white;cursor:pointer"-->
<!--                tooltip-placement="bottom" tooltip-append-to-body="true"></i>-->
<!--            </li>-->
            <li style="order: 3; display: none;" data-call-control="flag" onclick="toggleTransfer()">
              <i class="fa fa-arrow-right fa-lg" style="font-size: 23px;padding-top: 11px;color:white;cursor:pointer"
                tooltip-placement="bottom" tooltip-append-to-body="true"></i>
            </li>
            <li style="order: 3; display: none;" data-call-control="flag" onclick="toggleTransferQueue()">
            <i class="fa fa-arrow-right fa-lg" style="font-size: 23px;padding-top: 11px;color:white;cursor:pointer"
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
    $('.interaction-call-control-container').css('display', 'flex');
    $('body').first().after(`
      <div class="recordings-wrapper hidden" id="draggableList">
          <div class="header" id="draggableListHeader">
              <div class="list-header-recording">
                <h4 class="ml-8">Registrazioni</h4>
                <div onclick="toggleRecentRecordings()" class="close-btn">
                  <i class="fa fa-close"></i>
                </div>
            </div>
          </div>
          <div class="rec-list">
          </div>
      </div>
      
      
      <div class="transfer-wrapper hidden" id="draggableList5">
      <div class="header" id="draggableListHeader">
          <div class="list-header-recording">
            <h4 class="ml-8">Consulta</h4>
            <div onclick="toggleTransfer()" class="modal-header-btn modal-close">
              <i class="fa fa-close fa-2x"></i>
	  </div>
       
        </div>
      </div>
      <div>
          	<input id="consultInputSearch" type="text" placeholder="Cerca Contatti">
					</div>
          <div class="transfer-list">
          </div>
      </div>
      <div class="hidden" id="confirmation-dialog">
          <div class="header">
              <div class="confirmation-header">
                <h4 id="confirmation-dialog-title">Confermi di voler trasferire?</h4>
            </div>
          </div>
          <div class="confirmation-dialog-action">
          	<button onclick="confirmDialog()">
          		Si
						</button>
						<button class="bg-red" onclick="toggleConfirmationDialog()">
							Annulla
						</button>
          </div>
      </div>
      `);
    dragElement(document.getElementById('draggableList'));
    dragElement(document.getElementById('draggableList5'));
    //completeInfoVoicemail(); rimosso per problemi barra che nn si carica
    ['securePause', 'dtmf', 'scheduleCallback', 'transfer', 'record'].forEach(c => $(`[data-call-control="${c}"]`).hide(), );
    //$('i.icon-logo-genesys-cloud').parent().parent().hide();
}

function filterConsultant(e) {
    let filter = e.target.value;
    $('.transfer-list li').each(function() {
        let text = $(this).find('p').text();
        let lowerText = text.trim().toLowerCase();
        let match = lowerText.includes(filter);
        match ? $(this).show() : $(this).hide();
    });
}


// function waitLoader() {
// 	let loaded = $('.spinner-container').hasClass('ng-hide')
// 	if (loaded) {
// 		startingSetup();
// 	} else {
// 		setTimeout(waitLoader, 500)
// 	}
// } rimosso per provare intanto  a fissare il pb improvviso di barra che nn si carica

function waitLoader() {

	// let loaded = $('.spinner-container').hasClass('ng-hide')
	let spinner = $('.spinner-container')[0].outerHTML
	if (spinner.includes("<div class=\"spinner-container\" style=\"display: none;\"><i class=\"fa fa-spinner fa-spin fa-5x\"></i></div>")) {
		startingSetup();
	}
	else {
		setTimeout(waitLoader, 500)
	}
}


function createInterval(f, dynamicParameter, interval, id) {
    window[`hold_${id}`] = setInterval(function() {
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
    let interactions = $('.interactions').parent().parent();
    let interaction;
    interactions.each(function(index) {
        let angularElement = angular.element($(this));
        let conversationId = angularElement.scope()?.s?.id;
        if (conversationId === id) {
            interaction = $(this);
        }
    });
    if (interaction.length) {
        createInterval(interactionEl => {
            const scope = angular.element(interactionEl).scope();
            const me = scope?.s.me;
            if (me?.isHeld) {
                const startHold = me.participantInteraction.startHoldTime;
                let diff = new Date() - new Date(startHold);
                let diffInSeconds = parseInt(diff / 1000);
                if (interactionEl.find('#holdingTime').length) {
                    interactionEl.find('#holdingTime').text(` - ${moment.utc(diffInSeconds * 1000).format('mm:ss')} In Attesa\n`, );
                } else {
                    interactionEl.find('span.salesforce-calltimeelapsed>span').first().after(`<span id="holdingTime"> - ${moment.utc(diffInSeconds * 1000).format('mm:ss')} In Attesa\n</span>`, );
                }
            } else {
                interactionEl.find('#holdingTime').remove();
            }
        }, interaction.first(), 1000, id, );
    }
}





function startSecureIvrSession(flowId, conversationId) {
	let participantId;
	let api = new platformClient.ConversationsApi();
	return api.getConversation(conversationId).then(data => {
		data.participants.forEach(p => {
			if (p.purpose === 'customer') participantId = p.id;
		});
		let apiInstance = new platformClient.ConversationsApi();
		let opts = {
			body: {
				sourceParticipantId: '',
				flowId,
				userData: [employeeId, officialName].filter(e => e).join('-'),
				disconnect: false,
			},
		};

		apiInstance
			.postConversationParticipantSecureivrsessions(
				conversationId,
				participantId,
				opts,
			)
			.then(() => {
				snackbarAlert(
					'In corso Agent Greeting, Attendere la fine del messaggio',
					'error',
					6000,
				);
				if (isNewAction(`speak_${conversationId}`)) {
					speak("risponde l'operatore " + employeeId);
				}
			})
			.catch(err => {
				console.log(
					'There was a failure calling postConversationParticipantSecureivrsessions',
				);
				console.error(err);
			});
	});
}






function speak(msg) {
    let speech = new SpeechSynthesisUtterance();
    speech.lang = 'it';
    speech.text = msg;
    speech.rate = 0.8;
    speech.pitch = 0.8;
    let voices = window.speechSynthesis.getVoices().filter(v => v.lang === 'it-IT');
    console.log(window.speechSynthesis.getVoices());
    console.log(voices);
    speech.voice = voices[voices.length - 1];

    window.speechSynthesis.speak(speech);
}

function checkIfNotRespondingPopup(i = 0) {
    let isPopupHidden = $('div#notRespondingController_test').css('display')
    if (isPopupHidden == 'block') {
        updateInteractionStatus('Not Responding');
        //$('#notRespondingOffQueue_test')[0].click()
        //let changeInterval = setInterval(() => changeStatus('BREAK'), 400);
        //setTimeout(() => clearInterval(changeInterval), 2000)
    } else if (i < 50) {
        setTimeout(() => checkIfNotRespondingPopup(i + 1), 50);
    }
}

function updateInteractionStatus(status) {
    let el = $('#interaction_status_span');
    if (!el[0]) {
        $('#status_test>span').after(`<span id="interaction_status_span"></span>`);
        el = $('#interaction_status_span');
    }
    $('.top-bar.status-bar').css('background-color', status === 'Not Responding' ? '#f33' : '', );
    el.text(status ? ` - ${status}` : ``);
}

function patchConversationParticipantAttributes(conversationId, participantId, body, ) {
    let apiInstance = new platformClient.ConversationsApi();
    return apiInstance.patchConversationParticipantAttributes(conversationId, participantId, {
        attributes: body,
    }).catch(err => console.log('There was a failure calling patchConversationParticipantAttributes', err, ), );
}

async function tagNodes(event, interaction) {
    if (org === `ACEA ENERGIA`) {
        let mapping = {
            connect: {
                aemkt: `75`,
                aemkl: `9`,
                aegas: `132`
            },
            nps: {
                aemkt: `76`,
                aemkl: `10`,
                aegas: `133`
            },
            hangup: {
                aemkt: `83`,
                aemkl: `175`,
                aegas: `175`
            },
        };

        let conversation = await getConversation(interaction.id);
        let customer = conversation.participants.find(p => p.purpose === 'customer', );
        console.log(interaction);
        if (!customer.attributes['called_service']) {
            return;
        }
        if (!mapping[event][customer.attributes['called_service']]) {
            return;
        }
        // console.log(customer.attributes)
        let value = event === `hangup` ? 'CUSTOMER_DISCONNECT' : '';
        let flagId = mapping[event][customer.attributes['called_service']?.toLowerCase()];
        let string = `${customer.attributes['ELENCO TAG NODI']}\n${flagId},${new Date().toISOString()},${interaction.id},${value},,,,,,,,,,,${customer.ani}`;
        let body = {
            'ELENCO TAG NODI': string
        };
        patchConversationParticipantAttributes(interaction.id, customer.id, body);
    }
}

function patchConversationParticipant(conversationId) {
    let apiInstance = new platformClient.ConversationsApi();
    apiInstance.getConversation(conversationId).then(data => {
        let participant = data.participants.find(p => p.userId === userId);
        let body = {
            wrapup: {
                code: '27bf550a-9735-4f57-a258-621d04b1c3fd',
            },
        };
        console.log(participant);
        apiInstance.patchConversationParticipant(conversationId, participant.id, body).then(() => {
            console.log('patchConversationParticipant returned successfully.');
        }).catch(err => {
            console.log('There was a failure calling patchConversationParticipant', );
            console.error(err);
        });
    }).catch(err => {
        console.log('There was a failure calling getConversation');
        console.error(err);
    });
}

function getParticipant(interactionId, purpose, takeFirst = false) {
    let api = new platformClient.ConversationsApi();
    return api.getConversation(interactionId).then(data => {
        let participant;
        if (takeFirst) {
            return data.participants.find(p => p.purpose === purpose);
        } else {
            data.participants.forEach(p => {
                if (p.purpose === purpose) {
                    participant = p;
                }
            });
            return participant;
        }
    });
}


function setNPS() {
    getParticipant(interactionId, 'agent').then(participant => {
        console.log('participant riga 1442', participant);
        toggleNPS(true);
        npsEnable =  true; 
        let npsBtn = $('.nps');
        console.log('nps', npsBtn)
        npsBtn.unbind('click');
        npsBtn.click(() => {
            console.log('riga 1638' , ($('.consult-participants-container')))
            if ($('.consult-participants-container').is(':visible')) {
                let customerSelected = $(`.consult-participant .sel:not(:contains("${consultantNumber}"))`, );
                let isCustomerSelected = customerSelected.length;
                if (isCustomerSelected) {
                    $(`.consult-participant:contains("${consultantNumber}")`, ).find('span').click();
                    $('gef-disconnect-control').first().click();
                    //$('[ng-click="disconnect()"]').first().click();
                    setTimeout(() => {
                        tagNodes('nps', interactionId);
                        replaceParticipant(interactionId, participant.id, flowNPS, );
                    }, 1000);
                }
                return $('gef-disconnect-control').first().click(); // $('[ng-click="disconnect()"]').first().click();
            } else {
                tagNodes('nps', interactionId);
                replaceParticipant(interactionId, participant.id, flowNPS, );
            }
        });
    }).catch(err => {
        console.log('There was a failure calling getConversation');
        console.error(err);
    });
}


async function updateTransferEvt(interaction) {
    console.log(interaction);
    let agentParticipant = await getParticipant(interactionId, 'agent');
    //transfer
    let customerParticipant = await getParticipant(interactionId, 'customer', true, );
    // consult
    // hide nav nav-pills on click transfer
    $('.transfer-list').empty();
    $('[onclick="toggleTransfer()"]').show();
    Object.values(allowedTransfer).forEach((r, i) => $('.transfer-list').append(`
				<li><p class="list-record ellipsis link"
				onclick="toggleConfirmationDialog('Vuoi avviare la consultazione?', function() {
					consultParticipant('${interaction.id}', '${customerParticipant.id}', '${agentParticipant.id}', '${r.id}')
				})">
				<span class="rec-index">${i + 1} - </span>${r.name}<br></li>
		`), );
}


function replaceParticipantTransferQueue(conversationId, participantId, transferId) {
    let apiInstance = new platformClient.ConversationsApi();
    let body = {
        address: transferId,
    };
    //console.log(conversationId, participantId)
    apiInstance.postConversationParticipantReplace(conversationId, participantId, body).then(() => {
        disconnectConsultant(conversationId);
    }).catch(err => console.log('There was a failure calling postConversationParticipantReplace', err, ), ).finally(() => {
    });
}

async function updateTransferQueueId(interaction) {
    console.log(interaction);
    let agentParticipant = await getParticipant(interactionId, 'agent');
			  
    let customerParticipant = await getParticipant(interactionId, 'customer', true, );
			  
										   
    $('.transfer-list').empty();
    $('[onclick="toggleTransferQueue()"]').show();
    Object.values(allowedTransfer).forEach((r, i) => $('.transfer-list').append(`
    <li><p class="list-record ellipsis link"
    onclick="toggleConfirmationDialogQueue('Vuoi trasferire la chiamata?', function() {
        replaceParticipantTransferQueue('${interaction.id}', '${agentParticipant.id}', '${r.id}')
    })">
    <span class="rec-index">${i + 1} - </span>${r.name}<br></li>
`) , );
    
}



async function updateTransfer(interaction) {
    console.log(interaction);
    let agentParticipant = await getParticipant(interaction.id, 'agent');
    //transfer
    let customerParticipant = await getParticipant(interaction.id, 'customer', true, );
    // consult
    // hide nav nav-pills on click transfer
    $('.transfer-list').empty();
    $('[onclick="toggleTransfer()"]').show();
    Object.values(allowedTransfer).forEach((r, i) => $('.transfer-list').append(`
				<li><p class="list-record ellipsis link"
				onclick="toggleConfirmationDialog('Vuoi avviare la consultazione?', function() {
					consultParticipant('${interaction.id}', '${customerParticipant.id}', '${agentParticipant.id}', '${r.id}')
				})">
				<span class="rec-index">${i + 1} - </span>${r.name}<br></li>
		`), );
}

function toggleConfirmationDialog(msg = false, cb = undefined) {
    if (!$('.consult-participants-container').is(':visible') && $('li[onclick^="toggleConfirmationDialog("]').length) {
        $('li[onclick^="toggleConfirmationDialog("]').attr('onclick', 'toggleTransfer()', );
        return toggleTransfer();
    }
    let wrapper = $('#confirmation-dialog');
    actionToConfirm = cb;
    if (msg) {
        wrapper.removeClass('hidden');
        $('#confirmation-dialog-title').text(msg);
    } else {
        wrapper.addClass('hidden');
    }
}

function toggleConfirmationDialogQueue(msg = false, cb = undefined) {
    if (!$('.consult-participants-container').is(':visible') && $('li[onclick^="toggleConfirmationDialogQueue("]').length) {
        $('li[onclick^="toggleConfirmationDialogQueue("]').attr('onclick', 'toggleTransferQueue()', );
        return toggleTransferQueue();
    }
    let wrapper = $('#confirmation-dialog');
    actionToConfirm = cb;
    if (msg) {
        wrapper.removeClass('hidden');
        $('#confirmation-dialog-title').text(msg);
    } else {
        wrapper.addClass('hidden');
    }
}

function confirmDialog() {
    if (actionToConfirm) {
        actionToConfirm();
    }
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
            // 'mypurecloud.de': 'f9621e16-6936-47f5-8b48-eb9dd59b85f4' // ACEA
            'mypurecloud.de': 'e02b173c-f25a-4384-8630-85290102de16',
            // ACEA-ENERGIA
        },
        customInteractionAttributes: ['PT_URLPop', 'PT_SearchValue', 'PT_TransferContext', 'SF_Action', 'SF_URLPop', 'SF_apexClass', 'SF_methodName', 'CRM_URLPop', 'SF_methodParams', 'Id_Gruppo', 'enableControls', 'toBeDisplayedInInteraction', 'toBeTransferred', 'send_voicemails', 'AgentGreeting', 'ELENCO TAG NODI', 'called_service', 'callcenterphone', 'rec_reasons', 'EtichetteTrasf', 'open_interaction', 'NumeriTrasf', 'codatrasf',  'channel_type', 'custom_subchannel', 'c__interlocutoremail', 'c__interlocutornationalidentitynumber', 'ChatbotSummary__c', ],
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
                // primary: '#53cb7d', // local
                //primary: '#e27f7f', // Sviluppo
                 primary: '#b5b5b5', // Collaudo
                //	primary: '#55bada', // Produzione
                //primary: '#ff8c00', // Produzione FIX 
                // fix 
                text: '#123',
            },
        },
    },

    initialSetup: function() {
        loadJS("https://ajax.googleapis.com/ajax/libs/angularjs/1.5.6/angular.js", true);	
        for (let script of scriptsToLoad) {
            document.getElementsByTagName('head')[0].appendChild(script);
        }
        waitLoader();
        window.PureCloud.subscribe([{
            type: 'Interaction',
            callback: function(category, interaction) {
                console.warn('#########################');
                console.log(category, interaction);
                if (!$('.consult-participants-container').is(':visible') && $('li[onclick^="toggleConfirmationDialog("]').length) {
                    console.log(interaction);
                    updateTransfer(interaction.new || interaction);
                }
                console.log({
                    type: 'Interaction',
                    ef_category: category,
                    ef_data: interaction,
                });


                if (category === 'add' || category === 'change' ) 
                {
                    //$('gef-schedule-callback-control').prop('disabled', true);
                    //$('gef-dialpad-control').prop('disabled', true);
                    //$('gef-secure-pause-control').prop('disabled', true);
                   // $('gef-record-control').prop('disabled', true);
                   // $('gef-transfer-control').prop('disabled', true);
                   $('gef-transfer-control').css('display','none');
                   if (transferEnable) {
                    $(`[data-call-control="transfer"]`).show();  
                    $('gef-transfer-control').css('display','block');
                   //   
                     }    
                   $('gef-secure-pause-control').css('display','none');
               //    $('gef-dialpad-control').css('display','none');
                   $('gef-schedule-callback-control').css('display','none');
                }
                if (category === 'blindTransfer') { // update attribute
                    // aggiungo transferred = true
                    // TODO: modificare
                }
                // ADD STRING ON INTERACTION
                if (interaction.id) {
                    addStringToInteraction(`${interaction.id}_id`, interaction.id);
                }
                // ADD STRING ON INTERACTION
                if (interaction.attributes && interaction.attributes.tobedisplayedininteraction) {
                    addStringToInteraction(interaction.id, interaction.attributes.tobedisplayedininteraction, );
                }
                // WHEN ANSWERING A CALL
                if (category === 'connect' && interaction.isConnected) {
                    interactionId = interaction.id;
                    addInteraction(interactionId);
                    tagNodes('connect', interaction);
                    updateInteractionStatus('In Interazione');
                    //setPlatform();
                   // startCheckOnHold(interaction.id); rimosso per problemi barra che nn si carica
                    if (interaction.attributes?.enablecontrols) {
                        interaction.attributes.enablecontrols.split(';').forEach(c => {
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
                        });
                    }

                    // ADD TRANSFER NUMBER
                    if (interaction.attributes?.enablecontrols) {
                        interaction.attributes.enablecontrols.split(';').forEach(c => {
                            if (c === 'transferIIliv') {
                                if (interaction.attributes && interaction.attributes.numeritrasf && interaction.attributes.etichettetrasf) {
                                    let numeri = interaction.attributes.numeritrasf.split(',').map(e => e.trim());
                                    let etichette = interaction.attributes.etichettetrasf.split(',').map(e => e.trim());
                                    allowedTransfer = {};
                                    for (let i = 0; i < numeri.length; i++) {
                                        allowedTransfer[etichette[i]] = {
                                            name: etichette[i],
                                            id: numeri[i],
                                            // id:                "+393317288441"
                                        };
                                    }
                                    updateTransfer(interaction);
                                }

                                if (interaction.attributes && interaction.attributes.codatrasf && interaction.attributes.etichettetrasf) {
                                    let numeri = interaction.attributes.codatrasf.split(',').map(e => e.trim());
                                    let etichette = interaction.attributes.etichettetrasf.split(',').map(e => e.trim());
                                    allowedTransfer = {};
                                    for (let i = 0; i < numeri.length; i++) {
                                        allowedTransfer[etichette[i]] = {
                                            name: etichette[i],
                                            id: numeri[i],
                                            // id:                "+393317288441"
                                        };
                                    }
                                    updateTransferQueueId(interaction);
                                }
                            }
                            });
                        }
                    if (interaction.attributes?.agentgreeting) {
                        startSecureIvrSession(interaction.attributes.agentgreeting, interaction.id, );
                    }
                    if (interaction.attributes?.tobetransferred) {
                        flowNPS = interaction.attributes.tobetransferred;
                        setNPS();
                    }
                    enableRec(interaction.id);
                    if (interaction.attributes && interaction.attributes.open_interaction) {
                        //console.log('openInteractionopenInteractionopenInteraction')
                        let channel = interaction.attributes.channel_type || 'Call Center';
                        let subchannel = interaction.attributes.custom_subchannel || channel + ' ' + interaction.direction;

                        window.parent.postMessage(JSON.stringify({
                            type: 'openInteraction',
                            data: {
                                CallIdCCA__c: interaction.id,
                                CallCenterPhone__c: interaction.attributes?.callcenterphone || '',
                                Direction__c: interaction.direction,
                                Status__c: 'New',
                                InterlocutorPhone__c: interaction.ani,
                                Channel__c: channel,
                                LastModifiedChannel__c: channel,
                                SubChannel__c: subchannel,
                                LastModifiedSubChannel__c: subchannel,
                                OwnerID: userId,
                                InterlocutorEmail__c: interaction.attributes.c__interlocutoremail,
                                InterlocutorNationalIdentityNumber__c: interaction.attributes.c__interlocutornationalidentitynumber,
                            },
                        }), '*', );
                    }
                  if (interaction.direction === 'Outbound') {
                        $(`[data-call-control="dtmf"]`).show();
                        $(`[data-call-control="record"]`).show();  
                        $('gef-record-control').removeAttr('disabled'); 
                        window.parent.postMessage(JSON.stringify({
                            type: 'openInteractionOutbound',
                            data: {
                                CallIdCCA__c: interaction.id,
                                CallCenterPhone__c: null,
                                Direction__c: interaction.direction,
                                Status__c: 'New',
                                Channel__c: 'Call Center',
                                LastModifiedChannel__c: 'Call Center',
                                SubChannel__c: 'Call Center Outbound',
                                LastModifiedSubChannel__c: 'Call Center Outbound',
                                InterlocutorEmail__c: null,
                                InterlocutorNationalIdentityNumber__c: null,
                            },
                        }), '*',
                        console.log('postmessage inviato out') ) ;             
                    }
                }
                if (category === 'connect' && interaction.isConnected && interaction.attributes && !interaction.attributes.sf_action && interaction.attributes.crm_urlpop)
                    openTab(interaction.attributes.crm_urlpop);

                if (category === 'disconnect' && interaction.isDisconnected) {
                    toggleConfirmationDialog();
                    $(`#recReasonDialog`).remove();
                    $('li[onclick^="toggleConfirmationDialog("]').attr('onclick', 'toggleTransfer()', );
                    $('li[onclick^="toggleConfirmationDialogQueue("]').attr('onclick', 'toggleTransferQueue()', );
                    clearInterval(window[`hold_${interaction.id}`]);
                    toggleTransfer(true);
                    toggleTransferQueue(true);
                    // tagNodes('hangup', interaction)
                    updateInteractionStatus();
                    interactionId = undefined;
                    ['securePause', 'dtmf', 'scheduleCallback', 'transfer', 'record', ].forEach(c => {
                        $(`[data-call-control="${c}"]`).hide();
                    });
                    hideControl('[onclick="toggleTransfer()"]');
                    hideControl('[onclick="toggleTransferQueue()"]');
                    scheduleCallbackPermission = false;
                    disableRec();
                    recordEnable = false; 
                    checkIfNotRespondingPopup();
                    npsEnable = false;
                    if (org === `ACEA ENERGIA`) {
					let channel = ''; 
                        let subchannel = ''; 
                        let interlocutoremail = ''; 
                        let interlocutornumber = ''; 
                        let  chatbotsummary = '';
                        let obj = endInteraction(interaction.id);
						      if (interaction.direction === 'Outbound') {
                        channel = 'Call Center Outbound' ; 
                        console.log('interaction outbound', interaction)
                        subchannel = 'Call Center Outbound' ; 
                        } else {
                        channel = interaction.attributes.channel_type || 'Call Center';
                        subchannel = interaction.attributes.custom_subchannel || channel + ' ' + interaction.direction;
                        interlocutoremail = interaction.attributes.c__interlocutoremail;
                        interlocutornumber = interaction.attributes.c__interlocutornationalidentitynumber;
                        chatbotsummary = interaction.attributes.chatbotsummary__c || ''; 
                        }														  
				   
                        try {
                            window.parent.postMessage(JSON.stringify({
                                type: 'voicemailSubscription',
                                // THIS ONLY CLOSES THE INTERACTION
                                data: {
                                    Call: {
                                        StartTime: obj.startTime,
                                        EndCall: obj.endTime,
                                        ElapsedSeconds: parseInt(obj.time),
                                        CallId: interaction.id,
                                        Channel__c: channel,
                                        LastModifiedChannel__c: channel,
                                        SubChannel__c: subchannel,
                                        LastModifiedSubChannel__c: subchannel,
                                        OwnerID: userId,
                                        InterlocutorEmail__c: interlocutoremail,
                                        InterlocutorNationalIdentityNumber__c: interlocutornumber,
                                        ChatbotSummary__c: ChatbotSummary__c
                                    },
                                },
                            }), '*', );
                            postMessageEndInteraction = true;
                        } catch (err) {
                            console.log('SF_END riga 1943', err)
                            console.log()
                        }

                        console.log('postmessageend', postMessageEndInteraction);
                        console.log(`SF_END ElapsedSecond ${parseInt(obj.time)}`, 'EndTime ' + obj.endTime, 'StartTime ' + obj.startTime, 'callId ' + interaction.id)
                    }
                }

                if (postMessageEndInteraction === false && category === 'deallocate' && interaction.isDisconnected) {
                    if (org === `ACEA ENERGIA`) {
                        let obj = endInteraction(interaction.id);
                        let channel = interaction.attributes.channel_type || 'Call Center';
                        let subchannel = interaction.attributes.custom_subchannel || channel + ' ' + interaction.direction;
                        try {
                            window.parent.postMessage(JSON.stringify({
                                type: 'voicemailSubscription',
                                // THIS ONLY CLOSES THE INTERACTION
                                data: {
                                    Call: {
                                        StartTime: obj.startTime,
                                        EndCall: obj.endTime,
                                        ElapsedSeconds: parseInt(obj.time),
                                        CallId: interaction.id,
                                        Channel__c: channel,
                                        LastModifiedChannel__c: channel,
                                        SubChannel__c: subchannel,
                                        LastModifiedSubChannel__c: subchannel,
                                        OwnerID: userId,
                                        InterlocutorEmail__c: interaction.attributes.c__interlocutoremail,
                                        InterlocutorNationalIdentityNumber__c: interaction.attributes.c__interlocutornationalidentitynumber,

                                    },
                                },
                            }), '*', );
                            console.log('SF_END riga 1988')
                            postMessageEndInteraction = true;
                            console.log(`SF_END ElapsedSecond ${parseInt(obj.time)}`, 'EndTime ' + obj.endTime, 'StartTime ' + obj.startTime, 'callId ' + interaction.id)
                        } catch (err) {
                            console.log('SF_END riga 1992', err)
                        }

                    }
                }

                window.parent.postMessage(JSON.stringify({
                    type: 'interactionSubscription',
                    data: {
                        category: category,
                        interaction: interaction
                    },
                }), '*', );
            },
        }, {
            type: 'UserAction',
            callback: function(category, data) {
                window.parent.postMessage(JSON.stringify({
                    type: 'userActionSubscription',
                    data: {
                        category: category,
                        data: data
                    },
                }), '*', );
            },
        }, {
            type: 'Notification',
            callback: function(category, data) {
                window.parent.postMessage(JSON.stringify({
                    type: 'notificationSubscription',
                    data: {
                        category: category,
                        data: data
                    },
                }), '*', );
            },
        }, ]);

		window.addEventListener('click', function(evt) {
            console.log('evt target', evt.target)
        console.log('evt target text', evt.target.textContent)
        console.log('evt target nodename', evt.target.nodeName)
		console.log('evt target classname', evt.target.className)
		console.log('evt target outerhtml', evt.target.outerHTML)
            if (evt.target.textContent.includes('Pianificazione agente') || evt.target.textContent.includes('Interazioni') 
            || evt.target.textContent.includes('Nuova interazione')   || evt.target.textContent.includes('Inbox utente')
            ||  evt.target.textContent.includes('Attivazione coda')   || evt.target.textContent.includes('Impostazioni') 
            ||  evt.target.textContent.includes('Prestazioni agente') ||  evt.target.nodeName.includes('GEF-PICKUP-CONTROL') || 
             evt.target.textContent.includes('Registro interazioni') 
            ||   evt.target.outerHTML.includes("<i class=\"fa fa-pencil\"></i>") || evt.target.className.includes('interactionCount-number')
            || evt.target.className.includes('interactionCount-badge')
			|| evt.target.outerHTML.includes('<i class=\"fa fa-bar-chart fa-lg item-icon\>')
		 ||  evt.target.outerHTML.includes('<i class=\"icon-interactions item-icon\">')
		 ||  evt.target.outerHTML.includes('<i class=\"fa fa-inbox fa-lg\">')
		 ||  evt.target.outerHTML.includes('<i class=\"fa fa-calendar fa-lg fa-icon item-icon\">')
		 ||  evt.target.outerHTML.includes('<i class=\"fa fa-clipboard fa-lg item-icon\">')
		 ||  evt.target.outerHTML.includes('<i class=\"fa fa-gear fa-lg item-icon\">')
		 || evt.target.outerHTML.includes('<i class=\"fa fa-plus fa-lg item-icon\">') || evt.target.outerHTML.includes('<i class=\"fa fa-user interaction-call-work-edit\">') 
		 || evt.target.classNameL.includes('fa fa-file-text-o') || evt.target.classNameL.includes('fa fa-pencil fa-stack-1x')  ||  
         evt.target.classNameL.includes('fa fa-bar-chart')
		 ) {
				
   
         /*   if (evt.target.parentElement.parentElement.id === 'navDialpad' || evt.target.parentElement.parentElement.id ==='navUserInbox' ||
            evt.target.parentElement.parentElement.id ==='navAgentPerformance' || evt.target.parentElement.parentElement.id ==='queueActivation'  
            || evt.target.parentElement.parentElement.id ==='navInteractionList' || evt.target.parentElement.parentElement.id ==='navSettings'  
            || evt.target.parentNode.id === 'navDialpad' || evt.target.parentNode.id ==='navUserInbox' ||
            evt.target.parentNode.id ==='navAgentPerformance' || evt.target.parentNode.id ==='queueActivation'  
            || evt.target.parentNode.id==='navInteractionList' || evt.target.parentNode.id ==='navSettings' 
            || evt.target.attributes.id.nodeValue === 'navDialpad' || evt.target.attributes.id.nodeValue === 'navUserInbox' ||
            evt.target.attributes.id.nodeValue ==='navAgentPerformance' || evt.target.attributes.id.nodeValue ==='queueActivation' 
            || evt.target.attributes.id.nodeValue ==='navInteractionList' || evt.target.attributes.id.nodeValue ==='navSettings' ) { */
         //   if (evt.target.parentElement.parentElement.id != 'statusController_test' ||
            //   evt.target.parentElement.parentElement.id != 'notset' || evt.target.parentElement.parentElement.id != 'navBar') {
                // window.addEventListener('click', () => {
                    
                    console.log('evt entro nel listener', npsEnable, interactionId, recordEnable)
                    if (npsEnable) {
                      setNPS();
                       }       
                    updateTransferEvt(interactionId);
                    let zoomMinus = document.getElementsByClassName('fa-search-minus')
                    if (zoomMinus.length === 0) {
                         // Add NPS button
                         let hungupBtn = $('gef-disconnect-control');// $('[ng-click="disconnect()"]');
                         hungupBtn.addClass('hungup');
                         hungupBtn.after(`
                    <i class="icon-hangup nps" style="display: none; font-size: 23px;position:absolute;margin: 6px 12px;color:white;cursor:pointer"></i>"
                    tooltip-placement="bottom" tooltip-append-to-body="true" uib-tooltip="Disconnetti"`);
                         // Add Registrazioni dialog
                         $('li[data-call-control="record"]').html(`
                    <i class="fa fa-circle fa-lg" style="font-size: 23px;padding-top: 11px;color:white;cursor:pointer" tooltip-placement="bottom" tooltip-append-to-body="true"></i>
                    `);
                         $(
                             '.interaction-call-control-container > .call-control-list > [data-call-control="record"]',
                         ).after(`
                    <!--            <li style="order: 3; display: block;" data-call-control="flag" onclick="toggleRecentRecordings()">-->
                    <!--              <i class="fa fa-headphones fa-lg" uib-tooltip="Lista Registrazioni" style="font-size: 23px;padding-top: 11px;color:white;cursor:pointer"-->
                    <!--                tooltip-placement="bottom" tooltip-append-to-body="true"></i>-->
                    <!--            </li>-->
                    <li style="order: 4; display: none;" data-call-control="flag" onclick="toggleTransfer()">
                    <i class="fa fa-arrow-right fa-lg" style="font-size: 23px;padding-top: 11px;color:white;cursor:pointer"
                    tooltip-placement="bottom" tooltip-append-to-body="true"></i>
                    </li> 
                    <li style="order: 4; display: none;" data-call-control="flag" onclick="toggleTransferQueue()">
                    <i class="fa fa-arrow-right fa-lg" style="font-size: 23px;padding-top: 11px;color:white;cursor:pointer"
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
                         $('.interaction-call-control-container').css('display', 'flex');
                         $('body').first().after(`
                    <div class="recordings-wrapper hidden" id="draggableList">
                    <div class="header" id="draggableListHeader">
                    <div class="list-header-recording">
                    <h4 class="ml-8">Registrazioni</h4>
                    <div onclick="toggleRecentRecordings()" class="close-btn">
                    <i class="fa fa-close"></i>
                    </div>
                    </div>
                    </div>
                    <div class="rec-list">
                    </div>
                    </div>
                    
                    
                    <div class="transfer-wrapper hidden" id="draggableList5">
                    <div class="header" id="draggableListHeader">
                    <div class="list-header-recording">
                    <h4 class="ml-8">Consulta</h4>
                    <div onclick="toggleTransfer()" class="modal-header-btn modal-close">
                    <i class="fa fa-close fa-2x"></i>
                    </div>
                    <div onclick="toggleTransferQueue()">
                    <i class="fa fa-close fa-2x"></i>
                    </div>
                    </div>
                    </div>
                    <div>
                    <input id="consultInputSearch" type="text" placeholder="Cerca Contatti">
                     </div>
                    <div class="transfer-list">
                    </div>
                    </div>
                    <div class="hidden" id="confirmation-dialog">
                    <div class="header">
                    <div class="confirmation-header">
                    <h4 id="confirmation-dialog-title">Confermi di voler trasferire?</h4>
                    </div>
                    </div>
                    <div class="confirmation-dialog-action">
                    <button onclick="confirmDialog()">
                    Si
                         </button>
                         <button class="bg-red" onclick="toggleConfirmationDialog()">
                             Annulla
                         </button>
                    </div>
                    </div>
                    `);
                         dragElement(document.getElementById('draggableList'));
                         dragElement(document.getElementById('draggableList5'));
                        // completeInfoVoicemail(); rimosso per problemi barra che nn si carica
                         ['securePause', 'dtmf', 'scheduleCallback', 'transfer','record'].forEach(c =>
                             $(`[data-call-control="${c}"]`).hide(),
                         );
                         $('gef-transfer-control').css('display','none');
                         $('gef-secure-pause-control').css('display','none');
                       //  $('gef-dialpad-control').css('display','none');
                         $('gef-schedule-callback-control').css('display','none');
                                       
                     }
            }
            if (recordEnable) {
                $(`[data-call-control="record"]`).show();  
                enableRec(interactionId);
                 }    
            if (transferEnable) {
                 $(`[data-call-control="transfer"]`).show();  
                 $('gef-transfer-control').css('display','block');
                //   
                  }    
        });

        window.addEventListener('click', function(evt) {
            console.log('evt target', evt.target)
        console.log('evt target', evt.target.textContent)
        if (evt.target.firstChild.textContent.includes('Disconnetti') || evt.target.id.includes('logout') )	{
            logout();
    }
    });


        window.addEventListener('message', function(event) {
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
                        if (contactSearchCallback)
                            contactSearchCallback(message.data);
                    } else if (message.type === 'updateUserStatus') {
                        window.PureCloud.User.updateStatus(message.data);
                    } else if (message.type === 'updateInteractionState') {
                        window.PureCloud.Interaction.updateState(message.data);
                    } else if (message.type === 'setView') {
                        window.PureCloud.User.setView(message.data);
                    } else if (message.type === 'updateAudioConfiguration') {
                        window.PureCloud.User.Notification.setAudioConfiguration(message.data, );
                    } else if (message.type === 'sendCustomNotification') {
                        window.PureCloud.User.Notification.notifyUser(message.data);
                    }
                }
            } catch {}
        });
    },
    screenPop: function(searchString, interaction) {
        window.parent.postMessage(JSON.stringify({
            type: 'screenPop',
            data: {
                searchString: searchString,
                interactionId: interaction
            },
        }), '*', );
    },
    processCallLog: function(callLog, interaction, eventName, onSuccess, onFailure, ) {
        window.parent.postMessage(JSON.stringify({
            type: 'processCallLog',
            data: {
                callLog: callLog,
                interactionId: interaction,
                eventName: eventName,
            },
        }), '*', );
        let success = true;
        success ? onSuccess({
            id: callLog.id || Date.now()
        }) : onFailure();
    },
    openCallLog: function(callLog, interaction) {
        window.parent.postMessage(JSON.stringify({
            type: 'openCallLog',
            data: {
                callLog: callLog,
                interaction: interaction
            },
        }), '*', );
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
    },*/
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
            return;
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

const styleSheets = Array.from(document.styleSheets).filter(styleSheet => !styleSheet.href || styleSheet.href.startsWith(window.location.origin), );

function changeStylesheetRule(selector, property, value) {
    // Make the strings lowercase
    selector = selector.toLowerCase();
    property = property.toLowerCase();
    value = value.toLowerCase();
    let style = styleSheets[0];
    for (let i = 0; i < style.cssRules.length; i++) {
        if (style.cssRules[i].selectorText === selector) {
            styleSheets[0].deleteRule(i);
            //return;
        }
    }

    // Add it if it does not
    styleSheets[0].insertRule(selector + ' { ' + property + ': ' + value + '; }', 0, );
}

//-----------------------------------------------------------------------------------
// GENESYS API METHODS

function getConversation(conversationId) {
    let api = new platformClient.ConversationsApi();
    return api.getConversation(conversationId);
}

//-----------------------------------------------------------------------------------