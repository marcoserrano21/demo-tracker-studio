# ✅ DEPLOYMENT CHECKLIST

## Important: Cross-Project Setup

**Your app uses:**
- **Hosting:** tesladrivehub (Firebase App Hosting)
- **Database:** studio-2717279964-3f1e2 (Firestore)

This is normal! The app is hosted on one project but connects to data in another.

---

## Before Deploying

- [ ] Code is up to date with latest changes
- [ ] `npm run build` completes without errors
- [ ] Localhost shows advisors and data correctly
- [ ] Browser console shows: `Connected to database project: studio-2717279964-3f1e2`

## During Deployment

### Via Firebase App Hosting Console (Recommended):
- [ ] Go to https://console.firebase.google.com/u/0/project/tesladrivehub/apphosting
- [ ] You're already in the correct hosting project (tesladrivehub)
- [ ] Click "Create new release" or "Roll out"
- [ ] Wait for deployment to complete (may take a few minutes)

---

## After Deployment

### Immediate Checks (First 30 seconds):
- [ ] Open deployed site URL
- [ ] Press F12 to open browser console
- [ ] Look for log: `[Firebase Init] Connected to project: studio-2717279964-3f1e2`
- [ ] Look for log: `[Firebase Connection] Connected to database project: studio-2717279964-3f1e2`
- [ ] **Note:** Even though hosted on tesladrivehub, it should connect to studio-2717279964-3f1e2 database

### Data Verification (Next 2 minutes):
- [ ] Click "Select Store" → Choose any store (e.g., "Oakbrook")
- [ ] "Select Your Name" dialog appears
- [ ] Dropdown shows advisor names (not empty)
- [ ] Select your advisor (e.g., "Marco Serrano")
- [ ] Click "Continue"

### Full Functionality Check (Next 5 minutes):
- [ ] **My Hub tab**: Shows XP, Level, Achievements, Streak
- [ ] **Fleet tab**: Shows vehicles with battery levels
- [ ] **Schedule tab**: Shows scheduled drives
- [ ] **History tab**: Shows past drive logs
- [ ] **Hall of Fame tab**: Shows leaderboard with advisors

## 🚨 If Anything Fails

### Symptom: No advisors in dropdown
**Check:**
- [ ] Console shows: `Connected to database project: studio-2717279964-3f1e2`?
- [ ] Any console errors about Firebase connection?
- [ ] Network tab shows failed Firebase API calls?

**Possible Causes:**
1. Ad blocker blocking Firebase connections
2. Network/firewall issues
3. Cache issue

**Fix:**
1. Check console logs for exact error
2. Try disabling ad blocker
3. Hard refresh (Ctrl+Shift+R)
4. Try incognito mode

### Symptom: Console shows different database project
**Example:**
```
[Firebase Connection] Connected to database project: tesladrivehub
```

**This means:**
- App is connecting to tesladrivehub database (which is empty)
- Should connect to studio-2717279964-3f1e2 instead

**Fix:**
1. Check `src/firebase/config.ts` - should show `projectId: "studio-2717279964-3f1e2"`
2. If config is correct, rebuild and redeploy
3. Clear browser cache completely

## 📊 Success Confirmation

### You know it worked when you see ALL of these:

✅ Console log: `Connected to database project: studio-2717279964-3f1e2`  
✅ Advisors show in dropdown (names visible)  
✅ XP and level displayed in My Hub  
✅ Achievements unlocked and visible  
✅ Scheduled drives in Schedule tab  
✅ Historical data in History tab  
✅ No console errors  

### If ALL ✅ above = SUCCESS! 🎉

Your deployed site is now connected to the same database as localhost and all your data is accessible!

---

**Hosting Project**: tesladrivehub (Firebase App Hosting)  
**Database Project**: studio-2717279964-3f1e2 (Firestore)  
**Deploy URL**: https://console.firebase.google.com/u/0/project/tesladrivehub/apphosting  
**Expected Result**: Full data visibility (advisors, XP, achievements, drives)
