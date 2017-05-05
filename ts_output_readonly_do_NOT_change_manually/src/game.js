;
var game;
(function (game) {
    //weapons: 0 -> missile, 1 -> radar
    game.weapons = [];
    game.weapons[0] = false;
    game.weapons[1] = false;
    game.invalid = false;
    game.$rootScope = null;
    game.$timeout = null;
    // Global variables are cleared when getting updateUI.
    // I export all variables to make it easy to debug in the browser by
    // simply typing in the console, e.g.,
    // game.currentUpdateUI
    game.currentUpdateUI = null;
    game.didMakeMove = false; // You can only make one move per updateUI
    game.animationEndedTimeout = null;
    game.state = null;
    // For community games.
    game.proposals = null;
    game.yourPlayerInfo = null;
    function init($rootScope_, $timeout_) {
        game.$rootScope = $rootScope_;
        game.$timeout = $timeout_;
        registerServiceWorker();
        translate.setTranslations(getTranslations());
        translate.setLanguage('en');
        resizeGameAreaService.setWidthToHeight(1);
        gameService.setGame({
            updateUI: updateUI,
            getStateForOgImage: null,
        });
    }
    game.init = init;
    function registerServiceWorker() {
        // I prefer to use appCache over serviceWorker
        // (because iOS doesn't support serviceWorker, so we have to use appCache)
        // I've added this code for a future where all browsers support serviceWorker (so we can deprecate appCache!)
        if (!window.applicationCache && 'serviceWorker' in navigator) {
            var n = navigator;
            log.log('Calling serviceWorker.register');
            n.serviceWorker.register('service-worker.js').then(function (registration) {
                log.log('ServiceWorker registration successful with scope: ', registration.scope);
            }).catch(function (err) {
                log.log('ServiceWorker registration failed: ', err);
            });
        }
    }
    function getTranslations() {
        return {};
    }
    /*
      export function communityUI(communityUI: ICommunityUI) {
        log.info("Game got communityUI:", communityUI);
        // If only proposals changed, then do NOT call updateUI. Then update proposals.
        let nextUpdateUI: IUpdateUI = {
            playersInfo: [],
            playMode: communityUI.yourPlayerIndex,
            numberOfPlayers: communityUI.numberOfPlayers,
            state: communityUI.state,
            turnIndex: communityUI.turnIndex,
            endMatchScores: communityUI.endMatchScores,
            yourPlayerIndex: communityUI.yourPlayerIndex,
          };
        if (angular.equals(yourPlayerInfo, communityUI.yourPlayerInfo) &&
            currentUpdateUI && angular.equals(currentUpdateUI, nextUpdateUI)) {
          // We're not calling updateUI to avoid disrupting the player if he's in the middle of a move.
        } else {
          // Things changed, so call updateUI.
          updateUI(nextUpdateUI);
        }
        // This must be after calling updateUI, because we nullify things there (like playerIdToProposal&proposals&etc)
        yourPlayerInfo = communityUI.yourPlayerInfo;
        let playerIdToProposal = communityUI.playerIdToProposal;
        didMakeMove = !!playerIdToProposal[communityUI.yourPlayerInfo.playerId];
        proposals = [];
        for (let i = 0; i < gameLogic.ROWS; i++) {
          proposals[i] = [];
          for (let j = 0; j < gameLogic.COLS; j++) {
            proposals[i][j] = 0;
          }
        }
        for (let playerId in playerIdToProposal) {
          let proposal = playerIdToProposal[playerId];
          let delta = proposal.data;
          proposals[delta.row][delta.col]++;
        }
      }
    
    */
    function isProposal(row, col) {
        return game.proposals && game.proposals[row][col] > 0;
    }
    game.isProposal = isProposal;
    function isProposal1(row, col) {
        return game.proposals && game.proposals[row][col] == 1;
    }
    game.isProposal1 = isProposal1;
    function isProposal2(row, col) {
        return game.proposals && game.proposals[row][col] == 2;
    }
    game.isProposal2 = isProposal2;
    function updateUI(params) {
        log.info("Game got updateUI:", params);
        game.didMakeMove = false; // Only one move per updateUI
        game.currentUpdateUI = params;
        clearAnimationTimeout();
        game.state = params.state;
        if (isFirstMove()) {
            game.state = gameLogic.getInitialState();
            console.log("initial move!!!!!!!!!: ", game.state);
            params.state = game.state;
            updateUI(params);
        }
        // We calculate the AI move only after the animation finishes,
        // because if we call aiService now
        // then the animation will be paused until the javascript finishes.
        game.animationEndedTimeout = game.$timeout(animationEndedCallback, 500);
    }
    game.updateUI = updateUI;
    function animationEndedCallback() {
        log.info("Animation ended");
        maybeSendComputerMove();
    }
    function clearAnimationTimeout() {
        if (game.animationEndedTimeout) {
            game.$timeout.cancel(game.animationEndedTimeout);
            game.animationEndedTimeout = null;
        }
    }
    function maybeSendComputerMove() {
        if (!isComputerTurn())
            return;
        var currentMove = {
            endMatchScores: game.currentUpdateUI.endMatchScores,
            state: game.currentUpdateUI.state,
            turnIndex: game.currentUpdateUI.turnIndex,
        };
        var move = aiService.findComputerMove(currentMove);
        log.info("Computer move: ", move);
        makeMove(move);
    }
    function makeMove(move) {
        if (game.didMakeMove) {
            return;
        }
        game.didMakeMove = true;
        //init move shot for next player
        game.state.move = false;
        game.state.shot = false;
        if (!game.proposals) {
            gameService.makeMove(move, null);
        }
        else {
            var delta = move.state.delta;
            var myProposal = {
                data: delta,
                chatDescription: '' + (delta.row + 1) + 'x' + (delta.col + 1),
                playerInfo: game.yourPlayerInfo,
            };
            // Decide whether we make a move or not (if we have 2 other proposals supporting the same thing).
            if (game.proposals[delta.row][delta.col] < 2) {
                move = null;
            }
            //gameService.communityMove(move, myProposal);
        }
    }
    function isFirstMove() {
        return !game.state;
    }
    function yourPlayerIndex() {
        return game.currentUpdateUI.yourPlayerIndex;
    }
    function isComputer() {
        var playerInfo = game.currentUpdateUI.playersInfo[game.currentUpdateUI.yourPlayerIndex];
        // In community games, playersInfo is [].
        return playerInfo && playerInfo.playerId === '';
    }
    function isComputerTurn() {
        return isMyTurn() && isComputer();
    }
    function isHumanTurn() {
        return isMyTurn() && !isComputer();
    }
    function isMyTurn() {
        return !game.didMakeMove &&
            game.currentUpdateUI.turnIndex >= 0 &&
            game.currentUpdateUI.yourPlayerIndex === game.currentUpdateUI.turnIndex; // it's my turn
    }
    game.isMyTurn = isMyTurn;
    function validShot(row, col) {
        var shipRow, shipCol;
        if (game.currentUpdateUI.yourPlayerIndex == 0) {
            shipRow = game.state.myShip.row;
            shipCol = game.state.myShip.col;
        }
        else {
            shipRow = game.state.yourShip.row;
            shipCol = game.state.yourShip.col;
        }
        if (shipRow == row && shipCol == col)
            return false;
        if (game.state.myBoard[row][col] == 'M')
            return false;
        return true;
    }
    game.validShot = validShot;
    function validMove(row, col) {
        if (game.state.myBoard[row][col] == 'M') {
            console.log("invalid Move!");
            return false;
        }
        var shipRow, shipCol;
        if (game.currentUpdateUI.yourPlayerIndex == 0) {
            shipRow = game.state.myShip.row;
            shipCol = game.state.myShip.col;
        }
        else {
            shipRow = game.state.yourShip.row;
            shipCol = game.state.yourShip.col;
        }
        for (var i = -1; i <= 1; i++)
            for (var j = -1; j <= 1; j++) {
                if ((shipRow + i == row && shipCol + j == col)) {
                    console.log("valid Move!");
                    return true;
                }
            }
        return false;
    }
    game.validMove = validMove;
    function valid(row, col) {
        var shipRow, shipCol;
        console.log("judging valid state: ", game.state);
        if (game.state.move == false && game.state.shot == false) {
            console.log("move!!!");
            return validMove(row, col);
        }
        else {
            console.log("shot!!!");
            return validShot(row, col);
        }
    }
    game.valid = valid;
    //missile
    function turnmissile() {
        game.mouseRow = -1;
        game.mouseCol = -1;
        if (game.state.missile[game.currentUpdateUI.yourPlayerIndex]) {
            return;
        }
        if (game.state.move == true)
            if ((game.weapons[1] == true && game.state.radar[game.currentUpdateUI.yourPlayerIndex] == false)) {
                game.invalid = true;
            }
            else {
                game.invalid = false;
                game.weapons[0] = !game.weapons[0];
            }
        else {
            game.invalid = true;
        }
    }
    game.turnmissile = turnmissile;
    function usedmissile() {
        return game.state.missile[game.currentUpdateUI.yourPlayerIndex];
    }
    game.usedmissile = usedmissile;
    /**Radar */
    function turnRadar() {
        game.mouseRow = -1;
        game.mouseCol = -1;
        if (game.state.radar[game.currentUpdateUI.yourPlayerIndex]) {
            return;
        }
        if (game.state.move == true) {
            if ((game.weapons[0] == true && game.state.missile[game.currentUpdateUI.yourPlayerIndex] == false)) {
                game.invalid = true;
            }
            else {
                game.invalid = false;
                game.weapons[1] = !game.weapons[1];
            }
        }
        else {
            game.invalid = true;
        }
    }
    game.turnRadar = turnRadar;
    function usedRadar() {
        return game.state.radar[game.currentUpdateUI.yourPlayerIndex];
    }
    game.usedRadar = usedRadar;
    function cellClickedMy(row, col) {
        log.info("My Board cell:", row, col);
        if (!valid(row, col)) {
            game.invalid = true;
            return;
        }
        if (!isHumanTurn())
            return;
        game.invalid = false;
        var nextMove = null;
        try {
            nextMove = gameLogic.createMove(game.state, row, col, game.currentUpdateUI.turnIndex, game.weapons);
        }
        catch (e) {
            log.info(["Cell is already full in position:", row, col]);
            return;
        }
        var nextUpdateUI = game.currentUpdateUI;
        nextUpdateUI.state = nextMove.state;
        nextUpdateUI.turnIndex = nextMove.turnIndex;
        game.state = nextUpdateUI.state;
        console.log("state after move: ", game.state);
        updateUI(nextUpdateUI);
        game.weapons[0] = false;
        game.weapons[1] = false;
        // Move is legal, make it!
        console.log("nextMove: ", nextMove);
        if (game.state.shot == true)
            makeMove(nextMove);
    }
    game.cellClickedMy = cellClickedMy;
    function cursor() {
        if (game.state.move == true)
            return true;
        else
            return false;
    }
    game.cursor = cursor;
    function showShipMy() {
        if (game.currentUpdateUI.yourPlayerIndex == 1)
            return true;
        return false;
    }
    game.showShipMy = showShipMy;
    function moveArea(row, col) {
        var myRow = game.state.myShip.row;
        var myCol = game.state.myShip.col;
        var yourRow = game.state.yourShip.row;
        var yourCol = game.state.yourShip.col;
        if (game.state.move == true || game.state.myBoard[row][col] == 'M') {
            return false;
        }
        if (game.currentUpdateUI.yourPlayerIndex == 0) {
            for (var i = -1; i <= 1; i++)
                for (var j = -1; j <= 1; j++)
                    if (i != 0 || j != 0)
                        if ((myRow + i) == row && (myCol + j) == col)
                            return true;
        }
        else {
            for (var i = -1; i <= 1; i++)
                for (var j = -1; j <= 1; j++)
                    if (i != 0 || j != 0)
                        if ((yourRow + i) == row && (yourCol + j) == col)
                            return true;
        }
        return false;
    }
    game.moveArea = moveArea;
    function missArea(row, col) {
        if (game.state.myBoard[row][col] == 'M')
            return true;
        return false;
    }
    game.missArea = missArea;
    function shotArea(row, col) {
        if (game.state.myBoard[row][col] == 'X')
            return true;
        return false;
    }
    game.shotArea = shotArea;
    function shootingArea(row, col) {
        var shipRow, shipCol;
        if (game.currentUpdateUI.yourPlayerIndex == 0) {
            shipRow = game.state.myShip.row;
            shipCol = game.state.myShip.col;
        }
        else {
            shipRow = game.state.yourShip.row;
            shipCol = game.state.yourShip.col;
        }
        if (game.state.move == false || (row == shipRow && col == shipCol) || game.state.myBoard[row][col] == 'M')
            return false;
        return true;
    }
    game.shootingArea = shootingArea;
    function distance(row, col) {
        var shipRow, shipCol;
        if (game.currentUpdateUI.turnIndex == 0) {
            shipRow = game.state.myShip.row;
            shipCol = game.state.myShip.col;
        }
        else {
            shipRow = game.state.yourShip.row;
            shipCol = game.state.yourShip.col;
        }
        //console.log("row: ",row, "col: ",col, " distance: ", Math.sqrt(Math.pow(Math.abs(shipRow-row),2) + Math.pow(Math.abs(shipCol-col),2)));
        return Math.sqrt(Math.pow(Math.abs(shipRow - row), 2) + Math.pow(Math.abs(shipCol - col), 2));
    }
    game.distance = distance;
    function previousShot(row, col) {
        if (game.state.buffer != null && game.state.buffer.row == row && game.state.buffer.col == col)
            return true;
        return false;
    }
    game.previousShot = previousShot;
    function shouldShowImage(row, col) {
        //console.log("state: ",state);
        if (game.state.myBoard[row][col] == 'X')
            return true;
        if (game.currentUpdateUI.yourPlayerIndex == 0) {
            if (game.state.myShip.row == row && game.state.myShip.col == col)
                return true;
        }
        else {
            if (game.state.yourShip.row == row && game.state.yourShip.col == col)
                return true;
        }
        return false;
    }
    game.shouldShowImage = shouldShowImage;
    function showText() {
        if (game.currentUpdateUI.turnIndex == 0)
            return true;
        return false;
    }
    game.showText = showText;
    function shouldSlowlyAppear(row, col) {
        return game.state.delta &&
            game.state.delta.row === row && game.state.delta.col === col;
    }
    game.shouldSlowlyAppear = shouldSlowlyAppear;
    game.mouseRow = -1;
    game.mouseCol = -1;
    function crossHover(row, col, mouseRow, mouseCol) {
        if (game.weapons[0] == false)
            return false;
        var shipRow, shipCol;
        if (game.currentUpdateUI.turnIndex == 0) {
            shipRow = game.state.myShip.row;
            shipCol = game.state.myShip.col;
        }
        else {
            shipRow = game.state.yourShip.row;
            shipCol = game.state.yourShip.col;
        }
        if (row == shipRow && col == shipCol)
            return false;
        if ((mouseRow - 1 == row && mouseCol == col) || (mouseRow == row && mouseCol - 1 == col) || (mouseRow == row && mouseCol + 1 == col) || (mouseRow + 1 == row && mouseCol == col) || (mouseRow == row && mouseCol == col))
            return true;
        return false;
    }
    game.crossHover = crossHover;
    function radarHover(row, col, mouseRow, mouseCol) {
        if (game.weapons[1] == false)
            return false;
        var shipRow, shipCol;
        if (game.currentUpdateUI.turnIndex == 0) {
            shipRow = game.state.myShip.row;
            shipCol = game.state.myShip.col;
        }
        else {
            shipRow = game.state.yourShip.row;
            shipCol = game.state.yourShip.col;
        }
        if (row == shipRow && col == shipCol)
            return false;
        if ((mouseRow - 1 == row && mouseCol == col) || (mouseRow == row && mouseCol - 1 == col) || (mouseRow == row && mouseCol + 1 == col) || (mouseRow + 1 == row && mouseCol == col) || (mouseRow == row && mouseCol == col))
            return true;
        return false;
    }
    game.radarHover = radarHover;
})(game || (game = {}));
angular.module('myApp', ['gameServices'])
    .run(['$rootScope', '$timeout',
    function ($rootScope, $timeout) {
        $rootScope['game'] = game;
        game.init($rootScope, $timeout);
    }]);
//# sourceMappingURL=game.js.map