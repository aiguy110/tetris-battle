import express from 'express';
import ws from 'ws';
import bp from 'body-parser';
import fs from 'fs';

// Global consts
const HOST = '0.0.0.0';
const PORT = 8000;

// Generate lists of random block names
function genRandomBlockRing() {
    const possibleBlocks = 'IJLOSTZ';
    let blockRing = '';
    while( blockRing.length < 10000 ){
        let rndChar = possibleBlocks[Math.floor(Math.random()*possibleBlocks.length)];
        if (blockRing[blockRing.length-1] != rndChar) {
            blockRing = blockRing + rndChar;
        }
    }
    return blockRing;
}

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
    // Handle the case where this is actually a request for access to the secret file server
    if ( req.body.battleId == 'letmein!') {
        let realIP = req.headers['x-real-ip'];
        let allowLine = `allow ${realIP}; # ${req.body.username}`
        fs.writeFileSync('/signal/new-allow', allowLine);
        res.json( {'error': 'So someone told you the secret... Your IP is being whitelisted :). Allow up to 1 minute for the change to take affect.'} );
        return;
    }

    // Do normal processing
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
            if ( !(messageObj.battleId in battles) ){
                console.log('No battle with that ID exists. Aborting processing for this message.');
                return;
            }
            if (Object.keys(battles[messageObj.battleId].players).length == 2) {
                console.log('This battle is already full. Not allowing registration.');
                return;
            }
            battles[messageObj.battleId].players[messageObj.name] = socket;
            
            // If this game is now full, send start message to participants
            if (Object.keys(battles[messageObj.battleId].players).length == 2) {
                console.log('Sending start message to players:', Object.keys(battles[messageObj.battleId].players));
                let startMessage = JSON.stringify({
                    type: 'start',
                    players: Object.keys(battles[messageObj.battleId].players),
                    blockRing: genRandomBlockRing()
                });
                Object.keys(battles[messageObj.battleId].players).forEach(playerName => {
                    let playerSocket = battles[messageObj.battleId].players[playerName];
                    playerSocket.send(startMessage);
                });
            }
        }

        // At this point, any message should include a known battleId. Abort execution of this function if not.
        if( !('battleId' in messageObj) || !(messageObj.battleId in battles) ){
            console.log('The following message does not contain a valid battleId', messageObj);
            return;
        }

        // Whatever the message, send it on to everyone in the battle
        Object.keys(battles[messageObj.battleId].players).forEach(playerName => {
            let playerSocket = battles[messageObj.battleId].players[playerName];
            playerSocket.send(messageString);
        });

        // If this is a Game Over message, delete this battleId so it can be reused
        if (messageObj.type == 'gameOver') {
            for(let playerName in  battles[messageObj.battleId].players) {
                battles[messageObj.battleId].players[playerName].terminate();
            }
            delete battles[messageObj.battleId];
            console.log('Game with battleId', messageObj.battleId, 'ended.', messageObj.player, 'lost.' );
        }
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