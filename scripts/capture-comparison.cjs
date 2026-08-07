const { app, BrowserWindow } = require("electron");
const fs = require("fs");

const [sourcePath, implementationPath, outputPath] = process.argv.slice(2);

app.whenReady().then(async () => {
  const window = new BrowserWindow({ width: 1800, height: 700, show: false, backgroundColor: "#02060b" });
  const source = `data:image/png;base64,${fs.readFileSync(sourcePath).toString("base64")}`;
  const implementation = `data:image/png;base64,${fs.readFileSync(implementationPath).toString("base64")}`;
  const html = `<!doctype html><style>*{box-sizing:border-box}body{margin:0;background:#02060b;color:white;font-family:system-ui}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px}.pane{display:grid;gap:8px}b{font-size:13px;color:#8fa2b8}img{display:block;width:100%;height:640px;object-fit:contain;object-position:top;background:#06111f}</style><div class="grid"><div class="pane"><b>REFERENCE</b><img src="${source}"></div><div class="pane"><b>IMPLEMENTATION</b><img src="${implementation}"></div></div>`;
  const htmlPath = "/tmp/gametime-comparison.html";
  fs.writeFileSync(htmlPath, html);
  await window.loadFile(htmlPath);
  await new Promise((resolve) => setTimeout(resolve, 700));
  const image = await window.webContents.capturePage();
  fs.writeFileSync(outputPath, image.toPNG());
  app.quit();
});
