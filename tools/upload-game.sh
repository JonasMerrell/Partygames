#!/bin/sh
# Upload a game folder to a Party Hall server.
#   PARTY_ADMIN_TOKEN=... ./tools/upload-game.sh https://host:7777 games/my-game
set -eu
server=${1:?server url}; dir=${2:?game folder}
: "${PARTY_ADMIN_TOKEN:?set PARTY_ADMIN_TOKEN}"
id=$(basename "$dir")
cd "$dir"
find . -type f ! -name '.*' | sed 's|^\./||' | while read -r f; do
  curl -fsS -X PUT -H "Authorization: Bearer $PARTY_ADMIN_TOKEN" \
    --data-binary "@$f" "$server/api/games/$id/$f"
done
