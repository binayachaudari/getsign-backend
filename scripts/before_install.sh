#!/bin/bash

echo "Deplpyment Group is: $DEPLOYMENT_GROUP_NAME";

sudo /bin/bash

echo "Node Version"
sudo node -v

if [ "$DEPLOYMENT_GROUP_NAME" == "GetSignBackEndCICDDev" ]; then
  DESTINATION_PATH="/var/www/GetSign-Dev/jetsign-backend/"
elif [ "$DEPLOYMENT_GROUP_NAME" == "GetSignBackEndCICDQA" ]; then
  DESTINATION_PATH="/var/www/GetSign-QA/jetsign-backend/"
elif [ "$DEPLOYMENT_GROUP_NAME" == "GetSignBackEndCICDProd" ]; then
  DESTINATION_PATH="/home/ubuntu/GetSign/jetsign-backend/"
else 
  echo "Unsupported environment"
  exit 1
fi

sudo \cp -R /var/www/GetSign-Temp/jetsign-backend/* $DESTINATION_PATH
cd $DESTINATION_PATH
sudo yarn --frozen-lockfile
