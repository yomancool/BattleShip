var gameService = gamingPlatform.gameService;
var alphaBetaService = gamingPlatform.alphaBetaService;
var translate = gamingPlatform.translate;
var resizeGameAreaService = gamingPlatform.resizeGameAreaService;
var log = gamingPlatform.log;
var dragAndDropService = gamingPlatform.dragAndDropService;
var gameLogic;
(function (gameLogic) {
    gameLogic.ROWS = 8;
    gameLogic.COLS = 8;
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
            var mine = Math.floor((Math.random() * gameLogic.ROWS));
            var your = Math.floor((Math.random() * gameLogic.COLS));
            board[0][mine] = 'O';
            board[gameLogic.ROWS - 1][your] = 'O';
            return { myBoard: board, delta: null, start: 1, myShip: { row: 0, col: mine }, yourShip: { row: gameLogic.ROWS - 1, col: your }, move: false, shot: false, buffer: null };
        }
    }
    gameLogic.getInitialState = getInitialState;
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
        return { myBoard: board, delta: null, start: 1, myShip: myP, yourShip: yourP, move: true, shot: false, buffer: null };
    }
    gameLogic.moveState = moveState;
    function shotState(stateBeforeMove, turnIndexBeforeMove, row, col) {
        var originRow;
        var originCol;
        var board = stateBeforeMove.myBoard;
        var myP = { row: stateBeforeMove.myShip.row, col: stateBeforeMove.myShip.col };
        var yourP = { row: stateBeforeMove.yourShip.row, col: stateBeforeMove.yourShip.col };
        if (board[row][col] == '') {
            console.log("shot miss!!");
            board[row][col] = 'M';
        }
        else {
            console.log("shot hit!!");
            if (turnIndexBeforeMove == 0) {
                originRow = stateBeforeMove.myShip.row;
                originCol = stateBeforeMove.myShip.col;
                if (row != originRow && col != originCol)
                    if (board[row][col] == 'O') {
                        console.log("O -> X");
                        board[row][col] = 'X';
                    }
            }
            else {
                originRow = stateBeforeMove.yourShip.row;
                originCol = stateBeforeMove.yourShip.col;
                if (row != originRow && col != originCol)
                    if (board[row][col] == 'O') {
                        console.log("O -> X");
                        board[row][col] = 'X';
                    }
                myP = { row: stateBeforeMove.myShip.row, col: stateBeforeMove.myShip.col };
                yourP = { row: originRow, col: originCol };
            }
        }
        return { myBoard: board, delta: null, start: 1, myShip: myP, yourShip: yourP, move: false, shot: true, buffer: { row: row, col: col } };
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
            console.log("state after shot:", stateAfterMove);
        }
        var myBoardAfterMove = stateAfterMove.myBoard;
        var winner = getWinner(myBoardAfterMove, stateAfterMove);
        if (winner !== '') {
            // Game over.
            turnIndex = -1;
            endMatchScores = winner === "0" ? [1, 0] : winner === "1" ? [0, 1] : [0, 0];
        }
        else {
            // Game continues. Now it's the opponent's turn (the turn switches from 0 to 1 and 1 to 0).
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