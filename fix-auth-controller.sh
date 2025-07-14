#!/bin/bash

# Fix script to update auth controller on Render

cat << 'EOF' > /tmp/auth-fix.js
// Add this to the beginning of authController.js after the class definition
// Bind methods to maintain 'this' context
const controller = new AuthController();
controller.register = controller.register.bind(controller);
controller.login = controller.login.bind(controller);
controller.refresh = controller.refresh.bind(controller);
controller.getMe = controller.getMe.bind(controller);
controller.updatePushToken = controller.updatePushToken.bind(controller);
controller.generateAccessToken = controller.generateAccessToken.bind(controller);
controller.generateRefreshToken = controller.generateRefreshToken.bind(controller);

module.exports = controller;
EOF

echo "Fix created. To apply on Render:"
echo "1. Go to Render Dashboard → Shell"
echo "2. Run these commands:"
echo ""
echo "cd src/controllers"
echo "cp authController.js authController.js.backup"
echo ""
echo "# Then edit the file to bind methods properly"