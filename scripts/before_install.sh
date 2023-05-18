#!/bin/bash

echo "Deplpyment Group is: $DEPLOYMENT_GROUP_NAME";

sudo /bin/bash

echo "Node Version"
sudo node -v

if [ "$DEPLOYMENT_GROUP_NAME" == "GetSignBackEndCICDDev" ]; then
  DESTINATION_PATH="/var/www/GetSign-Dev/jetsign-backend/"
fi

if [ "$DEPLOYMENT_GROUP_NAME" == "GetSignBackEndCICDProd" ]; then
  DESTINATION_PATH="/home/ubuntu/GetSign/jetsign-backend/"
  sudo cp -R /var/www/GetSign-Dev/jetsign-backend/* $DESTINATION_PATH
fi

cd $DESTINATION_PATH
sudo yarn --frozen-lockfile
