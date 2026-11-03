"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  advanceGame,
  BOARD_SIZE,
  createInitialGame,
  GameState,
  Piece,
  PlayerIndex,
  ShotResult,
  strikerLine,
} from "../lib/carrom-physics";

interface GameView {
  scores: [number, number];
  currentPlayer: PlayerIndex;
  phase: GameState["phase"];
  winner: GameState["winner"];
  remaining: [number, number];
}

interface AimDrag {
  pointerId: number;
  startX: number;
  startY: number;
  pullX: number;
  pullY: number;
}

const PLAYER_NAMES = ["Player one", "Player two"] as const;
const PLAYER_COLORS = ["ivory", "charcoal"] as const;

function createView(game: GameState): GameView {
  return {
    scores: [...game.scores],
    currentPlayer: game.currentPlayer,
    phase: game.phase,
    winner: game.winner,
    remaining: [
      game.pieces.filter((piece) => piece.color === "ivory" && !piece.pocketed)
        .length,
      game.pieces.filter(
        (piece) => piece.color === "charcoal" && !piece.pocketed,
      ).length,
    ],
  };
}

function drawCircle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  fill: string,
  stroke?: string,
  lineWidth = 1,
): void {
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fillStyle = fill;
  context.fill();
  if (stroke) {
    context.lineWidth = lineWidth;
    context.strokeStyle = stroke;
    context.stroke();
  }
}

function drawPiece(context: CanvasRenderingContext2D, piece: Piece): void {
  if (piece.pocketed) return;

  const isQueen = piece.color === "queen";
  const isIvory = piece.color === "ivory";
  const fill = isQueen
    ? "#bd604b"
    : isIvory
      ? "#f5e9d1"
      : "#26312e";
  const edge = isQueen ? "#833c31" : isIvory ? "#cbbb99" : "#121a18";

  context.save();
  context.shadowColor = "rgba(35, 29, 21, .3)";
  context.shadowBlur = 7;
  context.shadowOffsetY = 3;
  drawCircle(context, piece.x, piece.y, piece.radius, fill, edge, 2);
  context.shadowColor = "transparent";
  drawCircle(
    context,
    piece.x,
    piece.y,
    piece.radius * 0.64,
    "transparent",
    isQueen ? "rgba(255, 230, 202, .72)" : isIvory ? "#d9c9a9" : "#53605b",
    1,
  );
  if (isQueen) {
    drawCircle(context, piece.x, piece.y, 3.2, "#f2c37b");
  } else {
    drawCircle(
      context,
      piece.x,
      piece.y,
      2.2,
      isIvory ? "#c8b692" : "#76817b",
    );
  }
  context.restore();
}

function drawStriker(context: CanvasRenderingContext2D, game: GameState): void {
  const striker = game.striker;
  if (striker.pocketed) return;

  context.save();
  context.shadowColor = "rgba(27, 24, 20, .36)";
  context.shadowBlur = 12;
  context.shadowOffsetY = 5;
  drawCircle(context, striker.x, striker.y, striker.radius, "#d5a257", "#805b2b", 3);
  context.shadowColor = "transparent";
  drawCircle(context, striker.x, striker.y, striker.radius * 0.71, "#e9c27f", "#fff0ce", 2);
  drawCircle(context, striker.x, striker.y, striker.radius * 0.39, "#a97537", "#805b2b", 2);
  drawCircle(context, striker.x, striker.y, 3.5, "#f8e3b8");
  context.restore();
}

function drawBoard(
  context: CanvasRenderingContext2D,
  game: GameState,
  aim: AimDrag | null,
): void {
  const size = BOARD_SIZE;
  context.clearRect(0, 0, size, size);
  context.fillStyle = "#10221d";
  context.fillRect(0, 0, size, size);

  context.save();
  context.shadowColor = "rgba(0, 0, 0, .38)";
  context.shadowBlur = 30;
  context.shadowOffsetY = 17;
  const wood = context.createLinearGradient(36, 36, 760, 760);
  wood.addColorStop(0, "#bd8650");
  wood.addColorStop(0.48, "#95633c");
  wood.addColorStop(1, "#70482f");
  context.fillStyle = wood;
  context.beginPath();
  context.roundRect(35, 35, 730, 730, 31);
  context.fill();
  context.restore();

  context.strokeStyle = "rgba(255, 226, 176, .45)";
  context.lineWidth = 2;
  context.beginPath();
  context.roundRect(48, 48, 704, 704, 24);
  context.stroke();
  context.strokeStyle = "rgba(73, 43, 26, .38)";
  context.lineWidth = 1;
  context.beginPath();
  context.roundRect(59, 59, 682, 682, 20);
  context.stroke();

  const field = context.createLinearGradient(96, 95, 704, 705);
  field.addColorStop(0, "#f2e7d2");
  field.addColorStop(1, "#e5d4b8");
  context.fillStyle = field;
  context.fillRect(96, 96, 608, 608);
  context.strokeStyle = "rgba(132, 91, 54, .25)";
  context.lineWidth = 1;
  context.strokeRect(101, 101, 598, 598);

  context.strokeStyle = "rgba(153, 90, 67, .78)";
  context.lineWidth = 2;
  context.beginPath();
  context.arc(400, 400, 103, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.arc(400, 400, 80, 0, Math.PI * 2);
  context.stroke();
  drawCircle(context, 400, 400, 4, "#a85946");

  for (const y of [160, 640]) {
    context.strokeStyle = "rgba(168, 91, 69, .9)";
    context.lineWidth = 2.5;
    context.beginPath();
    context.moveTo(153, y);
    context.lineTo(647, y);
    context.stroke();
    for (const x of [153, 647]) {
      drawCircle(context, x, y, 13, "rgba(184, 106, 77, .12)", "#a95f49", 2);
      drawCircle(context, x, y, 4, "#a95f49");
    }
    context.strokeStyle = "rgba(168, 91, 69, .58)";
    context.lineWidth = 1.5;
    context.beginPath();
    context.arc(400, y, 36, 0, Math.PI * 2);
    context.stroke();
  }

  for (const [x, y] of [
    [108, 108],
    [692, 108],
    [108, 692],
    [692, 692],
  ]) {
    drawCircle(context, x, y, 37, "#573b2c", "#e7d2b1", 3);
    drawCircle(context, x, y, 30, "#19221e", "#402c22", 2);
    drawCircle(context, x - 5, y - 6, 21, "#111917");
  }

  for (const [x, y, rotation] of [
    [74, 74, 0],
    [726, 74, Math.PI / 2],
    [726, 726, Math.PI],
    [74, 726, -Math.PI / 2],
  ]) {
    context.save();
    context.translate(x, y);
    context.rotate(rotation);
    context.fillStyle = "rgba(249, 224, 186, .78)";
    context.beginPath();
    context.moveTo(-7, -17);
    context.lineTo(0, -28);
    context.lineTo(7, -17);
    context.closePath();
    context.fill();
    context.restore();
  }

  context.save();
  context.setLineDash([6, 7]);
  context.strokeStyle = "rgba(168, 91, 69, .38)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(153, 400);
  context.lineTo(647, 400);
  context.stroke();
  context.restore();

  const lineY = strikerLine(game.currentPlayer);
  context.strokeStyle = game.phase === "ready" ? "rgba(191, 129, 70, .52)" : "rgba(168, 91, 69, .22)";
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(153, lineY);
  context.lineTo(647, lineY);
  context.stroke();

  for (const piece of game.pieces) drawPiece(context, piece);

  if (aim && game.phase === "ready") {
    const dx = aim.startX - aim.pullX;
    const dy = aim.startY - aim.pullY;
    const magnitude = Math.hypot(dx, dy);
    if (magnitude > 2) {
      const length = Math.min(175, 70 + magnitude * 0.45);
      const endX = game.striker.x + (dx / magnitude) * length;
      const endY = game.striker.y + (dy / magnitude) * length;
      context.save();
      context.setLineDash([7, 7]);
      context.strokeStyle = "rgba(108, 70, 42, .8)";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(game.striker.x, game.striker.y);
      context.lineTo(endX, endY);
      context.stroke();
      context.restore();
      drawCircle(context, endX, endY, 5, "#a85946");
    }
    drawCircle(context, game.striker.x, game.striker.y, 29, "rgba(195, 139, 73, .13)", "rgba(128, 84, 40, .55)", 1.5);
  }

  drawStriker(context, game);
}

function getShotMessage(result: ShotResult): string {
  if (result.winner === "draw") return "A beautiful match. It’s a draw.";
  if (result.winner !== null) return `${PLAYER_NAMES[result.winner]} wins the match!`;
  if (result.foul) return "Foul — striker pocketed. One point deducted.";
  if (result.queenPocketed) return "Queen pocketed — +3 bonus points.";
  if (result.ownPiecesPocketed > 0) {
    return `${result.ownPiecesPocketed} coin${result.ownPiecesPocketed === 1 ? "" : "s"} pocketed. Your turn again.`;
  }
  if (result.opposingPiecesPocketed > 0) return "Opponent’s coin pocketed. Turn passes.";
  return `${PLAYER_NAMES[result.nextPlayer]} to play.`;
}

export default function CarromGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [initialGame] = useState(createInitialGame);
  const gameRef = useRef<GameState>(initialGame);
  const dragRef = useRef<AimDrag | null>(null);
  const [gameView, setGameView] = useState(() => createView(initialGame));
  const [message, setMessage] = useState("Drag the striker back, then release to shoot.");
  const [shotNumber, setShotNumber] = useState(1);
  const [canvasError, setCanvasError] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) {
      setCanvasError(true);
      return;
    }

    let animationFrame = 0;
    let previousTime = 0;

    const resizeCanvas = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(BOARD_SIZE * pixelRatio);
      canvas.height = Math.round(BOARD_SIZE * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas);
    resizeCanvas();

    const frame = (timestamp: number) => {
      const game = gameRef.current;
      if (game) {
        const deltaSeconds = previousTime === 0 ? 0 : (timestamp - previousTime) / 1000;
        const result = advanceGame(game, deltaSeconds);
        if (result) {
          setGameView(createView(game));
          setMessage(getShotMessage(result));
          setShotNumber((number) => number + 1);
        }
        drawBoard(context, game, dragRef.current);
      }
      previousTime = timestamp;
      animationFrame = window.requestAnimationFrame(frame);
    };

    animationFrame = window.requestAnimationFrame(frame);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
    };
  }, []);

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * BOARD_SIZE,
      y: ((event.clientY - bounds.top) / bounds.height) * BOARD_SIZE,
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return;
    const game = gameRef.current;
    if (!game || game.phase !== "ready") return;
    const point = pointFromEvent(event);
    const striker = game.striker;
    const strikerDistance = Math.hypot(point.x - striker.x, point.y - striker.y);

    if (strikerDistance <= striker.radius + 13) {
      dragRef.current = {
        pointerId: event.pointerId,
        startX: point.x,
        startY: point.y,
        pullX: point.x,
        pullY: point.y,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    const lineY = strikerLine(game.currentPlayer);
    if (
      Math.abs(point.y - lineY) <= 23 &&
      point.x >= 153 + striker.radius &&
      point.x <= 647 - striker.radius
    ) {
      striker.x = point.x;
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const point = pointFromEvent(event);
    const pullX = point.x - drag.startX;
    const pullY = point.y - drag.startY;
    const pullLength = Math.hypot(pullX, pullY);
    const limit = 130;
    const scale = pullLength > limit ? limit / pullLength : 1;
    drag.pullX = drag.startX + pullX * scale;
    drag.pullY = drag.startY + pullY * scale;
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const point = pointFromEvent(event);
    const pullX = point.x - drag.startX;
    const pullY = point.y - drag.startY;
    const pullLength = Math.hypot(pullX, pullY);
    dragRef.current = null;

    if (pullLength < 8) return;
    const game = gameRef.current;
    if (!game || game.phase !== "ready") return;

    const power = Math.min(pullLength, 130) * 7.2;
    const scale = power / pullLength;
    game.striker.vx = -pullX * scale;
    game.striker.vy = -pullY * scale;
    game.phase = "moving";
    game.shotElapsed = 0;
    setGameView(createView(game));
    setMessage("The board is in motion…");
  };

  const handlePointerCancel = () => {
    dragRef.current = null;
  };

  const startNewGame = () => {
    const game = createInitialGame();
    gameRef.current = game;
    dragRef.current = null;
    setGameView(createView(game));
    setShotNumber(1);
    setMessage("Drag the striker back, then release to shoot.");
  };

  const winnerLabel =
    gameView.winner === "draw"
      ? "Match drawn"
      : gameView.winner !== null
        ? `${PLAYER_NAMES[gameView.winner]} wins`
        : "";

  return (
    <main className="game-shell min-h-screen flex flex-col">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Carrom Club home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="15" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="18" cy="18" r="9" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="18" cy="18" r="3" fill="currentColor" />
              <path d="M18 3v6m15 9h-6M18 33v-6M3 18h6" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </span>
          <span className="brand-copy">
            <strong>CARROM CLUB</strong>
            <span>EST. EVERYWHERE</span>
          </span>
        </Link>
        <div className="topbar-right">
          <span className="local-match"><span /> LOCAL MATCH</span>
          <button className="new-game-button" type="button" onClick={startNewGame}>
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M16.5 9.5a6.5 6.5 0 1 1-1.9-4.6M16.5 3.5v4h-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            New game
          </button>
        </div>
      </header>

      <section className="intro">
        <div>
          <p className="eyebrow"><span /> THE NEIGHBOURHOOD CLASSIC</p>
          <h1>One board. <span>All heart.</span></h1>
          <p className="intro-copy">
            A little friendly competition, just like the tea stall.
          </p>
        </div>
        <div className="match-meta">
          <span className="meta-label">MATCH</span>
          <strong>01 <i>/</i> 01</strong>
        </div>
      </section>

      <section className="game-layout" aria-label="Carrom match">
        <div className="board-panel">
          <div className="board-panel-head">
            <div className="board-title">
              <span className="board-index">01</span>
              <div>
                <strong>THE CLASSIC BOARD</strong>
                <span>Warm wood · clean break</span>
              </div>
            </div>
            <span className="shot-count">SHOT <b>{String(shotNumber).padStart(2, "0")}</b></span>
          </div>
          <div className="board-wrap">
            <canvas
              ref={canvasRef}
              className="carrom-canvas"
              aria-label="Carrom board. Drag the striker backwards and release to shoot. Click your baseline to reposition it."
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
            />
            {canvasError && (
              <div className="canvas-error" role="alert">
                Your browser could not open the game board. Please try a current browser.
              </div>
            )}
            {gameView.phase === "finished" && (
              <div className="game-over" role="status">
                <span className="game-over-mark">✦</span>
                <span className="eyebrow">THAT’S THE MATCH</span>
                <strong>{winnerLabel}</strong>
                <button type="button" onClick={startNewGame}>Play again</button>
              </div>
            )}
          </div>
          <div className="board-footer">
            <div className="turn-indicator">
              <span className={`turn-dot player-${gameView.currentPlayer}`} />
              <span>
                <strong>
                  {gameView.phase === "finished"
                    ? "Match complete"
                    : `${PLAYER_NAMES[gameView.currentPlayer]}’s turn`}
                </strong>
                <small>{message}</small>
              </span>
            </div>
            <div className="gesture-hint" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M7 13.5V6.8a1.5 1.5 0 0 1 3 0v4.7-6a1.5 1.5 0 0 1 3 0v6-4.2a1.5 1.5 0 0 1 3 0v5.2-2a1.5 1.5 0 0 1 3 0v5.1c0 3-2.4 5.4-5.4 5.4h-1.2c-2 0-3.1-.7-4.2-2l-3.3-3.8a1.7 1.7 0 0 1 2.5-2.3l1.2 1.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>DRAG TO SHOOT</span>
            </div>
          </div>
        </div>

        <aside className="sidebar">
          <section className="turn-card">
            <div className="section-kicker"><span className="live-dot" /> LIVE TURN</div>
            <div className="turn-player">
              <span className={`player-token player-${gameView.currentPlayer}`}>
                {gameView.currentPlayer === 0 ? "1" : "2"}
              </span>
              <div>
                <span className="turn-label">AT THE BOARD</span>
                <strong>{PLAYER_NAMES[gameView.currentPlayer]}</strong>
              </div>
              <span className="turn-arrow" aria-hidden="true">↗</span>
            </div>
            <p className="turn-tip">
              {gameView.phase === "finished"
                ? "The board is yours whenever you’re ready for a rematch."
                : "Set your striker on the baseline. Pull back to line up your shot."}
            </p>
          </section>

          <section className="score-section" aria-label="Scoreboard">
            <div className="section-heading">
              <h2>THE SCORE</h2>
              <span>FIRST TO 9</span>
            </div>
            <div className="score-card">
              {[0, 1].map((player) => {
                const index = player as PlayerIndex;
                const active = gameView.currentPlayer === index && gameView.phase !== "finished";
                return (
                  <div className={`score-row ${active ? "is-active" : ""}`} key={index}>
                    <span className={`score-piece ${PLAYER_COLORS[index]}`} />
                    <div className="score-person">
                      <strong>{PLAYER_NAMES[index]}</strong>
                      <span>{gameView.remaining[index]} coins left</span>
                    </div>
                    <strong className="score-value">{gameView.scores[index]}</strong>
                  </div>
                );
              })}
              <div className="score-progress" aria-hidden="true">
                <span style={{ width: `${Math.min(50, (gameView.scores[0] / 9) * 50)}%` }} />
                <span style={{ width: `${Math.min(50, (gameView.scores[1] / 9) * 50)}%` }} />
              </div>
            </div>
            <p className="queen-note"><span>✦</span> Pocket the queen for a <strong>+3 point bonus.</strong></p>
          </section>

          <section className="how-to-card">
            <div className="section-heading">
              <h2>HOW TO PLAY</h2>
              <span>THE BASICS</span>
            </div>
            <ol>
              <li><span>01</span><p>Drag back the striker to set your power.</p></li>
              <li><span>02</span><p>Release to flick. Pocket your colour to keep your turn.</p></li>
              <li><span>03</span><p>First to 9 points takes the bragging rights.</p></li>
            </ol>
            <div className="foul-note">
              <span aria-hidden="true">↗</span>
              Striker in a pocket? That’s a foul — lose 1 point.
            </div>
          </section>
        </aside>
      </section>

      <footer className="page-footer">
        <span>MADE FOR THE LOVE OF THE GAME</span>
        <span><i /> TWO PLAYERS · ONE BOARD · ENDLESS REMATCHES</span>
      </footer>
    </main>
  );
}
