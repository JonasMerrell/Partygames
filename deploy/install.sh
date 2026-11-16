#!/bin/sh
# One-time setup on the game server VM, run as root from an unpacked release:
#   sudo sh partyhall/deploy/install.sh [CERT.pem KEY.pem]
# Without arguments it looks for the Let's Encrypt certificate that
# Hohmann's Reach keeps under /var/lib/hohmann-reach.
# Installs Party Hall stopped; start it with `sudo switch-game party`.
set -eu
[ "$(id -u)" = 0 ] || { echo "run as root" >&2; exit 1; }
here=$(cd "$(dirname "$0")/.." && pwd)
admin=${SUDO_USER:-jonas}

cert=${1:-}; key=${2:-}
if [ -z "$cert" ]; then
  for f in $(grep -rl "BEGIN CERTIFICATE" /var/lib/hohmann-reach 2>/dev/null); do
    if openssl x509 -in "$f" -noout -issuer 2>/dev/null | grep -qi "let's encrypt\|O = Let's Encrypt\|ISRG"; then
      [ -z "$cert" ] || { echo "several Let's Encrypt certificates found; pass CERT KEY explicitly" >&2; exit 1; }
      cert=$f
    fi
  done
  [ -n "$cert" ] || { echo "no Let's Encrypt certificate found under /var/lib/hohmann-reach; pass CERT KEY" >&2; exit 1; }
  pub=$(openssl x509 -in "$cert" -noout -pubkey | sha256sum)
  for f in $(grep -rlE "BEGIN (EC |RSA )?PRIVATE KEY" /var/lib/hohmann-reach 2>/dev/null); do
    if [ "$(openssl pkey -in "$f" -pubout 2>/dev/null | sha256sum)" = "$pub" ]; then key=$f; fi
  done
  [ -n "$key" ] || { echo "found $cert but not its private key; pass CERT KEY" >&2; exit 1; }
fi
echo "certificate: $cert"
echo "key:         $key"

id partyhall >/dev/null 2>&1 || useradd --system --home-dir /var/lib/partyhall --shell /usr/sbin/nologin partyhall
install -d -m 755 /opt/partyhall
install -m 755 "$here/partyhall" /opt/partyhall/partyhall
rm -rf /opt/partyhall/games && cp -r "$here/games" /opt/partyhall/games
install -d -o partyhall -g partyhall -m 2775 /var/lib/partyhall /var/lib/partyhall/games
usermod -aG partyhall "$admin"

install -d -m 750 -g partyhall /etc/partyhall
if [ ! -s /etc/partyhall/admin-token ]; then
  head -c 24 /dev/urandom | base64 | tr '+/' '-_' > /etc/partyhall/admin-token
fi
chgrp partyhall /etc/partyhall/admin-token && chmod 640 /etc/partyhall/admin-token

install -m 644 "$here/deploy/partyhall.service" /etc/systemd/system/partyhall.service
install -d /etc/systemd/system/partyhall.service.d
printf '[Service]\nLoadCredential=tls-cert:%s\nLoadCredential=tls-key:%s\n' "$cert" "$key" \
  > /etc/systemd/system/partyhall.service.d/tls.conf
install -m 755 "$here/deploy/switch-game" /usr/local/bin/switch-game
install -m 755 "$here/deploy/partyhall-update" /usr/local/bin/partyhall-update
printf '%s ALL=(root) NOPASSWD: /usr/local/bin/switch-game, /usr/local/bin/partyhall-update\n' "$admin" \
  > /etc/sudoers.d/partyhall
chmod 440 /etc/sudoers.d/partyhall
visudo -cf /etc/sudoers.d/partyhall
systemctl daemon-reload
echo
echo "Installed. Hohmann's Reach is untouched and still running."
echo "Switch with:  sudo switch-game party   /   sudo switch-game hohmann"
echo "Admin token for uploading games is in /etc/partyhall/admin-token (readable by group partyhall)."
