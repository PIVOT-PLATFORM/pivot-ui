#!/bin/sh
# Cloud Run edge activation (managed-min stack).
#
# The image ships nginx.conf (docker-compose gateway: :443/TLS, Docker service
# upstreams) as the default. In Cloud Run the backends are reached over their
# *.run.app hostnames, injected as env vars. When PIVOT_CORE_UPSTREAM is set we
# render nginx.cloudrun.conf.template (listen :8080, env upstreams) OVER
# /etc/nginx/conf.d/default.conf, so the same image serves both targets.
#
# This runs from /docker-entrypoint.d/ before nginx starts (nginx:alpine
# official entrypoint). envsubst is restricted to our four variables so nginx's
# own runtime $variables ($uri, $host, $proxy_add_x_forwarded_for, …) survive.
set -eu

if [ -z "${PIVOT_CORE_UPSTREAM:-}" ]; then
    echo "[pivot] PIVOT_CORE_UPSTREAM unset — keeping docker-compose nginx.conf" >&2
    exit 0
fi

echo "[pivot] Cloud Run edge mode — rendering nginx.cloudrun.conf.template" >&2

: "${PIVOT_COLLABORATIF_UPSTREAM:?PIVOT_COLLABORATIF_UPSTREAM required in Cloud Run mode}"
: "${PIVOT_AGILITE_UPSTREAM:?PIVOT_AGILITE_UPSTREAM required in Cloud Run mode}"

envsubst '${PIVOT_CORE_UPSTREAM} ${PIVOT_COLLABORATIF_UPSTREAM} ${PIVOT_AGILITE_UPSTREAM}' \
    < /etc/nginx/pivot/nginx.cloudrun.conf.template \
    > /etc/nginx/conf.d/default.conf

echo "[pivot] upstreams: core=${PIVOT_CORE_UPSTREAM} collaboratif=${PIVOT_COLLABORATIF_UPSTREAM} agilite=${PIVOT_AGILITE_UPSTREAM}" >&2
