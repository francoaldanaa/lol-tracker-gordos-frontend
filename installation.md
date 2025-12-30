# Configure and install dependencies

### Configure dependencies and create deploy user that will own the frontend.

```
sudo apt update
sudo apt -y upgrade
sudo apt -y install git curl ca-certificates

adduser deploy
usermod -aG sudo deploy

sudo chown -R deploy:deploy /opt/lol-tracker-gordos-frontend
sudo chmod -R u+rwX,g+rX,o-rwx /opt/lol-tracker-gordos-frontend

su - deploy
```

### Add NPM repo
```
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
```

### Install a Node version that matches your project (.nvmrc or package.json "engines")
```
nvm install --lts
node -v
npm -v
```

### Enable pnpm
```
corepack enable
corepack prepare pnpm@latest --activate
pnpm -v
```

### Set environment variables file
> [!NOTE] Remember:
> NODE_ENV=production
> PORT=3000

```
sudo nano /etc/lol-tracker-gordos-frontend.env
sudo chown root:root /etc/lol-tracker-gordos-frontend.env
sudo chmod 640 /etc/lol-tracker-gordos-frontend.env
```

### Install deps for the project and build
```
cd /opt/lol-tracker-gordos-frontend
pnpm install --frozen-lockfile
pnpm build
```

### Install PM2
```
npm i -g pm2
chmod +x /opt/lol-tracker-gordos-frontend/start-prod.sh
```

### Start
```
pm2 start ./start-prod.sh --name gordostracker-app
pm2 logs gordostracker-app
```

### Set auto start on reboot
```
pm2 save
pm2 startup systemd
```

## Configure init on reboot and NGINX

Refer to [NGINX and PM2 guide](auto-setup.md)