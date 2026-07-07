module.exports = {
  apps: [
    {
      name: "dfa-backend",
      cwd: "/home/dfa-admin/ai-forensics-assistant/backend",
      script: "/home/dfa-admin/ai-forensics-assistant/venv/bin/uvicorn",
      args: "app.main:app --host 0.0.0.0 --port 8000",
      interpreter: "none",
      env: {
        PATH: "/home/dfa-admin/ai-forensics-assistant/venv/bin:/usr/local/bin:/usr/bin:/bin",
        VIRTUAL_ENV: "/home/dfa-admin/ai-forensics-assistant/venv",
        PYTHONPATH: "/home/dfa-admin/ai-forensics-assistant/backend",
      },
      autorestart: true,
      watch: false,
      max_restarts: 5,
      restart_delay: 3000,
    },
    {
      name: "dfa-frontend",
      cwd: "/home/dfa-admin/ai-forensics-assistant/frontend",
      script: "node_modules/.bin/next",
      args: "start",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        NEXT_PUBLIC_API_URL: "http://localhost:8000",
      },
      autorestart: true,
      watch: false,
      max_restarts: 5,
      restart_delay: 3000,
    },
  ],
};