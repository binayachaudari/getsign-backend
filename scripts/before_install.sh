#!/bin/bash

echo "Deplpyment Group is: $DEPLOYMENT_GROUP_NAME";

if [ "$DEPLOYMENT_GROUP_NAME" == "GetSignBackEndCICDDev" ]; then
  cd /var/www//var/www/GetSign-Dev/jetsign-backend
fi

if [ "$DEPLOYMENT_GROUP_NAME" == "GetSignBackEndCICDProd" ]; then
  cd /home/ubuntu/GetSign/jetsign-backend
fi


sudo apt-get update
sudo apt-get install -y nodejs
sudo apt-get install npm  -y
sudo npm install -g yarn 

yarn global add pm2

echo "Node Version"
sudo node -v
