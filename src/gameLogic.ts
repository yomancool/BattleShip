
type Board = string[][];
type missile = boolean[];
type Radar = boolean[];
interface BoardDelta {
  row: number;
  col: number;
}
interface bufferArray {
    row: number[];
    col: number[];
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
  buffer: bufferArray;
  missile: missile;
  radar: Radar;
}

import gameService = gamingPlatform.gameService;
import alphaBetaService = gamingPlatform.alphaBetaService;
import translate = gamingPlatform.translate;
import resizeGameAreaService = gamingPlatform.resizeGameAreaService;
import log = gamingPlatform.log;
import dragAndDropService = gamingPlatform.dragAndDropService;

module gameLogic {
  export const ROWS = 8;
  export const COLS = 8;

  export function getInitialState(): IState {
    if(1) {
      let board: Board = [];
      let missile: missile = [];
      let radar: Radar = [];
        
      //initialize buffer
      let bufferrow = [];
      let buffercol = [];
      for(let i=0; i<5; i++) {
          bufferrow[i] = -1;
          buffercol[i] = -1;
      }

      for (let i = 0; i < ROWS; i++) {
        board[i] = [];
        for (let j = 0; j < COLS; j++) {
          board[i][j] = '';
        }
      }
      //initial missile
      missile[0] = false;
      missile[1] = false;
      radar[0] = false;
      radar[1] = false;
        
      // random starting point
      let mine = Math.floor((Math.random() * ROWS));
      let your = Math.floor((Math.random() * COLS));

      board[0][mine] = 'O';
      board[ROWS-1][your] = 'O';
      
      return {myBoard: board, delta: null, start:1, myShip: {row:0,col:mine}, yourShip: {row:ROWS-1,col:your}, move:false, shot:false, buffer:{row:bufferrow,col:buffercol}, missile:missile, radar:radar};
    }  
}


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
    let buffer = stateBeforeMove.buffer;
    let board = stateBeforeMove.myBoard;
    let missile = stateBeforeMove.missile;
    let radar = stateBeforeMove.radar;
    for(let i=0; i<5; i++) {
        buffer.row[i] = -1;
        buffer.col[i] = -1;
    }
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
    return {myBoard: board, delta: null, start:1, myShip: myP, yourShip: yourP, move:true, shot:false, buffer:buffer, missile:missile, radar:radar}
  }

    export function crossmissile(buffer:bufferArray, board:Board, row:number, col:number, turnIndex:number, state:IState) {
      let shipRow, shipCol, count=0, bufferrow = [], buffercol = [];
      if(turnIndex==0) {
        shipRow = state.myShip.row;
        shipCol = state.myShip.col;
      }
      else {
        shipRow = state.yourShip.row;
        shipCol = state.yourShip.col;
      }

      for(let i=-1; i<=1; i++) {
        for(let j=-1; j<=1; j++) {
          if((0 <= row+i) && (row+i < ROWS) && (0 <= col+j) && (col+j < COLS)) {
              
            if( (i==-1 && j==-1) || (i==-1 && j==1) || (i==1 && j==-1) || (i==1 && j==1)) 
                continue;
              
              if(board[row+i][col+j] == 'O' && (row+i!=shipRow && col+j!=shipCol)) {
                board[row+i][col+j] = 'X';
                bufferrow[count] = row+i;
                buffercol[count] = col+j;
                count++;
              }
              else if(board[row+i][col+j] == '') {
                board[row+i][col+j] = 'M';
                bufferrow[count] = row+i;
                buffercol[count] = col+j;
                count++;
              }
              else if(board[row+i][col+j] == 'X') {
                board[row+i][col+j] = 'X';
                bufferrow[count] = row+i;
                buffercol[count] = col+j;
                count++;
              }
            }
          }
        }
        
      for(let i=count; i<5; i++) {
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

    export function detect(board:Board, row:number, col:number, turnIndex:number, state:IState):Board {
      let shipRow, shipCol;
      if(turnIndex==0) {
        shipRow = state.myShip.row;
        shipCol = state.myShip.col;
      }
      else {
        shipRow = state.yourShip.row;
        shipCol = state.yourShip.col;
      }

      for(let i=-1; i<=1; i++) {
        for(let j=-1; j<=1; j++) {
          if((0 <= row+i) && (row+i < ROWS) && (0 <= col+j) && (col+j < COLS)) { 
            if(board[row+i][col+j] == 'O' && (row+i!=shipRow && col+j!=shipCol)) {
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

    export function shotState(stateBeforeMove: IState, turnIndexBeforeMove:number,row:number, col:number, weapons:boolean[]): IState {
    let originRow;
    let originCol;
    let buffer = stateBeforeMove.buffer;
    let board = stateBeforeMove.myBoard;
    let missile = stateBeforeMove.missile;
    let radar = stateBeforeMove.radar;
    let myP = {row: stateBeforeMove.myShip.row, col: stateBeforeMove.myShip.col};
    let yourP = {row: stateBeforeMove.yourShip.row, col: stateBeforeMove.yourShip.col};
    if(weapons[0] == true) {
      let tmp = crossmissile(buffer,board,row,col,turnIndexBeforeMove, stateBeforeMove);
      board = tmp.board;
      buffer = tmp.buffer;
      missile[turnIndexBeforeMove] = true;
    }
    else if(weapons[1] == true) {
      board = detect(board,row,col,turnIndexBeforeMove, stateBeforeMove);
      radar[turnIndexBeforeMove] = true;
    }
    else {
      buffer.row[0] = row;
      buffer.col[0] = col;
      for(let i=1; i<5; i++) {
        buffer.row[i] = -1;
        buffer.col[i] = -1;
      }
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
    }
    
    return {myBoard: board, delta: null, start:1, myShip: myP, yourShip: yourP, move:false, shot:true, buffer:buffer, missile:missile, radar:radar}
  }

  export function createMove(
      stateBeforeMove: IState, row: number, col: number, turnIndexBeforeMove: number, weapons: boolean[]): IMove {

    
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
      stateAfterMove = shotState(stateBeforeMove,turnIndexBeforeMove,row,col,weapons);
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
