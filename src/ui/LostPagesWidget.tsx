import React from "react";
import { LostPage, LostPagesGenerator } from "../game";
import { alchemyStr, dialectStr } from "./utils";

function LostPageWidget(rolls: number[], page: LostPage) {
  return (
    <div
      className={["lostPagesGeneratorPage"]
        .concat(rolls.length > 0 ? ["rollable"] : [])
        .join(" ")}
    >
      {rolls.map((x) => x.toString()).join("")} [{alchemyStr(page.cost)}→
      {dialectStr(page.dialect)}]
    </div>
  );
}

export default function LostPagesWidget(deps: {
  lostPagesGenerator: LostPagesGenerator;
}) {
  const { lostPagesGenerator } = deps;
  const elems = [...lostPagesGenerator.wheel.entries()].map(([idx, page]) => {
    const rolls = [0, 1, 2, 3, 4, 5].filter(
      (shift) =>
        (lostPagesGenerator.pos + shift) % lostPagesGenerator.wheel.length ===
        idx
    );
    return LostPageWidget(rolls, page);
  });
  return (
    <div className="lostPagesGenerator window">
      <h4>Lost pages</h4>
      {elems}
    </div>
  );
}
