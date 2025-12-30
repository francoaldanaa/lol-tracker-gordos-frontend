# Configure NGINX, UFW and CertBot

### Install Nginx

```
sudo apt update
sudo apt -y install nginx
sudo systemctl enable --now nginx
# Test the config is fine
sudo nginx -t
```

### Create configuration file
sudo nano /etc/nginx/sites-available/gordos-tracker-frontend

```
server {
    listen 80;
    server_name gordostracker.duckdns.org _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```


### Enable it and reload
```
sudo ln -s /etc/nginx/sites-available/gordos-tracker-frontend /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### Configure UFW
Since we are using Nginx on port 80, we only want to open SSH + HTTP/S. Order matters:

```
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

### Enable HTTPS with Certbot

```
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
certbot --version

# Request certificate
sudo certbot --nginx -d gordostracker.duckdns.org
```



## How to recover if something went wrong

### DigitalOcean Recovery Console - disable ufw:

```
ufw disable
```


### DNS issues
If you changed DNS lately, ensure it is propagated correctly, all these should point to the same IP (droplet):

```
dig @1.1.1.1 gordostracker.duckdns.org A +time=2 +tries=1
dig @8.8.8.8 gordostracker.duckdns.org A +time=2 +tries=1
dig @1.1.1.1 gordostracker.duckdns.org AAAA +time=2 +tries=1
```