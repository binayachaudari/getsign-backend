#!/bin/bash

echo "Deplpyment Group is: $DEPLOYMENT_GROUP_NAME";

if [ "$DEPLOYMENT_GROUP_NAME" == "GetSignBackEndCICDDev" ]; then
  sudo pm2 restart dev --user root
fi

if [ "$DEPLOYMENT_GROUP_NAME" == "GetSignBackEndCICDQA" ]; then
  sudo pm2 restart qa --user root
fi

if [ "$DEPLOYMENT_GROUP_NAME" == "GetSignBackEndCICDProd" ]; then
  sudo pm2 restart server --user root
fi

sudo pm2 status --user root


