> **📋 File Migration Info**
> - **Original Location:** `apps/docs/coolify_setup.md`
> - **Moved Date:** 2025-12-08
> - **Moved By:** migrate-markdown-docs.sh

---

#  setting up a coolify container and connecting it to github actions

Setting up coolify + docker + env’s

1. Ssh into your server and install coolify
    1. Docs: https://coolify.io/docs/get-started/installation#quick-installation-recommended
    2. Run curl -fsSL https://get.coollabs.io/coolify/install.sh | bash
2. Once installed go to the URL provided to setup the admin account for the new server
3. Login.
4. Run this in your terminal to update the SSH config settings so GitHub can access the server:  nano /etc/ssh/sshd_config
5. Go to the bottom and add these vars in:  PermitRootLogin prohibit-password PubkeyAuthentication yes
6. Run this to reset the server:  systemctl restart ssh
7. Go back to the the coolify console then click ‘sources’ on the left panel
8. Name your new coolify app
9. Continue the manual installation (click continue)
10. Go here  https://github.com/settings/apps/new  login
11. Name your new GitHub app that will connect to this server
12. Setup your GitHub app:  Repository permissions: Homepage url = the IP of coolify callback url = http://<SERVER_IP>:8000/api/oauth/github/callback Webhook url: http://<SERVER_IP>:8000/api/webhooks/github web hook Secret (optional): make it something random and copy it for coolify/ <WEBHOOK_SECRET> Contents → Read-only Metadata → Read-only Subscribe to events Push (optional, for auto-deploys)
13. Copy the  app ID <APP_ID> client ID <CLIENT_ID>  client secret <CLIENT_SECRET>  web hook secret <WEBHOOK_SECRET>
    1. Generate the private key and copy it
