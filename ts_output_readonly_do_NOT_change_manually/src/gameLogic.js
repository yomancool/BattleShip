var gameService = gamingPlatform.gameService;
var alphaBetaService = gamingPlatform.alphaBetaService;
var translate = gamingPlatform.translate;
var resizeGameAreaService = gamingPlatform.resizeGameAreaService;
var log = gamingPlatform.log;
var dragAndDropService = gamingPlatform.dragAndDropService;
var gameLogic;
(function (gameLogic) {
    gameLogic.ROWS = 10;
    gameLogic.COLS = 10;
    /*
      function setShipRow(board: Board, state: IState, row: number, col: number, direction: boolean): IState {
        let shipNum = state.ship;
        let originBoard = board;
        if(shipNum < 5) {
          if(state.start==0) {
            if(board[row][col] === 'O') {
              throw new Error("already set!");
            }
            else {
              let length=5-shipNum;
              let compensate=0;
    
             // give compensate to out of boundary
              if(!validSet(board, row, col, length, direction)) {
                compensate = row+length-ROWS;
              }
    
              //check if already set
              for(let i=0; i<length; i++) {
                //check if already set
                if(board[row-compensate+i][col]==='O') {
                  window.alert("Already set ship here");
                  return {myBoard: originBoard ,yourBoard: state.yourBoard, delta:null, ship: shipNum, start: state.start};
                }
              }
    
              for(let i=0; i<length; i++) {
                board[row-compensate+i][col]='O';
              }
              
              shipNum++;
              console.log("shipNum:", shipNum);
            }
          }
        }
        else {
          return {myBoard: board,yourBoard: state.yourBoard, delta:{row,col}, ship: shipNum, start: 1};
        }
        if(shipNum==5) {
          state.start=1;
        }
    
        return {myBoard: board,yourBoard: state.yourBoard, delta:{row,col}, ship: shipNum, start: state.start};
      }
    */
    /*
      function setShipCol(board: Board, state: IState, row: number, col: number, direction: boolean): IState {
        let shipNum = state.ship;
        let originBoard = board;
        if(shipNum < 5) {
          if(state.start==0) {
            if(board[row][col] === 'O') {
              throw new Error("already set!");
            }
            else {
              let length=5-shipNum;
              let compensate=0;
    
              //give compensate to out of boundary
              if(!validSet(board, row, col, length,direction)) {
                compensate = col+length-COLS;
              }
    
              //check if already set
              for(let i=0; i<length; i++) {
                //check if already set
                if(board[row][col-compensate+i]==='O') {
                  window.alert("Already set ship here");
                  return {myBoard: originBoard ,yourBoard: state.yourBoard, delta:null, ship: shipNum, start: state.start};
                }
              }
    
              for(let i=0; i<length; i++) {
                board[row][col-compensate+i]='O';
              }
    
              shipNum++;
              console.log("shipNum:", shipNum);
            }
          }
        }
        else {
          return {myBoard: board,yourBoard: state.yourBoard, delta:{row,col}, ship: shipNum, start: 1};
        }
        if(shipNum==5) {
          state.start=1;
        }
    
        return {myBoard: board,yourBoard: state.yourBoard, delta:{row,col}, ship: shipNum, start: state.start};
      }
    */
    function getInitialState() {
        if (1) {
            var board = [];
            for (var i = 0; i < gameLogic.ROWS; i++) {
                board[i] = [];
                for (var j = 0; j < gameLogic.COLS; j++) {
                    board[i][j] = '';
                }
            }
            // random starting point
            var mine = Math.floor((Math.random() * 10));
            var your = Math.floor((Math.random() * 10));
            board[0][mine] = 'O';
            board[9][your] = 'O';
            return { myBoard: board, delta: null, start: 1, myShip: { row: 0, col: mine }, yourShip: { row: 9, col: your }, move: false };
        }
    }
    gameLogic.getInitialState = getInitialState;
    /*
      export function validSet(board: Board, row: number, col: number, leng: number, direction: boolean): boolean {
        if(direction == true) {
          if((row + leng) > 10 || row < 0 || col < 0) {
            return false;
          }
        }
        else {
          if((col + leng) > 10 || row < 0 || col < 0) {
            return false;
          }
        }
    
        return true;
      }
    */
    function validMove(row, col) {
        if (game.currentUpdateUI.yourPlayerIndex == 0) {
            if (Math.abs((row + col) - (game.currentUpdateUI.state.myShip.col + game.currentUpdateUI.state.myShip.row)) > 2)
                return false;
        }
        else {
            Math.abs((row + col) - (game.currentUpdateUI.state.yourShip.col + game.currentUpdateUI.state.yourShip.row)) > 2;
        }
        return true;
    }
    gameLogic.validMove = validMove;
    function getWinner(board, state) {
        for (var i = 0; i < gameLogic.ROWS; i++)
            for (var j = 0; j < gameLogic.COLS; j++)
                if (board[i][j] == 'X') {
                    console.log("Game Ends ");
                    if (i == state.myShip.row && j == state.myShip.col)
                        return "1";
                    else
                        return "0";
                }
        return '';
    }
    function moveState(stateBeforeMove, turnIndexBeforeMove, row, col) {
        var myP;
        var yourP;
        var originRow;
        var originCol;
        var board = stateBeforeMove.myBoard;
        if (turnIndexBeforeMove == 0) {
            originRow = stateBeforeMove.myShip.row;
            originCol = stateBeforeMove.myShip.col;
            board[originRow][originCol] = '';
            board[row][col] = 'O';
            myP = { row: row, col: col };
            yourP = { row: stateBeforeMove.yourShip.row, col: stateBeforeMove.yourShip.col };
        }
        else {
            originRow = stateBeforeMove.yourShip.row;
            originCol = stateBeforeMove.yourShip.col;
            board[originRow][originCol] = '';
            board[row][col] = 'O';
            myP = { row: stateBeforeMove.myShip.row, col: stateBeforeMove.myShip.col };
            yourP = { row: row, col: col };
        }
        return { myBoard: board, delta: null, start: 1, myShip: myP, yourShip: yourP, move: true };
    }
    gameLogic.moveState = moveState;
    function shotState(stateBeforeMove, turnIndexBeforeMove, row, col) {
        var myP;
        var yourP;
        var originRow;
        var originCol;
        var board = stateBeforeMove.myBoard;
        if (board[row][col] == '') {
            board[row][col] = 'M';
            document.getElementById('my' + (row) + 'x' + (col)).classList.add("missArea");
        }
        else {
            if (turnIndexBeforeMove == 0) {
                originRow = stateBeforeMove.myShip.row;
                originCol = stateBeforeMove.myShip.col;
                if (row != originRow && col != originCol)
                    if (board[row][col] == 'O')
                        board[row][col] == 'X';
                myP = { row: originRow, col: originCol };
                yourP = { row: stateBeforeMove.yourShip.row, col: stateBeforeMove.yourShip.col };
            }
            else {
                originRow = stateBeforeMove.yourShip.row;
                originCol = stateBeforeMove.yourShip.col;
                if (row != originRow && col != originCol)
                    if (board[row][col] == 'O')
                        board[row][col] == 'X';
                myP = { row: stateBeforeMove.myShip.row, col: stateBeforeMove.myShip.col };
                yourP = { row: originRow, col: originCol };
            }
        }
        return { myBoard: board, delta: null, start: 1, myShip: myP, yourShip: yourP, move: false };
    }
    gameLogic.shotState = shotState;
    function createMove(stateBeforeMove, row, col, turnIndexBeforeMove) {
        if (!stateBeforeMove) {
            stateBeforeMove = getInitialState();
        }
        var myBoard = stateBeforeMove.myBoard;
        if (getWinner(myBoard, stateBeforeMove) !== '') {
            throw new Error("Can only make a move if the game is not over!");
        }
        var endMatchScores;
        var turnIndex;
        var stateAfterMove;
        if (!stateBeforeMove.move) {
            stateAfterMove = moveState(stateBeforeMove, turnIndexBeforeMove, row, col);
            turnIndex = turnIndexBeforeMove;
            endMatchScores = null;
        }
        else {
            stateAfterMove = shotState(stateBeforeMove, turnIndexBeforeMove, row, col);
            turnIndex = 1 - turnIndexBeforeMove;
            endMatchScores = null;
        }
        var myBoardAfterMove = stateAfterMove.myBoard;
        var winner = getWinner(myBoardAfterMove, stateAfterMove);
        if (winner !== '') {
            // Game over.
            turnIndex = -1;
            endMatchScores = winner === "0" ? [1, 0] : winner === "1" ? [0, 1] : [0, 0];
        }
        else {
        }
        var delta = { row: row, col: col };
        var state = stateAfterMove;
        return { endMatchScores: endMatchScores, turnIndex: turnIndex, state: state };
    }
    gameLogic.createMove = createMove;
    function createInitialMove() {
        return { endMatchScores: null, turnIndex: 0,
            state: getInitialState() };
    }
    gameLogic.createInitialMove = createInitialMove;
})(gameLogic || (gameLogic = {}));
//# sourceMappingURL=gameLogic.js.map