const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.use(express.static('frontend'))

let db = {
  players: new Map(),
  gameStarted: false,
  canvas: {
    width: 120,
    height: 80,
    spaceWidth: 10
  },
  gameLoop: null,
  tickMillis: 100,
  occupiedSpaces: []
}

app.get('/', (req, res) => {
  res.sendFile(__dirname + 'frontend/index.html');
});

io.on('connection', (socket) => {
  debug("A user connected", 0);

  socket.on('join_game', (data) => {

    if(db.gameStarted)
    {
      socket.emit('error', {
        message: 'The game has already started'
      });
    }

    if(db.players.has(data.username))
    {
      socket.emit('error', {
        message: 'The specified username is already in use'
      });

      debug("Player already exists", 1);

      return;
    }

    let playerCoords = {
      x: db.players.size % 2 == 0 ? 0 : db.canvas.width - 1,
      y: db.players.size % 2 == 0 ? 0 : db.canvas.height - 1
    }

    let pixelCoords = playerPosToPixelPos(playerCoords.x, playerCoords.y);

    let playerInitialMove = db.players.size % 2 == 0 ? 39 : 37;

    db.players.set(data.username, {
      username: data.username,
      color: generateRandomColor(),
      playerCoords: {
        x: playerCoords.x,
        y: playerCoords.y
      },
      pixelCoords: {
        x: pixelCoords.x,
        y: pixelCoords.y
      },
      move: playerInitialMove,
      dead: false
    });


    db.occupiedSpaces.push(playerCoords);

    debug("A new player has joined the game", 1);

    socket.emit('show_page', {
      elementId: 'game_page'
    });

    sendPlayerInfo();
  });

  socket.on('start_game', (data) => {
    db.gameStarted = true;

    io.emit('hide_start_button', {});

    startGame();
  });

  socket.on('update_move', (data) => {
    let player = db.players.get(data.username);
    if(data.nextMove == (player.move + 2) ||
       data.nextMove == (player.move - 2))
    {
      return;
    }
    player.move = data.nextMove;
    db.players.set(player.username, player);
  });

  socket.on('disconnect', () => {
    debug("A user disconnected", 0);
  });

  debug(db, 0);
});

server.listen(3000, () => {
  debug('listening on *:3000', 0);
});

generateRandomColor = () =>
{
  return Math.floor(Math.random()*16777215).toString(16);
}

startGame = () =>
{
  io.emit('start_game', {});

  db.gameLoop = setInterval(() => {

    for(let playerInfo of db.players)
    {
      let player = playerInfo[1];

      if(player.dead)
      {
        return;
      }

      player.playerCoords = getNextPosition(player.move, player.username);
      player.pixelCoords = playerPosToPixelPos(player.playerCoords.x, player.playerCoords.y);

      //check for loosing conditions
      if(player.playerCoords.x < 0 ||
         player.playerCoords.y < 0 ||
         player.playerCoords.x >= db.canvas.width ||
         player.playerCoords.y >= db.canvas.height)
      {
        player.dead = true
      }
      
      for(let occupiedCoords of db.occupiedSpaces)
      {
        if(player.playerCoords.x == occupiedCoords.x &&
          player.playerCoords.y == occupiedCoords.y)
        {
          player.dead = true; 
        }
      }

      db.players.set(player.username, player);

      if(player.dead)
      {
        clearInterval(db.gameLoop);

        io.emit('player_died', {
          username: player.username
        })

        db = {
          players: new Map(),
          gameStarted: false,
          canvas: {
            width: 120,
            height: 80,
            spaceWidth: 10
          },
          gameLoop: null,
          tickMillis: 100,
          occupiedSpaces: []
        }

        return;
      }

      let playerX = player.playerCoords.x;
      let playerY = player.playerCoords.y;

      db.occupiedSpaces.push({
        x: playerX,
        y: playerY
      });
    }

    sendPlayerInfo();

  }, db.tickMillis)
}

sendPlayerInfo = () => {

  let players = [];
  
  for(let player of db.players)
  {
    players.push(player[1]);
  }

  io.emit('player_info', {
    players: players
  });
}

playerPosToPixelPos = (x, y) => {
  return {
    x: x * db.canvas.spaceWidth,
    y: y * db.canvas.spaceWidth
  }
}

getNextPosition = (move, username) => {

  let player = db.players.get(username);

  switch(move) {
    case 37:
      player.playerCoords.x--;
      break;
    case 38:
      player.playerCoords.y--;
      break;
    case 39:
      player.playerCoords.x++;
      break;
    case 40:
      player.playerCoords.y++;
      break;
  }

  return player.playerCoords;
}

//debug
debug = (message, channel) => {

  const DEBUG = {
    enabled: true,
    channels: []
  }

  if(DEBUG.enabled)
  {
    if(DEBUG.channels.includes(channel))
    {
      console.log();
      console.log("---------------------DEBUG---------------------");
      console.log(message);
      console.log("-----------------------------------------------");
      console.log();
    }
  }

}