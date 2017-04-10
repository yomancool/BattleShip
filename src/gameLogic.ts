type Board = string[][];
interface BoardDelta {
  row: number;
  col: number;
}

type IProposalData = BoardDelta;

interface IState {
  myBoard: Board;
  delta: BoardDelta;
  start: number;
  myShip: BoardDelta;
  yourShip: BoardDelta;
  move: boolean;
  shot: boolean;
}

import gameService = gamingPlatform.gameService;
import alphaBetaService = gamingPlatform.alphaBetaService;
import translate = gamingPlatform.translate;
import resizeGameAreaService = gamingPlatform.resizeGameAreaService;
import log = gamingPlatform.log;
import dragAndDropService = gamingPlatform.dragAndDropService;

module gameLogic {
  export const ROWS = 10;
  export const COLS = 10;


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


  export function getInitialState(): IState {
    if(1) {
      let board: Board = [];
      for (let i = 0; i < ROWS; i++) {
        board[i] = [];
        for (let j = 0; j < COLS; j++) {
          board[i][j] = '';
        }
      }
      // random starting point
      let mine = Math.floor((Math.random() * 10));
      let your = Math.floor((Math.random() * 10));

      board[0][mine] = 'O';
      board[9][your] = 'O';
      
      return {myBoard: board, delta: null, start:1, myShip: {row:0,col:mine}, yourShip: {row:9,col:your}, move:false, shot:false};
    }  
}
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

  export function validMove(row: number, col: number): boolean {
    if(game.currentUpdateUI.yourPlayerIndex==0) {
      if(Math.abs((row+col) - (game.currentUpdateUI.state.myShip.col + game.currentUpdateUI.state.myShip.row)) > 2)
        return false;
    }
    else {
      Math.abs((row+col) - (game.currentUpdateUI.state.yourShip.col + game.currentUpdateUI.state.yourShip.row)) > 2
    }
    return true;
  }

  function getWinner(board: Board, state: IState): string {
    for (let i = 0; i < ROWS; i++)
      for (let j = 0; j < COLS; j++)
        if(board[i][j]=='X') {
          console.log("Game Ends ");
          if(i==state.myShip.row && j==state.myShip.col)
            return "1";
          else
            return "0";
        }
    return '';
  }
  
  export function moveState(stateBeforeMove: IState, turnIndexBeforeMove:number,row:number, col:number): IState {
    let myP: BoardDelta;
    let yourP: BoardDelta;
    let originRow;
    let originCol;
    let board = stateBeforeMove.myBoard;
    if(turnIndexBeforeMove==0) {  //I move
          originRow = stateBeforeMove.myShip.row;
          originCol = stateBeforeMove.myShip.col;

          board[originRow][originCol] = '';
          board[row][col] = 'O';
          
          myP = {row: row, col: col};
          yourP = {row: stateBeforeMove.yourShip.row, col: stateBeforeMove.yourShip.col};
        }
        else {
          originRow = stateBeforeMove.yourShip.row;
          originCol = stateBeforeMove.yourShip.col;

          board[originRow][originCol] = '';
          board[row][col] = 'O';

          myP = {row: stateBeforeMove.myShip.row, col: stateBeforeMove.myShip.col};
          yourP = {row: row, col: col};
        }
    return {myBoard: board, delta: null, start:1, myShip: myP, yourShip: yourP, move:true, shot:false}
  }

    export function shotState(stateBeforeMove: IState, turnIndexBeforeMove:number,row:number, col:number): IState {
    let originRow;
    let originCol;
    let board = stateBeforeMove.myBoard;
    
    let myP = {row: stateBeforeMove.myShip.row, col: stateBeforeMove.myShip.col};
    let yourP = {row: stateBeforeMove.yourShip.row, col: stateBeforeMove.yourShip.col};

    if(board[row][col]=='') {//miss 
      console.log("shot miss!!");
      board[row][col] = 'M';
    }
    else {  //hit
      console.log("shot hit!!");
      if(turnIndexBeforeMove==0) {  //I move
          originRow = stateBeforeMove.myShip.row;
          originCol = stateBeforeMove.myShip.col;
          if(row != originRow && col != originCol)
            if(board[row][col]=='O') {
              console.log("O -> X");
              board[row][col]='X';
            }
        }
        else {
          originRow = stateBeforeMove.yourShip.row;
          originCol = stateBeforeMove.yourShip.col;

          if(row != originRow && col != originCol)
            if(board[row][col]=='O') {
              console.log("O -> X");
              board[row][col]='X';
            }

          myP = {row: stateBeforeMove.myShip.row, col: stateBeforeMove.myShip.col};
          yourP = {row: originRow, col: originCol};
        }
    }
    
    return {myBoard: board, delta: null, start:1, myShip: myP, yourShip: yourP, move:false, shot:true}
  }

  export function createMove(
      stateBeforeMove: IState, row: number, col: number, turnIndexBeforeMove: number): IMove {

    
    if (!stateBeforeMove) {
      stateBeforeMove = getInitialState();
    }
    let myBoard: Board = stateBeforeMove.myBoard;

    if (getWinner(myBoard,stateBeforeMove) !== '') {
      throw new Error("Can only make a move if the game is not over!");
    }

    let endMatchScores: number[];
    let turnIndex: number;
    let stateAfterMove;

    if(!stateBeforeMove.move) {
      stateAfterMove = moveState(stateBeforeMove,turnIndexBeforeMove,row,col);
      turnIndex = turnIndexBeforeMove;
      endMatchScores = null;
    }
    else {
      stateAfterMove = shotState(stateBeforeMove,turnIndexBeforeMove,row,col);
      turnIndex = 1 - turnIndexBeforeMove;
      endMatchScores = null;
      console.log("state after shot:", stateAfterMove);
    }

    let myBoardAfterMove = stateAfterMove.myBoard;

    let winner = getWinner(myBoardAfterMove,stateAfterMove);
    if (winner !== '') {
      // Game over.
      turnIndex = -1;
      endMatchScores = winner === "0" ? [1, 0] : winner === "1" ? [0, 1] : [0, 0];
    } else {
      // Game continues. Now it's the opponent's turn (the turn switches from 0 to 1 and 1 to 0).
    }

    let delta: BoardDelta = {row: row, col: col};

    let state: IState = stateAfterMove;

    return {endMatchScores: endMatchScores, turnIndex: turnIndex, state: state};

  }

  export function createInitialMove(): IMove {
    return {endMatchScores: null, turnIndex: 0,
        state: getInitialState()};
  }

}
