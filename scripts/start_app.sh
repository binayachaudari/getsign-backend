#!/bin/bash

echo "Deplpyment Group is: $DEPLOYMENT_GROUP_NAME";

if [ "$DEPLOYMENT_GROUP_NAME" == "GetSignBackEndCICDDev" ]; then
  cd /var/www/GetSign-Dev/jetsign-backend
  sudo pm2 restart dev --user root
fi

if [ "$DEPLOYMENT_GROUP_NAME" == "GetSignBackEndCICDQA" ]; then
  cd /var/www/GetSign-QA/jetsign-backend
  sudo pm2 restart qa --user root
fi

if [ "$DEPLOYMENT_GROUP_NAME" == "GetSignBackEndCICDProd" ]; then
  cd /home/ubuntu/GetSign/jetsign-backend
  sudo pm2 restart server --user root
fi

sudo pm2 status --user root


