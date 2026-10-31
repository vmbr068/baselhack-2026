{
  stdenv,
  fetchPnpmDeps,
  pnpmConfigHook,
  pnpm,
  nodejs_24,
  coreutils,
  hotelDemoSrc,
}:
stdenv.mkDerivation (finalAttrs: {
  pname = "hotel-demo";
  version = "0.0.0";
  src = hotelDemoSrc;

  nativeBuildInputs = [
    nodejs_24
    pnpm
    pnpmConfigHook
  ];

  pnpmDeps = fetchPnpmDeps {
    inherit (finalAttrs) pname version src;
    inherit pnpm;
    fetcherVersion = 3;
    hash = "sha256-RL7X1fU8do8Mhg2cCSu9anVe6wWYW3H8USXjOcoIEKg=";
  };

  buildPhase = ''
    runHook preBuild
    # prisma generate does not run the schema engine, but tries to download it.
    export PRISMA_SCHEMA_ENGINE_BINARY=${coreutils}/bin/true
    export DATABASE_URL=postgresql://build@localhost/build
    (cd apps/api && pnpm exec prisma generate)
    (cd apps/web && pnpm exec vite build)
    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall
    mkdir -p $out/lib
    cp -r . $out/lib/hotel-demo
    runHook postInstall
  '';
})
