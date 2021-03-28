import express from 'express';
// import cors from 'cors';
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
// app.use(cors())
app.post('/battle', (req, res) => {
    if( req.body.battleId in battles ){
        res.json( {'error': 'That BattleID already exists. Please try choosing a different BattleID for your new game, or attempt to join the existing game.'} );
        return;
    }

    let battleData = {
        players: {}
    }
    battleData.players[ req.body.username ] = {}
    battles[ req.body.battleId ] = battleData;

    res.json(req.body);
}) ;
app.get('/battle', (req, res) => {
    let battleId = req.query.battleId;
    if(battleId in battles) {
        console.log(battles);
        let players = Object.keys( battles[battleId] );
        res.json( players );
    }else{
        res.json( {'error': 'No game with that BattleID exists.' } );
    }
});

// Launch web server
var server = app.listen(PORT, HOST);
console.log(`Listening at http://${HOST}:${PORT}...`);