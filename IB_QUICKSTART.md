# Interactive Brokers Quick Start Guide

## Step-by-Step Setup for Client Portal Gateway

### Step 1: Download Client Portal Gateway

#### Option A: Direct Download from Interactive Brokers

1. **Visit the IB API download page:**
   - Go to: https://www.interactivebrokers.com/en/trading/ib-api.php
   - Scroll to "Third Party Trading Software"
   - Look for "Client Portal Gateway" or "Client Portal API"

2. **Alternative direct link:**
   - https://download2.interactivebrokers.com/portal/clientportal.gw.zip

3. **Download the ZIP file** to your computer (approximately 50-100 MB)

#### Option B: From IB Account Management

1. Log in to your IB account at https://www.interactivebrokers.com
2. Navigate to: Settings > API > API Software
3. Download "Client Portal Gateway"

### Step 2: Extract the Files

**Windows:**
```
1. Right-click the downloaded clientportal.gw.zip
2. Select "Extract All..."
3. Choose a location (e.g., C:\IB\clientportal.gw)
4. Click "Extract"
```

**Mac:**
```bash
# Extract to your home directory
cd ~/Downloads
unzip clientportal.gw.zip -d ~/IB/
```

**Linux:**
```bash
# Extract to your home directory
cd ~/Downloads
unzip clientportal.gw.zip -d ~/IB/
```

### Step 3: Start the Gateway

#### Windows

1. **Open Command Prompt as Administrator**
   - Press Windows key, type "cmd"
   - Right-click "Command Prompt" and select "Run as administrator"

2. **Navigate to the gateway folder:**
   ```batch
   cd C:\IB\clientportal.gw
   ```

3. **Run the gateway:**
   ```batch
   bin\run.bat root\conf.yaml
   ```

4. **Expected output:**
   ```
   Starting Client Portal Gateway...
   Gateway started on https://localhost:5000
   ```

#### Mac

1. **Open Terminal** (Applications > Utilities > Terminal)

2. **Navigate to the gateway folder:**
   ```bash
   cd ~/IB/clientportal.gw
   ```

3. **Make the script executable:**
   ```bash
   chmod +x bin/run.sh
   ```

4. **Run the gateway:**
   ```bash
   bin/run.sh root/conf.yaml
   ```

5. **Expected output:**
   ```
   Starting Client Portal Gateway...
   Gateway started on https://localhost:5000
   ```

#### Linux

1. **Open Terminal**

2. **Navigate to the gateway folder:**
   ```bash
   cd ~/IB/clientportal.gw
   ```

3. **Make the script executable:**
   ```bash
   chmod +x bin/run.sh
   ```

4. **Run the gateway:**
   ```bash
   ./bin/run.sh root/conf.yaml
   ```

5. **Expected output:**
   ```
   Starting Client Portal Gateway...
   Gateway started on https://localhost:5000
   ```

### Step 4: Authenticate with IB

1. **Open your web browser** (Chrome, Firefox, Safari, or Edge)

2. **Navigate to:**
   ```
   https://localhost:5000
   ```

3. **Accept the SSL certificate warning:**
   - **Chrome:** Click "Advanced" → "Proceed to localhost (unsafe)"
   - **Firefox:** Click "Advanced" → "Accept the Risk and Continue"
   - **Safari:** Click "Show Details" → "visit this website"
   - **Edge:** Click "Advanced" → "Continue to localhost (unsafe)"

   *Note: This is safe - it's just a self-signed certificate for localhost*

4. **Log in with your IB credentials:**
   - Enter your IB username
   - Enter your password
   - Complete any two-factor authentication if enabled

5. **Keep this browser tab open** - the gateway needs an active session

### Step 5: Test the Connection

1. **Open the ULTY NAV Nowcast Tool:**
   ```bash
   cd /home/user/ULTY-Projects
   python -m http.server 8000
   ```

2. **In another browser tab, go to:**
   ```
   http://localhost:8000/Index.html
   ```

3. **Scroll down to "Interactive Brokers Account" section**

4. **Click "Connect to IB"**

5. **Expected result:**
   - Status should show "Connected - [N] account(s) found"
   - Account dropdown should populate
   - "Fetch Account Data" button should appear

6. **Select your account and click "Fetch Account Data"**

7. **Your positions should load automatically!**

---

## Troubleshooting

### Gateway won't start

**Error: "Java not found"**
```bash
# The gateway includes Java, but if you get this error:

# Windows: Make sure you're in the correct directory
cd C:\IB\clientportal.gw

# Mac/Linux: Make sure the path is correct
cd ~/IB/clientportal.gw
ls -la  # Should show bin/ and root/ folders
```

**Error: "Port 5000 already in use"**
```bash
# Something else is using port 5000

# Windows: Find and kill the process
netstat -ano | findstr :5000
taskkill /PID [process_id] /F

# Mac/Linux: Find and kill the process
lsof -ti:5000 | xargs kill -9
```

**Error: "Permission denied"**
```bash
# Mac/Linux: Make script executable
chmod +x bin/run.sh

# Or run with bash directly
bash bin/run.sh root/conf.yaml
```

### Cannot connect from browser

**Problem:** https://localhost:5000 doesn't load

**Solutions:**
1. Check that gateway is running (should see output in terminal)
2. Try https://127.0.0.1:5000 instead
3. Check firewall isn't blocking port 5000
4. Make sure you're using HTTPS not HTTP

### Authentication fails

**Problem:** Can't log in to the gateway

**Solutions:**
1. Verify your IB credentials at www.interactivebrokers.com
2. Ensure you have an IBKR Pro account (Lite doesn't support API)
3. Check if trading permissions are active
4. Try logging out and back in
5. Restart the gateway

### "Not authenticated" in ULTY app

**Problem:** App says "Not authenticated"

**Solutions:**
1. Make sure you logged in via https://localhost:5000 first
2. Keep the browser tab with the gateway open
3. Session may have expired - log in again
4. Try clicking "Connect to IB" again

### No accounts found

**Problem:** Connected but no accounts appear

**Solutions:**
1. Verify you have an IBKR Pro account (required for API)
2. Check account permissions in IB Account Management
3. Make sure account is fully activated and funded
4. Try logging out and back in to the gateway

### Positions not loading

**Problem:** Account loads but no positions

**Solutions:**
1. Verify you have open positions in IB
2. Check that positions are in the selected account
3. Try refreshing: click "Fetch Account Data" again
4. Check browser console for errors (F12 → Console tab)

### CORS errors

**Problem:** Browser shows CORS policy errors

**Solutions:**
1. Make sure gateway is running on port 5000
2. Ensure you accepted the SSL certificate at https://localhost:5000
3. Try a different browser
4. Clear browser cache and cookies for localhost

---

## Quick Reference

### Start Gateway (Quick Commands)

**Windows:**
```batch
cd C:\IB\clientportal.gw
bin\run.bat root\conf.yaml
```

**Mac/Linux:**
```bash
cd ~/IB/clientportal.gw
bin/run.sh root/conf.yaml
```

### Gateway URLs

- **Gateway Web Interface:** https://localhost:5000
- **Authentication Check:** https://localhost:5000/v1/api/iserver/auth/status
- **Account List:** https://localhost:5000/v1/api/portfolio/accounts

### Stop Gateway

- Press `Ctrl+C` in the terminal where gateway is running
- Or close the terminal window

### Required Ports

- **5000** - Client Portal Gateway (HTTPS)
- **8000** - ULTY NAV Tool (HTTP, if using Python server)

---

## Configuration Tips

### Change Gateway Port (Optional)

If port 5000 conflicts with another application:

1. Edit `root/conf.yaml` in the gateway folder
2. Find the line: `listenPort: 5000`
3. Change to a different port (e.g., `5001`)
4. Update `js/ib-connector.js` in ULTY app:
   ```javascript
   this.baseUrl = 'https://localhost:5001/v1/api';
   ```

### Enable Logging (Optional)

For debugging, enable detailed logging:

1. Edit `root/conf.yaml`
2. Find `logging` section
3. Set `level: DEBUG`
4. Restart gateway

---

## Security Reminders

- Gateway runs only on localhost (not exposed to internet)
- Uses HTTPS with self-signed certificate (normal for localhost)
- Sessions timeout after inactivity
- Always log out when done
- Keep gateway software updated
- Never share your IB credentials
- Enable 2FA on your IB account

---

## System Requirements

- **Java:** Included with gateway (no separate install needed)
- **RAM:** Minimum 512 MB available
- **Disk Space:** ~200 MB
- **OS:** Windows 10+, macOS 10.14+, or Linux
- **Browser:** Chrome, Firefox, Safari, or Edge (latest version)
- **IB Account:** IBKR Pro (API access required)

---

## Need Help?

**IB Support:**
- https://www.interactivebrokers.com/en/support/contact.php
- Phone: 1-877-442-2757 (US)

**API Documentation:**
- https://interactivebrokers.github.io/cpwebapi/
- https://www.interactivebrokers.com/campus/ibkr-api-page/

**ULTY NAV Tool Issues:**
- Check browser console (F12 → Console)
- Review `IB_INTEGRATION.md` for detailed docs
- Verify gateway is running and authenticated

---

## Success Checklist

- [ ] Downloaded clientportal.gw.zip
- [ ] Extracted to a folder (e.g., ~/IB/clientportal.gw)
- [ ] Started gateway with run.sh or run.bat
- [ ] Logged in at https://localhost:5000
- [ ] Opened ULTY NAV Tool
- [ ] Clicked "Connect to IB" successfully
- [ ] Selected account from dropdown
- [ ] Clicked "Fetch Account Data"
- [ ] Positions loaded successfully
- [ ] Ready to calculate NAV nowcasts!

---

**You're all set!** Your Interactive Brokers account is now connected to the ULTY NAV Nowcast Tool.
