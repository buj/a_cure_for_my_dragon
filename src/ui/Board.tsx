import React from "react";
import {
  GameAction,
  GameActionType,
  GameState,
  Position,
  WorldObjectType,
} from "../game";
import {
  alchemyStr,
  dialectStr,
  extractPositionChoicesFromQuestion,
} from "./utils";
import { Question } from "./player";
import { isPositionalQuestion } from "../protocol";
import { evalThunk } from "../utils";

class Vector2d {
  public constructor(public x: number, public y: number) {}

  public add = (other: Vector2d): Vector2d => {
    return new Vector2d(this.x + other.x, this.y + other.y);
  };

  public sub = (other: Vector2d): Vector2d => {
    return new Vector2d(this.x - other.x, this.y - other.y);
  };

  public mul = (k: number): Vector2d => {
    return new Vector2d(this.x * k, this.y * k);
  };

  public div = (k: number): Vector2d => {
    return new Vector2d(this.x / k, this.y / k);
  };
}

namespace BoardImpl {
  const origin = new Vector2d(645, 77);
  const dy = new Vector2d(-21.375, 37.3125);
  const dx = new Vector2d(42.9375, 0);
  export const hexRadius = 21.5;

  function getCenterPixelForPos(pos: Position): Vector2d {
    return origin.add(dx.mul(pos.x).add(dy.mul(pos.y)));
  }

  function getPosForPixel(pixel: Vector2d): Position {
    const relPos = pixel.sub(origin);
    const y = relPos.y / dy.y;
    const x = relPos.sub(dy.mul(y)).x / dx.x;
    return { x: Math.round(x), y: Math.round(y) };
  }

  function computeSvgViewboxCoordsOfEvent(
    svgRef: React.RefObject<SVGSVGElement>,
    event: React.MouseEvent<SVGSVGElement>
  ): Vector2d {
    const svgElem = svgRef.current!;
    const tmp = svgElem.createSVGPoint();
    tmp.x = event.clientX;
    tmp.y = event.clientY;
    const transformedPoint = tmp.matrixTransform(
      svgElem.getScreenCTM()!.inverse()
    );
    return new Vector2d(transformedPoint.x, transformedPoint.y);
  }

  export function highlightChoices(q: Question) {
    const positions = extractPositionChoicesFromQuestion(q);
    return positions.map((pos) => {
      const centerPixel = getCenterPixelForPos(pos);
      return (
        <circle
          r={BoardImpl.hexRadius * 0.666}
          fill="#008800"
          opacity="0.3333"
          cx={centerPixel.x}
          cy={centerPixel.y}
        />
      );
    });
  }

  export function worldElements(state: GameState) {
    return state.world.listHexes().flatMap(({ pos, value: cell }) => {
      if (cell.object === undefined) {
        return [];
      }
      const centerPixel = getCenterPixelForPos(pos);
      switch (cell.object.type) {
        case WorldObjectType.PreviouslyVisited: {
          const opacity =
            cell.object.data.turnNumber === state.turnNumber ? 1 : 0.5;
          return [
            <text
              x={centerPixel.x}
              y={centerPixel.y}
              opacity={opacity}
              fontSize={hexRadius}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {cell.object.data.turnNumber}
            </text>,
          ];
        }
        case WorldObjectType.ProductionBuilding: {
          const repr = alchemyStr(cell.object.data.produces);
          return [
            <text
              x={centerPixel.x}
              y={centerPixel.y}
              fontSize={hexRadius}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {repr}
            </text>,
          ];
        }
        case WorldObjectType.Village: {
          return [...cell.object.data.pages.entries()].map(([i, page]) => {
            const dx = evalThunk(() => {
              switch (i) {
                case 0:
                  return -hexRadius * 0.5;
                case 1:
                  return hexRadius * 0.65;
                default:
                  throw new Error(
                    "a village with more than 2 pages is unsupported / not implemented"
                  );
              }
            });
            const x = centerPixel.x + dx;
            return (
              <text
                x={x}
                y={centerPixel.y - hexRadius / 3}
                fontSize={hexRadius * 0.55}
                className={["villagePage"]
                  .concat(page.purchased ? ["purchased"] : [])
                  .join(" ")}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                <tspan x={x}>{alchemyStr(page.page.cost)}</tspan>
                <tspan x={x} dy={hexRadius * 0.666}>
                  {dialectStr(page.page.dialect)}
                </tspan>
              </text>
            );
          });
        }
      }
      return [];
    });
  }

  export function onMouseDown(
    q: Question,
    event: React.MouseEvent<SVGSVGElement>,
    svgRef: React.RefObject<SVGSVGElement>
  ) {
    if (!isPositionalQuestion(q.prompt.context)) {
      return;
    }
    if (q.query.type !== "chooseFromList") {
      throw new Error("positional question but query is not a list");
    }
    const pixel = computeSvgViewboxCoordsOfEvent(svgRef, event);
    const pos = getPosForPixel(pixel);
    if (q.prompt.context === "chooseAction") {
      const actionType = evalThunk(() => {
        switch (event.button) {
          case 1:
            return GameActionType.Interact;
          case 0:
            return GameActionType.Move;
          default:
            return null;
        }
      });
      if (actionType === null) {
        return;
      }
      const matches = [
        ...q.query.ls.map((x) => x as GameAction).entries(),
      ].filter(
        ([_, action]) =>
          action.type === actionType &&
          action.target.x === pos.x &&
          action.target.y === pos.y
      );
      if (matches.length > 0) {
        if (matches.length > 1) {
          throw new Error(
            "unexpected: multiple matches for a given position and mouse button"
          );
        }
        q.answer.resolve(matches[0]![0]);
      }
    }
    const matches = [...q.query.ls.map((x) => x as Position).entries()].filter(
      ([_, { x, y }]) => x === pos.x && y === pos.y
    );
    if (matches.length > 0) {
      if (matches.length > 1) {
        throw new Error("unexpected: multiple matches for a given position");
      }
      q.answer.resolve(matches[0]![0]);
    }
  }

  export function onMouseMove(
    q: Question,
    event: React.MouseEvent<SVGSVGElement>,
    svgRef: React.RefObject<SVGSVGElement>,
    cursorRef: React.RefObject<SVGCircleElement>
  ) {
    const questionChoices = extractPositionChoicesFromQuestion(q);
    const pixel = computeSvgViewboxCoordsOfEvent(svgRef, event);
    const pos = getPosForPixel(pixel);
    const matched =
      [...questionChoices.entries()].filter(
        ([_, cand]) => cand.x === pos.x && cand.y === pos.y
      ).length > 0;

    const cursor = cursorRef.current!;
    if (matched) {
      const targetPixel = getCenterPixelForPos(pos);
      cursor.setAttribute("cx", targetPixel.x.toString());
      cursor.setAttribute("cy", targetPixel.y.toString());
      cursor.setAttribute("visibility", "visible");
    } else {
      cursor.setAttribute("visibility", "hidden");
    }
  }
}

export default function Board(deps: {
  question: Question | null;
  gameState: GameState | null;
}) {
  const { question, gameState } = deps;
  const svgRef = React.useRef<SVGSVGElement>(null);
  const cursorRef = React.useRef<SVGCircleElement>(null);
  const onMouseDown = evalThunk(() => {
    if (question === null) {
      return undefined;
    }
    return (e: React.MouseEvent<SVGSVGElement>) => {
      BoardImpl.onMouseDown(question, e, svgRef);
    };
  });
  const onMouseMove = evalThunk(() => {
    if (question === null) {
      return undefined;
    }
    return (e: React.MouseEvent<SVGSVGElement>) => {
      BoardImpl.onMouseMove(question, e, svgRef, cursorRef);
    };
  });
  return (
    <svg
      ref={svgRef}
      width="100%"
      viewBox="0 0 1052 744"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
    >
      <image href="board.svg" width="100%" height="100%" />
      <circle
        ref={cursorRef}
        visibility="hidden"
        r={BoardImpl.hexRadius}
        fill="none"
        stroke-width="3"
        stroke="#008800"
      />
      {gameState && BoardImpl.worldElements(gameState)}
      {question !== null && BoardImpl.highlightChoices(question)}
    </svg>
  );
}
