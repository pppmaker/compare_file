var errorCallback = null;
var resultCode = null;

var timeOut = 120; //120초 뒤에 타임아웃
var timer = null;
var rateNum = 0;

var frameRoomId = null;
var frameMode = null;
var isExpandView = false;
var isCloseFrameOpen = false;

//ysjung
let g_iframeInfo = null;
let g_fromKiosk = null;
let g_alternativePath = null;

let g_popWaitingTimeSec = 30;
let g_reservationTime = null;

window.addEventListener("message", function(event) {
  // if(window.location.origin != event.origin) {
  if(1) {
    console.log("index, iFrame, message, id: ", event.data.id);
    if(event.data.kiosk){
        console.log("index, iFrame, message, kiosk: ", event.data.kiosk);
        g_fromKiosk = true;
    }
    switch(event.data.id) {
      case "start":
        startCoview(event.data.data, (id, result) => {
          console.log("index, iFrame, startCoview, id", id);
          console.log("index, iFrame, startCoview, result", result);
          window.parent.postMessage({
            "id": id,
            "data": result,
          }, event.origin);
        });
        break;
      case "setting":
        settingCoview((id, result) => {
          window.parent.postMessage({
            "id": id,
            "data": result,
          }, event.origin);
        });
        break;
    }
  }
});

window.onload = function () {
    var url = "/cl/workschedule";
    $.ajax({
        url : url,
        method : 'post',
        // data : {
        //     subsid : subsid,
        // },
        success : function (result) {
            console.log("result", result);
            if(result.statusCode == 200){

                // ORG
                if(hasParam('type') == true || hasParam("iFrame") == true) {
                    if(hasParam("iFrame") == true) {
                        window.parent.postMessage({
                            "id": "standBy",
                        }, "*");
                    }
                    return;
                }
                else if(hasParam("subsId") == true){
                    let subsId = getParameterByName("subsId");
                    if(subsId != null){
                        var result = getObject(subsId);
                        console.log("CALL startProcess : subsId", result);
                        startProcess(result);
                    }
                }
                // ysjung outbound
                else if(hasParam("r") == true){
                    // get frame_info
                    g_callType = "OUTBOUND";

                    var roomId = getParameterByName("r");
                    setRoomId(roomId);
                    var subsId = getSubsIdFromRoomId(roomId);

                    // todo : get client info from api
                    var outBoundData = {
                        userId : "2" + Math.floor(Math.random()*10000)+1,
                        userName : "예약고객",
                        subsId : subsId,
                        subsName : "미래에셋 영상상담",
                        siteId : "0",
                        siteName : "mobile",
                        siteCode : "0",
                        itemCode : "ABC",
                        itemName : "예약상품",
                        custFull : "00000000000",
    					idNum : "0",
    					ownType : "1",
    					verify : "1",
    					type : "1",
    					path : "예약",
                    }
                    //var outBoundDataJ = JSON.stringify(outBoundData);
                    startProcess(outBoundData);
                }
            }
            else {
                // alert("업무시간이 종료되었습니다.");
                console.log("업무시간 아님!");
                var weekDayStrArr = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

                var wokingDayHtml = "";
                for(var i = 0; result.workScheduleList.length > i; i++){
                    var printIndex = i + 1;
                    if(printIndex > 6) printIndex = 0;

                    if(result.workScheduleList[printIndex].IS_WORK == "Y"){
                        wokingDayHtml += "<div class='scehdule_info_line'>"
                        + "<span class='schedul_titile'>" + weekDayStrArr[printIndex] + "</span>"
                        + "<span class='schedul_time'>"
                        + result.workScheduleList[printIndex].STIME.substring(0, 2) + ":"
                        + result.workScheduleList[printIndex].STIME.substring(2, 4) + " ~ "
                        + result.workScheduleList[printIndex].ETIME.substring(0, 2) + ":"
                        + result.workScheduleList[printIndex].ETIME.substring(2, 4)
                        + "</span>"
                        + "</div>"
                    }
                }


                $(".scehdule_info").html(wokingDayHtml);
                $(".modal_popup.scehdule").show();
                // new : not in schedule
                setTimeout(function(){
                    console.log("Clear Frame")
                    // closeCoview('error', 99);
                    window.parent.postMessage({
                        "id": "error",
                        "data" : {"code": "99"},
                    }, "*");
                }, g_popWaitingTimeSec * 1000)

            }
        },
        error : function (err) {
            console.log(err.toString());
            closeCoview('error', 99);
        }
    });

    window.history.pushState({page: 1}, "", "");
    window.onpopstate = function(evnet){
        console.log("onpopstate", event);

        if(event){
            window.history.pushState({page: 1}, "", "");
            closeFrame();
        }
    }


};

// function getObject(subsId){
//   let result = {
//     "userId"   : "2" + Math.floor(Math.random()*10000)+1,
//     "userName" : "테스트고객",
//     "roomType" : "once",
//     "siteCode" : "0",
//     "siteName" : "mobile",
//     "subsId"   : subsId,
//     "subsName" : "테스트회사",
//     "itemCode" : "ABCDE",
//     "itemName" : "테스트상품",
//     "shopUrl" : "https://dev21himart.coview.co.kr:4433/cl/mobile/images/item-image.png",
//     "shopCode" : "A-18293",
//     "shopName" : "[SK매직] SK매직 식기세척기 A-18293 [빌트인/16인용]",
//     "shopListPrice" : "3990000",
//     "shopPrice" : "2990000",
//   }
//   return result
// }

function hasParam(key) {
  let result = false;
  var params = location.search.substr(location.search.indexOf("?") + 1);
  console.log("hasParam, params: ", params);
  if(params.length > 0) {
    result = params.includes(key);
  }
  return result;
};

function getParameterByName(name) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
      results = regex.exec(location.search);
  return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, " "));
}

async function startCoview(data, callback){
    if(errorCallback != null){
      closeCoview("error", 5);
      return;
    }
    errorCallback = callback;

    if(data.subsId == null || data.roomType == null || data.subsId.length == 0 || data.roomType.length == 0) {
      closeCoview("error", 4);
      return;
    }

    if(data.roomType == "once"){
      if(data.userId == null || data.userName == null){
        closeCoview("error", 4);
        return;
      }
    }

    // not use 플라자 상담
    // if(await testCamera() == false){
    //     setForceResultCode('end', 12);
    //     closeProcess();
    //     return;
    // }

    startProcess(data);
  }

  function getJsonData(data){
    let result = {};

    result['companyCode'] = data.subsId;
    result['companyName'] = data.subsName;
    result['siteId'] = "5";
    result['siteName'] = data.siteName;
    result['siteCode'] = data.siteCode;
    result['itemCode'] = data.itemCode;
    result['itemName'] = data.itemName;
    result['shopUrl'] = data.shopUrl;
    result['shopCode'] = data.shopCode;
    result['shopName'] = data.shopName;

    return JSON.stringify(result);
  }

  function startProcess(data){
    g_iframeInfo = data; //ysjung
    console.log("g_iframeInfo", g_iframeInfo);
    userInfo = data;
    userInfo["userType"] = "client";
    webCore = new FermiCoview.WebCore();
    webUiCore = new FermiCoviewUI.UICore();

    webUiCore.media.init();

    //ysjung
    webCoreInit(data.userId, data.userId, data.userName, "client", data.subsId, null);
    setSubframeMode(0);

    if(g_callType != "OUTBOUND"){
        startTimer();
    }



    // org
    // g_isIos = 0;
    // if(g_isIos){
    //     webCoreInit(data.userId, data.userId, data.userName, "client", data.subsId, null);
    //     setSubframeMode(0);
    //     startTimer();
    // }
    // else{
    //     webUiCore.media.checkPermission((state, err) => {
    //       displayLog("permission allow", state);
    //       displayLog("permission allow, err", err);
    //
    //       switch(state) {
    //         case FermiCoviewUI.MediaPermission.ALLOW:
    //         case FermiCoviewUI.MediaPermission.DENY:
    //         case FermiCoviewUI.MediaPermission.ERROR:
    //           webCoreInit(data.userId, data.userId, data.userName, "client", data.subsId, null);
    //           setSubframeMode(0);
    //           startTimer();
    //           break;
    //       }
    //     });
    // }
  }

  function closeCoviewWithKiosk(id, data, roomId){
    console.log("closeCoviewWithKiosk ", id, data, roomId);
    if(id != null && data != null && roomId != null){
        resultCode = {
            id: id,
            code: data,
            roomId : roomId
        }
        frameRoomId = null;

        if(webCore && webCore.socket.isConnected() == true) {
            webCore.socket.disconnect();
        }

        if(errorCallback != null) {
            errorCallback(resultCode.id, resultCode);
            errorCallback = null;
            resultCode = null;
            timer = null;
        }

        // sharedoc with
        if(isLoadDocshare == true){
            tripath_disconnect();
        }
    }
  }

  function closeCoview(id, data){
    // new info popup
    console.log("closeCoview id: ", id);
    console.log("closeCoview data: ", data);
    if(data != 0){
        $(".modal_popup.busy").show();

/*
        setInterval(function(){
            $(".busy_info_count").text(popWaitingTimeSec)
            popWaitingTimeSec--;
        }, 1000);
*/


        setTimeout(function(){
            setResultCode(id, data);
            closeProcess();
            closeDocShare();
        }, g_popWaitingTimeSec * 1000);
    }
    else{
        setResultCode(id, data);
        closeProcess();
        closeDocShare();
    }
  }

  function closeDocShare(){
      // sharedoc with
      if(isLoadDocshare == true){
          tripath_disconnect();
      }
  }

  function closeProcess(){
    if(isLoadDocshare == true){
      tripath_disconnect();
    }

    if(resultCode != null){
      frameRoomId = null;

      if(webCore && webCore.socket.isConnected() == true) {
        webCore.socket.disconnect();
      }

      if(errorCallback != null) {
        errorCallback(resultCode.id, resultCode);
        errorCallback = null;
        resultCode = null;
        timer = null;
      }
    }

    // ysjung for outbound
    if(g_callType == "OUTBOUND"){
        console.log("closeProcess!!!!!!!!!!!!");
        location.replace("/cl/end");
    }
  }

  function startTimer(){
    if(timer == null){
      timer = setTimeout(()=>{
        clearTimer();
        sendTimeOut();
        setResultCode("error", 11);
        leaveRoom(); //타임아웃될 경우 leaveRoom을 보내서 agent에서 endRoom을 하도록
        setSubframeMode(2)
      }, timeOut * 1000);
    }
  }

  function clearTimer(){
    if(timer != null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function frameInit(roomId){
    frameRoomId = roomId;
    chatInit(roomId);
    viewInit(roomId);
  }

  function setResultCode(id, data){
    //한 번 정해진 결과 코드는 수정되지 않도록 함
    if(resultCode != null) return;
    if(id != null && data != null){
      resultCode = {
        id: id,
        code: data
      }
    }
  }

  function setForceResultCode(id, data){
    if(id != null && data != null){
      resultCode = {
        id: id,
        code: data
      }
    }
  }

  function leaveRoom(){
    let curRoomId = webCore.room.getRoomId();
    if(curRoomId != null){
      webCore.room.leaveRoom();
    }
    setRoomId(null);
  }

  function resRemovedRoom(){
    if(resultCode == null){
      //null일 경우 상담사에 의한 정상 종료로 간주
      setResultCode("error", 0);
    }

    console.log("IFRAME WILL CLOSE SOON");
    if(resultCode.code != 0){
        $(".modal_popup.busy").show();
        setTimeout(function(){
            closeProcess();
            removeChat();
            removeAllView();
        }, g_popWaitingTimeSec * 1000);
    }
    else{
        // openCloseFrame();
        closeProcess();
        removeChat();
        removeAllView();
    }
  }

  function closeFrame(){
    $("#popupContents").css("height", "198.5px");
    $("#popupExit").css("display", "none");
    $("#titleSubText").css("margin-bottom", "29px");
    openPopupFrame(null, "상담을 종료하시겠습니까?", "확인", "취소",
    ()=>{
      // leaveRoom();
      setResultCode("error", 0);
      let id = (webCore.room.isOwner() == true)? "ALL" : webCore.room.getOwnerId();
      let mediaType = webCore.call.getCallMediaType(id);
      webCore.call.callEnd(id, mediaType);
    },()=>{

    });
  }

  function openPopupFrame(text, subText, yesButton, noButton, yesCallback, noCallback){
    if(text != null){
      $("#titleMainText").show();
      $("#titleMainText").html(text);
    }

    if(subText != null){
      $("#titleSubText").show();
      $("#titleSubText").html(subText);
    }

    $("#popupExit").click(function(){
      setPopupFrame();
      if(noCallback != null){
        noCallback();
      }
    });

    $("#yesButton").html(yesButton);
    $("#yesButton").click(function(){
      setPopupFrame();
      yesCallback();
    });

    if(yesButton == null){
      $("#yesButton").css("display", "none");
    }

    if(noButton == null){
      $("#noButton").css("display", "none");
    }
    else{
      $("#noButton").css("display", "block");
      $("#noButton").html(noButton);
      $("#noButton").click(function(){
        setPopupFrame();
        noCallback();
      });
    }

    $("#popupFrame").show();
  }

  function setPopupFrame(){
    $("#popupFrame").hide();
    $("#titleMainText").hide();
    $("#titleMainText").html("");
    $("#titleSubText").hide();
    $("#titleSubText").html("");
    $("#yesButton").html("확인");
    $("#yesButton").off("click");
    $("#noButton").html("취소");
    $("#noButton").off("click");
    $("#popupExit").off("click");
    $("#rate").hide();
    removeChildAll("rate1");
  }

  function openCloseFrame(){
    //정상 종료가 아닐 경우 상담 평가 안함
    if(!resultCode || resultCode.code != 0) return closeProcess();

    if(isCloseFrameOpen == true) return;
    isCloseFrameOpen = true;

    if(g_fromKiosk){
        closeCoviewWithKiosk("end", 0, frameRoomId);
    }
    else {
        $("#rate").show();
        setRateView();

        $("#popupContents").css("height", "308px");
        $("#popupExit").css("display", "block");
        $("#titleSubText").css("margin-bottom", "17.5px");
        $("#yesButton").css("background-color", "#444444");
        openPopupFrame("상담이 종료되었습니다"
        , "전문 상담원과 상담하신 내용에 대해<br/>전반적인 만족도를 평가해주세요."
        ,"평가 완료하기", null, ()=>{
          $("#yesButton").css("background-color", "#f1344d");
          saveRate();
        }, ()=>{
          $("#yesButton").css("background-color", "#f1344d");
          saveRate();
        });
    }
  }

  function saveRate(){
    if(rateNum > 0){
      //별점 평가 로직
      // let requestUrl = g_asPostAddr + "/v1/counselor/assessment";
      let requestUrl = "/api/v1/counselor/assessment";
      let header = { key : "Accept", value: "application/json" };
      let data = { roomId : frameRoomId, rate : rateNum };
      httpManager.requestPostUrl(requestUrl, header, data, function(){
        $("#popupContents").css("height", "266.5px");
        $("#popupExit").css("display", "none");
        $("#titleSubText").css("margin-bottom", "17.5px");

        //ysjung : add event button
        let closeButtonText = "확인";
        $("#noButton").css("background-color", "#f1344d");
        let eventButton = null;

        if(userInfo.eventPage && userInfo.eventPage.length > 0){
            eventButton = "이벤트 보기";
            if(userInfo.eventBtnTxt){
                eventButton = userInfo.eventBtnTxt;
            }

            if(userInfo.eventImgPage){
                $("#popupContents").css("height", "449.5px");
                $(".frame_event").show();
                $(".frame_event_img").attr("src", userInfo.eventImgPage);
            }

            closeButtonText = "닫기";
            $("#noButton").css("background-color", "#444");
        }

        if(g_fromKiosk){
            closeCoview('error', 0);
        }
        else{
        openPopupFrame("영상상담 서비스를<br/>이용해주셔서 감사합니다"
        // ,"상담하신 이력은 마이롯데>문의내역>영상상담 내역에서 확인하실 수 있습니다."
                , eventButton
                , closeButtonText
                , ()=>{     // closeCoview('error', 14); /`/ close and event page open
                            setForceResultCode('end', 14);
                            closeProcess();
                      }
                , ()=>{
                          closeCoview('error', 0);
                      });
        }
      });
    }
  }

  function setRateView(){
    let rate1 = document.getElementById("rate1");
    for (var index = 0; index < 5; index++) {
      let num = index + 1;
      let star = document.createElement("img");
      star.className = "rate1";
      star.name = num;
      star.src = "/cl/mobile/images/ic-mark-on.png";
      rate1.appendChild(star);

      star.addEventListener("click", function(e) {
        rateNum = Math.floor(e.target.name);
        switchRateView("rate1");
      });
    }

    rateNum = 5;
    switchRateView(rateNum);
  }

  function toggleExpandDisplay(isExpand){
    if(isExpand == true && isExpandView == false){
      isExpandView = true;
      setMainView();
      //setRemoteView(true); //ykjung
      setRemoteView(false);
      setHeaderView();
      setToolsView(false);
      // setRemoteVideoView();
    }
    else if(isExpand == false && isExpandView == true){
      let inputText = document.getElementById("chatInputValue");
      inputText.blur();//채팅 입력중에 모드 전환 시 이벤트가 꼬이지 않게 동일 처리
      isExpandView = false;
      setMainView();
      setRemoteView(false);
      setHeaderView();
      setToolsView(true);
      // removeRemoteVideoView();
    }
  }

  function setMainView(){
    let isVertical = getIsVertical();
    if(isVertical == true && isExpandView == false){
      //$("#mainChatArea").css("height", "61px");
      $("#mainViewArea").css("height", "100%");
    }
    else if(videoShareId != null || imageShareId != null){
      //$("#mainChatArea").css("height", "100%");
      $("#mainViewArea").css("height", "100%");
    }
    else{
     // $("#mainChatArea").css("height", "100%");
      $("#mainViewArea").css("height", "auto");
    }
  }

  // 1117 ykjung
  function setRemoteView(isRemoteMode){
    toggleExpandButton(false);

    let canvasId = getSelectedCanvas();
    let mainViewArea = document.getElementById(canvasId);
    console.log(mainViewArea);

    let minWidth = mainViewArea.clientWidth;
    let minHeight = mainViewArea.clientHeight;
    let isVertical = minHeight/minWidth;
    //minHeight = isVertical > 1 ? minHeight : "calc(100% - 61px)";
    let maxWidth = isVertical > 1 ? "51px" : "110px";
    let maxHeight = isVertical > 1 ? "91px" : "62px";
    let maxHeightNum = maxHeight.split("px");
    let headerHeight = parseInt(maxHeightNum[0]);

    if(isRemoteMode == true){
      $('#mainHeader').css('height', headerHeight + 22 + "px");
      //$('#mainViewArea').addClass('chat_mode_animation');
      $('#mainViewArea').css('width', maxWidth);
      $('#mainViewArea').css('height', maxHeight);
      $('#mainViewArea').css('max-height', maxHeight);
      //$('#mainViewArea').css('min-height', maxHeight);
      $("#mainViewArea").click(function(){
        let inputText = document.getElementById("chatInputValue");
        inputText.value = "";
        inputText.style.height = "auto";
        //setChatViewSize();

        //$('#mainViewArea').css('min-height', minHeight);
        toggleExpandDisplay(false);
        setMainVideoViewRect(mainVideoId, minWidth);
      });
      setMainVideoViewRect(mainVideoId, 62);
      toggleExpandButton(true);
    }
    else if(isRemoteMode == false){
      //$('#mainHeader').css('height', "84px");
      //$('#mainViewArea').removeClass('chat_mode_animation');
      //$('#mainViewArea').css('width', "100%");
      //$('#mainViewArea').css('height', "auto");
      //$('#mainViewArea').css('max-height', "calc(100% - 61px)");
      //$("#mainViewArea").off("click");
      //toggleExpandButton(false);
    }
  }

  function toggleExpandButton(isExpand){
      if(g_fromKiosk){
          return;
      }

    if(isExpand == true){
      var mediaViewType = viewType.MAIN;
      let mainContainer = document.getElementById(mediaViewType.containerId);
      let expandButton = document.createElement('img');
      expandButton.id = "expandButton";
      expandButton.src = "/cl/mobile/images/btn-expand.png";
      expandButton.style.width = "35px";
      expandButton.style.height = "35px";
      expandButton.style.position = "absolute";
      expandButton.style.top = "5px";
      expandButton.style.right = "5px";
      expandButton.style.cursor = "pointer";
      expandButton.style.zIndex = "6";
      mainContainer.appendChild(expandButton);
    }
    else if(isExpand == false){
      var removeContainer = document.getElementById('expandButton');
      if(removeContainer){
        var parentContainer = removeContainer.parentElement;
        parentContainer.removeChild(removeContainer);
      }
    }
  }

  function setHeaderView(){
    var headerContainer = document.getElementById("mainHeader");
    var mainViewContainer = document.getElementById("mainViewArea");
    var chatViewContainer = document.getElementById("mainChatArea");

    if(g_fromKiosk){
        headerContainer.style.left = "451px";
        headerContainer.style.top = "22px";
        //headerContainer.style.width = "calc(100% - 451px)";
        headerContainer.style.background = "transparent";
      return;
    }

    var height = headerContainer.clientHeight;

    // 확장 컨트롤 필요없을것 같음!
    // if(isExpandView == true){
    //   headerContainer.style.height = height + "px";
    //   headerContainer.style.backgroundImage = "none";
    //   headerContainer.style.backgroundColor = "#000000";
    //   mainViewContainer.style.display = "none";
    //   chatViewContainer.style.position = "absolute";
    //   chatViewContainer.style.top = height + "px";
    // }
    // else if(isExpandView == false){
    //   headerContainer.style.height = 61 + "px";
    //   headerContainer.style.backgroundImage = "linear-gradient(180deg,#000000aa,#00000000)";
    //   headerContainer.style.backgroundColor = "transparent";
    //   mainViewContainer.style.display = "flex";
    //   chatViewContainer.style.position = "relative";
    //   chatViewContainer.style.top = "0px";
    // }
  }

  // function setToolsView(isView){
  //   if(isView == true){
  //     $(".frame_main_tools").css("display", "flex");
  //     if(isVideo == true){
  //       $("#subVideoArea").show();
  //     }
  //   }
  //   else{
  //     $(".frame_main_tools").css("display", "none");
  //     if(isVideo == true){
  //       $("#subVideoArea").hide();
  //     }
  //   }
  // }

  // NOT USE
  // function setRemoteVideoView(){
  //   console.log('it works!');
  //   var mediaViewType = viewType.REMOTE;
  //   let mainContainer = document.getElementById(mediaViewType.containerId);
  //   mainContainer.style.display = "flex";

  //   if(mainVideoId != null){
  //     var mainMedia = getMediaWithId(mainVideoId);
  //     setVideoView(mainMedia.id, mainMedia.stream, mainMedia.muted, mediaViewType);
  //   }
  //   else{
  //     //mainContainer.style.width = "calc(100% - 30px)";
  //     //mainContainer.style.height = "calc(100% - 30px)";
  //   }

  //   let expandButton = document.createElement('img');
  //   expandButton.src = "/cl/mobile/images/btn-expand.png";
  //   mainContainer.appendChild(expandButton);
  //   expandButton.addEventListener("click", function(e) {
  //     toggleExpandDisplay(false);
  //   });
  // }

  function removeRemoteVideoView(){
    resetView(viewType.REMOTE);
  }

  function setMainFrameMode() {
    frameMode = null;
    timeout = null;

    // if(g_fromKiosk){
    //     $("#clientFrame").addClass("kiosk_mode"); // Kiosk 접속시, 최상단 태그에 kiosk_mode 클래스 추가
    // }
    $("#mainFrame").removeClass("hide");
    $("#subFrame").removeClass("show_flex");

    $("#mainFrame").addClass("show_flex");
    $("#subFrame").addClass("hide");

    $(".frame_main_tools .mic").attr('src', '/cl/mobile/images/btn-mic-off.png');
    clearTimer();
    sendClientInfo(g_iframeInfo);
  }

  function setMainHeaderInfo(subsName, userName){
    if(!subsName || !userName) return;
    $("#subsName").html(subsName);
    $("#agentName").html(userName);

    // if(g_fromKiosk){
    //     $(".frame_main_name").css("color", "#f2760a");
    //     $(".frame_main_name .subs_name").css("border", "1px solid #f2760a");

    // }
  }

  function setSubframeMode(mode) {
    if(mode == frameMode) return;
    setPopupFrame();

    frameMode = mode;
    $("#mainFrame").addClass("hide");
    $("#subFrame").addClass("show_flex");
    $(".frame_sub_cancel_btn").off("click");

    if(mode == 0){
      if(g_fromKiosk){
          $("#clientFrame").addClass("kiosk_mode");
          $(".frame_sub_header").addClass("hide");
          $(".frame_sub_contents").addClass("hide");
          $(".frame_sub_cancel").addClass("hide");
        }
        else{
            //connecting
            $(".frame_sub_header").show();
            // $(".frame_sub_header").html("상담원 연결 중 입니다.");
            $(".frame_sub_loading").show();
            // $(".frame_sub_txt").html("상담원 연결 중 입니다.");
            $(".frame_sub_cancel_btn").html("화상 통화 취소");
            $(".frame_sub_cancel_btn").click(function(){
                sendUserCancel();
                closeCoview('error', 6);
            });
            // $(".frame_sub_reservation_btn").html("예약 접수하기");
            // $(".frame_sub_reservation_btn").click(function(){
            //     sendUserCancel();
            //     $("#subFrame").hide();
            //     $("#reservationFrame").show();
            // });
        }
    }
    else if(mode == 1){
      //agent_busy
      closeCoview('error', 10);

      //org 상담원 없음 페이지
      // $(".frame_sub_header").hide();
      // $(".frame_sub_loading").hide();
      // $(".frame_sub_info").show();
      // $(".frame_sub_info").html("해당 브랜드의 모든 상담원이 상담중입니다.<br/>잠시 후 다시 시도해주세요.");
      // $(".frame_sub_cancel_btn").html("닫기");
      // $(".frame_sub_cancel_btn").click(function(){
      //   closeCoview('error', 10);
      // });
    }
    else if(mode == 2){
      //timeout
      closeCoview('error', 11);

      //org 연결 시간 초과 페이지
      // $(".frame_sub_header").hide();
      // $(".frame_sub_loading").hide();
      // $(".frame_sub_info").show();
      // $(".frame_sub_info").html("지정된 연결 시간이 지나<br/>화상 상담이 불가능합니다.<br/>잠시 후 다시 시도해주세요.");
      // $(".frame_sub_cancel_btn").html("닫기");
      // $(".frame_sub_cancel_btn").click(function(){
      //   closeCoview('error', 11);
      // });
    }
  }

  function switchRateView(className){
    let stars = document.getElementsByClassName(className);
    for (let index = 0; index < stars.length; index++) {
      let star = stars[index];
      let num = Math.floor(star.name);
      if(num > rateNum){
        star.src = "/cl/mobile/images/ic-mark-off.png";
      }
      else{
        star.src = "/cl/mobile/images/ic-mark-on.png";
      }
    }
  }

  // function videohandler(data){
	// 	switch (data.type){
	// 		case "video":
  //       switchVideo(false, data.target);
  //       break;
  //     case "mic":
  //       switchMic(false, data.target);
  //       break;
  //   }
  // }

  function switchMic(isActive){
    if(isMic == false && isActive == true){
      isMic = isActive;
      setVideoSetting("mic", isActive);
      $(".frame_main_tools .mic").attr('src', '/cl/mobile/images/icon_sound.png');
    }
    else if(isMic == true && isActive == false){
      isMic = isActive;
      setVideoSetting("mic", isActive);
      $(".frame_main_tools .mic").attr('src', '/cl/mobile/images/icon_sound_2.png');
    }

    let data = { key : "VIDEO_STATUS", type: "mic", active: isMic, userId: userInfo.userId };
    sendP2pMsg(data);
  }

  function switchVideo(isActive){
    if(isActive == true){
      isVideo = isActive;
      setVideoSetting("video", isActive);
      $(".frame_main_tools .video").attr('src', '/cl/mobile/images/icon_video.png');
      //$("#subVideoArea").css("opacity", "1");
      $("#subVideoArea").addClass("on");
    }
    else if(isActive == false){
      isVideo = isActive;
      setVideoSetting("video", isActive);
      $(".frame_main_tools .video").attr('src', '/cl/mobile/images/icon_video_2.png');
      //$("#subVideoArea").css("opacity", "0");
      $("#subVideoArea").removeClass("on");
    }

    let data = { key : "VIDEO_STATUS", type: "video", active: isVideo, userId: userInfo.userId };
    sendP2pMsg(data);
  }

  function sendUserCancel() {
    let roomId = getRoomId();
    if(!webCore || !roomId) return;

    let info = webCore.room.getRoomInfo(roomId);
    if(info != null) {
      if(info.liveStatus == "IDLE") {
        webCore.room.requestRoom(roomId, "in", "CLIENTCANCEL", navigator.userAgent, window.location.href);
      }
      else {
        webCore.socket.sendNotiToAS("CLIENTCANCEL", {
          room: roomId,
          isJoin: webCore.room.getRoomId() == null ? false : true
        });
      }
    }
  }

  function sendTimeOut() {
    let roomId = getRoomId();
    if(!webCore || !roomId) return;

    let info = webCore.room.getRoomInfo(roomId);
    if(info != null) {
      if(info.liveStatus == "IDLE") {
        webCore.room.requestRoom(roomId, "in", "TIMEOUT", navigator.userAgent, window.location.href);
      }
      else {
        webCore.socket.sendNotiToAS("CONNTMOUT", {
          room: roomId,
          isJoin: webCore.room.getRoomId() == null ? false : true
        });
      }
    }
  }

  //ysjung
  function sendClientInfo(info){
      let data = { key : "IFRAME_INFO", data: info };
      sendP2pMsg(data);
  }

    async function testCamera(){
        var testConstraints = { audio: true, video: true };
        try {
            var testStream = await navigator.mediaDevices.getUserMedia (testConstraints);
            testStream.getTracks().forEach((track) => {
                //stream.removeTrack(track)
                track.stop();
            });

            return true;
        }
        catch (err) {
            return false;
        }
    }


// ysjung reservation function [[
function reservationBtnOnclick(el, time){
    console.log("reservationBtnOnclick", el, time);
    $(".frame_reservation_timetable_btn").removeClass("checked");
    el.className += " checked";

    g_reservationTime = time;
}

function reservationTimetableOnlick(){
    console.log("g_reservationTime", g_reservationTime);
    var name = $("#reservationNameInput").val();
    var number = $("#reservationNumberInput").val().replace(/-/gi,"");

    if(number.length == 0) {
        alert("연락처를 입력해 주시기 바랍니다.");
        return;
    }
    else if(isNaN(number) == true){
        alert("연락처가 유효 하지 않습니다.")
        return;
    }

    if(name == ""){
        alert("이름을 입력해주시기 바랍니다.")
        return;
    }

    if(g_reservationTime){
        $(".frame_loading").show();
        var url = "/cl/reservation";
        $.ajax({
            url : url,
            method : 'post',
            data : {
                time : g_reservationTime,
                name : name,
                number : number,
            },
            success : function (result) {
                console.log("result", result);
                if(result.statusCode == 200){
                    alert("예약완료 되었습니다");
                    closeCoview('error', 0);
                }
                else if(result.statusCode == 402){
                    alert("해당 시간은 예약이 모두 완료 되었습니다\n다른시간을 선택해 주시기 바랍니다.");
                }
                else{
                    alert("예약 시스템에 일시적인 오류가 발생 하였습니다\n다시 시도해주시기 바랍니다.");
                }
                $(".frame_loading").hide();
            },
            error : function (err) {
                console.log(err.toString());
                $(".frame_loading").hide();
                closeCoview('error', 1);
                // closeCoview('error', 99);
            }
        });
    }
    else{
        alert("예약 시간을 선택해 주시기 바랍니다.")
    }
}
// ysjung reservation function ]]

function getSubsIdFromRoomId(roomId){
	// 룸 번호 형태 xxxxxxx-xxxxx-xxxxx  => subsid-agentid-randomid
	console.log("getSubsIdFromRoomId roomId : ", roomId);
	var roomIdArr = roomId.split ('-');
	if(roomIdArr.length == 3){
		return roomIdArr[0];
	}
	else{
		return null;
	}
}
