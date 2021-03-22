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
    'I': [[-1, 0],
          [ 0, 0],
          [ 1, 0],
          [ 2, 0]],
    'J': [[-1, 0],
          [ 0, 0],
          [ 1, 0],
          [ 1, 1]]
}

class TetrisBoard {
    static rows = 20;
    static cols = 10;

    constructor(){
        this.grid = [];
        for(let i=0; i< TetrisBoard.rows; i++) {
            this.grid.push( new Array(TetrisBoard.cols).fill(CellEnum.Empty) );
        }

        // Fill bottom cells for visual inspection
        for(let j=0; j<=8; j++) {
            this.grid[TetrisBoard.rows-1][j] = j;
        }
    }

    render(ctx){
        let cellWidth  = ctx.canvas.width  / TetrisBoard.cols;
        let cellHeight = ctx.canvas.height / TetrisBoard.rows;
        
        // Draw grid
        ctx.lineWidth = 1;
        for (let i=1; i<TetrisBoard.rows; i++) {
            ctx.moveTo( 0               , i*cellHeight );
            ctx.lineTo( ctx.canvas.width, i*cellHeight );
        }
        for (let j=1; j<TetrisBoard.cols; j++) {
            ctx.moveTo( j*cellWidth, 0                 );
            ctx.lineTo( j*cellWidth, ctx.canvas.height );
        }
        ctx.stroke()

        // Draw cell contents
        for(let i=0; i<TetrisBoard.rows; i++){
            for(let j=0; j<TetrisBoard.cols; j++) {
                ctx.fillStyle = CellColors[ this.grid[i][j] ];
                ctx.fillRect(j*cellWidth  + 0.5, 
                             i*cellHeight + 0.5, 
                             cellWidth    - 1, 
                             cellHeight   - 1);
            }
        }
    }
}

var board = new TetrisBoard();
var ctx = document.getElementById('canvas').getContext('2d');
board.render( ctx );