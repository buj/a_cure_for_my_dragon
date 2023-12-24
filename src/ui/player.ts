import { IPlayer, Prompt } from "../entities";
import { QuestionContext, ShowContext } from "../protocol";
import { Deferred, createDeferred } from "../utils";

export type Question = {
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
  answer: Deferred<number>;
};

export type Show = { prompt: Prompt<ShowContext>; what: any };

export class UIPlayer implements IPlayer<QuestionContext, ShowContext> {
  public constructor(
    private setActiveQuestion: (q: Question) => void,
    private display: (s: Show) => void
  ) {}

  public chooseFromRange = (
    prompt: Prompt<QuestionContext>,
    l: number,
    r: number
  ): Promise<number> => {
    const answer = createDeferred<number>();
    this.setActiveQuestion({
      prompt,
      query: {
        type: "chooseFromRange",
        l,
        r,
      },
      answer,
    });
    return answer.promise;
  };

  public chooseFromList: <T>(
    prompt: Prompt<QuestionContext>,
    ls: T[]
  ) => Promise<T> = async (prompt, ls) => {
    const answer = createDeferred<number>();
    this.setActiveQuestion({
      prompt,
      query: {
        type: "chooseFromList",
        ls,
      },
      answer,
    });
    return ls[await answer.promise]!;
  };

  public show: <T>(prompt: Prompt<ShowContext>, value: T) => void = (
    prompt,
    value
  ) => {
    this.display({
      prompt,
      what: value,
    });
  };
}
