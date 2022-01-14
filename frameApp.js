let g_userInfo = null;
let g_roomId = null;
let g_ownerId = null;
let g_callType = null; // [ OUTBOUND | INBOUND]
let g_agentSubsId = null;
let g_agentFromId = null;
let g_startMode = null;
let g_isStartWithVideo = null;
let g_isAgentVideoOn = null;
let g_localVideoId = null;
let g_orientationMode = 0; // 0: 세로모드 | 1: 가로모드
let g_currentMode = null;
let g_sharedImgnaturalWidth = null;
let g_sharedImgnaturalheight = null;
let g_MainVideo = "client";
let g_isMobileAgent = false;
let g_AgentorientationMode = 0;  // 0: 세로, 1: 가로 //ysjung set orientation
let g_clientMode;
let g_isCameraChanging = false;
let g_hideChatMsgCount = 0;
let g_callMediaType = "BOTH"; // "AUDIO" | "VIDEO" | "BOTH"
let g_callSecond = 0;

// ysjung test //get mobile platform
let g_agentName = navigator.userAgent.toLowerCase();
let g_isIos = false;
let g_isAndroid = false;
if (g_agentName.indexOf("iphone") >= 0 || g_agentName.indexOf("ipad") >= 0 ||
    (g_agentName.indexOf("macintosh") >= 0 && g_agentName.indexOf("version/13") >= 0)) {
    g_isIos = true;
}

if (g_agentName.indexOf("android") >= 0) {
    g_isAndroid = true;
}



let ORG_AGENT_WIDTH = 386;
let ORG_AGENT_HEIGHT = 515;
let LAND_AGENT_WIDTH = 680;
let LAND_AGENT_HEIGHT = 515;

var webCore = null;
var webUiCore = null;
var httpManager = new HttpManager();

var userInfo = null;

let pointElements = [];

let serverInfoManager = null;

let canvasTransportDelegate = {
    drawPoint: function(core, target, x, y) {
        let canvas = document.getElementById(target);
        makePoint(target, x * canvas.width, y * canvas.height);
    },
    drawLineBegin: function(core, target, type, x, y, w, h, color, lineWidth) {
      let id = webUiCore.canvas.drawLineBegin(target, type, x, y, w, h, color, lineWidth);
      return id;
    },
    drawLineAdd: function(core, target, value, x, y) {
        webUiCore.canvas.drawLineAdd(target, value, x, y);
    },
    drawLineEnd: function(core, target, value, x, y) {
        webUiCore.canvas.drawLineEnd(target, value, x, y);
    },
    erase: function(core, target) {
        let id = webUiCore.canvas.erase(target);
        return id;
    },
    eraseAll: function(core, target) {
        webUiCore.canvas.eraseAll(target);
    },
    eraseAllByIds: function(core, target, list) {
        if(list != null && list.length > 0) {
            webUiCore.canvas.eraseAllByIds(target, list);
        }
    },
    eraseById: function(core, target, id) {
        webUiCore.canvas.eraseById(target, id);
    },
    eraseExclude(core, target, list) {
        webUiCore.canvas.eraseExclude(target, list);
    },
    eraseAllExclude(core, target, list) {
        webUiCore.canvas.eraseAllExclude(target, list);
    }

};

let canvasDelegate = {
    uiCoreDraw(canvasId, canvas) {
      let target = document.getElementById(canvasId);
      if(target){
        let context = target.getContext("2d");
        context.clearRect(0, 0, target.width, target.height);
        context.drawImage(canvas, 0, 0);
      }
    },
    uiCoreBeganPath(canvasId, id, type, x, y, data) {
        webCore.canvasTransport.sendBeganPath(webCore.room.getRoomId(), id, canvasId, type, x, y, data.width, data.height, data.lineColor, data.lineWidth);
    },
    uiCoreAddedPath(canvasId, id, type, x, y, data) {
        webCore.canvasTransport.sendAddedPath(webCore.room.getRoomId(), id, canvasId, type, x, y, data.width, data.height, data.lineColor, data.lineWidth);
    },
    uiCoreEndedPath(canvasId, id, type, x, y, data) {
        if(type == FermiCoviewUI.UICoreCanvasDrawType.POINT) {
            webCore.canvasTransport.sendPoint(webCore.room.getRoomId(), canvasId, x / data.width, y / data.height);
        }
        else {
            webCore.canvasTransport.sendEndedPath(webCore.room.getRoomId(), id, canvasId, type, x, y, data.width, data.height, data.lineColor, data.lineWidth);
        }
    }
};

var socketDelegate = new function () {
    this.coviewConnected = function(core) {
        console.log("+++++ CONNECTTED SOCKET +++++")

        //ysjung outbound
        console.log("g_callType", g_callType);
        if(g_callType  == "OUTBOUND"){
            var roomId = getRoomId();
            console.log("roomId", roomId);

            // outbound test
            // webCore.room.joinRoom(roomId, "IN", navigator.userAgent, window.location.href);

            // real
            if(g_commonDirection){
                webCore.room.joinRoom(roomId, g_commonDirection, navigator.userAgent, window.location.href);
            }
            else{
                webCore.room.joinRoom(roomId, "OUT", navigator.userAgent, window.location.href);
            }
            // webCore.room.joinRoom(roomId, "IN", navigator.userAgent, window.location.href);
        }
        else{
            webCore.room.requestRoomId();
        }

    };

    this.coviewDisconnected = function(core) {
        console.log("coviewDisconnected");
        setResultCode("error", 1);
        resRemovedRoom();
    };

    this.coviewOnMessage = function(core, data) {
        console.log("coviewOnMessage, id: ", data.id);
        console.log("coviewOnMessage, data: ", data);

        chatSubscribe(data);
        videoSubscribe(data);
        shareSubscribe(data);

        switch(data.id) {
            case "chat":
                let ownerId = webCore.room.getOwnerId();
                if(data.subType == "JOIN" && data.sender == ownerId){
                    setMainHeaderInfo(userInfo.subsName, data.senderName);
                }
                break;
            case "byPassP2PMsg":
                processP2pMsg(data);
                break;

            // for mirae
            case "existingParticipants":
                if(g_callType  == "OUTBOUND"){
                    var staffId = "";
                    var staffName = "";
                    for(var i = 0; i < data.data.length; i++){
                        if(data.data[i].userType == "STAFF" && data.data[i].isOwner == "true"){
                            staffId = data.data[i].userId;
                            staffName = data.data[i].userName;
                            break;
                        }
                    }
                    if(staffId != ""){
                        setMainHeaderInfo(userInfo.subsName, staffName);

                        var url = "/cl/staffinfo";
                        $.ajax({
                            url : url,
                            method : 'post',
                            data : {
                                staffId : staffId,
                            },
                            success : function (result) {
                                console.log("result", result);
                                if(result.statusCode == 200){
                                    connectDocShare(result.data);
                                    g_alternativePath = result.alertnative;
                                }
                                else {
                                    alert("상담사 정보요청 실패 하였습니다.\n다시 상담을 요청 하여 진행하여 주시기 바랍니다");
                                }
                            },
                            error : function (err) {
                                console.log(err.toString());
                            }
                        });
                    }
                }

                break;
        }
    };

    this.coviewOnError = function(core) {
        console.log("coviewOnError");
        setResultCode("error", 1);
        resRemovedRoom();
    };
};

var roomDelegate = new function() {
    this.coviewRequestId = function(core, data) {
      console.log("coviewRequestId", data);
      let roomId = data.roomId;
      if(roomId != null && roomId.length > 0) {
        setRoomId(roomId);

        let data = getJsonData(userInfo);
        webCore.room.requestRoom(roomId, "in", "ok", navigator.userAgent, window.location.href, data);
        // webCore.room.requestRoom(roomId, "in", "ok", navigator.userAgent, window.location.href);
      }
    };

    this.coviewRequestRoom = function(core, data) {
      // console.log("coviewRequestRoom", data);

      // ysjung - ignore busy message
        // let roomId = getRoomId();
        // if(roomId != null && roomId.length > 0) {
        //   if(roomId == data.roomId){
        //     console.log("coviewRequestRoom", data);
        //     webCore.room.joinRoom(roomId, navigator.userAgent, window.location.href);
        //   }
        // }

      // ORG eunji
      let roomId = getRoomId();
      if(roomId == data.roomId){
        if(roomId != null && roomId.length > 0) {
          if(data.busy == false){
            console.log("coviewRequestRoom", data);
            if(g_commonDirection){
                webCore.room.joinRoom(roomId, g_commonDirection, navigator.userAgent, window.location.href);
            }
            else{
                // if(g_fromKiosk){
                //     //webCore.room.joinRoom(roomId, "OUT", navigator.userAgent, window.location.href);
                //     webCore.room.joinRoom(roomId, "IN", navigator.userAgent, window.location.href);
                // }
                // else{
                //     webCore.room.joinRoom(roomId, "OUT", navigator.userAgent, window.location.href);
                // }

                // webCore.room.joinRoom(roomId, "IN", navigator.userAgent, window.location.href);
                webCore.room.joinRoom(roomId, "OUT", navigator.userAgent, window.location.href);
            }
          }
          else{
            setRoomId(null);
            setSubframeMode(1);
          }
        }
      }
    };

    this.coviewArrangeRoom = function(core, data) {
        console.log("coviewArrangeRoom", data);
    };

    this.coviewJoinRoom = function(core, data) {
        console.log("coviewJoinRoom", data);

        if(g_callType  == "OUTBOUND"){
            if(data.roomId == null){
                alert ("이미 종료된 상담 입니다\n다시 문의 해주시기 바랍니다.");
                resRemovedRoom();
            }
        }
    };

    this.coviewLeaveRoom = function(core, data) {
        console.log("coviewLeaveRoom", data);
        resRemovedRoom();
        removeRoomId();
        removeOnwerId();
    };

    this.coviewNewParticipantRoom = function(core, data) {
        console.log("coviewNewParticipantRoom", data);

        setTimeout(function(){
          let id = (webCore.room.isOwner() == true)? "ALL" : webCore.room.getOwnerId();
          let mediaType = getCallMediaType();
          webCore.call.callRequest(id, mediaType);
        }, 500);
    };

    this.coviewParticipantLeft = function(core, data) {
        console.log("coviewParticipantLeft", data);
        core.call.setEndCall(data.userId);
    };

    this.coviewEndRoom = function(core, data) {
        console.log("coviewEndRoom", data);
        core.call.clear();
        core.rtc.destroyRtcAll();
        resRemovedRoom();
        removeRoomId();
        removeOnwerId();
    };

    this.coviewRemovedRoom = function(core, data) {
        console.log("coviewRemovedRoom", data);

        let streams = webUiCore.media.getMediaDeviceListInUse();
        for(let stream of streams) {
            webUiCore.media.destroyStream(stream);
        }

        core.rtc.destroyRtcAll();
        resRemovedRoom();
        removeRoomId();
        removeOnwerId();
    };

    this.coviewError = function(core, data) {
        console.log("coviewError, code: ", data.code, "red");
        console.log("coviewError, message: ", data.message, "red");
        setResultCode("error", 1);
        resRemovedRoom();
    };
};

var roomInfoDelegate = new function() {
    this.coviewRoomList = function(core, data) {
        console.log("coviewRoomList", data);
    };

    this.coviewRoomCount = function(core, data) {
        console.log("coviewRoomCount", data);
    };

    this.coviewRoomInfo = function(core, data) {
        console.log("coviewRoomInfo", data);
        let roomId = getRoomId();
        if(roomId == data.roomId) {
            setOnwerId(data.roomInfo.ownerId);
        }
    };
};

var roomChangeDelegate = new function() {
    this.coviewRoomChangeEvent = function(core, data) {
        console.log("coviewRoomChangeEvent, eventType: " + data.eventType + ", roomId: " + data.roomId);
        let roomId = getRoomId();
        if(roomId == data.roomId) {
            if(data.eventType == "OWNCHG") {
                setOnwerId(data.ownerId);
                // webCore.room.joinRoom(roomId, navigator.userAgent, window.location.href); //roomResponse 200이 아닐 때 테스트를 위한 코드
            }
        }
    };

    this.coviewCurrentRoomOwnerChange = function(core, data) {
        console.log("coviewCurrentRoomOwnerChange", data);

        var url = "/cl/staffinfo";
        $.ajax({
            url : url,
            method : 'post',
            data : {
                staffId : data.ownerId,
            },
            success : function (result) {
                console.log("result", result);
                if(result.statusCode == 200){
                    connectDocShare(result.data);
                    g_alternativePath = result.alertnative;
                }
                else {
                    alert("상담사 정보요청 실패 하였습니다.\n다시 상담을 요청 하여 진행하여 주시기 바랍니다");
                }
            },
            error : function (err) {
                console.log(err.toString());
            }
        });

    };
};

var callDelegate = {
    coviewAllReject: function(core) {
        console.log("coviewAllReject");
        setResultCode("error", 9);
        leaveRoom();
    },
    coviewAccepted: function(core, id, mediaType, isFirst, isSip, callback) {
        console.log("coviewAccepted, id: ", id);
        console.log("coviewAccepted, mediaType: ", mediaType);
        console.log("coviewAccepted, isSip: ", isSip);

        // 최초의 연결이 될때, 자신의 통화 미디어 타입에 대해서 결정해야 한다.
        if(isFirst == true) {
            setMainFrameMode();
            var roomId = getRoomId();
            frameInit(roomId);

            core.canvasTransport.init(userInfo.userId, core.room.getOwnerId());
            core.canvasTransport.setDelegate(canvasTransportDelegate);

            let config = getConfig();
            //let profile = "VGA";
            let profile = getResolution(); //ysjung get from function

            let myMediaType = getCallMediaType();

            //if(g_isIos){
            if(1){
                let constraints = null;
                constraints = {video: true, audio: true};
                console.log("coviewAccepted, IOS constraints: ", constraints);
                webUiCore.media.getUserMedia(constraints, (stream, err) => {
                    if(stream != null) {
                        console.log("coviewAccepted, userInfo.userId: ", userInfo.userId);
                        core.rtc.makeSendOnly(userInfo.userId, FermiCoview.SourceType.CAMERA, myMediaType, stream, profile);
                        callback(true);
                    }
                    else {
                        console.log(err);
                        alert("비디오 영상 획득 실패 " + err);
                        callback(false);
                    }
                });
            }
            else{
                getMediaIds(config, (cameraId, micId) => {
                    let constraints = null;
                    switch(myMediaType) {
                        case FermiCoview.MediaType.VIDEO:
                        profile = config.cameraType;
                        constraints = webUiCore.media.getVideoConstraints(cameraId);
                        break;

                        case FermiCoview.MediaType.BOTH:
                        profile = config.cameraType;
                        constraints = webUiCore.media.getConstraints(cameraId, micId);
                        break;

                        case FermiCoview.MediaType.AUDIO:
                        constraints = webUiCore.media.getAudioConstraints(micId);
                        break;
                    }

                    console.log("coviewAccepted, constraints: ", constraints);
                    webUiCore.media.getUserMedia(constraints, (stream, err) => {
                        if(stream != null) {
                            console.log("coviewAccepted, userInfo.userId: ", userInfo.userId);
                            core.rtc.makeSendOnly(userInfo.userId, FermiCoview.SourceType.CAMERA, myMediaType, stream, profile);
                            callback(true);
                        }
                        else {
                            console.log(err);
                            alert("비디오 영상 획득 실패 " + err);
                            callback(false);
                        }
                    });
                });

            }
        }
        else {
            console.log("accepted, existMediaCallback call");
            if(callback != null) {
              callback(true);
            }
        }
    },
    coviewAllEndCall: function(core) {
        console.log("coviewAllEndCall");
        leaveRoom();

        for(let id of core.rtc.getRtcListAll()) {
            console.log("allEndcall, id: ", id);
            let src = core.rtc.getSource(id);
            if(src != null) {
                webUiCore.media.destroyStream(src);
            }

            core.rtc.destroyRtc(id);
          }

          core.call.clear();
    },
    coviewEndCall: function(core, id, mediaType, isSip) {
        let rtcId = core.rtc.getCallRtcId(id);

        console.log("endCall, id: ", id);
        console.log("endCall, rtcId: ", rtcId);
        console.log("endCall, mediaType: ", mediaType);
        console.log("endCall, isSip: ", isSip);

        core.rtc.destroyRtc(rtcId);
    },
    coviewNewCall: function(core, id, mediaType, isSip) {
        console.log("coviewNewCall, id: ", id);
        console.log("coviewNewCall, mediaType: ", mediaType);
        console.log("coviewNewCall, isSip: ", isSip);
        setClientId(id);


        // ysjung OUTBOUND
        // uiEvent.accept();
        webCore.call.callRequestAccepted(id, mediaType);
    },
    coviewCancelCall: function(core, id, mediaType, isSip){
        console.log("coviewCancelCall, id: ", id);
        console.log("coviewCancelCall, mediaType: ", mediaType);
        console.log("coviewCancelCall, isSip: ", isSip);
    }
};

var webRtcDelegate = {
    coviewNewJoinedMedia: function(core, id, srcType, userId, mediaType) {
        console.log("coviewNewJoinedMedia, id: ", id);
        core.rtc.makeReceiveOnly(id, srcType, mediaType, userId);
    },
    coviewCreatedMediaRtc: function(core, srcType, id, userId, mediaType) {
        console.log("coviewCreatedMediaRtc, id: ", id);
        console.log("+++ add local media coviewCreatedMediaRtc ",srcType, id, userId, mediaType);

        let stream = core.rtc.getSource(id);
        setVideoView(id, stream, true, viewType.SUB);
        addMediaList(id, stream, true, "local");
    },
    coviewDestroyedMediaRtc: function(core, srcType, id, userId) {
        console.log("coviewDestroyedMediaRtc, id: ", id);
    },
    coviewDestroyedMediaRtcAll: function(core) {
        console.log("coviewDestroyedMediaRtcAll");
        core.canvasTransport.removeDelegate();
        core.canvasTransport.destroy();
    },
    coviewErrorEvent: function(core, id, code) {
        console.log("coviewErrorEvent, id: ", id);
        console.log("coviewErrorEvent, code: ", code);
        if(code == 2) {
            core.rtc.destroyRtc(id);
        }
    },
    coviewNewMediaSource: function(core, srcType, id, source) {
        console.log("coviewNewMediaSource: ", core, srcType, id);
        console.log("coviewNewMediaSource, source: ", source);

        if(srcType != 7) { //ysjung : 7 => record source : do NOTHING
            var videoOwnerId = webCore.rtc.getUserId(id);

            if(checkMainVideo(id) == true){
                mainVideoId = id;
                setVideoView(id, source, false, viewType.MAIN);
                addMediaList(id, source, false, videoOwnerId);
            }
            else if(checkMainVideo(id) == false){
                changeShareView(viewType.SHARE);
                // toggleExpandDisplay(false);
                setShareView(id, source, false, viewType.SHARE);
                addMediaList(id, source, false, "others");
            }
        }
    },
    coviewUpdateMediaSource: function(core, srcType, id, source) {
        console.log("coviewUpdateMediaSource, id: ", id);
        updateVideoView(id, source);
    }
};

var webRtcIceCandidateDelegate = {
    coviewIceCandidateStatus: function(core, srcType, id, userId, mediaType, status) {
        console.log("coviewIceCandidateStatus, status: ", {
            id: id,
            userId: userId,
            status: status
        }, "#FFFF66");
    }
};

var webRtcReports = {
    reportsVideoByte: function(core, id, bytes, perBytes, width, height, frameRate) {
        let info = {
            id: id,
            bytes: bytes,
            perBytes: perBytes,
            width: width,
            height: height,
            frameRate: frameRate
        };

        let container = document.getElementById("f" + id + "_reports");
        let kBytes = bytes/1024;
        let perKbytes = perBytes/1024;

        let videoInfo = container.querySelector("#f" + id + "_reports_video");
        let html = `<span style='background:#000'>Video<br>total: ${kBytes.toFixed(2)} KBytes<br>perSeconds: <span style='color:#0f0'> ${perKbytes.toFixed(2)}</span> KBytes<br>width: ${width}, height: ${height}, fr: ${frameRate} </span>`;

        videoInfo.innerHTML = html;
        //console.log("reportsVideoByte, info: ", info, "green");
    },
    reportsAudioByte: function(core, id, bytes, perBytes) {
        let info = {
            id: id,
            bytes: bytes,
            perBytes: perBytes,
        };

        let container = document.getElementById("f" + id + "_reports");
        let kBytes = bytes/1024;
        let perKbytes = perBytes/1024;

        let audioInfo = container.querySelector("#f" + id + "_reports_audio");
        let html = `<span style='background:#000'>Audeo<br>total: ${kBytes.toFixed(2)} KBytes<br>perSeconds: <span style='color:#0f0'> ${perKbytes.toFixed(2)}</span> KBytes`;

        audioInfo.innerHTML = html;
    }
};

function displayLog(text, data, color) {
    console.log("[WEBCORE LOG] : ", text, data);
};

function webCoreInit(loginId, userId, userName, userType, subsId, token) {
    console.log("webCoreInit", loginId, userId, userName, userType, subsId, token);
    console.log("g_fromKiosk", g_fromKiosk);

    // outbound test
    // var turnSrvAddr = g_interTurnSrvAddr;
    var turnSrvAddr = g_extTurnSrvAddr;


    // if(g_extTurnSrvAddr && g_fromKiosk != true){
    //     turnSrvAddr = g_extTurnSrvAddr;
    // }
    // else if(g_extTurnSrvAddr && g_fromKiosk == true && g_kioskDirection == "OUT"){
    //     turnSrvAddr = g_extTurnSrvAddr;
    // }
    console.log("turnSrvAddr", turnSrvAddr);

    let config = {
        "addr": g_asSrvAddr,
        "iceServers": [{
            "urls": [turnSrvAddr],
            "username": "fermi",
            "credential": "fermi1004"
        }],
        "codec": getCodec(),
        "loginId": loginId,
        "userId": userId,
        "userName": userName,
        "userType": userType,
        "subsId": subsId,
        "token": token,
        "transports": ["websocket", "xhr-polling"],
    };

    setDelegate();
    webCore.init(config, true, g_webCoreStaticPath);
    webCore.room.getOwnerId();

    let sessionId = getRandomString(5, "#aA");
    webCore.socket.connect(sessionId);
};

function setDelegate() {
    webCore.socket.setDelegate(socketDelegate);

    webCore.room.setDelegate(roomDelegate);
    webCore.room.setInfoDelegate(roomInfoDelegate);
    webCore.room.setChangeDelegate(roomChangeDelegate);

    webCore.call.setDelegate(callDelegate);

    webCore.rtc.setDelegate(webRtcDelegate);
    webCore.rtc.setIceCandidateDelegate(webRtcIceCandidateDelegate);
};

function removeDelegate() {
    webCore.socket.removeDelegate(socketDelegate);

    webCore.room.removeDelegate(roomDelegate);
    webCore.room.removeInfoDelegate(roomInfoDelegate);
    webCore.room.removeChangeDelegate(roomChangeDelegate);

    webCore.call.removeDelegate(callDelegate);

    webCore.rtc.removeDelegate(webRtcDelegate);
    webCore.rtc.removeIceCandidateDelegate(webRtcIceCandidateDelegate);
}

function webCoreDestroy() {
    removeDelegate();
    webCore.destroy();
};

function setOnwerId(onwerId) {
  g_ownerId = onwerId;
}

function removeOnwerId() {
  g_ownerId = null;
};

function setRoomId(roomId) {
  g_roomId = roomId;
};

function getRoomId() {
  return g_roomId;
};

function removeRoomId() {
  g_roomId = null;
};

function setClientId(id) {
  g_agentFromId = id;
};

function getClientId() {
  return g_agentFromId;
};

function getMediaIds(config, callback) {
    //ysjung test
    webUiCore.media.setMediaConfig(config);
    webUiCore.media.getDeviceList((list) => {
        var cameraId;
        for(let item of list) {
            if(item.kind == "videoinput") {
                let o = makeOption(item.deviceId, item.label);

                if(item.label.indexOf(g_videoFacingMode) >= 0){
                    cameraId = item.deviceId;
                }
            }
        }
        console.log("getCamera, searchCamera, cameraId: ", cameraId);
        webUiCore.media.searchMic((micId, millisecond) => {
            console.log("getCamera, searchMic, micId: ", micId);
            if(callback != null) {
                callback(cameraId, micId);
            }
        });
    });
};

function setResolution(id, width, height) {
    let div = document.getElementById(id);
    div.innerText = width + " X " + height;
}

function getCodec() {
    var codec = g_videoCodec;
    if(g_isIos == true){
        if(g_agentName.indexOf("version/15.1") >= 0){
            codec = "VP8"
        }
    }

    return codec;
  // return g_videoCodec;
};

function getCallMediaType() {
  return g_callMediaType;
};

function getResolution() {
  return g_videoResolution;
};

function getRatio() {
  return g_videoRatio;
};

function getFacingMode() {
  return g_videoFacingMode;
};

function getConfig() {
    return {
        "cameraType": getResolution(),
        "cameraAspectRatio": getRatio(),
        "cameraFacingMode": getFacingMode(),
        "cameraWidth": 640,
        "cameraHeight": 480,
        "cameraFrameRate": [5, 24],
        "useMediaConstraints": true,
        "facingModeFrontList": ["front", "전면", "前面"],
        "facingModeBackList": ["back", "후면", "背面"],
        "screenShareWidth": 640,
        "screenShareHeight": 480,
        "screenShareFrameRate": 8,
    };
};

function makeControlView(id, width, height, video) {
    let div = document.createElement("div");
    div.style.display = "flex";
    div.style.width = width + "px";
    div.style.height = height + "px";
    div.id = id + "_control_box";

    let sliderbar = document.createElement("input");
    sliderbar.type = "range";
    sliderbar.min = 0;
    sliderbar.max = 1;
    sliderbar.value = 1;
    sliderbar.step = 0.05;
    sliderbar.style.width = "50%";

    sliderbar.addEventListener("change", (event) => {
        if(video.muted == false) {
            video.volume = event.target.value;
            volumeBox.innerText = (video.volume * 100) + "%";
        }
    });

    let volumeBox = document.createElement("div");
    volumeBox.innerText = (video.volume * 100) + "%";

    let muteButton = document.createElement("button");
    muteButton.style.backgroundColor = "#ffffff";
    muteButton.style.color = "#000000";
    muteButton.innerText = "muted"

    muteButton.addEventListener("click", (event) => {
        video.muted = !video.muted;
        if(video.muted == true) {
            muteButton.style.backgroundColor = "#ff0000";
            muteButton.style.color = "#ffffff";
        }
        else {
            muteButton.style.backgroundColor = "#ffffff";
            muteButton.style.color = "#000000";
        }
    });

    if(video.muted == true) {
        muteButton.style.backgroundColor = "#ff0000";
        muteButton.style.color = "#ffffff";
        sliderbar.disabled = true;
        volumeBox.disabled = true;
        muteButton.disabled = true;
    }

    let space1 = document.createElement("div");
    space1.style.width = "5px";
    space1.style.height = "100%";

    let space2 = document.createElement("div");
    space2.style.width = "5px";
    space2.style.height = "100%";


    div.appendChild(sliderbar);
    div.appendChild(space1);
    div.appendChild(volumeBox);
    div.appendChild(space2);
    div.appendChild(muteButton);

    return div;
};

function updateVideoView(id, stream) {
    let videoContainer = document.getElementById("videoArea");
    let video = videoContainer.querySelector("#" + "f" + id);
    video.pause();
    video.srcObject = stream;
};

function removeChildAll(id)  {
    let div = document.getElementById(id);
    if(div != null) {
        while(div.hasChildNodes() == true) {
            div.removeChild(div.firstChild);
        }
    }
};

function setCanvasMouseEvent(canvas, width, height) {
    console.log("setCanvasMouseEvent, canvas: ", canvas);
    console.log("setCanvasMouseEvent, width: ", width);
    console.log("setCanvasMouseEvent, height: ", height);
    canvas.addEventListener("mousedown", (ev) => {
        console.log("mousedown, ev: ", ev);
        webUiCore.canvas.mousedown(ev.target.id, ev);
    });

    canvas.addEventListener("mousemove", (ev) => {
        webUiCore.canvas.mousemove(ev.target.id, ev);
    });

    canvas.addEventListener("mouseup", (ev) => {
        console.log("mouseup, ev: ", ev);
        webUiCore.canvas.mouseup(ev.target.id, ev);
        let type = webUiCore.canvas.getDrawType(ev.target.id);
        console.log("mouseup, type: ", type);
        if(type == FermiCoviewUI.UICoreCanvasDrawType.POINT) {
            makePoint(ev.target.id, ev.offsetX , ev.offsetY);
        }
    });

    canvas.addEventListener("mouseout", (ev) => {
        webUiCore.canvas.mouseout(ev.target.id, ev);
    });

    webUiCore.canvas.init(canvas.id, canvasDelegate);
    webUiCore.canvas.setCanvasSize(canvas.id, width, height);
};

function setCanvasTouchEvent(canvas, width, height) {
    console.log("setCanvasTouchEvent, canvas: ", canvas);
    console.log("setCanvasTouchEvent, width: ", width);
    console.log("setCanvasTouchEvent, height: ", height);
    var isTouching = false;
    var lastTouchEvent = null;

    canvas.addEventListener("touchstart", (ev) => {
        console.log("touchstart, ev: ", ev);
        isTouching = true;
        var rect = ev.target.getBoundingClientRect();
        ev.offsetX = Math.floor(ev.targetTouches[0].pageX - rect.left);
        ev.offsetY = Math.floor(ev.targetTouches[0].pageY - rect.top);
        webUiCore.canvas.mousedown(ev.target.id, ev);
    });

    canvas.addEventListener("touchmove", (ev) => {
        if(isTouching == false) return;
        console.log("touchmove, ev: ", ev);
        var rect = ev.target.getBoundingClientRect();
        ev.offsetX = Math.floor(ev.targetTouches[0].pageX - rect.left);
        ev.offsetY = Math.floor(ev.targetTouches[0].pageY - rect.top);
        webUiCore.canvas.mousemove(ev.target.id, ev);
        lastTouchEvent = ev;
    });

    canvas.addEventListener("touchend", (ev) => {
        if(isTouching == false || lastTouchEvent == null) return;
        console.log("touchend, ev: ", ev);
        ev.offsetX = lastTouchEvent.offsetX;
        ev.offsetY = lastTouchEvent.offsetY;
        webUiCore.canvas.mouseup(ev.target.id, ev);
        webUiCore.canvas.mouseout(ev.target.id, ev);
        isTouching = false;
        lastTouchEvent = null;
    });

    canvas.addEventListener("touchcancel", (ev) => {
        if(isTouching == false || lastTouchEvent == null) return;
        console.log("touchcancel, ev: ", ev);
        ev.offsetX = lastTouchEvent.offsetX;
        ev.offsetY = lastTouchEvent.offsetY;
        webUiCore.canvas.mouseout(ev.target.id, ev);
        isTouching = false;
        lastTouchEvent = null;
    });

    webUiCore.canvas.init(canvas.id, canvasDelegate);
    webUiCore.canvas.setCanvasSize(canvas.id, width, height);
};

function makePoint(id, x, y) {
    let canvasBox = document.getElementById(id + "_box");
    let canvas = document.getElementById(id);

    let scale = 1;
    let externPoint = { x: 0, y: 0 };
    let point = calcPoint(id, x, y, canvas.width, canvas.height, 0, scale, externPoint);

    let pointElement = document.createElement('div');
    pointElement.style.position = 'absolute';
    pointElement.style.top = (point.y - 20 / scale) + 'px';
    pointElement.style.left = (point.x - 20 / scale) + 'px';
    pointElement.style.width = 40 / scale + 'px';
    pointElement.style.height = 40 / scale + 'px';
    pointElement.style.border = (2 / scale) + 'px solid #ff0011';
    pointElement.style.borderRadius = 40 / scale + 'px';
    pointElement.style.opacity = '0';
    pointElement.style.animation = 'pointer 0.5s 3 ease-out';
    canvasBox.appendChild(pointElement);
    pointElements.push(pointElement);

    setTimeout(() => {
        let p = pointElements.shift();
        canvasBox.removeChild(p);
    }, 2000);
};

function calcPoint(id, x, y, width, height, rotation, scale, point) {
    let result = {
        x: 0,
        y: 0
    };

    let mainCanvas = document.getElementById(id);
    let clientRect = mainCanvas.getBoundingClientRect();

    let scaleX = rotation == 0 || rotation == 180 ? clientRect.width / width : clientRect.height / width / scale;
    let scaleY = rotation == 0 || rotation == 180 ? clientRect.height / height : clientRect.width / height / scale;

    let c1 = point.x * scaleX;
    let c2 = point.y * scaleY;

    let left = rotation == 0 || rotation == 180 ? ((clientRect.width - width) / 2) - c1 : ((clientRect.height / scale - width) / 2) - c1 ;
    let top = rotation == 0 || rotation == 180 ? ((clientRect.height - height) / 2) - c2 : ((clientRect.width / scale - height) / 2) - c2 ;

    // result.x  = (x * scaleX) - left;
    // result.y = (y * scaleY) - top;
    result.x  = x;
    result.y = y;
    return result;
};

function getCurrentSourceType() {
    let mediaType = getCallMediaType();
    let sourceType = null;
    switch(mediaType) {
        case FermiCoview.MediaType.VIDEO:
        case FermiCoview.MediaType.BOTH:
            sourceType = FermiCoview.SourceType.CAMERA;
            break;

        case FermiCoview.MediaType.AUDIO:
            sourceType = FermiCoview.SourceType.MIC;
            break;
    }

    return sourceType;
};

function getRandomString(length, pattern) {
    let mask = "";
    let result = "";
    let usePattern = pattern  || "#aA!";

    if(usePattern.indexOf("a") > -1) {
        mask += "abcdefghijklmnopqrstuvwxyz";
    }

    if(usePattern.indexOf("A") > -1) {
        mask += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    }

    if(usePattern.indexOf("#") > -1) {
        mask += "0123456789";
    }

    if(usePattern.indexOf("!") > -1) {
        mask += "~`!@#$%^&*()_+{}[]:\";'<>?,./|\\";
    }

    for(let i = length; i > 0; --i) {
        result += mask[Math.floor(Math.random() * mask.length)];
    }

    return result;
};

function makeOption(deviceId, text) {
    var option = document.createElement("option");
    option.value = deviceId;
    option.text = text;
    return option;
};

function getLocaleString(num){
  let result = 0;
  if(num){
    // result = num.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
    result = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  }
  return result;
}
