import React from "react";
import { LostPage, LostPagesGenerator } from "../game";
import { alchemyStr, dialectStr } from "./utils";

function LostPageWidget(page: LostPage, current: boolean) {
  return (
    <div
      className={["lostPagesGeneratorPage"]
        .concat(current ? ["current"] : [])
        .join(" ")}
    >
      [{alchemyStr(page.cost)}→{dialectStr(page.dialect)}]
    </div>
  );
}

export default function LostPagesWidget(deps: {
  lostPagesGenerator: LostPagesGenerator;
}) {
  const { lostPagesGenerator } = deps;
  const elems = [...lostPagesGenerator.wheel.entries()].map(([idx, page]) =>
    LostPageWidget(page, idx === lostPagesGenerator.pos)
  );
  return (
    <div className="lostPagesGenerator">
      <h4>Lost pages</h4>
      {elems}
    </div>
  );
}
