#!/bin/bash

echo "Deplpyment Group is: $DEPLOYMENT_GROUP_NAME";

echo "Node Version"
sudo node -v

if [ "$DEPLOYMENT_GROUP_NAME" == "GetSignBackEndCICDDev" ]; then
  cd /var/www/GetSign-Dev/jetsign-backend
  sudo yarn --frozen-lockfile
fi

if [ "$DEPLOYMENT_GROUP_NAME" == "GetSignBackEndCICDProd" ]; then
  cd /home/ubuntu/GetSign/jetsign-backend
  sudo yarn --frozen-lockfile
fi






