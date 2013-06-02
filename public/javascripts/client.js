$(function() {
  // init
  var sync = /sync=([^&]+)/.exec(window.location.search);
  if (sync && '1' == sync[1]) {
    sync = true;
  } else {
    sync = false;
  }

  // append bar
  var stringBuild = [
    '<div class="ihq-tool-box">',
      '<div class="ihq-tool">',
        '<i class="icon-search">',
        '</i>',
        '<button class="add-question ihq-btn ihq-btn-warning" type="button">',
        '我有問題！</button>',
      '</div>',
      '<div class="ihq-question-queue">',
      '</div>',
    '</div>'
  ].join('');
  $('body').append(stringBuild);

  var questionCollection = new Questions();
  // Populate questions
  socket.on('init', function(data){
    questionCollection.reset(data.questions);
  });

  var view = new QuestionView({
    el: $(".ihq-question-queue"),
    collection: questionCollection
  });

  function addPointer(model) {
    var obj = $("<div class='pointer' style='position: absolute; width: 100px; height: 100px; background: rgba(255, 0, 0, 0.3);'></div>");
    obj.css("left", model.get("location").x);
    obj.css("top", model.get("location").y);
    if (0 == model.get('type')) {
      obj.attr('title', '請再重複一次');
    } else {
      obj.attr('title', model.get('str'));
    }
    obj.attr("mid", model.cid);
    $('body').append(obj);
  }

  // 0: normal
  // 1: select location
  // 2: select mode
  // reset when page change
  var askState = 0;

  function updatePage(urlHash) {
    // show pointers
    $('.pointer').remove();
    for (var i = 0; i < questionCollection.length; ++i) {
      var model = questionCollection.at(i);
      console.log(model.get('location'));
      if (model.get('location').pageurl == urlHash) {
        addPointer(model);
      }
    }
    askState = 0;
    window.location.hash = urlHash;
    if (sync) {
      window.socket.emit("server:pagechange", {
        'urlHash': urlHash
      });
    }
  }

  var Router = Backbone.Router.extend({
    routes: {
      ":foo": "page",
      ":foo/:bar" : "subpage",
    },
    page: function(p1) {
      updatePage('#/' + p1);
    },
    subpage: function(p1, p2) {
      updatePage('#/' + p1 + '/' + p2);
    },
  });
  var router = new Router();
  Backbone.history.start();


  console.log(sync);
  if (sync) {
    console.log("orz change");
    window.socket.on('pagechange', function(data) {
      updatePage(data.urlHash);
    });
  }

  var askQuestionBlock = $([
    "<div class='ihq-popup-window' style='position: absolute;z-index:100000;'>",
      "<div class='ihq-repeat'>",
        "<button class='repeat-btn ihq-btn ihq-btn-info'>請再重複一次</button>",
      "</div>",
      "<div>",
        '<div class="ihq-enter-question">輸入問題</div>',
        "<input type='text' class='question-text'></input>",
        "<button class='question-btn ihq-btn ihq-btn-info'>送出</button>",
      "</div>",
    "</div>"].join(""));
  $("body").append(askQuestionBlock);
  askQuestionBlock.hide();
  $("body").mousemove(function(event) {
    if (1 != askState) {
      return true;
    }
    console.log(event);
  });
  $("body").click(function(event) {
    if (1 != askState) {
      return true;
    }
    askState = 2;
    console.log(event);
    askQuestionBlock.css('top', event.pageY);
    askQuestionBlock.css('left', event.pageX);
    askQuestionBlock.css("position", "absolute");
    askQuestionBlock.show();
  });
  $(".repeat-btn", askQuestionBlock).click(function(event) {
    var model = new Question({
      'location': {
        'x': askQuestionBlock.css("left"),
        'y': askQuestionBlock.css("top"),
        'pageurl': window.location.hash,
      },
      // repeat or question
      'type': 0,
      // done, or to be answer
      'state': 0,
      // +1
      'count': 1,
    });
    questionCollection.add(model);
    socket.emit('client:ask', model.toJSON());
    askQuestionBlock.hide();
    askState = 0;
    addPointer(model);
  });
  $(".question-btn", askQuestionBlock).click(function(event) {
    var model = new Question({
      'location': {
        'x': askQuestionBlock.css("left"),
        'y': askQuestionBlock.css("top"),
        'pageurl': window.location.hash,
      },
      // repeat or question
      'type': 1,
      // for question
      'str': $(".question-text", askQuestionBlock).val(),
      // done, or to be answer
      'state': 0,
      // +1
      'count': 1,
    });
    questionCollection.add(model);
    socket.emit('client:ask', model.toJSON());
    askQuestionBlock.hide();
    askState = 0;
    addPointer(model);
  });

  $('.add-question').click(function(event) {
    askState = 1;
    askQuestionBlock.hide();
    event.stopPropagation();
  });
});


