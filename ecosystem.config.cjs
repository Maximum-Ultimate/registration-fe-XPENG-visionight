module.exports = {
  apps: [
    {
      name: "XPENG Visionight Registration",
      script: "/home/abracodebra-microsite/.nvm/versions/node/v22.22.2/bin/serve",
      args: "-s dist -l 3220",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};