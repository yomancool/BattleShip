interface SupportedLanguages {
  en: string, iw: string,
  pt: string, zh: string,
  el: string, fr: string,
  hi: string, es: string,
};


module game {

  export let direction: boolean = true;
  export function flipDirection() { direction = !direction; }

  export let space: boolean = true;

  export let radar: boolean = true;
  export function useRadar() {
    //check status before switching radar
    radar = !radar;
  }

  export let $rootScope: angular.IScope = null;
  export let $timeout: angular.ITimeoutService = null;

  // Global variables are cleared when getting updateUI.
  // I export all variables to make it easy to debug in the browser by
  // simply typing in the console, e.g.,
  // game.currentUpdateUI
  export let currentUpdateUI: IUpdateUI = null;
  export let didMakeMove: boolean = false; // You can only make one move per updateUI
  export let animationEndedTimeout: ng.IPromise<any> = null;
  export let state: IState = null;
  // For community games.
  export let proposals: number[][] = null;
  export let yourPlayerInfo: IPlayerInfo = null;

  export function init($rootScope_: angular.IScope, $timeout_: angular.ITimeoutService) {
    $rootScope = $rootScope_;
    $timeout = $timeout_;
    registerServiceWorker();
    translate.setTranslations(getTranslations());
    translate.setLanguage('en');
    resizeGameAreaService.setWidthToHeight(1);
    gameService.setGame({
      updateUI: updateUI,
      getStateForOgImage: null,
    });
  }

  function registerServiceWorker() {
    // I prefer to use appCache over serviceWorker
    // (because iOS doesn't support serviceWorker, so we have to use appCache)
    // I've added this code for a future where all browsers support serviceWorker (so we can deprecate appCache!)
    if (!window.applicationCache && 'serviceWorker' in navigator) {
      let n: any = navigator;
      log.log('Calling serviceWorker.register');
      n.serviceWorker.register('service-worker.js').then(function(registration: any) {
        log.log('ServiceWorker registration successful with scope: ',    registration.scope);
      }).catch(function(err: any) {
        log.log('ServiceWorker registration failed: ', err);
      });
    }
  }

  function getTranslations(): Translations {
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
  export function isProposal(row: number, col: number) {
    return proposals && proposals[row][col] > 0;
  }
  export function isProposal1(row: number, col: number) {
    return proposals && proposals[row][col] == 1;
  }
  export function isProposal2(row: number, col: number) {
    return proposals && proposals[row][col] == 2;
  }

  export function updateUI(params: IUpdateUI): void {
    log.info("Game got updateUI:", params);
    didMakeMove = false; // Only one move per updateUI
    currentUpdateUI = params;
    clearAnimationTimeout();
    state = params.state;
    if (isFirstMove()) {
      log.info("initial move!!!!!!!!!");
      state = gameLogic.getInitialState();
    }
    // We calculate the AI move only after the animation finishes,
    // because if we call aiService now
    // then the animation will be paused until the javascript finishes.
    animationEndedTimeout = $timeout(animationEndedCallback, 500);
  }

  function animationEndedCallback() {
    log.info("Animation ended");
    maybeSendComputerMove();
  }

  function clearAnimationTimeout() {
    if (animationEndedTimeout) {
      $timeout.cancel(animationEndedTimeout);
      animationEndedTimeout = null;
    }
  }

  function maybeSendComputerMove() {
    if (!isComputerTurn()) return;
    let currentMove:IMove = {
      endMatchScores: currentUpdateUI.endMatchScores,
      state: currentUpdateUI.state,
      turnIndex: currentUpdateUI.turnIndex,
    }
    let move = aiService.findComputerMove(currentMove);
    log.info("Computer move: ", move);
    makeMove(move);
  }

  function makeMove(move: IMove) {
    if (didMakeMove) { // Only one move per updateUI
      return;
    }
    didMakeMove = true;

    if (!proposals) {
      gameService.makeMove(move,null);
    } else {
      let delta = move.state.delta;
      let myProposal:IProposal = {
        data: delta,
        chatDescription: '' + (delta.row + 1) + 'x' + (delta.col + 1),
        playerInfo: yourPlayerInfo,
      };
      // Decide whether we make a move or not (if we have 2 other proposals supporting the same thing).
      if (proposals[delta.row][delta.col] < 2) {
        move = null;
      }
      //gameService.communityMove(move, myProposal);
    }
  }

  function isFirstMove() {
    return !currentUpdateUI.state;
  }

  function yourPlayerIndex() {
    return currentUpdateUI.yourPlayerIndex;
  }

  function isComputer() {
    let playerInfo = currentUpdateUI.playersInfo[currentUpdateUI.yourPlayerIndex];
    // In community games, playersInfo is [].
    return playerInfo && playerInfo.playerId === '';
  }

  function isComputerTurn() {
    return isMyTurn() && isComputer();
  }

  function isHumanTurn() {
    return isMyTurn() && !isComputer();
  }

  export function isMyTurn() {
    return !didMakeMove && // you can only make one move per updateUI.
      currentUpdateUI.turnIndex >= 0 && // game is ongoing
      currentUpdateUI.yourPlayerIndex === currentUpdateUI.turnIndex; // it's my turn
  }

  export function validShot(row:number, col:number): boolean {
    let shipRow, shipCol;
    if(currentUpdateUI.yourPlayerIndex==0) {
      shipRow = state.myShip.row;
      shipCol = state.myShip.col;
    }
    else {
      shipRow = state.yourShip.row;
      shipCol = state.yourShip.col;
    }
    if(shipRow==row && shipCol==col)  //shot myself
      return false;
    
    return true;

  }

  export function validMove(row:number, col:number): boolean {

    if(state.myBoard[row][col]=='M') {
      console.log("invalid Move!");
      return false;
    }
    
    let shipRow, shipCol;
    if(currentUpdateUI.yourPlayerIndex==0) {
      shipRow = state.myShip.row;
      shipCol = state.myShip.col;
    }
    else {
      shipRow = state.yourShip.row;
      shipCol = state.yourShip.col;
    }
    console.log("row: ",shipRow,"col: ",shipCol);

    for(let i=-1; i<=1; i++)
      for(let j=-1; j<=1; j++) {
        if(shipRow+i == row && shipCol+j == col) {
          console.log("valid Move!");
          return true;
        }
      }
    return false;
  }

  export function valid(row: number, col: number): boolean {
    let shipRow, shipCol;
    console.log("judging valid state: ", state);
    
    if(state.move==false && state.shot==false) {
      console.log("move!!!");
      return validMove(row,col);
    }
    else {
      console.log("shot!!!");
      return validShot(row,col);
    }
  }


  export function cellClickedMy(row: number, col: number): void {
    log.info("My Board cell:", row, col);
    
    if (!valid(row,col)) {
      document.getElementById("move").style.display = "block"; 
      return;
    }

    if (!isHumanTurn()) return;
    document.getElementById("move").style.display = "none";
    
    let nextMove: IMove = null;
    try {
      nextMove = gameLogic.createMove(
          state, row, col, currentUpdateUI.turnIndex);
    } catch (e) {
      log.info(["Cell is already full in position:", row, col]);
      return;
    }
    let nextUpdateUI: IUpdateUI = currentUpdateUI;
    nextUpdateUI.state = nextMove.state;
    nextUpdateUI.turnIndex = nextMove.turnIndex;
    state = nextUpdateUI.state;
    console.log("state after move: ",state);
    updateUI(nextUpdateUI);
    // Move is legal, make it!
    console.log("nextMove: ",nextMove);
    if(state.shot==true)
      makeMove(nextMove);
}


export function moveArea():void {

  let myRow = state.myShip.row;
  let myCol = state.myShip.col;

  let yourRow = state.yourShip.row;
  let yourCol = state.yourShip.col;

  for(let i=0;i<10;i++)
    for(let j=0;j<10;j++){
      if(document.getElementById('my' + i + 'x' + j)!==null)
        if(document.getElementById('my' + i + 'x' + j).classList.contains("moveArea"))
          document.getElementById('my' + i + 'x' + j).classList.remove("moveArea");
    }

  if(currentUpdateUI.yourPlayerIndex==0) {
    for(let i=-1;i<=1;i++){
      for(let j=-1;j<=1;j++){
        if (i!=0 || j!=0)
          if((myRow+i) >=0 && (myRow+i) < 10 && (myCol+j) >=0 && (myCol+j) < 10) 
            if(document.getElementById('my' + (myRow+i) + 'x' + (myCol+j))!==null)
              document.getElementById('my' + (myRow+i) + 'x' + (myCol+j)).classList.add("moveArea");
      }
    } 
  }
  else {
    for(let i=-1;i<=1;i++)
      for(let j=-1;j<=1;j++)
        if (i!=0 || j!=0)
          if((yourRow+i) >=0 && (yourRow+i) < 10 && (yourCol+j) >=0 && (yourCol+j) < 10)
            if(document.getElementById('my' + (yourRow+i) + 'x' + (yourCol+j))!==null)
              document.getElementById('my' + (yourRow+i) + 'x' + (yourCol+j)).classList.add("moveArea");
  }
}
  export function MissArea(): void {
    for(let i=0;i<10;i++)
      for(let j=0;j<10;j++){
        if(document.getElementById('my' + i + 'x' + j)!==null)
          if(state.myBoard[i][j]=='M')
            document.getElementById('my' + i + 'x' + j).classList.add("missArea");
      }
  }

    export function shotArea(row: number, col:number): void {
    let shipRow, shipCol;
    if(currentUpdateUI.yourPlayerIndex==1) {
      shipRow = state.myShip.row;
      shipCol = state.myShip.col;
    }
    else {
      shipRow = state.yourShip.row;
      shipCol = state.yourShip.col;
    }
    if(state.myBoard[shipRow][shipCol]=='X')  //enemy is shot!!
      document.getElementById('my' + (shipRow) + 'x' + (shipCol)).classList.add("shotArea");
  }

  export function shouldShowImage(row: number, col: number): boolean {
    moveArea();
    MissArea();
    shotArea(row, col);
    //console.log("state: ",state);
    if(currentUpdateUI.yourPlayerIndex==0) {
      if(state.myShip.row == row && state.myShip.col ==col)
        return true;
    }
    else {
      if(state.yourShip.row == row && state.yourShip.col ==col)
        return true;
    }
    return false;
  }
  

  export function showText(): boolean {
    if(currentUpdateUI.turnIndex == 0) return true;

    return false;
  }

  export function shouldSlowlyAppear(row: number, col: number): boolean {
      return state.delta &&
          state.delta.row === row && state.delta.col === col;
  }

}

angular.module('myApp', ['gameServices'])
  .run(['$rootScope', '$timeout',
    function ($rootScope: angular.IScope, $timeout: angular.ITimeoutService) {
      $rootScope['game'] = game;
      game.init($rootScope, $timeout);
    }]);
