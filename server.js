import * as express from 'express';
import * as ws from 'ws';

// Global consts
const HOST = '0.0.0.0';
const PORT = 8080;

// Setup web server to serve static resources
var app = express();
app.use(express.static('www'));
app.get('/', (req, res) => {
    res.redirect('/client.html');
});

var server = app.listen(PORT, HOST);
