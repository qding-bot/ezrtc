let selfEasyrtcid = "";
let haveSelfVideo = false;

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
}

function clearConnectList () {
    let otherClientDiv = document.getElementById("otherClients");
    while (otherClientDiv.hasChildNodes()) {
        otherClientDiv.removeChild(otherClientDiv.lastChild);
    }
}

function setUpMirror () {
    if (!haveSelfVideo) {
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

function appInit () {
    let roomName = getUrlVars()["room"];
    let mode = Number(getUrlVars()["mode"] || 1);
    console.log('Init: mode is ' + mode);

    if (mode === 1) {
        easyrtc.enableVideo(true);
        easyrtc.enableAudio(true);
        easyrtc.enableVideoReceive(false);
        easyrtc.enableAudioReceive(false);
        easyrtc.initMediaSource(
            function (mediastream) {
                setUpMirror();
            },
            function (errorCode, errorText) {
                console.log('error init media source');
                easyrtc.showError(errorCode, errorText);
            });
        document.getElementById("callerVideo").hidden = true;
    } else if (mode === 2) {
        easyrtc.enableVideo(false);
        easyrtc.enableAudio(false);
        easyrtc.enableVideoReceive(true);
        easyrtc.enableAudioReceive(true);
        document.getElementById("selfVideo").hidden = true;
    }

    easyrtc.setSocketUrl("https://ezrtc.one1tree.com.cn");
    easyrtc.setUseFreshIceEachPeerConnection(false);
    easyrtc.setRoomOccupantListener((roomName, occupants, isPrimary) => {
        if (mode === 2) {
            return;
        }

        let otherClientDiv = document.getElementById("otherClients");
        clearConnectList();
        for (let easyrtcid in occupants) {
            if (occupants.hasOwnProperty(easyrtcid)) {
                if (in_call.has(easyrtcid)) {
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
                        enable("otherClients");
                    },
                    (accepted, easyrtcid) => {
                        if (!accepted) {
                            easyrtc.showError("CALL-REJECTEd", "Sorry, your call to " + easyrtc.idToName(easyrtcid) + " was rejected");
                            enable("otherClients");
                        } else {
                            console.log('call accepted by ' + easyrtcid);
                            in_call.add(easyrtcid);
                        }
                    }
                );
                enable("hangupButton");

                let label = document.createTextNode(easyrtc.idToName(easyrtcid));
                let button = document.createElement("div");
                button.appendChild(label);
                otherClientDiv.appendChild(button);
            }
        }
    });

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

    easyrtc.setStreamAcceptor(function (easyrtcid, stream) {
        console.log('stream from ' + easyrtcid + ' accepted');
        console.log(stream);
        // setUpMirror();
        let video = document.getElementById("callerVideo");
        easyrtc.setVideoObjectSrc(video, stream);
        enable("hangupButton");
    });

    easyrtc.setOnStreamClosed(function (easyrtcid) {
        console.log('stream from ' + easyrtcid + ' closed');
        easyrtc.setVideoObjectSrc(document.getElementById("callerVideo"), "");
        disable("hangupButton");
        in_call.delete(easyrtcid);
    });


    // easyrtc.setCallCancelled(function (easyrtcid) {
    //     if (easyrtcid === callerPending) {
    //         document.getElementById("acceptCallBox").style.display = "none";
    //         callerPending = false;
    //     }
    // });

    easyrtc.setAcceptChecker(function (easyrtcid, callback) {
        console.log('accepted call from ' + easyrtcid);
        callback(true);
        // callerPending = null;
    });
}





