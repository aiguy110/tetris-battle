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
        params[ kvPair[0] ] = decodeURI(kvPair[1]);
    });
    return params;
}

class TetrisGame {
    static rows = 20;
    static cols = 10;
    
    static defaultPos = [0, 5];
    static defaultRot = 0;
    
    static initialTickInterval = 750;
    static minTickInterval = 400;
    static tickIntervalDecayRate = 50;

    constructor(ctx){
        this.ctx = ctx;
        
        this.grid = [];
        for(let i=0; i< TetrisGame.rows; i++) {
            this.grid.push( new Array(TetrisGame.cols).fill(CellEnum.Empty) );
        }

        this.currentBlockName = null;
        this.storedBlockName = null;
        this.blockRing = null;
        this.blockRingInd = 0;

        this.storageWindow = null;
        this.queueWindows  = null;
    }

    startGame(blockRing){
        this.blockRing = blockRing;
        this.currentBlockName = this.blockRing[0];
        this.blockRingInd = 1;
        
        this.currentPos = TetrisGame.defaultPos;
        this.currentRot = TetrisGame.defaultRot;

        this.tickInterval = TetrisGame.initialTickInterval;
        this.tickTimeout = setTimeout( () => this.moveCursorBlock([1, 0]), this.tickInterval );

        this.updateQueueWindows();
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
        
        if (di != 0) {
            clearTimeout(this.tickTimeout);
            this.tickTimeout = setTimeout( () => this.moveCursorBlock([1, 0]), this.tickInterval );
        }
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
        this.incramentBlockRing();

        // Re-draw things
        this.renderBoard();
        this.updateQueueWindows();

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

    incramentBlockRing() {
        this.currentBlockName = this.blockRing[ this.blockRingInd ];
        this.blockRingInd = (this.blockRingInd + 1) % this.blockRing.length;
    }

    updateQueueWindows() {
        if(this.queueWindows != null) {
            for(let i=0; i<this.queueWindows.length; i++) {
                let ringInd = (this.blockRingInd + i) % this.blockRing.length;
                this.queueWindows[i].setBlock( this.blockRing[ringInd] );
            }
        }
    }

    doStorageSwap() {
        // Do we have anything in storage?
        if (this.storageWindow.blockName == null) {
            // Nope
            storageWindow.setBlock( this.currentBlockName );
            this.incramentBlockRing();
            this.updateQueueWindows();
        } else {
            // Yep
            let temp = this.currentBlockName;
            this.currentBlockName = this.storageWindow.blockName;
            this.storageWindow.setBlock(temp);
        }

        // Reset the cursor rot and try to currect any collisions
        this.currentRot = TetrisGame.defaultRot;
        this.rotateCursorBlock(0); // Call this just for its collision correction logic

        this.renderBoard();
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
            let currentFillerLines = this.getFillerLines();
            let rowsToDelete = Math.min(completedRows.length, currentFillerLines);
            let rowsToSend   = Math.max(0, completedRows.length-currentFillerLines-1);
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
        setTimeout(() => { 
            alert('Game Over');
            window.location.href = '/';
        }, 1000);
        document.removeEventListener('keydown', keyboardEventHandler);
        this.sendGameOver(socket);
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

    addFillerRow() {
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

        this.sendBoardUpdate(socket);
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

    sendGameOver(socket) {
        let urlParams = getUrlParams();
        let message = JSON.stringify({
            type: 'gameOver',
            player: urlParams.name,
            battleId: urlParams.battleId,
        });
        socket.send(message);
    }

}

class BlockWindow {
    static rows=4;
    static cols=4;

    constructor(ctx) {
        this.ctx = ctx;
        this.blockName = null;
    }

    setBlock(blockName) {
        this.blockName = blockName;
        this.render();
    }

    render() {
        const cellWidth  = this.ctx.canvas.width  / BlockWindow.cols;
        const cellHeight = this.ctx.canvas.height / BlockWindow.rows;

        // Clear canvas
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height );

        // Draw our block
        if (this.blockName == null) {
            return;
        }
        let blockId = CellEnum[this.blockName];
        let shape   = BlockShapes[this.blockName];
        let color   = CellColors[blockId];
        
        let left   = null;
        let right  = null;
        let top    = null;
        let bottom = null;
        shape.forEach( delta => {
            let i = delta[0];
            let j = delta[1];

            let cellLeft   =  j    * cellWidth;
            let cellRight  = (j+1) * cellWidth;
            let cellTop    =  i    * cellHeight;
            let cellBottom = (i+1) * cellHeight;

            if (left   == null || cellLeft   < left   ) left   = cellLeft;
            if (right  == null || cellRight  > right  ) right  = cellRight;
            if (top    == null || cellTop    < top    ) top    = cellTop;
            if (bottom == null || cellBottom > bottom ) bottom = cellBottom;
        } );

        let xOffset = (this.ctx.canvas.width  - left - right ) / 2;
        let yOffset = (this.ctx.canvas.height - top  - bottom) / 2;

        shape.forEach( delta => {
            let i = delta[0];
            let j = delta[1];

            this.ctx.fillStyle = color;
            this.ctx.fillRect(j*cellWidth  + 1.5 + xOffset, 
                              i*cellHeight + 1.5 + yOffset, 
                              cellWidth    - 1, 
                              cellHeight   - 1);
        } ); 
    }
}

// Populate name banners
var myNameBanner = document.getElementById('my-name-banner');
myNameBanner.innerText = getUrlParams().name + "'s Game";

var oppNameBanner = document.getElementById('opp-name-banner');
oppNameBanner.innerText = "Waiting for other player...";

// Initialize BlockWindow objects
var storageWindowCtx = document.getElementById('storage-block').getContext('2d');
var storageWindow = new BlockWindow(storageWindowCtx);

var queueWindow1Ctx = document.getElementById('queue-block-1').getContext('2d');
var queueWindow1 = new BlockWindow(queueWindow1Ctx);

var queueWindow2Ctx = document.getElementById('queue-block-2').getContext('2d');
var queueWindow2 = new BlockWindow(queueWindow2Ctx);

var queueWindow3Ctx = document.getElementById('queue-block-3').getContext('2d');
var queueWindow3 = new BlockWindow(queueWindow3Ctx);

// Initialize TetrisGame objects
var myCtx = document.getElementById('my-board-canvas').getContext('2d');
var myGame = new TetrisGame(myCtx);
myGame.renderBoard();

myGame.storageWindow = storageWindow;
myGame.queueWindows = [queueWindow1, queueWindow2, queueWindow3];

var oppCtx = document.getElementById('opponent-board-canvas').getContext('2d');
var oppGame = new TetrisGame(oppCtx);
oppGame.renderBoard();

// Add keyboard event listeners
function keyboardEventHandler(event) {
    LEFT_KEYS  = ['ArrowLeft' , 'KeyA' ];
    RIGHT_KEYS = ['ArrowRight', 'KeyD' ];
    DOWN_KEYS  = ['ArrowDown' , 'KeyS' ];
    LROT_KEYS  = ['PageUp'    , 'KeyQ' ];
    RROT_KEYS  = ['PageDown'  , 'KeyE' ];
    DROP_KEYS  = ['ArrowUp'   , 'KeyW' ];
    STORE_KEYS = ['Enter'     , 'KeyF', 'Space'];

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
    }else if ( STORE_KEYS.includes(event.code) ) {
        myGame.doStorageSwap();
    }
}
document.addEventListener('keydown', keyboardEventHandler);

// Add touch event listeners (we'll assume only one touch at a time)
var touchActive = false;
var touchStartX = 0;
var touchStartY = 0;
var touchLastStepX = 0;
var touchLastStepY = 0;
var maxDistFromStart = 0;
var maxXDistFromStart = 0;
var lastSeenY = 0;

const stepSize = 40;

function handleTouchStart(event) {
    let touch = event.touches[0];
    touchActive = true;
    touchStartX = touch.screenX;
    touchStartY = touch.screenY;
    touchLastStepX = touch.screenX;
    touchLastStepY = touch.screenY;
    lastSeenY = touch.screenY;
}

function handleTouchMove(event) {
    let touch = event.touches[0];
    let deltaX = touch.screenX - touchLastStepX;
    let deltaY = touch.screenY - touchLastStepY;

    let distFromStart = Math.sqrt((touch.screenX-touchStartX)**2 + (touch.screenY-touchStartY)**2);
    if (distFromStart > maxDistFromStart) {
        maxDistFromStart = distFromStart;
    }

    let xDistFromStart = Math.abs(touch.screenX - touchStartX);
    if (xDistFromStart > maxXDistFromStart) {
        maxXDistFromStart = xDistFromStart;
    }

    lastSeenY = touch.screenY;
    
    if (deltaX > 0) {
        xSteps = Math.floor( deltaX / stepSize );
        for (let n=0; n<xSteps; n++) {
            myGame.moveCursorBlock([0,1]);
        }
        touchLastStepX += xSteps * stepSize;
    } else {
        xSteps = Math.floor( - deltaX / stepSize );
        for (let n=0; n<xSteps; n++) {
            myGame.moveCursorBlock([0,-1]);
        }
        touchLastStepX -= xSteps * stepSize;
    }

    if (deltaY > 0) {
        ySteps = Math.floor( deltaY / stepSize );
        for (let n=0; n<ySteps; n++) {
            myGame.moveCursorBlock([1,0]);
        }
        touchLastStepY += ySteps * stepSize;
    }
}

function handleTouchEnd(event) {
    if (maxDistFromStart < stepSize) {
        if (touchStartY < screen.height / 4) {
            myGame.doStorageSwap()
        } else {
            if (touchStartX < screen.width / 2) {
                myGame.rotateCursorBlock(-1);
            } else {
                myGame.rotateCursorBlock(1);
            }
        }
    } else if (maxXDistFromStart < stepSize && (lastSeenY - touchStartY) < -2*stepSize) {
        myGame.dropCursorBlock();
    }
    
    touchActive = false;
    touchStartX = 0;
    touchStartY = 0;
    touchLastStepX = 0;
    touchLastStepY = 0;
    maxDistFromStart = 0;
    maxXDistFromStart = 0;
    lastSeenY = 0;
}

function removeTouch(touch) {
    if (touch.identifier in activeTouches) {
        delete activeTouches[touch.identifier];
    }
}

document.getElementsByTagName('body')[0].addEventListener('touchstart', handleTouchStart);
document.getElementsByTagName('body')[0].addEventListener('touchend', handleTouchEnd);
document.getElementsByTagName('body')[0].addEventListener('touchcancel', handleTouchEnd);
document.getElementsByTagName('body')[0].addEventListener('touchmove', handleTouchMove);


// Allow fullscreen (useful for mobile)
function tryFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen({navigationUI: 'hide'}).catch((err) => {
        alert(`Error attempting to enable fullscreen mode: ${err.message} (${err.name})`);
        }).then(() => {
            screen.orientation.lock('portrait');
        })
    }
}
document.getElementById('storage-block').addEventListener('click', _ => tryFullscreen())

// Can't enable fullscreen mode on iOS (!!??!!), so do this to prevent terrible page-zoom experience
// Lifted from: https://stackoverflow.com/questions/11689353/disable-pinch-zoom-on-mobile-web
document.addEventListener('gesturestart', function(e) {
    e.preventDefault();
    // special hack to prevent zoom-to-tabs gesture in safari
    document.body.style.zoom = 0.99;
});

document.addEventListener('gesturechange', function(e) {
    e.preventDefault();
    // special hack to prevent zoom-to-tabs gesture in safari
    document.body.style.zoom = 0.99;
});

document.addEventListener('gestureend', function(e) {
    e.preventDefault();
    // special hack to prevent zoom-to-tabs gesture in safari
    document.body.style.zoom = 0.99;
});

document.addEventListener('touchstart', function(e) {
    e.preventDefault();
})

document.addEventListener('touchmove', function(e) {
    e.preventDefault();
})

document.addEventListener('touchend', function(e) {
    e.preventDefault();
    e.target.click()
})


// Initialize WebSocket
var useTLS = (window.location.href.split(':')[0] == 'https');
var wsSchema = useTLS ? 'wss' : 'ws'
var socket = new WebSocket(wsSchema + '://' + window.location.host);

// Add WebSocket message listeners
function wsMessageHandler( event ) {
    let messageObj = JSON.parse( event.data );
    if (messageObj.type == 'start') {
        let myName = getUrlParams().name;
        messageObj.players.forEach( player => {
            if (player != myName){
                oppNameBanner.innerText = player + "'s Game"
            }
        });
        myGame.startGame(messageObj.blockRing);
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
            myGame.addFillerRow();
        }
        myGame.renderBoard();
        myGame.sendBoardUpdate();
    }else if (messageObj.type == 'gameOver'){
        if (messageObj.player == getUrlParams().name) {
            return;
        }
        alert('You win!');
        window.location.href = '/';
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