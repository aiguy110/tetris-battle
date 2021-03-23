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
          [ 2,-1]],
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
class TetrisGame {
    static rows = 20;
    static cols = 10;
    static defaultPos = [0, 5];
    static defaultRot = 0;


    constructor(ctx){
        this.ctx = ctx;
        
        this.grid = [];
        for(let i=0; i< TetrisGame.rows; i++) {
            this.grid.push( new Array(TetrisGame.cols).fill(CellEnum.Empty) );
        }

        this.currentBlockName = 'T';
        this.currentPos = TetrisGame.defaultPos;
        this.currentRot = TetrisGame.defaultRot;
    }

    drawCell(i, j, color) {
        const cellWidth  = ctx.canvas.width  / TetrisGame.cols;
        const cellHeight = ctx.canvas.height / TetrisGame.rows;

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
        this.ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height );

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
        let shape       = BlockShapes[ this.currentBlockName ];
        let solidColor  = CellColors[ CellEnum[this.currentBlockName] ];
        let shadowColor = solidColor.substr(0, 7) + '44';
        let contactPos  = this.getPosOnContact(shape, this.currentPos, this.currentRot);
        
        this.drawBlock( contactPos     , this.currentRot, shape, shadowColor); // Draw shadow first...
        this.drawBlock( this.currentPos, this.currentRot, shape, solidColor ); // so solid block can cover it.
    }
    
    moveCursorBlock(delta) {
        let di = delta[0];
        let dj = delta[1];
        let newPos = [this.currentPos[0] + di, this.currentPos[1] + dj];
        
        let shape = BlockShapes[this.currentBlockName];
        if (!this.isCollided(shape, newPos, this.currentRot)) {
            this.currentPos = newPos;
        }
        this.renderBoard();
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
                break;
            }
        }
        this.renderBoard();
    }

    dropCursorBlock() {
        let currentBlockId    = CellEnum[ this.currentBlockName ];
        let currentBlockShape = BlockShapes[ this.currentBlockName ];
        let rotatedShape = rotateShape(currentBlockShape, this.currentRot);
        let contactPos = this.getPosOnContact(rotatedShape, this.currentPos, rotatedShape, 0);
        let i = contactPos[0];
        let j = contactPos[1];
        rotatedShape.forEach(delta => {
            let di = delta[0];
            let dj = delta[1];
            this.grid[i+di][j+dj] = currentBlockId;
        })

        this.currentPos = TetrisGame.defaultPos;
        this.currentRot = TetrisGame.defaultRot;
        this.currentBlockName = this.getRandomBlockName()

        this.renderBoard()
    }


}


// Initialize TetrisGame object
var ctx = document.getElementById('canvas').getContext('2d');
var game = new TetrisGame(ctx);
game.renderBoard();

// Add event listeners
document.addEventListener('keydown', event => {
    console.log(event)
    LEFT_KEYS  = ['ArrowLeft' , 'KeyA' ];
    RIGHT_KEYS = ['ArrowRight', 'KeyD' ];
    DOWN_KEYS  = ['ArrowDown' , 'KeyS' ];
    LROT_KEYS  = ['PageUp'    , 'KeyQ' ];
    RROT_KEYS  = ['PageDown'  , 'KeyE' ];
    DROP_KEYS  = ['ArrowUp'   , 'KeyW', 'Space'];

    if ( RIGHT_KEYS.includes(event.code) ) {
        game.moveCursorBlock([0, 1]);
    }else if ( LEFT_KEYS.includes(event.code) ) {
        game.moveCursorBlock([0,-1]);
    }else if ( DOWN_KEYS.includes(event.code) ) {
        game.moveCursorBlock([1, 0]);
    }else if ( DROP_KEYS.includes(event.code) ) {
        game.dropCursorBlock();
    }else if ( RROT_KEYS.includes(event.code) ) {
        game.rotateCursorBlock(1);
    }else if ( LROT_KEYS.includes(event.code) ) {
        game.rotateCursorBlock(-1);
    }
});