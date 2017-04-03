;
var game;
(function (game) {
    game.direction = true;
    function flipDirection() { game.direction = !game.direction; }
    game.flipDirection = flipDirection;
    game.space = true;
    game.radar = true;
    function useRadar() {
        //check status before switching radar
        game.radar = !game.radar;
    }
    game.useRadar = useRadar;
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
            log.info("initial move!!!!!!!!!");
            game.state = gameLogic.getInitialState();
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
        }
    }
    function isFirstMove() {
        return !game.currentUpdateUI.state;
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
    function validMove(row, col) {
        var shipRow, shipCol;
        if (game.state.myBoard[row][col] == 'M')
            return false;
        if (game.state.shot == true)
            return true;
        if (game.currentUpdateUI.yourPlayerIndex == 0) {
            shipRow = game.state.myShip.row;
            shipCol = game.state.myShip.col;
        }
        else {
            shipRow = game.state.yourShip.row;
            shipCol = game.state.yourShip.col;
        }
        //same index
        if (shipRow == row && shipCol == col)
            return false;
        for (var i = -1; i <= 1; i++)
            for (var j = -1; j <= 1; j++) {
                if ((shipRow + i == row && shipCol + j == col))
                    return true;
            }
        return false;
    }
    game.validMove = validMove;
    function cellClickedMy(row, col) {
        log.info("My Board cell:", row, col);
        if (!validMove(row, col)) {
            document.getElementById("move").style.display = "block";
            return;
        }
        if (!isHumanTurn())
            return;
        document.getElementById("move").style.display = "none";
        var nextMove = null;
        try {
            nextMove = gameLogic.createMove(game.state, row, col, game.currentUpdateUI.turnIndex);
        }
        catch (e) {
            log.info(["Cell is already full in position:", row, col]);
            return;
        }
        var nextUpdateUI = game.currentUpdateUI;
        nextUpdateUI.state = nextMove.state;
        nextUpdateUI.turnIndex = nextMove.turnIndex;
        updateUI(nextUpdateUI);
        // Move is legal, make it!
        console.log("nextMove: ", nextMove);
        if (game.state.shot == true)
            makeMove(nextMove);
    }
    game.cellClickedMy = cellClickedMy;
    function move() {
        var myRow = game.state.myShip.row;
        var myCol = game.state.myShip.col;
        var yourRow = game.state.yourShip.row;
        var yourCol = game.state.yourShip.col;
        for (var i = 0; i < 10; i++)
            for (var j = 0; j < 10; j++) {
                if (document.getElementById('my' + i + 'x' + j) !== null)
                    if (document.getElementById('my' + i + 'x' + j).classList.contains("moveArea"))
                        document.getElementById('my' + i + 'x' + j).classList.remove("moveArea");
            }
        if (game.currentUpdateUI.yourPlayerIndex == 0) {
            for (var i = -1; i <= 1; i++) {
                for (var j = -1; j <= 1; j++) {
                    if (i != 0 || j != 0)
                        if ((myRow + i) >= 0 && (myRow + i) < 10 && (myCol + j) >= 0 && (myCol + j) < 10)
                            if (document.getElementById('my' + (myRow + i) + 'x' + (myCol + j)) !== null)
                                document.getElementById('my' + (myRow + i) + 'x' + (myCol + j)).classList.add("moveArea");
                }
            }
        }
        else {
            for (var i = -1; i <= 1; i++)
                for (var j = -1; j <= 1; j++)
                    if (i != 0 || j != 0)
                        if ((yourRow + i) >= 0 && (yourRow + i) < 10 && (yourCol + j) >= 0 && (yourCol + j) < 10)
                            if (document.getElementById('my' + (yourRow + i) + 'x' + (yourCol + j)) !== null)
                                document.getElementById('my' + (yourRow + i) + 'x' + (yourCol + j)).classList.add("moveArea");
        }
    }
    game.move = move;
    function shouldShowImage(row, col) {
        move();
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
    function isPiece(row, col, turnIndex, pieceKind, whichboard) {
        return game.state.myBoard[row][col] === pieceKind || (isProposal(row, col) && game.currentUpdateUI.turnIndex == turnIndex);
    }
    function isPieceM(row, col, whichboard) {
        return isPiece(row, col, 1, 'M', whichboard);
    }
    game.isPieceM = isPieceM;
    function shouldSlowlyAppear(row, col) {
        return game.state.delta &&
            game.state.delta.row === row && game.state.delta.col === col;
    }
    game.shouldSlowlyAppear = shouldSlowlyAppear;
})(game || (game = {}));
angular.module('myApp', ['gameServices'])
    .run(['$rootScope', '$timeout',
    function ($rootScope, $timeout) {
        $rootScope['game'] = game;
        game.init($rootScope, $timeout);
    }]);
//# sourceMappingURL=game.js.map