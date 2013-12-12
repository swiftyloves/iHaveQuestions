(function(){
  "use strict";
  var scriptTag = document.querySelector('#°▽°ﾉ');
  var roomId = scriptTag.dataset.roomId;
  console.log('Room ID detected: ', roomId);
  var serverUrl = scriptTag.src.replace('c.js', '');

roomId
  // if (!rid) {
  //   console.log("no rid");
  // } else {
  //   $("body").attr("data-room-id", roomId[1]);
  // }

  var userId = "" + Math.random();

  var _socket = io.connect(serverUrl, {
    query: 'roomId=' + roomId
  });
  _socket.on('connect', function (data) {
    console.log('Connected');
  });

  // Current-user aware socket.
  window.socket = {
    emit: function(evt, data){
      // Append user id in data.
      data.userId = userId;
      _socket.emit(evt, data);
    },
    on: function(evt, callback){
      // Check user id.
      _socket.on(evt, function(data){
        if(data.userId !== userId){
          callback(data);
        }
      });
    }
  };
}());
