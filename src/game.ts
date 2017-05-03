interface SupportedLanguages {
  en: string, iw: string,
  pt: string, zh: string,
  el: string, fr: string,
  hi: string, es: string,
};


module game {

  //weapons: 0 -> missile, 1 -> radar
  export let weapons: boolean[] = [];
  weapons[0] = false;
  weapons[1] = false;
  
  export let invalid: boolean = false;

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
      state = gameLogic.getInitialState();
      console.log("initial move!!!!!!!!!: ", state);
      params.state = state;
      updateUI(params);
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
    //init move shot for next player
    state.move = false;
    state.shot = false;
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
    return !state;
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

    if(state.myBoard[row][col]=='M')  //already shot
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

    for(let i=-1; i<=1; i++)
      for(let j=-1; j<=1; j++) {
        if((shipRow+i == row && shipCol+j == col)) {
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

  //missile
  export function turnmissile() {
    mouseRow = -1;
    mouseCol = -1;
    if(state.missile[currentUpdateUI.yourPlayerIndex]) {
      return;
    }
    if(state.move == true)
      if((weapons[1]==true && state.radar[currentUpdateUI.yourPlayerIndex]==false)) {
        invalid = true;
      }
      else {
        invalid = false;
        weapons[0] = !weapons[0];
      }
    else {
      invalid = true;
    }
  }

  export function usedmissile():boolean {
    return state.missile[currentUpdateUI.yourPlayerIndex];
  }

  /**Radar */
  export function turnRadar() {
    mouseRow = -1;
    mouseCol = -1;
    if(state.radar[currentUpdateUI.yourPlayerIndex]) {
      return;
    }
    if(state.move == true) {
      if((weapons[0]==true && state.missile[currentUpdateUI.yourPlayerIndex]==false)) {
        invalid = true;
      }
      else {
      invalid = false;
      weapons[1] = !weapons[1];
      }
    }
    else {
      invalid = true;
    }
  }

  export function usedRadar():boolean {
    return state.radar[currentUpdateUI.yourPlayerIndex];
  }


  export function cellClickedMy(row: number, col: number): void {
    
    log.info("My Board cell:", row, col);
    if (!valid(row,col)) {
      invalid = true;
      return;
    }
    if (!isHumanTurn()) return;
    invalid = false;
    let nextMove: IMove = null;
    try {
      nextMove = gameLogic.createMove(
          state, row, col, currentUpdateUI.turnIndex, weapons);
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
    weapons[0] = false;
    weapons[1] = false;
    // Move is legal, make it!
    console.log("nextMove: ",nextMove);
    if(state.shot==true)
      makeMove(nextMove);
}


export function cursor():boolean {
  if(state.move == true)
    return true;
  else
    return false;
}

export function showShipMy(): boolean {
  if(currentUpdateUI.yourPlayerIndex == 1)
    return true;
  return false;
}

export function moveArea(row:number,col:number):boolean {
  let myRow = state.myShip.row;
  let myCol = state.myShip.col;
  let yourRow = state.yourShip.row;
  let yourCol = state.yourShip.col;

  if(state.move==true || state.myBoard[row][col]=='M') {
    return false;
  }

  if(currentUpdateUI.yourPlayerIndex==0) {
    for(let i=-1;i<=1;i++)
      for(let j=-1;j<=1;j++)
        if (i!=0 || j!=0)
          if((myRow+i) == row && (myCol+j) == col)
            return true;
  }
  else {
    for(let i=-1;i<=1;i++)
      for(let j=-1;j<=1;j++)
        if (i!=0 || j!=0)
          if((yourRow+i) == row && (yourCol+j) == col)
            return true;
  }
  return false;
}

  export function missArea(row:number,col:number): boolean {
    if(state.myBoard[row][col]=='M')
      return true;
    return false;
  }

  export function shotArea(row: number, col:number): boolean {
    if(state.myBoard[row][col]=='X')  //enemy is shot!!
      return true;

    return false;
  }

  export function shootingArea(row: number, col:number): boolean {
    let shipRow, shipCol;
    if(currentUpdateUI.yourPlayerIndex==0) {
      shipRow = state.myShip.row;
      shipCol = state.myShip.col;
    }
    else {
      shipRow = state.yourShip.row;
      shipCol = state.yourShip.col;
    }

    if(state.move == false || (row == shipRow && col == shipCol) || state.myBoard[row][col]=='M')  //enemy is shot!!
      return false;

    return true;
  }


  export function distance(row:number, col:number): number {
    let shipRow, shipCol;
    if(currentUpdateUI.turnIndex==0) {
      shipRow = state.myShip.row;
      shipCol = state.myShip.col;
    }
    else {
      shipRow = state.yourShip.row;
      shipCol = state.yourShip.col;
    }
      //console.log("row: ",row, "col: ",col, " distance: ", Math.sqrt(Math.pow(Math.abs(shipRow-row),2) + Math.pow(Math.abs(shipCol-col),2)));
      return Math.sqrt(Math.pow(Math.abs(shipRow-row),2) + Math.pow(Math.abs(shipCol-col),2));
  }

  export function previousShot(row:number, col:number): boolean {
    if(state.buffer!=null && state.buffer.row == row && state.buffer.col == col)
      return true;
    return false;
  }

  export function shouldShowImage(row: number, col: number): boolean {
    //console.log("state: ",state);
    if(state.myBoard[row][col]=='X') return true;
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


  export let mouseRow:number = -1;
  export let mouseCol:number = -1;

  export function crossHover(row: number,col: number,mouseRow: number,mouseCol: number): boolean {
    if(weapons[0]==false)
      return false;
    let shipRow, shipCol;
    if(currentUpdateUI.turnIndex==0) {
      shipRow = state.myShip.row;
      shipCol = state.myShip.col;
    }
    else {
      shipRow = state.yourShip.row;
      shipCol = state.yourShip.col;
    }
    if(row == shipRow && col == shipCol)
      return false;

    if( (mouseRow-1 == row && mouseCol == col) || (mouseRow == row && mouseCol-1 == col) || (mouseRow == row && mouseCol+1 == col) || (mouseRow+1 == row && mouseCol == col) || (mouseRow == row && mouseCol == col) )
      return true;
    return false;
  }

  export function radarHover(row: number,col: number,mouseRow: number,mouseCol: number): boolean {
    if(weapons[1]==false)
      return false;
    let shipRow, shipCol;
    if(currentUpdateUI.turnIndex==0) {
      shipRow = state.myShip.row;
      shipCol = state.myShip.col;
    }
    else {
      shipRow = state.yourShip.row;
      shipCol = state.yourShip.col;
    }
    if(row == shipRow && col == shipCol)
      return false;

    if( (mouseRow-1 == row && mouseCol == col) || (mouseRow == row && mouseCol-1 == col) || (mouseRow == row && mouseCol+1 == col) || (mouseRow+1 == row && mouseCol == col) || (mouseRow == row && mouseCol == col) )
      return true;
    return false;
  }

}

angular.module('myApp', ['gameServices'])
  .run(['$rootScope', '$timeout',
    function ($rootScope: angular.IScope, $timeout: angular.ITimeoutService) {
      $rootScope['game'] = game;
      game.init($rootScope, $timeout);
    }]);
