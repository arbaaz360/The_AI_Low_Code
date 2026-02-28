#!/usr/bin/env node
/**
 * Generates samples/form_big.json - a representative large form (100+ fields)
 */
import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIELD_COUNT = 100;
const SECTION_SIZE = 10;

const sections = [];
const nodes = {};
const mapping = [];

let nodeId = 0;
const rootChildren = [];

for (let s = 0; s < FIELD_COUNT / SECTION_SIZE; s++) {
  const sectionId = `section_${s}`;
  const sectionChildren = [];
  rootChildren.push(sectionId);

  nodes[sectionId] = {
    id: sectionId,
    type: "Section",
    props: { title: `Section ${s + 1}` },
    children: sectionChildren,
    layout: {}
  };

  for (let i = 0; i < SECTION_SIZE; i++) {
    const fid = `f${nodeId}`;
    nodeId++;
    sectionChildren.push(fid);
    const path = `form.values.field_${fid}`;
    nodes[fid] = {
      id: fid,
      type: i % 5 === 0 ? "core.TextArea" : "core.TextInput",
      bindings: { value: path }
    };
    mapping.push({ sourcePath: path, targetPath: `body.${fid}` });
  }
}

const formBig = {
  schemaVersion: "1.0",
  pageFamily: "Form",
  rootNodeId: "root",
  nodes: {
    root: {
      id: "root",
      type: "FormGrid",
      layout: { columns: 12 },
      children: rootChildren
    },
    ...nodes
  },
  dataContext: { entity: "LargeForm", mode: "create" },
  submission: {
    submitOperation: { operationId: "largeForm.submit" },
    mapping
  }
};

writeFileSync(
  join(__dirname, "form_big.json"),
  JSON.stringify(formBig, null, 2),
  "utf8"
);
console.log("Generated samples/form_big.json");
