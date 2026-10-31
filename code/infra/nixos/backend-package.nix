{
  buildNpmPackage,
  importNpmLock,
  nodejs_24,
  lib,
}:
buildNpmPackage {
  pname = "mcp-exchange-backend";
  version = "0.0.1";
  src = lib.cleanSource ../../backend;
  nodejs = nodejs_24;

  # Reads the dependencies from package-lock.json, so changing them needs no
  # hash update here.
  npmDeps = importNpmLock { npmRoot = ../../backend; };
  npmConfigHook = importNpmLock.npmConfigHook;

  # npm pack honours .gitignore, which excludes dist/: install the files by hand.
  installPhase = ''
    runHook preInstall
    npm prune --omit=dev --offline --no-audit --no-fund
    mkdir -p $out/lib/backend
    cp -r dist node_modules mock_hotel package.json $out/lib/backend/
    runHook postInstall
  '';
}
