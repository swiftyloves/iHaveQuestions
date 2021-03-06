/*
  ?._./ Client Script
  This is the script that embeds to user slides.

  The client script uses MVP structure:

   __________________    emit    _________   emit   ____________   DOM events
  |                 | <-------- | socket | <------ |           | <------------
  | SocketIO Server |           | wrapper|         | Presentor |                View (Pure DOM)
  |_________________| --------> |________| ------> |___________| ------------>
                      broadcast  (acts as    on                      DOM
                                  model)                         manipulation

*/

// ============
// Load modules
// ============

var helper = require('./helper.js'),
    $ = helper.$,
    $$ = helper.$$,

    // Wrapped Socket
    socket = require('./socket'),

    // Constructors (Object Schema)
    Question = require('./models/question');

// =====================
// Constants & Cariables
// =====================

var
toolboxStr = [
  '<div class="owo-tool">',
    '<i class="icon-search"></i>',
    '<button class="add-question owo-btn owo-btn-warning" type="button">我有問題！</button>',
    '<p class="add-question-hint">請在有問題的地方點一下！</p>',
    '<button class="cancel-add-question owo-btn owo-btn-warning" type="button">取消發問</button>',
  '</div>',
  '<div class="owo-question-queue">',
  '</div>'
].join(''),
questionBlockStr = [
  "<div>",
    '<div class="owo-enter-question">輸入問題</div>',
    "<input type='text' class='question-text' value='請再重複一次'></input>",
    "<button class='question-btn owo-btn owo-btn-primary'>送出</button>",
  "</div>",
].join("");

// Is lecturer or not
var isLecturer = false;

// Question list
var questions = {};

// 0: normal
// 1: select location
// 2: select mode
// reset when page change
var askState = 0;

// ==============
// Initialization
// ==============
helper.loadStyle('/stylesheets/style.css');

var toolboxElem = helper.html2Elem(toolboxStr, 'div', {'class': 'owo-tool-box'}),
    questionBlockElem = helper.html2Elem(questionBlockStr, 'div', {'class': 'owo-popup-window'}),
    thumbElem = helper.html2Elem("", "div", {'class': 'owo-tool-thumb'}),
    toolboxQueue = $('.owo-question-queue', toolboxElem);


$('body').appendChild(toolboxElem);
$('body').appendChild(questionBlockElem);
$('body').appendChild(thumbElem);

function setState(newState){
  $('body').classList.remove('owo-state-' + askState);
  $('body').classList.add('owo-state-' + newState);
  askState = newState;
}
setState(0);

// =========
// Presentor
// =========

/*
  Event & data list handled by presentor:

  event   | Passed Data         | Expected data
  --------+---------------------+--------------
  init    | {}                  | { isLecturer: is lecturer or not, 
          |                     |   questions: { All existing question instances } }
  plus    | {id: quesition id}  | { id: question id, backers: [userId of all backers] }
  ask     | Both: the new question instance
  answer  | Both: {id: question id}
*/


// Dom events --> Emit socket events.
// ----------------------------------

// Press "create question"
//
$('.question-btn', questionBlockElem).addEventListener('click', function(){
  var str = $('.question-text', questionBlockElem).value;
  var instance = new Question(
    questionBlockElem.style.left,
    questionBlockElem.style.top, str);

  setState(0);

  socket.emit('ask', instance, instance);
});

// DOM event helper: bind emitting events on questionElem
//
function bindEmittingEventsToQuestion(questionElem, instance){
  $('.delete', questionElem).addEventListener('click', function(){
    socket.emit('answer', {id: instance.id}, {id: instance.id});
  });
  $('.plus', questionElem).addEventListener('click', function(){
    // Skip if the user already +1'd.
    if(instance.backers.indexOf(socket.userId) !== -1){ return; }

    // Emit plus event
    socket.emit('plus', {id: instance.id}, {
      id: instance.id,
      backers: instance.backers.concat(socket.userId)
    });
  });
}

// Socket events --> DOM manip.
//

socket.on('init', function(data){
  console.log("INIT: ", data);
  isLecturer = data.isLecturer;
  for(var id in data.questions){
    if(data.questions.hasOwnProperty(id)){
      addQuestion(data.questions[id]);
    }
  }
});

socket.on('ask', addQuestion);

socket.on('answer', function(data){
  var id = data.id;

  // Skip if already deleted.
  if(!questions[id]){ return; }

  delete questions[id];
  getQuestionElemById(id).remove();

  var pointerElem = getPointerElemById(id);
  if(pointerElem){
    pointerElem.remove();
  }
});

socket.on('plus', function(data){
  questions[data.id].backers = data.backers;
  var questionElem = getQuestionElemById(data.id);
  $('.plus', questionElem).innerText = data.backers.length;
});


// DOM manip helper: create one question DOM
//
function addQuestion(instance){
  // Skip if we already have this question.
  if(questions[instance.id]){ return; }

  questions[instance.id] = instance;

  var questionElem = helper.html2Elem(
    '<div class="content"></div><div class="desc"><div class="plus"></div><div class="delete">✔</div></div>',
    'div', {'data-id': instance.id, 'class': 'one-question'});

  $('.content', questionElem).innerText = instance.str;
  $('.plus', questionElem).innerText = instance.backers.length;

  if(!isLecturer){
    $('.delete', questionElem).style.display = 'none';
  }

  // Local event that does not need socket emission.
  $('.content', questionElem).addEventListener('click', function(){
    window.location.hash = instance.url;
  });

  toolboxQueue.appendChild(questionElem);
  bindEmittingEventsToQuestion(questionElem, instance);
  addPointer(instance);
}

// DOM manip helper: create one question pointer DOM
//
function addPointer(instance){
  // Skip if the question is not on current page.
  if(window.location.hash !== instance.url) return;

  var pointerElem = helper.html2Elem("<i class='icon-map-marker'></i>", 'div',
    {'class': 'owo-pointer', title: instance.str, 'data-id': instance.id} );
  pointerElem.style.left = instance.x;
  pointerElem.style.top = instance.y;

  $('body').appendChild(pointerElem);
}

// DOM manip helper: get question dom
//
function getQuestionElemById(id){
  return $('.one-question[data-id="'+id+'"]', toolboxQueue);
}
function getPointerElemById(id){
 return $('.owo-pointer[data-id="'+id+'"]'); 
}

// Event handlers that does not need to be synced.
//

// Add / remove pointers.
window.addEventListener('hashchange', function(){
  var id;

  $$('.owo-pointer', null, true).forEach(function(pointerElem){
    pointerElem.remove();
  });

  for(id in questions){
    if( !questions.hasOwnProperty(id) ){ continue; }
    addPointer(questions[id]);
  }

  // Reset state
  setState(0);
});

// Adding question
//
$('.add-question', toolboxElem).addEventListener('click', function(e){
  setState(1);
  e.stopPropagation();
});

$('body').addEventListener('click', function(e){
  // Skip if not selecting question location
  if(askState !== 1){ return; }

  setState(2);
  questionBlockElem.style.left = (e.pageX / window.innerWidth) * 100 + '%';
  questionBlockElem.style.top = (e.pageY / window.innerHeight) * 100 + '%';
});

$('.cancel-add-question', toolboxElem).addEventListener('click', function(e){
  setState(0);
  e.stopPropagation();
});

thumbElem.addEventListener('click', function(){
  $('body').classList.toggle('owo-toolbox-active');
});
