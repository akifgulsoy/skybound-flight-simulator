import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const projectRoot = process.cwd();
const moduleSource = resolve(
  projectRoot,
  "app/vendor/three.module.min.txt",
);
const licenseSource = resolve(projectRoot, "app/vendor/three-LICENSE.txt");
const moduleTarget = resolve(
  projectRoot,
  "dist/client/vendor/three.module.min.js",
);
const licenseTarget = resolve(
  projectRoot,
  "dist/client/vendor/three-LICENSE.txt",
);

await mkdir(dirname(moduleTarget), { recursive: true });
await Promise.all([
  copyFile(moduleSource, moduleTarget),
  copyFile(licenseSource, licenseTarget),
]);

console.log("Three.js tarayıcı varlığı dağıtım paketine eklendi.");
