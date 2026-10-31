{
  buildNpmPackage,
  importNpmLock,
  nodejs_24,
  lib,
}:
buildNpmPackage {
  pname = "mcp-exchange-frontend";
  version = "0.1.0";
  src = lib.cleanSource ../../frontend;
  nodejs = nodejs_24;

  # Reads the dependencies from package-lock.json, so changing them needs no
  # hash update here.
  npmDeps = importNpmLock { npmRoot = ../../frontend; };
  npmConfigHook = importNpmLock.npmConfigHook;

  installPhase = ''
    runHook preInstall
    cp -r dist $out
    runHook postInstall
  '';
}
