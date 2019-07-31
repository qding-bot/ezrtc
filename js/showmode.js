let selfEasyrtcid = "";
let haveSelfVideo = false;
let roomName;
let mode = 1;
let callers = new Set();

function disable (domId) {
    document.getElementById(domId).disabled = "disabled";
}

function enable (domId) {
    document.getElementById(domId).disabled = "";
}

// let onceOnly = true;
let in_call = new Set();

function hangup () {
    easyrtc.hangupAll();
    disable("hangupButton");
    disable("unMuteButton");
    disable("muteButton");
}

function unMuteAll () {
    for (let easyrtcid of in_call) {
        let video = document.getElementById(easyrtcid);
        video.muted = false;
    }
    disable("unMuteButton");
    enable("muteButton");
}

function muteAll () {
    for (let easyrtcid of in_call) {
        let video = document.getElementById(easyrtcid);
        video.muted = true;
    }
    disable("muteButton");
    enable("unMuteButton");
}

function clearConnectList () {
    let otherClientDiv = document.getElementById("otherClients");
    while (otherClientDiv.hasChildNodes()) {
        otherClientDiv.removeChild(otherClientDiv.lastChild);
    }
}

function setUpMirror () {
    if (!haveSelfVideo) {
        console.log('set up local media');
        let selfVideo = document.getElementById("selfVideo");
        easyrtc.setVideoObjectSrc(selfVideo, easyrtc.getLocalStream());
        selfVideo.muted = true;
        haveSelfVideo = true;
    }
}

function disconnect () {
    easyrtc.disconnect();
    document.getElementById("iam").innerHTML = "logged out";
    enable("connectButton");
    // disable("disconnectButton");
    easyrtc.clearMediaStream(document.getElementById("selfVideo"));
    easyrtc.setVideoObjectSrc(document.getElementById("selfVideo"), "");
    easyrtc.closeLocalMediaStream();
    easyrtc.setRoomOccupantListener(function () {
    });
    clearConnectList();
}

function getUrlVars () {
    const vars = {};
    const parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
        vars[key] = value;
    });
    return vars;
}

function callEverybodyElse (roomName, occupants, isPrimary) {
    easyrtc.setRoomOccupantListener(null);

    // let otherClientDiv = document.getElementById("otherClients");
    // clearConnectList();
    console.log('occupants: ' + JSON.stringify(occupants));

    for (let easyrtcid in occupants) {
        if (occupants.hasOwnProperty(easyrtcid)) {
            if (in_call.has(easyrtcid)) {
                continue;
            }

            // let label = document.createTextNode(easyrtc.idToName(easyrtcid));
            // let button = document.createElement("div");
            // button.appendChild(label);
            // otherClientDiv.appendChild(button);

            if (mode === 2) {
                easyrtc.sendPeerMessage(easyrtcid, "cmd", 'call me');
                continue;
            }

            easyrtc.call(
                easyrtcid,
                () => {
                    console.log('call succeeded ' + easyrtcid);
                    enable("hangupButton");
                },
                () => {
                    console.log('call failed ' + easyrtcid);
                    // enable("otherClients");
                },
                (accepted, easyrtcid) => {
                    if (!accepted) {
                        easyrtc.showError("CALL-REJECTEd", "Sorry, your call to " + easyrtc.idToName(easyrtcid) + " was rejected");
                        // enable("otherClients");
                    } else {
                        console.log('call accepted by ' + easyrtcid);
                    }
                }
            );
            enable("hangupButton");


        }
    }
}

function messageListener (easyrtcid, msgType, content) {
    if (msgType === 'cmd' && content === 'call me') {
        callEverybodyElse(roomName, {[easyrtcid]: null}, null);
    }
}

function appInit () {
    roomName = getUrlVars()["room"];
    mode = Number(getUrlVars()["mode"] || 2);
    console.log('Init: mode is ' + mode);

    if (mode === 1) {
        easyrtc.enableVideo(true);
        easyrtc.enableAudio(true);
        easyrtc.enableVideoReceive(true);
        easyrtc.enableAudioReceive(true);
        easyrtc.initMediaSource(
            function (mediastream) {
                setUpMirror();
            },
            function (errorCode, errorText) {
                console.log('error init media source');
                easyrtc.showError(errorCode, errorText);
            });
        easyrtc.setPeerListener(messageListener);

    } else if (mode === 2) {
        easyrtc.enableVideo(false);
        easyrtc.enableAudio(false);
        easyrtc.enableVideoReceive(true);
        easyrtc.enableAudioReceive(true);
        document.getElementById("selfVideo").hidden = true;
    }

    // easyrtc.enableDebug(true);
    easyrtc.setSocketUrl("https://ezrtc.one1tree.com.cn");
    easyrtc.setUseFreshIceEachPeerConnection(false);
    easyrtc.setRoomOccupantListener(callEverybodyElse);

    easyrtc.connect(
        roomName,
        (easyrtcid) => {
            selfEasyrtcid = easyrtcid;
            console.log("I am " + easyrtc.cleanId(easyrtcid));
        },
        (errorCode, message) => {
            console.error(errorCode);
            console.error(message);
        }
    );

    easyrtc.setOnError(function (errEvent) {
        console.error(errEvent.errorText);
    });

    easyrtc.setStreamAcceptor(function (easyrtcid, stream) {
        console.log('stream from ' + easyrtcid + ' accepted');
        console.log(stream);
        // setUpMirror();

        let videoElem = document.createElement('video');
        videoElem.id = easyrtcid;
        videoElem.autoplay = true;
        videoElem.setAttribute('playsinline', 'playsinline');
        videoElem.poster = "images/user_icon.png";

        if (mode === 1) {
            enable("muteButton");
        } else {
            videoElem.muted = true;
            enable("unMuteButton");
        }

        videoElem.onclick = () => {
            videoElem.muted = !videoElem.muted
        };

        let videos = document.getElementById("videos");
        videos.appendChild(videoElem);

        easyrtc.setVideoObjectSrc(videoElem, stream);
        in_call.add(easyrtcid);
        enable("hangupButton");
    });

    easyrtc.setOnStreamClosed(function (easyrtcid) {
        console.log('stream from ' + easyrtcid + ' closed');
        easyrtc.setVideoObjectSrc(document.getElementById(easyrtcid), "");

        let frame = document.getElementById(easyrtcid);
        frame.parentNode.removeChild(frame);

        in_call.delete(easyrtcid);

        if (in_call.size === 0) {
            disable("unMuteButton")
        }

    });

    easyrtc.setAcceptChecker(function (easyrtcid, callback) {
        console.log('accepted call from ' + easyrtcid);
        callback(true);
        // in_call.add(easyrtcid);
        // callerPending = null;
    });
}





