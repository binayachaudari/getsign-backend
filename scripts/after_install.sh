#!/bin/bash

echo "Deplpyment Group is: $DEPLOYMENT_GROUP_NAME";

if [ "$DEPLOYMENT_GROUP_NAME" == "GetSignBackEndCICDDev"]; then
  cd /var/www//var/www/GetSign-Dev/jetsign-backend
fi

if [ "$DEPLOYMENT_GROUP_NAME" == "GetSignBackEndCICDProd"]; then
  cd /home/ubuntu/GetSign/jetsign-backend
fi

sudo yarn --frozen-lockfile
