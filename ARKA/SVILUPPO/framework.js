let contactSearchCallback;
let platformClient;
let authToken;
let userId;
let cachedUrl = {};
let queues = [];
let enableCustomLogs = false;
let scheduleCallbackPermission = false;
//let mappingGroupsTable = 'd4acb78b-5f94-4e98-9943-07d7aa981fb0';
let regexVoicemailEvent = new RegExp('v2\.users\..+?\.voicemail\.messages');
let groups = [];
let allowedStatus = [];
let presenceDefinitions = {};
let interactionId;
let seenInteractions = {};
let org = 'arka';

function log(message, title = "Log", type = "Info") {
    if (enableCustomLogs) {
        console.log(
            `%c${title}`,
            "background: yellow; color: black; font-size: 30px"
        );
        console.log(`${type}: `, message);
    }
}

const toggleCustomLogs = () => {
    enableCustomLogs = !enableCustomLogs;
    return enableCustomLogs ? "Log per debug Abilitati" : "Log per debug Disabilitati";
}

function getDpLogo() {
    return "https://www.digitalpegasus.cloud/Logos/logo_dp_techne.png";
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

function setPlatform() {
    platformClient = require("platformClient");

    window.PureCloud.User.getAuthToken(function (token) {
        console.log("TOKEN: ", token);
        authToken = token;
        const client = platformClient.ApiClient.instance;
        client.setAccessToken(token);
        client.setEnvironment("mypurecloud.de");
        getUserId();
        updateQueuesList();
    });
}

function getUserId() {
    let apiInstance = new platformClient.UsersApi();

    return apiInstance
        .getUsersMe({ expand: ['groups'] })
        .then((data) => {
            userId = data.id;
            globalUsername = data.name;
            groups = data.groups && data.groups.map(g => g.id);
            //subscribeWebsocket();
        })
        .catch((err) => {
            console.log("There was a failure calling getUsersMe");
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
    let expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue.toString() + ";" + expires + ";path=/";
}

function openTab(url) {
    window.open(url);
}

function params() {
	return new URL(window.location.href).searchParams;
}

if (!params().get('enableFrameworkClientId')) {
	window.location = window.location.href + '&enableFrameworkClientId=true';
}

let scriptJquery = document.createElement("script");
scriptJquery.src = "https://code.jquery.com/jquery-3.5.0.min.js";
scriptJquery.type = "text/javascript";
scriptJquery.onload = function () {
    console.warn("#########################");
};
let sdkJS = document.createElement("script");
sdkJS.src =
    "https://sdk-cdn.mypurecloud.com/javascript/110.0.0/purecloud-platform-client-v2.min.js";
sdkJS.onload = () => {
    console.log("loaded");
    setPlatform();
};

let styleRecordings = document.createElement("style");
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

  .rec-list {
    overflow-y: scroll;
    height: 100%;
    list-style: none;
  }

  .recordings-wrapper {
    width: 200px;
    background: white;
    z-index: 99;
    height: 300px;
    display: flex;
    flex-direction: column;
    position: fixed;
    right: 10px;
    top: 170px;
    border: 1px solid #bbb;
  }
  
  .hidden {
    display: none;
  }

  .link {
    color: #337ab7;
    text-decoration: underline;
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
  
    .interaction-edit {
  	display: none;
  }
  
`;

let scriptsToLoad = [scriptJquery, sdkJS, styleRecordings];

function recCall(conversationId, status) {
    let api = new platformClient.ConversationsApi();
    api.getConversation(conversationId)
        .then((data) => {
            let partecipant =
                data?.participants.find(
                    (participant) => participant.purpose === "agent"
                ) ||
                data?.participants.find(
                    (participant) => participant.purpose === "user"
                );
            api.patchConversationParticipant(conversationId, partecipant.id, {
                recording: status,
            })
                .then(() =>
                    status ? startRec(conversationId) : stopRec(conversationId)
                )
                .catch((err) => console.error("err PATCH:" + JSON.stringify(err)));
        })
        .catch((err) => {
            console.log("There was a failure calling getConversation");
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
        expand: ["conversation"], // [String] | Which fields, if any, to expand.
    };

    return apiInstance
        .getUserrecordings(opts)
        .then((data) => {
            let recordings = data.entities.map((r) => {
                return {
                    id: r.id,
                    date: moment(r.dateCreated).format("DD/MM/YYYY HH:mm"),
                    duration: Math.floor(r.durationMilliseconds / 1000),
                    number: r.conversation.participants.find(p => p.purpose !== "user").address,
                };
            });
            mapAllInfoOfRecordings(recordings).then((infoRecordings) => {
                log(infoRecordings, "infoRecordings");
                $(".rec-list").empty();
                infoRecordings.forEach((r, i) =>
                    appendAnchorToList({ ...r, index: i })
                );
            });
        })
        .catch((err) => {
            console.log("There was a failure calling getUserrecordings");
            console.error(err);
        });
}
function sendContactSearch() {
    console.log('process add Search Context');
    document.getElementById("softphone").contentWindow.postMessage(JSON.stringify({
        type: 'sendContactSearch',
        data: JSON.parse(document.getElementById("contactSearchPayload").value)
    }), "*");
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
                    console.log(
                        "There was a failure calling getContentmanagementDocument"
                    );
                    console.error(err);
                });
        });
    });
    return Promise.all(sharingUrls).then(() => recordings);
}

function appendAnchorToList(record) {
    $(".rec-list")
        .append(`<li><p class="list-record ellipsis link" onclick="copyToClipboard('${record.sharingUri
            }')">
  <span class="rec-index">${record.index + 1} - </span>${record.number}<br>
  <span class="list-time">${record.date} - ${record.duration
            }s</span></p></li>`);
}

function copyToClipboard(text) {
    if (window.clipboardData && window.clipboardData.setData) {
        // Internet Explorer-specific code path to prevent textarea being shown while dialog is visible.
        snackbarAlert("Url copiato", "info", 2000);
        return window.clipboardData.setData("Text", text);
    } else if (
        document.queryCommandSupported &&
        document.queryCommandSupported("copy")
    ) {
        let textarea = document.createElement("textarea");
        textarea.textContent = text;
        textarea.style.position = "fixed"; // Prevent scrolling to bottom of page in Microsoft Edge.
        document.body.appendChild(textarea);
        textarea.select();
        try {
            snackbarAlert("Url copiato", "info", 2000);
            return document.execCommand("copy"); // Security exception may be thrown by some browsers.
        } catch (ex) {
            console.warn("Copy to clipboard failed.", ex);
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

function hideStatusMenu() {
    $('[ng-if="s.subStatus"].pull-right').parent().parent().click(() => {
        //console.log(tempAllowed)
        let tempAllowed = allowedStatus.map(s => presenceDefinitions[s])
        $('[ng-repeat="sub in subStatuses"]').each(function () {
            if (!tempAllowed.includes(this.innerText))
                this.remove()
        })
    })
}

function addNoteToVoicemail(element, note = '') {
    element.find('.note-content').remove()
    if (note) {
        let notes = note.split('\n').filter(e => e);
        console.log(notes[0].slice(10) === notes[1].slice(16))
        if (notes[0].slice(10) === notes[1].slice(16)) {
            notes.pop()
        }
        notes.forEach(n => {
            element.find('span.user-voicemail-data').eq(1).after('<span class="user-voicemail-data note-content ng-binding">' + n + '</span>')
        })
    }
}

function replaceParticipant(conversationId, participantId, transferId) {
    let apiInstance = new platformClient.ConversationsApi();
    let body = {
        "address": transferId
    }; // Object | Transfer request
    console.log(conversationId, participantId)
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
                console.log($(this))
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
        "read": true,
        "deleted": false,
        "note": newNote
    }
    return apiInstance.putVoicemailMessage(messageId, body);
}
/// DEBUGGING FUNCTION
function removeNotes() {
    let apiInstance = new platformClient.VoicemailApi();
    let body = {
        "read": false,
        "deleted": false,
        "note": ''
    }
    $('.user-voicemail-item').each(function (index) {
        console.log(this)
        let v = angular.element($(this)).scope().v;
        apiInstance.putVoicemailMessage(v.id, body).then(() => {
            v.note = '';
            addNoteToVoicemail($(this), '')
        });
    });
}

function checkInteractionHasQueue() {
    let queueInput = $(".dial-queue-input")
    let addressInput = $(".target-address-input")
    let allowed = !!queueInput.val().length && queues.includes(queueInput.val()) && !!addressInput.val().length;
    allowed ? enableAddInteractionButton() : disableAddInteractionButton();
}

function disableAddInteractionButton() {
    $(".add-interaction-button").first().attr("disabled", "disabled");
}
function enableAddInteractionButton() {
    $(".add-interaction-button").removeAttr("disabled");
}

function enableRec(conversationId) {
    log(undefined, "enableRec");
    let recIcons = $('li[data-call-control="record"] > i');
    recIcons.css("color", "white");
    recIcons.css("cursor", "pointer");
    recIcons.removeAttr("ng-click");
    recIcons.unbind("click");
    recIcons.click(() =>
        recCall(conversationId, true)
    );
}

function disableRec() {
    log(undefined, "disableRec");
    let recIcons = $('li[data-call-control="record"] > i');
    recIcons.css("color", "#999");
    recIcons.css("cursor", "default");
    recIcons.unbind("click");
}

function startRec(conversationId) {
    log(undefined, "startRec");
    let recIcons = $('li[data-call-control="record"] > i');
    recIcons.css("color", "red");
    recIcons.unbind("click");
    recIcons.click(() =>
        recCall(conversationId, false)
    );
}

function stopRec(conversationId) {
    log(undefined, "stopRec");
    let recIcons = $('li[data-call-control="record"] > i');
    recIcons.css("color", "white");
    recIcons.unbind("click");
    recIcons.click(() =>
        recCall(conversationId, true)
    );
}

function toggleRecentRecordings() {
    let wrapper = $(".recordings-wrapper")
    wrapper.toggleClass("hidden");
    if (wrapper.is(":visible")) {
        retrieveUserRegistration();
    }
}

function subscribeWebsocket() {
    let connectUri = "";
    try {
        let apiInstance = new platformClient.NotificationsApi();
        let topics_array = [
            { id: `v2.contentmanagement.workspaces.${userId}.documents` },
            { id: `v2.users.${userId}.voicemail.messages` },
        ];

        apiInstance.postNotificationsChannels().then((data) => {
            apiInstance.postNotificationsChannelSubscriptions(data.id, topics_array);
            connectUri = data.connectUri;

            websocket = new WebSocket(connectUri);
            websocket.onmessage = function (msg) {
                websocketEvent(JSON.parse(msg.data));
            };
        });
    } catch (ex) {
        console.error(ex);
    }
}

function websocketEvent(event) {
    // console.log(event)
    // Case new recordings
    if (
        event.eventBody.name === "Recording" &&
        event.metadata.action === "create" &&
        event.metadata.status === "complete"
    ) {
        log(event, "WEBSOCKET");
        if (!cachedUrl[event.eventBody.id])
            updateSharingUrl(event.eventBody.id).then((registration) =>
                getSharingUrl(registration)
            );
    }
    // Case change voicemail
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
    let apiInstance = new platformClient.ContentManagementApi();

    let documentId = registration.id; // String | Document ID

    return apiInstance
        .getContentmanagementDocument(documentId, {})
        .then((data) => {
            if (!cachedUrl[data.id]) {
                let newWindow = window.open(
                    "",
                    `Registrazione`,
                    "width=600,height=50,top=30,resizable=no"
                );
                newWindow.document.write(
                    moment().format("DD-MM-YYYY HH:mm:ss") +
                    ": " +
                    data.sharingUri +
                    "<br>"
                );
                updateRegistrationList(data);
            }
        })
        .catch((err) => {
            console.log("There was a failure calling getContentmanagementDocument");
            console.error(err);
        });
}

function getUserRecording(recordingId) {
    let apiInstance = new platformClient.UserRecordingsApi();

    let opts = { expand: ["conversation"] };

    return apiInstance
        .getUserrecording(recordingId, opts)
        .then((data) => {
            //console.log(`getUserrecording success! data: ${JSON.stringify(data, null, 2)}`);
            return data;
        })
        .catch((err) => {
            console.log("There was a failure calling getUserrecording");
            console.error(err);
        });
}

function getConversationAttributes(id) {
    let apiInstance = new platformClient.ConversationsApi();
    return apiInstance
        .getConversation(id)
        .then((data) => {
            //console.log(`getConversation success! data: ${JSON.stringify(data, null, 2)}`);
            let partecipant =
                data?.participants.find(
                    (participant) => participant.purpose === "customer"
                ) ||
                data?.participants.find(
                    (participant) => participant.purpose === "external"
                );
            return partecipant && partecipant.attributes;
        })
        .catch((err) => {
            console.log("There was a failure calling getConversation");
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
        sharedEntityType: "DOCUMENT",
        sharedEntity: {
            id: id,
        },
        memberType: "GROUP",
        member: {
            id: groupId,
        },
    }; // Object | CreateShareRequest - entity id and type and a single member or list of members are required

    return apiInstance
        .postContentmanagementShares(body)
        .then(() => {
            log(undefined, "postContentmanagementShares");
            return registration;
        })
        .catch((err) => {
            console.log("There was a failure calling postContentmanagementShares");
            console.error(err);
        });
}

function updateQueuesList() {
    let apiInstance = new platformClient.RoutingApi();

    let opts = {
        pageSize: 200, // Number | Page size
        pageNumber: 1, // Number | Page number
        sortBy: "name", // String | Sort by
    };

    apiInstance
        .getRoutingQueues(opts)
        .then((data) => {
            queues = data.entities.map((e) => e.name);
            //console.log(`getRoutingQueues success! data: ${JSON.stringify(data, null, 2)}`);
        })
        .catch((err) => {
            console.log("There was a failure calling getRoutingQueues");
            console.error(err);
        });
}

function hideInDropDown() {
    // Remove Genesys Cloud Button

    $('[ng-click="getHelpLink($event)"]').parent().remove();
    $('[ng-click="goToPureCloud()"]').parent().remove();
    // RIMUOVE OUTBOUND
    $('[ng-click="goToDialpad()"], #navDialpad').parent().remove()
    $('[ng-click="goToAgentSchedule()"]').parent().remove()

    $(".dropdown-toggle").click(hideInDropDown);
    $('[ng-click="goToMore($event)"]').click(hideInDropDown);
    $("li[ng-if=\"navCategory == 'more'\"] > a").first().click(hideInDropDown);
}

function addCheckOnList() {
    $(".dropdown-menu>li").click(checkInteractionHasQueue);
}

function logoutPurecloud() {
    let apiInstance = new platformClient.TokensApi();
    return apiInstance
        .deleteTokensMe()
        .then(() => {
            console.log("deleteTokensMe returned successfully.");
        })
        .catch((err) => {
            console.log("There was a failure calling deleteTokensMe");
            console.error(err);
        });
}

function updateInteraction(status) {
    console.log("process interaction state change", interactionId);
    if (!interactionId) return;
    let payload = {
        action: status,
        id: interactionId,
    };
    window.PureCloud.Interaction.updateState(payload);
}

function changeStatus(status) {
    payload = { id: status };
    window.PureCloud.User.updateStatus(payload);
}

function addStringToInteraction(id, string, count) {
    if (seenInteractions[id]) return;
    seenInteractions[id] = true;
    if (!count) count = 1
    if (count > 10) return;
    let interactions = $('.interactions').parent().parent()
    if (!interactions.length) {
        setTimeout(() => addStringToInteraction(id, string, (count + 1)), 500)
    }
    interactions.each(function (index) {
        let angularElement = angular.element($(this))
        let conversationId = angularElement.scope()?.s?.id
        if (conversationId !== id) {
            setTimeout(() => addStringToInteraction(id, string, (count + 1)), 500)
        } else {
            $(this).find('span.call-queuename>span').first().after(`<br><span>${string}\n</span>`)
        }
    })
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
	let queueScope = angular.element('.queues').parent().scope()
	let watermarkScope = angular.element('.watermark>a').scope()
	// Deactivating functions from scope()
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

function startingSetup() {
    $('.target-address-input, .dial-queue-input').on('input', () => {
        checkInteractionHasQueue();
        setTimeout(addCheckOnList, 500);
    });
    $('.dropdown-toggle').not('#statusListArrow_test').unbind('click').click(hideInBurgerMenu);
    $('[ng-click="goToMore($event)"]').unbind('click').click(hideInBurgerMenu);
    $('li[ng-if="navCategory == \'more\'"] > a').first().unbind('click').click(hideInBurgerMenu);

    // $('li[ng-if="navCategory == \'more\'"]').first().unbind('click').click(hideInBurgerMenu);
}

function waitLoader() {
    let loaded = $('.spinner-container').hasClass('ng-hide')
    if (loaded) {
        startingSetup();
    } else {
        setTimeout(waitLoader, 500)
    }
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
    $('[ng-click="goToPureCloud()"]').parent().remove();
    $('[ng-click="goToQueueActivation()"]').parent().remove();
    $('[ng-click="goToCallLog()"]').parent().remove();
    $('[ng-click="goToAgentPerformance()"]').parent().remove();
    // $('[ng-click="goToUserInbox()"]').parent().remove();
    $('[ng-click="goToAgentSchedule()"]').parent().remove();

    $('[ng-click="goToMore($event)"]').unbind('click').click(hideInBurgerMenu);
    $('li[ng-if="navCategory == \'more\'"] > a').first().unbind('click').click(hideInBurgerMenu);

}

window.Framework = {
    config: {
        getUserLanguage: function (callback) {
            callback("it-IT");
        },
        name: "veryInterestingNameApp",
        clientIds: {
            "mypurecloud.com": "",
            "mypurecloud.ie": "",
            "mypurecloud.com.au": "",
            "mypurecloud.jp": "",
            "mypurecloud.de": "d53cd2f2-28d3-4604-a2a9-5cf2827b2df1", // ARKA
            //"mypurecloud.de": "d9f87709-89e3-4a7b-9559-c12317209375", // GIOTTO
            //"mypurecloud.de": "497edd81-8bd5-46ae-9611-650314413b2d", // TECHNEGMBH
            //"mypurecloud.de": "f9621e16-6936-47f5-8b48-eb9dd59b85f4", // ACEA
        },
        customInteractionAttributes: [
            "PT_URLPop",
            "PT_SearchValue",
            "PT_TransferContext",
            "SF_Action",
            "SF_URLPop",
            "SF_apexClass",
            "SF_methodName",
            "CRM_URLPop",
            "SF_methodParams",
            "Id_Gruppo",
            "enableControls",
            "toBeDisplayedInInteraction",
            "toBeTransferred",
        ],
        settings: {
            embedWebRTCByDefault: true,
            hideWebRTCPopUpOption: true,
            enableCallLogs: true,
            enableTransferContext: true,
            hideCallLogSubject: true,
            hideCallLogContact: false,
            hideCallLogRelation: false,
            searchTargets: ["people", "queues", "frameworkcontacts"],
            theme: {
                // primary: "#f82", // local
                primary: "#e27f7f", // Sviluppo
                // primary: "#b5b5b5", // Collaudo
              //  primary: "#55bada", // Produzione
                text: "#123",
            },
        },
    },

    initialSetup: function () {
        for (script of scriptsToLoad) {
            document.getElementsByTagName("head")[0].appendChild(script);
        }

        waitLoader();

        setTimeout(function () {
            $(document).ready(function () {
                $('img[alt="Genesys Cloud Logo"]')
                    .attr("src", `${getDpLogo()}`)
                    .css("zoom", "100%")
                    .css("opacity", "0.8")
                    .css("cursor", "auto");
            });
                        // Add NPS button
            let hungupBtn = $('[ng-click="disconnect()"]')
            hungupBtn.addClass('hungup');
            hungupBtn.after(`<i class="icon-hangup nps" style="display: none; font-size: 23px;position:absolute;margin: 6px 12px;color:white;cursor:pointer"></i>"
            tooltip-placement="bottom" tooltip-append-to-body="true" uib-tooltip="Disconnetti"`);

            ["securePause", "record", "transfer"].forEach(
                (c) => jQuery(`[data-call-control="${c}"]`).hide()
            );

        



        }, 2000);

        window.PureCloud.subscribe([
            {
                type: "Interaction",
                callback: function (category, interaction) {
                    console.warn("#########################");
                    console.log(category, interaction);
                    console.log({ type: "Interaction", ef_category: category, ef_data: interaction });

                    // ADD STRING ON INTERACTION
                    if (category === "connect" && interaction.attributes && interaction.attributes.tobedisplayedininteraction) {
                        addStringToInteraction(interaction.id, interaction.attributes.tobedisplayedininteraction)
                    }
                    // WHEN ANSWERING A CALL
                    if (category === "connect" && interaction.isConnected) {
                        interactionId = interaction.id;
                        setPlatform();
                        enableRec(interaction.id);
                         if (interaction.attributes?.tobetransferred) {
                            let api = new platformClient.ConversationsApi();
                            api.getConversation(interactionId).then(data => {
                                let participant;
                                data.participants.forEach(p => {
                                    if (p.purpose === 'agent') {
                                        participant = p;
                                    }
                                })
                                toggleNPS(true);
                                let npsBtn = $('.nps')
                                npsBtn.unbind('click')
                                npsBtn.click(() => {
                                    if ($('.consult-participants-container').is(':visible')) {
                                        return $('[ng-click="disconnect()"]').first().click();
                                        }
                                    // tagNodes('nps', interaction)
                                    replaceParticipant(interactionId, participant.id, interaction.attributes.tobetransferred)
                                });
                            }).catch((err) => {
                                console.log('There was a failure calling getConversation');
                                console.error(err);
                            });
                        }
                        if (interaction.attributes?.enablecontrols) {
                            interaction.attributes.enablecontrols.split(';').forEach((c) => {
                                $(`[data-call-control="${c}"]`).show();
                                if (c === 'scheduleCallback') {
                                    scheduleCallbackPermission = true;
                                }
                            });
                        }
                    }
                   if (
                        category === "connect" &&
                        interaction.isConnected &&
                        interaction.attributes &&
                        !interaction.attributes.sf_action &&
                        interaction.attributes.crm_urlpop
                    ) {
                        openTab(interaction.attributes.crm_urlpop);
                    }

                    if (category === "disconnect" && interaction.isDisconnected) {
                        interactionId = undefined;
                        console.warn("DISCONNECTED");
                        scheduleCallbackPermission = false;
                        disableRec();
                        if (interaction.attributes?.enablecontrols) {
                            interaction.attributes.enablecontrols.split(';').forEach((c) => $(`[data-call-control="${c}"]`).hide())
                        }
                    }
                    console.warn("#########################");
                    window.parent.postMessage(
                        JSON.stringify({
                            type: "interactionSubscription",
                            data: { category: category, interaction: interaction },
                        }),
                        "*"
                    );
                },
            },
            {
                type: "UserAction",
                callback: function (category, data) {
                    window.parent.postMessage(
                        JSON.stringify({
                            type: "userActionSubscription",
                            data: { category: category, data: data },
                        }),
                        "*"
                    );
                },
            },
            {
                type: "Notification",
                callback: function (category, data) {
                    window.parent.postMessage(
                        JSON.stringify({
                            type: "notificationSubscription",
                            data: { category: category, data: data },
                        }),
                        "*"
                    );
                },
            },
        ]);

        window.addEventListener('click', function(evt) {
			//     console.log('evt', evt.target.parentElement.parentElement)
			    console.log('evt target textcontent', evt.target.textContent)
				 //console.log('evt id', evt.target.parentElement.parentElement.id)
				 if (evt.target.textContent.includes('Pianificazione agente') || evt.target.textContent.includes('Interazioni') 
				 || evt.target.textContent.includes('Nuova interazione')   || evt.target.textContent.includes('Inbox utente')
				 ||  evt.target.textContent.includes('Attivazione coda')   || evt.target.textContent.includes('Impostazioni') 
				 ||  evt.target.textContent.includes('Prestazioni agente') ||   evt.target.textContent.includes('Registro interazioni') ) {
          
            // Add NPS button
           // let hungupBtn = $('[ng-click="disconnect()"]')
            let hungupBtn = $('gef-disconnect-control');
            hungupBtn.addClass('hungup');
            hungupBtn.after(`<i class="icon-hangup nps" style="display: none; font-size: 23px;position:absolute;margin: 6px 12px;color:white;cursor:pointer"></i>"
            tooltip-placement="bottom" tooltip-append-to-body="true" uib-tooltip="Disconnetti"`);

            ["securePause", "record", "transfer"].forEach(
                (c) => jQuery(`[data-call-control="${c}"]`).hide()
            );
        }
		})	
		;
        	window.addEventListener('click', function(evt) {
            console.log('evt target', evt.target)
        console.log('evt target', evt.target.textContent)
      
		if (evt.target.firstChild.textContent.includes('Disconnetti') || evt.target.id.includes('logout') )	{
			logout();
	}
	});

	


        window.addEventListener("message", function (event) {
            try {
                let message = JSON.parse(event.data);
                console.log('message', message)
                if (message) {
                    if (message.type === "clickToDial") {
                        window.PureCloud.clickToDial(message.data);
                    } else if (message.type === "addAssociation") {
                        window.PureCloud.addAssociation(message.data);
                    } else if (message.type === "addAttribute") {
                        window.PureCloud.addCustomAttributes(message.data);
                    } else if (message.type === "addTransferContext") {
                        window.PureCloud.addTransferContext(message.data);
                    } else if (message.type === "sendContactSearch") {
                        if (contactSearchCallback) contactSearchCallback(message.data);
                    } else if (message.type === "updateUserStatus") {
                        window.PureCloud.User.updateStatus(message.data);
                    } else if (message.type === "updateInteractionState") {
                        window.PureCloud.Interaction.updateState(message.data);
                    } else if (message.type === "setView") {
                        window.PureCloud.User.setView(message.data);
                    } else if (message.type === "updateAudioConfiguration") {
                        window.PureCloud.User.Notification.setAudioConfiguration(message.data);
                    } else if (message.type === "sendCustomNotification") {
                        window.PureCloud.User.Notification.notifyUser(message.data);
                    } else if  (message.type == "contactSearch") {
                            document.getElementById("searchText").innerHTML = ": " + message.data.searchString;
                            sendContactSearch();
                    }
                }
            } catch { }
        });
    },
    screenPop: function (searchString, interaction) {
        window.parent.postMessage(
            JSON.stringify({
                type: "screenPop",
                data: { searchString: searchString, interactionId: interaction },
            }),
            "*"
        );
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
                type: "processCallLog",
                data: {
                    callLog: callLog,
                    interactionId: interaction,
                    eventName: eventName,
                },
            }),
            "*"
        );
        let success = true;
        success ? onSuccess({ id: callLog.id || Date.now() }) : onFailure();
    },
    openCallLog: function (callLog, interaction) {
        window.parent.postMessage(
            JSON.stringify({
                type: "openCallLog",
                data: { callLog: callLog, interaction: interaction },
            }),
            "*"
        );
    },
    contactSearch: function (searchValue, onSuccess, onFailure) {
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
    }
};


//------------------------------------------------------

function dragElement(elmnt) {
    let pos1 = 0,
        pos2 = 0,
        pos3 = 0,
        pos4 = 0;
    if (document.getElementById(elmnt.id + "Header")) {
        // if present, the header is where you move the DIV from:
        document.getElementById(elmnt.id + "Header").onmousedown = dragMouseDown;
    } else {
        // otherwise, move the DIV from anywhere inside the DIV:
        elmnt.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e) {
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
        elmnt.style.top = elmnt.offsetTop - pos2 + "px";
        elmnt.style.left = elmnt.offsetLeft - pos1 + "px";
    }

    function closeDragElement() {
        // stop moving when mouse button is released:
        document.onmouseup = null;
        document.onmousemove = null;
    }
}
