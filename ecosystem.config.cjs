module.exports = {
  apps: [
    {
      name: "XPENG Visionight RSVP",
      script: "/home/xpengvisionnight-rsvp/.nvm/versions/node/v22.22.3/bin/serve",
      args: "-s dist -l 3020",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};