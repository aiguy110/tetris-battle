import express from 'express';
import ws from 'ws';
import bp from 'body-parser';

// Global consts
const HOST = '0.0.0.0';
const PORT = 8080;

// Active Battle info
var battles = {}

// Setup web server to serve static resources
var app = express();
app.use(express.static('www'));
app.get('/', (req, res) => {
    res.redirect('/start.html');
});

// Allow BattleIDs to be created and queried
app.use(bp.json());
app.post('/battle', (req, res) => {
    if( req.body.battleId in battles ){
        res.json( {'error': 'That BattleID already exists. Please try choosing a different BattleID for your new game, or attempt to join the existing game.'} );
        return;
    }

    let battleData = {
        players: {}
    }
    battleData.players[ req.body.username ] = null;
    battles[ req.body.battleId ] = battleData;

    res.json(req.body);
}) ;
app.get('/battle', (req, res) => {
    let battleId = req.query.battleId;
    if(battleId in battles) {
        let players = Object.keys( battles[battleId] );
        res.json( players );
    }else{
        res.json( {'error': 'No game with that BattleID exists.' } );
    }
});

// Setup WebSocket server
const wsServer = new ws.Server({noServer: true});
wsServer.on('connection', socket => {
    socket.on('message', messageString => {
        // Parse message
        let messageObj = JSON.parse(messageString);
        
        // Process registations
        if (messageObj.type == 'register') {
            console.log(`Got registration message from ${messageObj.name} for battle ${messageObj.battleId}`);
            if (Object.keys(battles[messageObj.battleId].players).length == 2) {
                console.log('This battle is already full. Not allowing registration.');
                return;
            }
            battles[messageObj.battleId].players[messageObj.name] = socket;
            
            // If this game is now full, send start message to participants
            if (Object.keys(battles[messageObj.battleId].players).length == 2) {
                let startMessage = JSON.stringify({
                    type: 'start',
                    players: Object.keys(battles[messageObj.battleId].players)
                });
                Object.keys(battles[messageObj.battleId].players).forEach(playerName => {
                    let playerSocket = battles[messageObj.battleId].players[playerName];
                    playerSocket.send(startMessage);
                });
            }
        }

        // Whatever the message, send it on to everyone in the battle
        Object.keys(battles[messageObj.battleId].players).forEach(playerName => {
            let playerSocket = battles[messageObj.battleId].players[playerName];
            playerSocket.send(messageString);
        });
    })
})


// Launch web server
var server = app.listen(PORT, HOST);
console.log(`Listening at http://${HOST}:${PORT}...`);

// Attach WebSocket server to web server
server.on('upgrade', (request, socket, head) => {
    wsServer.handleUpgrade(request, socket, head, socket => {
        wsServer.emit('connection', socket, request);
    });
});