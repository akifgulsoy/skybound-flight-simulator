import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const projectRoot = process.cwd();
const moduleSource = resolve(
  projectRoot,
  "node_modules/three/build/three.module.min.js",
);
const coreSource = resolve(
  projectRoot,
  "node_modules/three/build/three.core.min.js",
);
const licenseSource = resolve(projectRoot, "node_modules/three/LICENSE");
const moduleTarget = resolve(
  projectRoot,
  "dist/client/vendor/three.module.min.js",
);
const coreTarget = resolve(
  projectRoot,
  "dist/client/vendor/three.core.min.js",
);
const licenseTarget = resolve(
  projectRoot,
  "dist/client/vendor/three-LICENSE.txt",
);

await mkdir(dirname(moduleTarget), { recursive: true });
await Promise.all([
  copyFile(moduleSource, moduleTarget),
  copyFile(coreSource, coreTarget),
  copyFile(licenseSource, licenseTarget),
]);

console.log("Three.js tarayıcı varlıkları dağıtım paketine eklendi.");
