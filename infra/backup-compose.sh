#!/usr/bin/env bash
set -euo pipefail
umask 077

if [[ $# != 1 || ! -d $1 ]]; then
    echo 'Usage: ALAMUT_BACKUP_RECIPIENT=age1... bash infra/backup-compose.sh <existing backup directory>' >&2
    exit 2
fi
: "${ALAMUT_BACKUP_RECIPIENT:?Set the public age recovery recipient}"
command -v docker >/dev/null
command -v age >/dev/null

destination=$(cd -- "$1" && pwd -P)
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
work=$(mktemp -d "${TMPDIR:-/tmp}/alamut-backup.XXXXXXXXXX")
encrypted=
cleanup() {
    if [[ -n $encrypted ]]; then rm -f -- "$encrypted"; fi
    rm -f -- "$work/database.sql" "$work/media.tar"
    rmdir -- "$work"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

docker compose exec -T mysql sh -eu -c '
    export MYSQL_PWD="$MYSQL_PASSWORD"
    exec mysqldump --user="$MYSQL_USER" --default-character-set=utf8mb4 \
        --single-transaction --quick --no-tablespaces --set-gtid-purged=OFF \
        "$MYSQL_DATABASE"
' > "$work/database.sql"
docker compose exec -T backend tar -C /app/media -cf - . > "$work/media.tar"
test -s "$work/database.sql"
test -s "$work/media.tar"

encrypted=$(mktemp "$destination/.alamut-encrypted.XXXXXXXXXX")
tar -C "$work" -czf - database.sql media.tar |
    age --encrypt --recipient "$ALAMUT_BACKUP_RECIPIENT" > "$encrypted"
archive="$destination/alamut-$(date -u +%Y%m%dT%H%M%SZ)-${encrypted##*.}.tar.gz.age"
mv -T -- "$encrypted" "$archive"
encrypted=
printf '%s\n' "$archive"
