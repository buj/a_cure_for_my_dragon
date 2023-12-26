import { PrngState, Prompt } from "../entities";
import { GameState, zGameState } from "../game";
import { QuestionContext } from "../protocol";
import { PromiseState, createDeferred } from "../utils";
import { DialogueEntry } from "./HistoryWidget";
import { Question, Show } from "./player";
import { z } from "zod";

export type FrozenQuestion = {
  prompt: Prompt<QuestionContext>;
  query:
    | {
        type: "chooseFromRange";
        l: number;
        r: number;
      }
    | {
        type: "chooseFromList";
        ls: any[];
      };
  answer: number;
};

export namespace FrozenQuestion {
  export function fromQuestion(q: Question): FrozenQuestion | null {
    const answer = q.answer.getSync();
    if (answer.state !== PromiseState.Resolved) {
      return null;
    }
    return {
      prompt: q.prompt,
      query: q.query,
      answer: answer.value,
    };
  }

  export function toQuestion(fq: FrozenQuestion): Question {
    const d = createDeferred<number>();
    d.resolve(fq.answer);
    return {
      prompt: fq.prompt,
      query: fq.query,
      answer: d,
    };
  }
}

export type FrozenDialogueEntry =
  | {
      type: "question";
      data: FrozenQuestion;
    }
  | {
      type: "show";
      data: Show;
    };

export namespace FrozenDialogueEntry {
  export function toDialogueEntry(e: FrozenDialogueEntry): DialogueEntry {
    switch (e.type) {
      case "show": {
        return e;
      }
      case "question": {
        return {
          type: "question",
          data: FrozenQuestion.toQuestion(e.data),
        };
      }
    }
  }

  export function fromDialogueEntry(
    d: DialogueEntry
  ): FrozenDialogueEntry | null {
    switch (d.type) {
      case "show": {
        return d;
      }
      case "question": {
        const q = FrozenQuestion.fromQuestion(d.data);
        if (q === null) {
          return null;
        }
        return {
          type: "question",
          data: q,
        };
      }
    }
  }
}

export type GameData = {
  rngState: PrngState;
  state: GameState;
  history: Array<FrozenDialogueEntry>;
};

export namespace GameData {
  export function serialize(data: GameData): string {
    return JSON.stringify(data);
  }

  export function deserialize(str: string): {
    rngState: any;
    state: GameState;
    history: any;
  } {
    const obj = JSON.parse(str);
    return {
      rngState: obj["rngState"],
      state: zGameState.parse(obj["state"]),
      history: obj["history"],
    };
  }
}
