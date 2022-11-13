#!/bin/bash
LOCK_FILE=/tmp/tetris-deploy.lock
LOG_FILE=/tmp/tetris-deploy.log

# Logging convenience function
function log() {
    echo "$(date): $@" >> $LOG_FILE
}

# Don't run two instances at once
if [ -f $LOCK_FILE ]; then
    log "Deploy script is already running. Exiting."
    exit
fi

function cleanup {
    rm -rf $LOCK_FILE
}
trap cleanup EXIT
touch $LOCK_FILE

# Main logic
IMAGE_INFO=$(docker image list)
OLD_STAG_IMAGE=$(echo "$IMAGE_INFO" | grep 'tetris-battle' | grep 'latest-staging' | awk '{print $3}')
OLD_PROD_IMAGE=$(echo "$IMAGE_INFO" | grep 'tetris-battle' | grep 'latest' | grep -v 'staging' | awk '{print $3}')

docker pull aiguy110/tetris-battle:latest-staging
docker pull aiguy110/tetris-battle:latest

IMAGE_INFO=$(docker image list)
NEW_STAG_IMAGE=$(echo "$IMAGE_INFO" | grep 'tetris-battle' | grep 'latest-staging' | awk '{print $3}')
NEW_PROD_IMAGE=$(echo "$IMAGE_INFO" | grep 'tetris-battle' | grep 'latest' | grep -v 'staging' | awk '{print $3}')

if [ $OLD_STAG_IMAGE != $NEW_STAG_IMAGE ] || [ $OLD_PROD_IMAGE != $NEW_PROD_IMAGE ]; then
    CONTAINER_INFO=$(docker ps)
fi

if [ $OLD_STAG_IMAGE != $NEW_STAG_IMAGE ]; then
    log "Staging image has updated from $OLD_STAG_IMAGE to $NEW_STAG_IMAGE. Starting new container."
    OLD_CONTAINER_ID=$(echo "$CONTAINER_INFO" | grep $OLD_STAG_IMAGE | awk '{print $1}')
    docker kill $OLD_CONTAINER_ID
    docker run -p 8001:8000 -d --restart unless-stopped $NEW_STAG_IMAGE
    docker image rm $OLD_STAG_IMAGE
fi

if [ $OLD_PROD_IMAGE != $NEW_PROD_IMAGE ]; then
    log "Production image has updated from $OLD_PROD_IMAGE to $NEW_PROD_IMAGE. Starting new container."
    OLD_CONTAINER_ID=$(echo "$CONTAINER_INFO" | grep $OLD_PROD_IMAGE | awk '{print $1}')
    docker kill $OLD_CONTAINER_ID
    docker run -p 8000:8000 -d --restart unless-stopped $NEW_PROD_IMAGE
    docker image rm $OLD_PROD_IMAGE
fi