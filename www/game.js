const tingSound     = document.getElementById('ting');
const thudSound     = document.getElementById('thud');
const swooshSound   = document.getElementById('swoosh');
const gameOverSound = document.getElementById('game-over');

tingSound.load();
thudSound.load();
swooshSound.load();
gameOverSound.load();

tingSound.volume   = 0.25;
swooshSound.volume = 0.075;

function forcePlaySound(sound) {
    sound.currentTime = 0;
    sound.play();
}

const CellEnum = {
    'Empty':  0,
    'I':      1,
    'J':      2,
    'L':      3,
    'O':      4,
    'S':      5,
    'T':      6,
    'Z':      7,
    'Filler': 8
}

const CellColors = [
    '#00000000',
    '#4287f5ff',
    '#004dc7ff',
    '#edae00ff',
    '#edda02ff',
    '#12ed02ff',
    '#ba02d6ff',
    '#d60202ff',
    '#636363ff',
]

const BlockShapes = {
    'I': [[ 0, 0],
          [ 1, 0],
          [ 2, 0],
          [ 3, 0]],
    'J': [[ 0, 0],
          [ 1, 0],
          [ 2, 0],
          [ 2,-1]],
    'L': [[ 0, 0],
          [ 1, 0],
          [ 2, 0],
          [ 2, 1]],
    'O': [[ 0, 0],
          [ 1, 0],
          [ 0, 1],
          [ 1, 1]],
    'S': [[ 0, 0],
          [ 0, 1],
          [ 1,-1],
          [ 1, 0]],
    'T': [[ 0,-1],
          [ 0, 0],
          [ 0, 1],
          [ 1, 0]],
    'Z': [[ 0, 0],
          [ 0,-1],
          [ 1, 1],
          [ 1, 0]],
}

function rotateCoords90(coords){
    return [coords[1], -coords[0]]
}

function rotateShape(shape, rotCount) {
    for(let n=0; n<rotCount; n++) {
        let newShape = [];
        shape.forEach( coords => {
            newShape.push( rotateCoords90(coords) );
        });
        shape = newShape;
    }
    return shape;
}

function getUrlParams() {
    let paramsString = window.location.href.split('?')[1];
    let kvStrings = paramsString.split('&');
    let params = {};
    kvStrings.forEach(kvStr => {
        let kvPair = kvStr.split('=');
        params[ kvPair[0] ] = kvPair[1];
    });
    return params;
}

class TetrisGame {
    static rows = 20;
    static cols = 10;
    static defaultPos = [0, 5];
    static defaultRot = 0;
    static initialTickInterval = 750;
    static minTickInterval = 200;
    static tickIntervalDecayRate = 50;
    

    constructor(ctx){
        this.ctx = ctx;
        
        this.grid = [];
        for(let i=0; i< TetrisGame.rows; i++) {
            this.grid.push( new Array(TetrisGame.cols).fill(CellEnum.Empty) );
        }

        this.currentBlockName = null;
    }

    startGame(){
        this.currentBlockName = 'T';
        this.currentPos = TetrisGame.defaultPos;
        this.currentRot = TetrisGame.defaultRot;

        this.tickInterval = TetrisGame.initialTickInterval;
        this.tickTimeout = setTimeout( () => this.moveCursorBlock([1, 0]), this.tickInterval );
    }

    drawCell(i, j, color) {
        const cellWidth  = this.ctx.canvas.width  / TetrisGame.cols;
        const cellHeight = this.ctx.canvas.height / TetrisGame.rows;

        this.ctx.fillStyle = color;
        this.ctx.fillRect(j*cellWidth  + 1.5, 
                     i*cellHeight + 1.5, 
                     cellWidth    - 1, 
                     cellHeight   - 1);
    }

    drawBlock(pos, rot, shape, color) {
        let rotatedShape = rotateShape( shape, rot );
        rotatedShape.forEach( delta => {
            let di = delta[0];
            let dj = delta[1];
            let i = pos[0];
            let j = pos[1];
            
            this.drawCell(i+di, j+dj, color);
        })
    }

    isOutOfBounds(coords) {
        return coords[0] < 0 || coords[0] >= TetrisGame.rows || coords[1] < 0 || coords[1] >= TetrisGame.cols
    }

    isCollided(shape, pos, rot) {
        let rotatedShape = rotateShape(shape, rot);
        let i = pos[0];
        let j = pos[1];
        for(let n=0; n<rotatedShape.length; n++){
            let di = rotatedShape[n][0];
            let dj = rotatedShape[n][1];
            if (this.isOutOfBounds([i+di, j+dj]) || this.grid[i+di][j+dj] != CellEnum.Empty) {
                return true;
            }
        }
        return false;
    }

    getPosOnContact(shape, pos, rot) {
        let i = pos[0];
        let j = pos[1];
        while(true) {
            if (this.isCollided(shape, [i, j], rot)) {
                break;
            }
            i++;
        }
        return [i-1, j]; 
    }

    getRandomBlockName() {
        return 'IJLOSTZ'[Math.floor(Math.random()*7)];
    }

    renderBoard(){
        const cellWidth  = this.ctx.canvas.width  / TetrisGame.cols;
        const cellHeight = this.ctx.canvas.height / TetrisGame.rows;

        // Clear canvas
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height );

        // Draw grid lines
        this.ctx.strokeStyle = '#888888';
        this.ctx.lineWidth = 1;
        for (let i=0; i<=TetrisGame.rows; i++) {
            let y = Math.floor(i*cellHeight) + 0.5;
            this.ctx.moveTo( 0                    , y );
            this.ctx.lineTo( this.ctx.canvas.width, y );
        }
        for (let j=0; j<=TetrisGame.cols; j++) {
            let x = Math.floor(j*cellWidth) + 0.5;
            this.ctx.moveTo( x, 0                      );
            this.ctx.lineTo( x, this.ctx.canvas.height );
        }
        this.ctx.stroke()

        // Draw cell contents
        for(let i=0; i<TetrisGame.rows; i++){
            for(let j=0; j<TetrisGame.cols; j++) {
                this.drawCell( i, j, CellColors[this.grid[i][j]] );
            }
        }

        // Draw cursor block and shadow
        if (this.currentBlockName != null) {
            let shape       = BlockShapes[ this.currentBlockName ];
            let solidColor  = CellColors[ CellEnum[this.currentBlockName] ];
            let shadowColor = solidColor.substr(0, 7) + '44';
            let contactPos  = this.getPosOnContact(shape, this.currentPos, this.currentRot);
            
            this.drawBlock( contactPos     , this.currentRot, shape, shadowColor); // Draw shadow first...
            this.drawBlock( this.currentPos, this.currentRot, shape, solidColor ); // so solid block can cover it.
        }
    }
    
    moveCursorBlock(delta) {
        clearTimeout(this.tickTimeout);

        let di = delta[0];
        let dj = delta[1];
        let newPos = [this.currentPos[0] + di, this.currentPos[1] + dj];
        
        let shape = BlockShapes[this.currentBlockName];
        if (!this.isCollided(shape, newPos, this.currentRot)) {
            this.currentPos = newPos;
        }else if (this.isCollided(shape, newPos, this.currentRot) && di==1 && dj==0) {
            this.dropCursorBlock();
        }

        this.renderBoard();
        this.sendCursorUpdate(socket);

        this.tickTimeout = setTimeout( () => this.moveCursorBlock([1, 0]), this.tickInterval );
    }

    rotateCursorBlock(deltaRot) {
        let shape = BlockShapes[ this.currentBlockName ];
        let newRot = (this.currentRot + deltaRot) % 4;
        while (newRot < 0) {
            newRot += 4;
        }
        let allowOffsets = [
            [ 0, 0],
            [ 0, 1],
            [ 0,-1],
            [ 1, 0]
        ];
        for(let o=0; o<allowOffsets.length; o++) {
            let newPos = [this.currentPos[0] + allowOffsets[o][0], this.currentPos[1] + allowOffsets[o][1]];
            if (!this.isCollided(shape, newPos, newRot)) {
                this.currentPos = newPos;
                this.currentRot = newRot;
                forcePlaySound(swooshSound);
                break;
            }
        }
        this.renderBoard();
    }

    dropCursorBlock() {
        // Figure out where the block will land
        let currentBlockId    = CellEnum[ this.currentBlockName ];
        let currentBlockShape = BlockShapes[ this.currentBlockName ];
        let rotatedShape = rotateShape(currentBlockShape, this.currentRot);
        let contactPos = this.getPosOnContact(rotatedShape, this.currentPos, rotatedShape, 0);
        let i = contactPos[0];
        let j = contactPos[1];
        
        // Commit the block shape to those cells
        rotatedShape.forEach(delta => {
            let di = delta[0];
            let dj = delta[1];
            this.grid[i+di][j+dj] = currentBlockId;
        })

        // Did we complete any rows?
        this.handleCompletedRows();

        // Reset the cursor
        this.currentPos = TetrisGame.defaultPos;
        this.currentRot = TetrisGame.defaultRot;
        this.currentBlockName = this.getRandomBlockName()

        // Re-draw the board
        this.renderBoard()

        // Play thud sound
        forcePlaySound(thudSound);

        // Let our opponent know about our move
        this.sendBoardUpdate(socket);
        this.sendCursorUpdate(socket);

        // Check for Game Over
        let newBlockShape = BlockShapes[ this.currentBlockName ];
        if (this.isCollided(newBlockShape, this.currentPos, this.currentRot)) {
            this.doGameOver();
        }

    }

    handleCompletedRows() {
        let completedRows = [];
        for(let i=0; i<TetrisGame.rows; i++) {
            let rowIsComplete = true;
            for(let j=0; j<TetrisGame.cols; j++) {
                if (this.grid[i][j] == CellEnum.Empty || this.grid[i][j] == CellEnum.Filler) {
                    rowIsComplete = false;
                    break
                }
            }
            if(rowIsComplete) {
                completedRows.push(i);
            }
        }
        completedRows.forEach( row => this.deleteRow(row) );
        if (completedRows.length > 0) {
            forcePlaySound(tingSound);
            this.tickInterval -= TetrisGame.tickIntervalDecayRate;
            if (this.tickInterval < TetrisGame.minTickInterval) {
                this.tickInterval = TetrisGame.minTickInterval;
            }
        }
        if (completedRows.length > 1) {
            let currentFlllerLines = this.getFillerLines();
            let rowsToDelete = Math.min(completedRows.length, currentFlllerLines);
            let rowsToSend   = Math.max(0, completedRows.length-currentFlllerLines);
            for(let n=0; n<rowsToDelete; n++) {
                this.deleteRow(TetrisGame.rows-1);
            }
            if (rowsToSend > 0) {
                this.sendFillerRows(socket, rowsToSend);
            }
        }
    }

    deleteRow(row) {
        // Shift everything above this row down
        for (let i=row; i>0; i--) {
            for(let j=0; j<TetrisGame.cols; j++) {
                this.grid[i][j] = this.grid[i-1][j];
            }
        }

        // Clear the top row
        for(let j=0; j<TetrisGame.cols; j++) {
            this.grid[0][j] = CellEnum.Empty;
        }
    }

    doGameOver() {
        this.currentBlockName = null;
        clearTimeout(this.tickTimeout);
        forcePlaySound(gameOverSound);
        setTimeout(() => alert('Game Over'), 1000);
        document.removeEventListener('keydown', keyboardEventHandler);
    }

    getFillerLines() {
        let lineCount = 0;
        for (let i=TetrisGame.rows-1; i>=0; i--) {
            if(this.grid[i][0] == CellEnum.Filler){
                lineCount++;
            }else{
                break;
            }
        }
        return lineCount;
    }

    addFillerLine() {
        // Move everything up one
        for(let i=0; i<TetrisGame.rows-1; i++) {
            for(let j=0; j<TetrisGame.cols; j++) {
                this.grid[i][j] = this.grid[i+1][j];
            }
        }
        
        // Fill the bottom row
        for(let j=0; j<TetrisGame.cols; j++) {
            this.grid[TetrisGame.rows-1][j] = CellEnum.Filler;
        }
    }

    sendBoardUpdate(socket) {
        let urlParams = getUrlParams();
        let message = JSON.stringify({
            type: 'boardUpdate',
            player: urlParams.name,
            battleId: urlParams.battleId,
            grid: this.grid
        });
        socket.send(message);
    }

    sendCursorUpdate(socket) {
        let urlParams = getUrlParams();
        let message = JSON.stringify({
            type: 'cursorUpdate',
            player: urlParams.name,
            battleId: urlParams.battleId,
            pos: this.currentPos,
            rot: this.currentRot,
            blockName: this.currentBlockName 
        });
        socket.send(message);
    }

    sendFillerRows(socket, count) {
        let urlParams = getUrlParams();
        let message = JSON.stringify({
            type: 'fillerRows',
            player: urlParams.name,
            battleId: urlParams.battleId,
            rowCount: count,
        });
        socket.send(message);
    }

}


// Initialize TetrisGame objects
var myCtx = document.getElementById('my-board-canvas').getContext('2d');
var myGame = new TetrisGame(myCtx);
myGame.renderBoard();

var oppCtx = document.getElementById('opponent-board-canvas').getContext('2d');
var oppGame = new TetrisGame(oppCtx);
oppGame.renderBoard();

// Add input event listeners
function keyboardEventHandler(event) {
    LEFT_KEYS  = ['ArrowLeft' , 'KeyA' ];
    RIGHT_KEYS = ['ArrowRight', 'KeyD' ];
    DOWN_KEYS  = ['ArrowDown' , 'KeyS' ];
    LROT_KEYS  = ['PageUp'    , 'KeyQ' ];
    RROT_KEYS  = ['PageDown'  , 'KeyE' ];
    DROP_KEYS  = ['ArrowUp'   , 'KeyW', 'Space'];

    if ( RIGHT_KEYS.includes(event.code) ) {
        myGame.moveCursorBlock([0, 1]);
    }else if ( LEFT_KEYS.includes(event.code) ) {
        myGame.moveCursorBlock([0,-1]);
    }else if ( DOWN_KEYS.includes(event.code) ) {
        myGame.moveCursorBlock([1, 0]);
    }else if ( DROP_KEYS.includes(event.code) ) {
        myGame.dropCursorBlock();
    }else if ( RROT_KEYS.includes(event.code) ) {
        myGame.rotateCursorBlock(1);
    }else if ( LROT_KEYS.includes(event.code) ) {
        myGame.rotateCursorBlock(-1);
    }
}
document.addEventListener('keydown', keyboardEventHandler);

// Initialize WebSocket
var socket = new WebSocket('ws://' + window.location.host);

// Add WebSocket message listeners
function wsMessageHandler( event ) {
    let messageObj = JSON.parse( event.data );
    if (messageObj.type == 'start') {
        // TODO: Show the other players name somewhere
        myGame.startGame();
    }else if (messageObj.type == 'boardUpdate') {
        if (messageObj.player == getUrlParams().name) {
            return;
        }
        oppGame.grid = messageObj.grid;
        oppGame.renderBoard();
    }else if (messageObj.type == 'cursorUpdate') {
        if (messageObj.player == getUrlParams().name) {
            return;
        }
        oppGame.currentPos = messageObj.pos;
        oppGame.currentRot = messageObj.rot;
        oppGame.currentBlockName = messageObj.blockName;
        oppGame.renderBoard();
    }else if (messageObj.type == 'fillerRows'){
        if (messageObj.player == getUrlParams().name) {
            return;
        }
        for(let n=0;n<messageObj.rowCount; n++) {
            myGame.addFillerLine();
        }
    }
}
socket.onmessage = wsMessageHandler;

// Send the server a hello via the WebSocket
socket.onopen = () => {
    let urlParams = getUrlParams();
    registrationMessage = { 
        type: 'register',
        name: urlParams.name,
        battleId: urlParams.battleId
    }
    socket.send( JSON.stringify(registrationMessage) );
}