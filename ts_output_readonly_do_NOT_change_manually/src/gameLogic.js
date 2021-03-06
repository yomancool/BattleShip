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
            var missile = [];
            var radar = [];
            //initialize buffer
            var bufferrow = [];
            var buffercol = [];
            for (var i = 0; i < 5; i++) {
                bufferrow[i] = -1;
                buffercol[i] = -1;
            }
            for (var i = 0; i < gameLogic.ROWS; i++) {
                board[i] = [];
                for (var j = 0; j < gameLogic.COLS; j++) {
                    board[i][j] = '';
                }
            }
            //initial missile
            missile[0] = false;
            missile[1] = false;
            radar[0] = false;
            radar[1] = false;
            // random starting point
            var mine = Math.floor((Math.random() * gameLogic.ROWS));
            var your = Math.floor((Math.random() * gameLogic.COLS));
            board[0][mine] = 'O';
            board[gameLogic.ROWS - 1][your] = 'O';
            return { myBoard: board, delta: null, start: 1, myShip: { row: 0, col: mine }, yourShip: { row: gameLogic.ROWS - 1, col: your }, move: false, shot: false, buffer: { row: bufferrow, col: buffercol }, missile: missile, radar: radar };
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
        var buffer = stateBeforeMove.buffer;
        var board = stateBeforeMove.myBoard;
        var missile = stateBeforeMove.missile;
        var radar = stateBeforeMove.radar;
        for (var i = 0; i < 5; i++) {
            buffer.row[i] = -1;
            buffer.col[i] = -1;
        }
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
        return { myBoard: board, delta: null, start: 1, myShip: myP, yourShip: yourP, move: true, shot: false, buffer: buffer, missile: missile, radar: radar };
    }
    gameLogic.moveState = moveState;
    function crossmissile(buffer, board, row, col, turnIndex, state) {
        var shipRow, shipCol, count = 0, bufferrow = [], buffercol = [];
        if (turnIndex == 0) {
            shipRow = state.myShip.row;
            shipCol = state.myShip.col;
        }
        else {
            shipRow = state.yourShip.row;
            shipCol = state.yourShip.col;
        }
        for (var i = -1; i <= 1; i++) {
            for (var j = -1; j <= 1; j++) {
                if ((0 <= row + i) && (row + i < gameLogic.ROWS) && (0 <= col + j) && (col + j < gameLogic.COLS)) {
                    if ((i == -1 && j == -1) || (i == -1 && j == 1) || (i == 1 && j == -1) || (i == 1 && j == 1))
                        continue;
                    if (board[row + i][col + j] == 'O' && (row + i != shipRow && col + j != shipCol)) {
                        board[row + i][col + j] = 'X';
                        bufferrow[count] = row + i;
                        buffercol[count] = col + j;
                        count++;
                    }
                    else if (board[row + i][col + j] == '') {
                        board[row + i][col + j] = 'M';
                        bufferrow[count] = row + i;
                        buffercol[count] = col + j;
                        count++;
                    }
                    else if (board[row + i][col + j] == 'X') {
                        board[row + i][col + j] = 'X';
                        bufferrow[count] = row + i;
                        buffercol[count] = col + j;
                        count++;
                    }
                }
            }
        }
        for (var i = count; i < 5; i++) {
            bufferrow[i] = -1;
            buffercol[i] = -1;
        }
        buffer.row = bufferrow;
        buffer.col = buffercol;
        return {
            buffer: buffer,
            board: board
        };
    }
    gameLogic.crossmissile = crossmissile;
    function detect(board, row, col, turnIndex, state) {
        var shipRow, shipCol;
        if (turnIndex == 0) {
            shipRow = state.myShip.row;
            shipCol = state.myShip.col;
        }
        else {
            shipRow = state.yourShip.row;
            shipCol = state.yourShip.col;
        }
        for (var i = -1; i <= 1; i++) {
            for (var j = -1; j <= 1; j++) {
                if ((0 <= row + i) && (row + i < gameLogic.ROWS) && (0 <= col + j) && (col + j < gameLogic.COLS)) {
                    if (board[row + i][col + j] == 'O' && (row + i != shipRow && col + j != shipCol)) {
                        window.alert("foundShip!");
                        console.log("foundship!!!!!!");
                        return board;
                    }
                }
            }
        }
        window.alert("Ship not found!");
        console.log("Ship not found!!!!!!");
        return board;
    }
    gameLogic.detect = detect;
    function shotState(stateBeforeMove, turnIndexBeforeMove, row, col, weapons) {
        var originRow;
        var originCol;
        var buffer = stateBeforeMove.buffer;
        var board = stateBeforeMove.myBoard;
        var missile = stateBeforeMove.missile;
        var radar = stateBeforeMove.radar;
        var myP = { row: stateBeforeMove.myShip.row, col: stateBeforeMove.myShip.col };
        var yourP = { row: stateBeforeMove.yourShip.row, col: stateBeforeMove.yourShip.col };
        if (weapons[0] == true) {
            var tmp = crossmissile(buffer, board, row, col, turnIndexBeforeMove, stateBeforeMove);
            board = tmp.board;
            buffer = tmp.buffer;
            missile[turnIndexBeforeMove] = true;
        }
        else if (weapons[1] == true) {
            board = detect(board, row, col, turnIndexBeforeMove, stateBeforeMove);
            radar[turnIndexBeforeMove] = true;
        }
        else {
            buffer.row[0] = row;
            buffer.col[0] = col;
            for (var i = 1; i < 5; i++) {
                buffer.row[i] = -1;
                buffer.col[i] = -1;
            }
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
        }
        return { myBoard: board, delta: null, start: 1, myShip: myP, yourShip: yourP, move: false, shot: true, buffer: buffer, missile: missile, radar: radar };
    }
    gameLogic.shotState = shotState;
    function createMove(stateBeforeMove, row, col, turnIndexBeforeMove, weapons) {
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
            stateAfterMove = shotState(stateBeforeMove, turnIndexBeforeMove, row, col, weapons);
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