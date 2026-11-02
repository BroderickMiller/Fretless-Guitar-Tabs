import * as at from "@coderline/alphatab";
import { writeFileSync } from "node:fs";
const importer = new at.importer.AlphaTexImporter();
importer.initFromString(
  String.raw`\title "First light" \artist "Fretless" \tempo 96 . :4 0.6 2.5 2.4 0.3 | 3.6 2.5 0.4 0.3 | 0.6 2.5 3.4 2.3 | 0.6.1`,
  new at.Settings(),
);
const score = importer.readScore();
writeFileSync(
  "fixtures/first-light.gp",
  new at.exporter.Gp7Exporter().export(score),
);

const band = new at.importer.AlphaTexImporter();
band.initFromString(
  String.raw`\title "Three piece" \artist "Fretless" \tempo 96 \track "Guitar" \instrument 25 . :4 0.6 2.5 2.4 0.3 | 3.6 2.5 0.4 0.3 \track "Bass" \instrument 34 \tuning G2 D2 A1 E1 B0 . :4 0.5 0.5 2.3 2.3 | 3.4 3.4 0.3 0.3 \track "Drums" \instrument percussion . :4 36 38 36 38 | 36 38 36 38`,
  new at.Settings(),
);
writeFileSync(
  "fixtures/three-piece.gp",
  new at.exporter.Gp7Exporter().export(band.readScore()),
);
