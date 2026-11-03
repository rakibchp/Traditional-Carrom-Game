export const BOARD_SIZE = 800;
export const PIECE_RADIUS = 14;
export const STRIKER_RADIUS = 21;
export const SCORE_TO_WIN = 9;

export type PieceColor = "ivory" | "charcoal" | "queen";
export type PlayerIndex = 0 | 1;
export type GamePhase = "ready" | "moving" | "finished";

export interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  pocketed: boolean;
}

export interface Piece extends Body {
  id: number;
  color: PieceColor;
}

export interface GameState {
  pieces: Piece[];
  striker: Body;
  scores: [number, number];
  currentPlayer: PlayerIndex;
  phase: GamePhase;
  winner: PlayerIndex | "draw" | null;
  ownPiecesPocketed: number;
  opposingPiecesPocketed: number;
  queenPocketed: boolean;
  strikerPocketed: boolean;
  shotElapsed: number;
}

export interface ShotResult {
  shooter: PlayerIndex;
  nextPlayer: PlayerIndex;
  foul: boolean;
  ownPiecesPocketed: number;
  opposingPiecesPocketed: number;
  queenPocketed: boolean;
  winner: PlayerIndex | "draw" | null;
}

const PIECE_START_RADIUS = 30;
const PIECE_OUTER_RADIUS = 66;
const INNER_PIECE_COUNT = 6;
const OUTER_PIECE_COUNT = 12;
const RAIL_MIN = 113;
const RAIL_MAX = BOARD_SIZE - RAIL_MIN;
const POCKET_RADIUS = 41;
const POCKETS = [
  { x: 108, y: 108 },
  { x: BOARD_SIZE - 108, y: 108 },
  { x: 108, y: BOARD_SIZE - 108 },
  { x: BOARD_SIZE - 108, y: BOARD_SIZE - 108 },
];

function makePiece(
  id: number,
  color: PieceColor,
  x: number,
  y: number,
): Piece {
  return {
    id,
    color,
    x,
    y,
    vx: 0,
    vy: 0,
    radius: PIECE_RADIUS,
    pocketed: false,
  };
}

export function strikerLine(player: PlayerIndex): number {
  return player === 0 ? 640 : 160;
}

export function createInitialGame(): GameState {
  const pieces: Piece[] = [makePiece(0, "queen", 400, 400)];
  let id = 1;

  for (let index = 0; index < INNER_PIECE_COUNT; index += 1) {
    const angle = (index / INNER_PIECE_COUNT) * Math.PI * 2;
    pieces.push(
      makePiece(
        id++,
        index % 2 === 0 ? "ivory" : "charcoal",
        400 + Math.cos(angle) * PIECE_START_RADIUS,
        400 + Math.sin(angle) * PIECE_START_RADIUS,
      ),
    );
  }

  for (let index = 0; index < OUTER_PIECE_COUNT; index += 1) {
    const angle = (index / OUTER_PIECE_COUNT) * Math.PI * 2 + Math.PI / 12;
    pieces.push(
      makePiece(
        id++,
        index % 2 === 0 ? "charcoal" : "ivory",
        400 + Math.cos(angle) * PIECE_OUTER_RADIUS,
        400 + Math.sin(angle) * PIECE_OUTER_RADIUS,
      ),
    );
  }

  return {
    pieces,
    striker: {
      x: 400,
      y: strikerLine(0),
      vx: 0,
      vy: 0,
      radius: STRIKER_RADIUS,
      pocketed: false,
    },
    scores: [0, 0],
    currentPlayer: 0,
    phase: "ready",
    winner: null,
    ownPiecesPocketed: 0,
    opposingPiecesPocketed: 0,
    queenPocketed: false,
    strikerPocketed: false,
    shotElapsed: 0,
  };
}

function isPocketed(body: Body): boolean {
  return POCKETS.some(
    (pocket) =>
      Math.hypot(body.x - pocket.x, body.y - pocket.y) <= POCKET_RADIUS,
  );
}

function moveBody(body: Body, seconds: number): void {
  body.x += body.vx * seconds;
  body.y += body.vy * seconds;

  if (body.x - body.radius < RAIL_MIN) {
    body.x = RAIL_MIN + body.radius;
    body.vx = Math.abs(body.vx) * 0.82;
  } else if (body.x + body.radius > RAIL_MAX) {
    body.x = RAIL_MAX - body.radius;
    body.vx = -Math.abs(body.vx) * 0.82;
  }

  if (body.y - body.radius < RAIL_MIN) {
    body.y = RAIL_MIN + body.radius;
    body.vy = Math.abs(body.vy) * 0.82;
  } else if (body.y + body.radius > RAIL_MAX) {
    body.y = RAIL_MAX - body.radius;
    body.vy = -Math.abs(body.vy) * 0.82;
  }
}

function collide(first: Body, second: Body): void {
  const dx = second.x - first.x;
  const dy = second.y - first.y;
  const distance = Math.hypot(dx, dy);
  const minimumDistance = first.radius + second.radius;

  if (distance >= minimumDistance) return;

  const nx = distance > 0 ? dx / distance : 1;
  const ny = distance > 0 ? dy / distance : 0;
  const overlap = minimumDistance - distance;
  first.x -= nx * overlap * 0.5;
  first.y -= ny * overlap * 0.5;
  second.x += nx * overlap * 0.5;
  second.y += ny * overlap * 0.5;

  const relativeVelocity = (second.vx - first.vx) * nx + (second.vy - first.vy) * ny;
  if (relativeVelocity >= 0) return;

  const impulse = (-(1 + 0.94) * relativeVelocity) / 2;
  first.vx -= impulse * nx;
  first.vy -= impulse * ny;
  second.vx += impulse * nx;
  second.vy += impulse * ny;
}

function chooseWinner(scores: [number, number]): PlayerIndex | "draw" | null {
  if (scores[0] < SCORE_TO_WIN && scores[1] < SCORE_TO_WIN) return null;
  if (scores[0] === scores[1]) return "draw";
  return scores[0] > scores[1] ? 0 : 1;
}

function finishShot(game: GameState): ShotResult {
  const shooter = game.currentPlayer;
  const otherPlayer: PlayerIndex = shooter === 0 ? 1 : 0;
  const ownPiecesPocketed = game.ownPiecesPocketed;
  const opposingPiecesPocketed = game.opposingPiecesPocketed;

  if (game.strikerPocketed) game.scores[shooter] = Math.max(0, game.scores[shooter] - 1);
  game.scores[shooter] += ownPiecesPocketed;
  game.scores[otherPlayer] += opposingPiecesPocketed;
  if (game.queenPocketed) game.scores[shooter] += 3;

  const winner =
    chooseWinner(game.scores) ??
    (game.pieces.every((piece) => piece.pocketed)
      ? game.scores[0] === game.scores[1]
        ? "draw"
        : game.scores[0] > game.scores[1]
          ? 0
          : 1
      : null);
  const nextPlayer =
    game.strikerPocketed || ownPiecesPocketed === 0 ? otherPlayer : shooter;

  game.currentPlayer = nextPlayer;
  game.phase = winner === null ? "ready" : "finished";
  game.winner = winner;
  game.striker = {
    x: 400,
    y: strikerLine(nextPlayer),
    vx: 0,
    vy: 0,
    radius: STRIKER_RADIUS,
    pocketed: false,
  };

  return {
    shooter,
    nextPlayer,
    foul: game.strikerPocketed,
    ownPiecesPocketed,
    opposingPiecesPocketed,
    queenPocketed: game.queenPocketed,
    winner,
  };
}

export function advanceGame(game: GameState, deltaSeconds: number): ShotResult | null {
  if (game.phase !== "moving") return null;

  const frameTime = Math.min(deltaSeconds, 0.035);
  const steps = Math.max(1, Math.ceil(frameTime / 0.01));
  const stepTime = frameTime / steps;
  game.shotElapsed += frameTime;

  for (let step = 0; step < steps; step += 1) {
    const bodies = [...game.pieces.filter((piece) => !piece.pocketed), game.striker];
    for (const body of bodies) {
      if (body.pocketed) continue;
      moveBody(body, stepTime);

      if (isPocketed(body)) {
        body.pocketed = true;
        if (body === game.striker) {
          game.strikerPocketed = true;
        } else {
          const piece = game.pieces.find((candidate) => candidate === body);
          if (!piece) continue;
          if (piece.color === "queen") {
            game.queenPocketed = true;
          } else if (
            (game.currentPlayer === 0 && piece.color === "ivory") ||
            (game.currentPlayer === 1 && piece.color === "charcoal")
          ) {
            game.ownPiecesPocketed += 1;
          } else {
            game.opposingPiecesPocketed += 1;
          }
        }
      }
    }

    const activeBodies = [
      ...game.pieces.filter((piece) => !piece.pocketed),
      ...(game.striker.pocketed ? [] : [game.striker]),
    ];
    for (let first = 0; first < activeBodies.length; first += 1) {
      for (let second = first + 1; second < activeBodies.length; second += 1) {
        collide(activeBodies[first], activeBodies[second]);
      }
    }

    const friction = Math.pow(0.984, stepTime * 60);
    for (const body of activeBodies) {
      body.vx *= friction;
      body.vy *= friction;
      if (Math.hypot(body.vx, body.vy) < 7) {
        body.vx = 0;
        body.vy = 0;
      }
    }
  }

  const activeBodies = [
    ...game.pieces.filter((piece) => !piece.pocketed),
    ...(game.striker.pocketed ? [] : [game.striker]),
  ];
  const stillMoving = activeBodies.some(
    (body) => Math.hypot(body.vx, body.vy) >= 7,
  );
  if (stillMoving || game.shotElapsed < 0.18) return null;

  const result = finishShot(game);
  game.ownPiecesPocketed = 0;
  game.opposingPiecesPocketed = 0;
  game.queenPocketed = false;
  game.strikerPocketed = false;
  game.shotElapsed = 0;
  return result;
}
