//initialization functions
db = {
  pages: new Map(),
  players: new Map(),
  localPlayer: {
    username: null,
    move: null
  },
  canvas: {
    width: 100,
    height: 100,
    spaceWidth: 10
  }
}

storeAllPages = () => {

  for(let element of document.body.children)
  {
    if(element.nodeName == "DIV")
    {
      db.pages.set(element.id, element);
    }
  }
}

removeAllPages = () => {

  for(let page of db.pages)
  {
    page[1].remove();
  }
}

addPage = (elementId) => {
  page = db.pages.get(elementId)
  document.body.appendChild(page);
}

removePage = (elementId) => {
  let element = document.querySelector("#" + elementId);
  element.remove();
}
//--------

//initialize
storeAllPages();
removeAllPages();
addPage("home_page");
//--------

//socket receiving endpoints
var socket = io();

socket.on('error', function(data) {
  alert(data.message)
});

socket.on('show_page', function(data) {
  removeAllPages();
  addPage(data.elementId);
});

socket.on('hide_start_button', function(data) {
  let startButton = document.querySelector("#start_game_button");
  startButton.remove();
});

socket.on('player_info', function(data) {

  for(let player of data.players)
  {
    db.players.set(player.username, player);
  }

  updateCanvas();
});

socket.on('start_game', function(data) {
  window.addEventListener('keydown', sendNextMove, false);
});
//--------

//pre functions
function pre_joinGame()
{
  let pre_username = document.querySelector("#username").value;
  joinGame(pre_username);
}

function pre_startGame()
{
  socket.emit('start_game', {})
}
//--------

//Other functions
function joinGame(username) {
  socket.emit('join_game', {
    username: username
  });

  db.localPlayer.username = username;
}

socket.on('player_died', function(data) {
  alert("\"" + data.username + "\" died!:(")
});
//--------

function updateCanvas() {
  const canvas = document.getElementById("tutorial");

  if (canvas.getContext) {
    const ctx = canvas.getContext("2d");
    
    for(let playerInfo of db.players)
    {
      let player = playerInfo[1];

      let redAsHex = player.color.substring(0, 2);
      let greenAsHex = player.color.substring(2, 4);
      let blueAsHex = player.color.substring(4, 6);

      let red = parseInt(redAsHex, 16);
      let green = parseInt(greenAsHex, 16);
      let blue = parseInt(blueAsHex, 16);

      ctx.fillStyle = "rgba(" + red + ", " + green + ", " + blue + ")";
      ctx.fillRect(player.pixelCoords.x, player.pixelCoords.y, db.canvas.spaceWidth, db.canvas.spaceWidth);
    }
  }
}

function sendNextMove(e) {

  let keyCode = e.keyCode;
  let validKeyCodes = [37, 38, 39, 40];

  if(!validKeyCodes.includes(keyCode))
  {
    return;
  }

  let localPlayer = db.localPlayer;
  localPlayer.move = e.keyCode;

  socket.emit('update_move', {
    username: localPlayer.username,
    nextMove: localPlayer.move
  })
}