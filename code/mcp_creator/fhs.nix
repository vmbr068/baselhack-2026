let
  pkgs = import (builtins.getFlake "nixpkgs") { system = "x86_64-linux"; };
in
pkgs.buildFHSEnv {
  name = "pw";
  targetPkgs = p: with p; [
    stdenv.cc.cc.lib
    glib
    nss
    nspr
    dbus
    atk
    at-spi2-atk
    cups
    libdrm
    expat
    libxkbcommon
    mesa
    libgbm
    alsa-lib
    pango
    cairo
    libx11
    libxcomposite
    libxdamage
    libxext
    libxfixes
    libxrandr
    libxcb
    systemd
  ];
}
