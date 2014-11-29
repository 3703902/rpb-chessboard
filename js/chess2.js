/******************************************************************************
 *                                                                            *
 *    This file is part of RPB Chessboard, a Wordpress plugin.                *
 *    Copyright (C) 2013-2014  Yoann Le Montagner <yo35 -at- melix.net>       *
 *                                                                            *
 *    This program is free software: you can redistribute it and/or modify    *
 *    it under the terms of the GNU General Public License as published by    *
 *    the Free Software Foundation, either version 3 of the License, or       *
 *    (at your option) any later version.                                     *
 *                                                                            *
 *    This program is distributed in the hope that it will be useful,         *
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of          *
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the           *
 *    GNU General Public License for more details.                            *
 *                                                                            *
 *    You should have received a copy of the GNU General Public License       *
 *    along with this program.  If not, see <http://www.gnu.org/licenses/>.   *
 *                                                                            *
 ******************************************************************************/


var Chess2 = {};


/**
 * Basic chess tools. TODO
 *
 * @namespace Chess2
 */
(function(myself)
{
	'use strict';


	// ---------------------------------------------------------------------------
	// Internationalization
	// ---------------------------------------------------------------------------

	myself.i18n = {};

	// Ordinal integers (from 1 to 8).
	myself.i18n.ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];

	// FEN parsing error messages
	myself.i18n.WRONG_NUMBER_OF_FEN_FIELDS                = 'A FEN string must contain exactly 6 space-separated fields.';
	myself.i18n.WRONG_NUMBER_OF_SUBFIELDS_IN_BOARD_FIELD  = 'The 1st field of a FEN string must contain exactly 8 `/`-separated subfields.';
	myself.i18n.UNEXPECTED_CHARACTER_IN_BOARD_FIELD       = 'Unexpected character in the 1st field of the FEN string: `{1}`.';
	myself.i18n.UNEXPECTED_END_OF_SUBFIELD_IN_BOARD_FIELD = 'The {1} subfield of the FEN string 1st field is unexpectedly short.';
	myself.i18n.INVALID_TURN_FIELD                        = 'The 2nd field of a FEN string must be either `w` or `b`.';
	myself.i18n.INVALID_CASTLE_RIGHTS_FIELD               = 'The 3rd field of a FEN string must be either `-` or a list of characters among `K`, `Q`, `k` and `q` (in this order).';
	myself.i18n.INVALID_EN_PASSANT_FIELD                  = 'The 4th field of a FEN string must be either `-` or a square from the 3rd or 6th row where en-passant is allowed.';
	myself.i18n.WRONG_ROW_IN_EN_PASSANT_FIELD             = 'The row number indicated in the FEN string 4th field is inconsistent with respect to the 2nd field.';
	myself.i18n.INVALID_MOVE_COUNTING_FIELD               = 'The {1} field of a FEN string must be a number.';



	// ---------------------------------------------------------------------------
	// Exceptions
	// ---------------------------------------------------------------------------

	myself.exceptions = {};


	/**
	 * @constructor
	 * @alias IllegalArgument
	 * @memberof Chess2
	 *
	 * @classdesc
	 * Exception thrown when an invalid argument is passed to a function.
	 *
	 * @param {string} fun
	 */
	myself.exceptions.IllegalArgument = function(fun) {
		this.fun = fun;
	};


	/**
	 * @constructor
	 * @alias InvalidFEN
	 * @memberof Chess2
	 *
	 * @classdesc
	 * Exception thrown by the FEN parsing function.
	 *
	 * @param {string} fen String whose parsing leads to an error.
	 * @param {string} message Human-readable error message.
	 * @param ...
	 */
	myself.exceptions.InvalidFEN = function(fen, message) {
		this.fen     = fen    ;
		this.message = message;
		for(var i=2; i<arguments.length; ++i) {
			var re = new RegExp('\\{' + (i-1) + '\\}');
			this.message = this.message.replace(re, arguments[i]);
		}
	};



	// ---------------------------------------------------------------------------
	// Internal constants
	// ---------------------------------------------------------------------------

	// Colors
	var /* const */ WHITE = 0;
	var /* const */ BLACK = 1;

	// Special square values
	var /* const */ EMPTY   = -1;
	var /* const */ INVALID = -2;

	// Pieces
	var /* const */ KING   = 0;
	var /* const */ QUEEN  = 1;
	var /* const */ ROOK   = 2;
	var /* const */ BISHOP = 3;
	var /* const */ KNIGHT = 4;
	var /* const */ PAWN   = 5;

	// Colored pieces
	var /* const */ WK =  0; var /* const */ BK =  1;
	var /* const */ WQ =  2; var /* const */ BQ =  3;
	var /* const */ WR =  4; var /* const */ BR =  5;
	var /* const */ WB =  6; var /* const */ BB =  7;
	var /* const */ WN =  8; var /* const */ BN =  9;
	var /* const */ WP = 10; var /* const */ BP = 11;

	// String conversion
	var /* const */ COLORED_PIECE_SYMBOL = 'KkQqRrBbNnPp';
	var /* const */ PIECE_SYMBOL         = 'kqrbnp';
	var /* const */ COLOR_SYMBOL         = 'wb';
	var /* const */ ROW_SYMBOL           = '12345678';
	var /* const */ COLUMN_SYMBOL        = 'abcdefgh';



	// ---------------------------------------------------------------------------
	// Constructor & string conversion methods
	// ---------------------------------------------------------------------------

	/**
	 * @constructor
	 * @alias Position
	 * @memberof Chess2
	 *
	 * @classdesc
	 * Represent a chess position, i.e. the state of a 64-square chessboard with a few additional
	 * information (who is about to play, castling rights, en-passant rights).
	 *
	 * @param {string} [fen = 'start'] Either `'start'`, `'empty'`, or a FEN string representing chess position.
	 * @throws InvalidFEN If the input parameter is neither a correctly formatted FEN string nor `'start'` or `'empty'`.
	 */
	myself.Position = function(fen) {
		if(typeof fen === 'undefined' || fen === null || fen === 'start') {
			this.reset();
		}
		else if(fen === 'empty') {
			this.clear();
		}
		else {
			this._setFEN(fen, false);
		}
	};


	/**
	 * Set the position to the empty state.
	 */
	myself.Position.prototype.clear = function()
	{
		// Board state
		this._board = [
			INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID,
			INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID,
			INVALID, EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , INVALID,
			INVALID, EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , INVALID,
			INVALID, EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , INVALID,
			INVALID, EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , INVALID,
			INVALID, EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , INVALID,
			INVALID, EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , INVALID,
			INVALID, EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , INVALID,
			INVALID, EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , INVALID,
			INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID,
			INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID
		];

		// Meta-data
		this._turn         = WHITE;
		this._castleRights = [0, 0];
		this._enPassant    = -1;

		// Computed attributes
		this._legal = false;
		this._king  = [-1, -1];
	};


	/**
	 * Set the position to the starting state.
	 */
	myself.Position.prototype.reset = function()
	{
		// Board state
		this._board = [
			INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID,
			INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID,
			INVALID, WR     , WN     , WB     , WQ     , WK     , WB     , WN     , WR     , INVALID,
			INVALID, WP     , WP     , WP     , WP     , WP     , WP     , WP     , WP     , INVALID,
			INVALID, EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , INVALID,
			INVALID, EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , INVALID,
			INVALID, EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , INVALID,
			INVALID, EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , EMPTY  , INVALID,
			INVALID, BP     , BP     , BP     , BP     , BP     , BP     , BP     , BP     , INVALID,
			INVALID, BR     , BN     , BB     , BQ     , BK     , BB     , BN     , BR     , INVALID,
			INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID,
			INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID
		];

		// Meta-data
		this._turn         = WHITE;
		this._castleRights = [129 /* (1 << 'column a') | (1 << 'column h') */, 129];
		this._enPassant    = -1;

		// Computed attributes
		this._legal = true;
		this._king  = [25 /* e1 */, 95 /* e8 */];
	};


	/**
	 * Return a human-readable string representing the position. This string is multi-line,
	 * and is intended to be displayed in a fixed-width font (similarly to an ASCII-art picture).
	 *
	 * @returns {string} Human-readable representation of the position.
	 */
	myself.Position.prototype.ascii = function()
	{
		// Board scanning
		var res = '+---+---+---+---+---+---+---+---+\n';
		for(var r=7; r>=0; --r) {
			for(var c=0; c<8; ++c) {
				var cp = this._board[21 + 10*r + c];
				res += '| ' + (cp < 0 ? ' ' : COLORED_PIECE_SYMBOL[cp]) + ' ';
			}
			res += '|\n';
			res += '+---+---+---+---+---+---+---+---+\n';
		}

		// Meta-data
		res += COLOR_SYMBOL[this._turn] + ' ';
		res += castleRightsToString(this._castleRights) + ' ';
		res += this._enPassant < 0 ? '-' : COLUMN_SYMBOL[this._enPassant];

		// Return the result
		return res;
	};


	/**
	 * `fen()` or `fen({fiftyMoveClock:number, fullMoveNumber:number})`: return the FEN representation of the position (getter behavior).
	 *
	 * `fen(string [, boolean])`: parse the given FEN string and set the position accordingly (setter behavior).
	 */
	myself.Position.prototype.fen = function()
	{
		if(arguments.length === 0) {
			return this._getFEN(0, 1);
		}
		else if(arguments.length === 1 && typeof arguments[0] === 'object') {
			var fiftyMoveClock = (typeof arguments[0].fiftyMoveClock === 'number') ? arguments[0].fiftyMoveClock : 0;
			var fullMoveNumber = (typeof arguments[0].fullMoveNumber === 'number') ? arguments[0].fullMoveNumber : 1;
			return this._getFEN(fiftyMoveClock, fullMoveNumber);
		}
		else if(arguments.length === 1 && typeof arguments[0] === 'string') {
			return this._setFEN(arguments[0], false);
		}
		else if(arguments.length >= 2 && typeof arguments[0] === 'string' && typeof arguments[1] === 'boolean') {
			return this._setFEN(arguments[0], arguments[1]);
		}
		else {
			throw new myself.exceptions.IllegalArgument('Position#fen()');
		}
	};


	/**
	 * Return the FEN representation of the position.
	 *
	 * @returns {string}
	 */
	myself.Position.prototype._getFEN = function(fiftyMoveClock, fullMoveNumber)
	{
		var res = '';

		// Board scanning
		for(var r=7; r>=0; --r) {
			if(r !== 7) {
				res += '/';
			}
			var emptySquareCounter = 0;
			for(var c=0; c<8; ++c) {
				var cp = this._board[21 + 10*r + c];
				if(cp < 0) {
					++emptySquareCounter;
				}
				else {
					if(emptySquareCounter > 0) {
						res += emptySquareCounter;
						emptySquareCounter = 0;
					}
					res += COLORED_PIECE_SYMBOL[cp];
				}
			}
			if(emptySquareCounter > 0) {
				res += emptySquareCounter;
			}
		}

		// Meta-data
		res += ' ' + COLOR_SYMBOL[this._turn] + ' ' + castleRightsToString(this._castleRights) + ' ';
		if(this._enPassant < 0) {
			res += '-';
		}
		else {
			res += COLUMN_SYMBOL[this._enPassant] + (this._turn===WHITE ? '6' : '3');
		}

		// Additional move counting flags
		res += ' ' + fiftyMoveClock + ' ' + fullMoveNumber;

		// Return the result
		return res;
	};


	/**
	 * Try to parse a FEN string, and set the position accordingly if parsing is successful.
	 *
	 * @param {string} fen
	 * @param {boolean} strict
	 * @returns {{fiftyMoveClock:number, fullMoveNumber:number}}
	 * @throws InvalidFEN
	 */
	myself.Position.prototype._setFEN = function(fen, strict)
	{
		// Trim the input string and split it into 6 fields.
		fen = fen.replace(/^\s+|\s+$/g, '');
		var fields = fen.split(/\s+/);
		if(fields.length !== 6) {
			throw new myself.exceptions.InvalidFEN(fen, myself.i18n.WRONG_NUMBER_OF_FEN_FIELDS);
		}

		// The first field (that represents the board) is split in 8 sub-fields.
		var rowFields = fields[0].split('/');
		if(rowFields.length !== 8) {
			throw new myself.exceptions.InvalidFEN(fen, myself.i18n.WRONG_NUMBER_OF_SUBFIELDS_IN_BOARD_FIELD);
		}

		// Initialize the position
		this.clear();
		this._legal = null;

		// Board parsing
		for(var r=7; r>=0; --r) {
			var rowField = rowFields[7-r];
			var i = 0;
			var c = 0;
			while(i<rowField.length && c<8) {
				var s = rowField[i];
				var cp = COLORED_PIECE_SYMBOL.indexOf(s);

				// The current character is in the range [1-8] -> skip the corresponding number of squares.
				if(/^[1-8]$/.test(s)) {
					c += parseInt(s, 10);
				}

				// The current character corresponds to a colored piece symbol -> set the current square accordingly.
				else if(cp >= 0) {
					this._board[21 + 10*r + c] = cp;
					++c;
				}

				// Otherwise -> parsing error.
				else {
					throw new myself.exceptions.InvalidFEN(fen, myself.i18n.UNEXPECTED_CHARACTER_IN_BOARD_FIELD, s);
				}

				// Increment the character counter.
				++i;
			}

			// Ensure that the current sub-field deals with all the squares of the current row.
			if(i !== rowField.length || c !== 8) {
				throw new myself.exceptions.InvalidFEN(fen, myself.i18n.UNEXPECTED_END_OF_SUBFIELD_IN_BOARD_FIELD, myself.i18n.ORDINALS[7-r]);
			}
		}

		// Turn parsing
		this._turn = COLOR_SYMBOL.indexOf(fields[1]);
		if(this._turn < 0) {
			throw new myself.exceptions.InvalidFEN(fen, myself.i18n.INVALID_TURN_FIELD);
		}

		// Castle-rights parsing
		this._castleRights = castleRightsFromString(fields[2], strict);
		if(this._castleRights === null) {
			throw new myself.exceptions.InvalidFEN(fen, myself.i18n.INVALID_CASTLE_RIGHTS_FIELD);
		}

		// En-passant parsing
		var enPassantField = fields[3];
		if(enPassantField !== '-') {
			if(!/^[a-h][36]$/.test(enPassantField)) {
				throw new myself.exceptions.InvalidFEN(fen, myself.i18n.INVALID_EN_PASSANT_FIELD);
			}
			if(strict && ((enPassantField[1]==='3' && this._turn===WHITE) || (enPassantField[1]==='6' && this._turn===BLACK))) {
				throw new myself.exceptions.InvalidFEN(fen, myself.i18n.WRONG_ROW_IN_EN_PASSANT_FIELD);
			}
			this._enPassant = COLUMN_SYMBOL.indexOf(enPassantField[0]);
		}

		// Move counting flags parsing
		var moveCountingRegExp = strict ? /^(?:0|[1-9][0-9]*)$/ : /^[0-9]+$/;
		if(!moveCountingRegExp.test(fields[4])) {
			throw new myself.exceptions.InvalidFEN(fen, myself.i18n.INVALID_MOVE_COUNTING_FIELD, myself.i18n.ORDINALS[4]);
		}
		if(!moveCountingRegExp.test(fields[5])) {
			throw new myself.exceptions.InvalidFEN(fen, myself.i18n.INVALID_MOVE_COUNTING_FIELD, myself.i18n.ORDINALS[5]);
		}
		return { fiftyMoveClock: parseInt(fields[4], 10), fullMoveNumber: parseInt(fields[5], 10) };
	};


	/**
	 * Return a FEN-compatible representation of the castle rights. TODO: make it chess-960 compatible.
	 *
	 * @param {array} castleRights
	 * @returns {string}
	 */
	function castleRightsToString(castleRights) {
		var res = '';
		/* jshint bitwise: false */
		if(castleRights[WHITE] & 1<<7) { res += 'K'; }
		if(castleRights[WHITE] & 1<<0) { res += 'Q'; }
		if(castleRights[BLACK] & 1<<7) { res += 'k'; }
		if(castleRights[BLACK] & 1<<0) { res += 'q'; }
		return res === '' ? '-' : res;
	}


	/**
	 * Parsing function for the FEN-representation of the castle rights. TODO: make it chess-960 compatible.
	 *
	 * @param {string} castleRights
	 * @param {boolean} strict
	 * @return {array} `null` if the parsing fails.
	 */
	function castleRightsFromString(castleRights, strict) {
		var res = [0, 0];
		if(castleRights === '-') {
			return res;
		}
		if(!(strict ? /^K?Q?k?q?$/ : /^[KQkq]*$/).test(castleRights)) {
			return null;
		}
		/* jshint bitwise: false */
		if(castleRights.indexOf('K') >= 0) { res[WHITE] |= 1<<7; }
		if(castleRights.indexOf('Q') >= 0) { res[WHITE] |= 1<<0; }
		if(castleRights.indexOf('k') >= 0) { res[BLACK] |= 1<<7; }
		if(castleRights.indexOf('q') >= 0) { res[BLACK] |= 1<<0; }
		return res;
	}



	// ---------------------------------------------------------------------------
	// Getters/setters
	// ---------------------------------------------------------------------------


	/**
	 * Get/set the content of a square.
	 *
	 * @param {string} square `'e4'` for instance
	 * @param {string|{type:string, color:string}} [value]
	 */
	myself.Position.prototype.square = function(square, value) {
		if(typeof square !== 'string' || !/^[a-h][1-8]$/.test(square)) {
			throw new myself.exceptions.IllegalArgument('Position#square()');
		}
		var column = COLUMN_SYMBOL.indexOf(square[0]);
		var row    = ROW_SYMBOL   .indexOf(square[1]);
		if(typeof value === 'undefined' || value === null) {
			return getSquare(this, row, column);
		}
		else {
			if(!setSquare(this, row, column, value)) {
				throw new myself.exceptions.IllegalArgument('Position#square()');
			}
		}
	};


	/**
	 * Return the content of the given square.
	 *
	 * @param {number} row
	 * @param {number} column
	 * @returns {string|{piece:string, color:string}} `'-'` is returned if the square is empty.
	 */
	function getSquare(position, row, column) {
		var cp = position._board[21 + 10*row + column];
		return cp < 0 ? '-' : { piece: PIECE_SYMBOL[Math.floor(cp/2)], color: COLOR_SYMBOL[cp%2] };
	}


	/**
	 * Set the content of the given square.
	 *
	 * @param {number} row
	 * @param {number} column
	 * @param {string|{piece:string, color:string}} value
	 */
	function setSquare(position, row, column, value) {
		var index = 21 + 10*row + column;
		if(value === '-') {
			position._board[index] = EMPTY;
			position._legal = null;
			return true;
		}
		else if(typeof value === 'object' && typeof value.piece === 'string' && typeof value.color === 'string') {
			var piece = PIECE_SYMBOL.indexOf(value.piece);
			var color = COLOR_SYMBOL.indexOf(value.color);
			if(piece >= 0 && color >= 0) {
				position._board[index] = piece*2 + color;
				position._legal = null;
				return true;
			}
		}
		return false;
	}


	/**
	 * Get/set the turn flag.
	 *
	 * @param {string} [value]
	 */
	myself.Position.prototype.turn = function(value) {
		if(typeof value === 'undefined' || value === null) {
			return getTurn(this);
		}
		else {
			if(!setTurn(this, value)) {
				throw new myself.exceptions.IllegalArgument('Position#turn()');
			}
		}
	};


	/**
	 * Return the turn flag.
	 *
	 * @returns {string} `'w'` or `'b'`
	 */
	function getTurn(position) {
		return COLOR_SYMBOL[position._turn];
	}


	/**
	 * Set the turn flag.
	 *
	 * @param {string} value `'w'` or `'b'`
	 */
	function setTurn(position, value) {
		if(typeof value === 'string') {
			var turn = COLOR_SYMBOL.indexOf(value);
			if(turn >= 0) {
				position._turn = turn;
				position._legal = null;
				return true;
			}
		}
		return false;
	}


	/**
	 * Get/set the castle rights. TODO: make it chess-960 compatible.
	 *
	 * @param {string} color
	 * @param {string} side
	 * @param {boolean} [value]
	 */
	myself.Position.prototype.castleRights = function(color, side, value) {
		if(typeof color !== 'string' || !(side==='k' || side==='q')) {
			throw new myself.exceptions.IllegalArgument('Position#castleRights()');
		}
		color = COLOR_SYMBOL.indexOf(color);
		if(color < 0) {
			throw new myself.exceptions.IllegalArgument('Position#castleRights()');
		}
		var column = side==='k' ? 0 : 7;
		if(typeof value === 'undefined' || value === null) {
			return getCastleRights(this, color, column);
		}
		else {
			if(!setCastleRights(this, color, column, value)) {
				throw new myself.exceptions.IllegalArgument('Position#castleRights()');
			}
		}
	};


	/**
	 * Return the castle rights for the given color and column.
	 *
	 * @param {number} color
	 * @param {number} column
	 * @returns {boolean}
	 */
	function getCastleRights(position, color, column) {
		/* jshint bitwise: false */
		return (position._castleRights[color] & (1 << column)) !== 0;
	}


	/**
	 * Set the castle rights for the given color and column.
	 *
	 * @param {number} color
	 * @param {number} column
	 * @param {boolean} value
	 */
	function setCastleRights(position, color, column, value) {
		if(typeof value === 'boolean') {
			/* jshint bitwise: false */
			if(value) {
				position._castleRights[color] |= 1 << column;
			}
			else {
				position._castleRights[color] &= ~(1 << column);
			}
			position._legal = null;
			return true;
		}
		return false;
	}


	/**
	 * Get/set the en-passant flag.
	 *
	 * @param {string} [value]
	 */
	myself.Position.prototype.enPassant = function(value) {
		if(typeof value === 'undefined' || value === null) {
			return getEnPassant(this);
		}
		else {
			if(!setEnPassant(this, value)) {
				throw new myself.exceptions.IllegalArgument('Position#enPassant()');
			}
		}
	};


	/**
	 * Return the en-passant flag.
	 *
	 * @returns {string} `'-'`, `'a'`, `'b'`, ... or `'h'`
	 */
	function getEnPassant(position) {
		return position._enPassant < 0 ? '-' : COLUMN_SYMBOL[position._enPassant];
	}


	/**
	 * Set the en-passant flag.
	 *
	 * @param {string} value
	 */
	function setEnPassant(position, value) {
		if(value === '-') {
			position._enPassant = -1;
			position._legal = null;
			return true;
		}
		else if(typeof value === 'string') {
			var enPassant = COLUMN_SYMBOL.indexOf(value);
			if(enPassant >= 0) {
				position._enPassant = enPassant;
				position._legal = null;
				return true;
			}
		}
		return false;
	}




})(Chess2);
