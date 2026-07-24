# Setup and demo guide

## 1. Validate locally

```bash
pnpm install
pnpm run check
pnpm run preview
```

Open `http://127.0.0.1:4173`. The local adapter uses `dev/mock-state.json`, so the interface can be reviewed before Google authorization.

## 2. Connect Apps Script

```bash
pnpm exec clasp login
```

Create a new standalone Apps Script project and push the source:

```bash
pnpm exec clasp create-script --title "Partner Onboarding Autopilot" --type standalone --rootDir src
pnpm run clasp:push
```

The `create-script` command writes `.clasp.json` for a new project. If connecting an existing project, use `.clasp.example.json` as the starting point instead.

## 3. Create the Sheet

Open the Apps Script editor and run:

```javascript
setupDemoSpreadsheet()
```

Authorize the requested Google Sheets permissions. The function creates all eight sheets, writes headers, seeds the exact Ledgerly exercise data, and stores the spreadsheet ID in Script Properties.

## 4. Install the scanner

Run:

```javascript
installScheduledTrigger()
```

This removes any prior scanner trigger and installs one five-minute clock trigger for `scheduledScan`.

## 5. Deploy the web app

In Apps Script:

1. Select **Deploy → New deployment**.
2. Choose **Web app**.
3. Execute as yourself.
4. Select the access level appropriate for the reviewer.
5. Deploy and open the generated URL.

## Recommended five-minute demo

1. Start on **Activations** and explain Sheets → scanner → draft review.
2. Show that Ledgerly is in `AUTO`, then switch to `MANUAL` to explain the control.
3. Use a pending partner in **Demo controls** and simulate activation.
4. Run the scan or manually accept the activation.
5. Open **Email Reviews** and move through Day 0, Day 3, and Day 7.
6. Point out the key message and desired outcome beside each preview.
7. Briefly show **Programs** and **Partners** to demonstrate that content comes from configurable data, not hard-coded UI.

The demo should emphasize the activation logic and message decisions. The management pages support that story; they are not the story themselves.
