#!/bin/bash

echo "Deplpyment Group is: $DEPLOYMENT_GROUP_NAME";

echo "Node Version"
sudo node -v

if [ "$DEPLOYMENT_GROUP_NAME" == "GetSignBackEndCICDDev" ]; then
  cd /var/www/GetSign-Dev/jetsign-backend
elif [ "$DEPLOYMENT_GROUP_NAME" == "GetSignBackEndCICDQA" ]; then
  cd /var/www/GetSign-QA/jetsign-backend
elif [ "$DEPLOYMENT_GROUP_NAME" == "GetSignBackEndCICDProd" ]; then
  cd /home/ubuntu/GetSign/jetsign-backend
fi

  sudo yarn --frozen-lockfile






