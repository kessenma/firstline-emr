> **📋 File Migration Info**
> - **Original Location:** `apps/docs/LOGIN_TEST_CHECKLIST.md`
> - **Moved Date:** 2025-12-08
> - **Moved By:** migrate-markdown-docs.sh

---

# Login Test Checklist

## 🧪 Pre-Test Setup

### Environment Check
- [ ] Dev server is running (`pnpm devWeb`)
- [ ] PostgreSQL database is accessible
- [ ] `.env.local` file exists with correct values:
  - [ ] `DATABASE_URL` set
  - [ ] `NEXTAUTH_URL` set (should be `http://localhost:3000`)
  - [ ] `NEXTAUTH_SECRET` set
  - [ ] `JWT_SECRET` set
  - [ ] `GOOGLE_CLIENT_ID` set (if using Google login)
  - [ ] `GOOGLE_CLIENT_SECRET` set (if using Google login)

### Browser Setup
- [ ] Using Chrome, Firefox, or Edge (latest version)
- [ ] No browser extensions interfering (or use incognito)
- [ ] JavaScript enabled
- [ ] Cookies enabled

### Clean State
- [ ] Browser console open BEFORE loading page (F12)
- [ ] Clear all site data OR use incognito/private window
  - Application tab → Storage → Clear site data
- [ ] No other tabs with the app open
- [ ] Clear console logs (🚫 icon)

## 📝 Test Cases

### Test 1: Fresh Login
**Goal:** Verify basic login flow works

**Steps:**
1. Navigate to `http://localhost:3000/auth/login`
2. Enter valid credentials:
   - Email: [your test email]
   - Password: [your test password]
3. Click "Login" button

**Expected Console Logs (in order):**
```
🔐 LoginForm - Component mounted
🔐 LoginForm - Providers fetched
[User clicks Login]
🔐 LoginForm - Login button clicked
🔐 LoginForm - Form onSubmit event fired
🔐 LoginForm - onSubmit called!
🔐 LoginForm - Form data: { email: "...", hasPassword: true }
🔐 LoginForm - Set submitting to true
🔐 LoginForm - Starting login attempt with api.signIn
🔐 apiWrapper.signIn - Starting NextAuth signIn
[Server logs]
🔐 Attempting login for: [email]
✅ Login successful for: [email]
--- SignIn Callback ---
🔑 JWT callback - Setting user ID: [id]
🔑 JWT callback - Setting user email: [email]
📋 Session callback - User ID: [id]
📋 Session callback - User Email: [email]
[Back to browser]
🔐 apiWrapper.signIn - NextAuth response received
🔐 apiWrapper.signIn - Response: { ok: true, error: null, status: 200, url: null }
🔐 LoginForm - SignIn response received
🔐 LoginForm - response.ok: true
🔐 LoginForm - isSuccess evaluated to: true
✅ LoginForm - Login successful!
✅ LoginForm - About to redirect to /home
✅ LoginForm - Redirecting NOW...
✅ LoginForm - REDIRECT EXECUTING
[Page changes to /home]
🏠 Home page - Session status: authenticated
🏠 Home page - User data: {...}
✅ Home page - Full render starting
```

**Expected Results:**
- [ ] No error messages appear
- [ ] No error toasts appear
- [ ] URL changes from `/auth/login` to `/home`
- [ ] Home page renders with user's name
- [ ] No 401 errors in console
- [ ] No 401 errors in Network tab

**Result:** ✅ PASS / ❌ FAIL

**Notes:**
_______________________________________________

---

### Test 2: Invalid Password
**Goal:** Verify error handling

**Steps:**
1. Navigate to `http://localhost:3000/auth/login`
2. Enter valid email but WRONG password
3. Click "Login" button

**Expected Logs:**
```
[... login attempt logs ...]
❌ Invalid password for: [email]
❌ LoginForm - Login failed
❌ LoginForm - Error message: Invalid password
```

**Expected Results:**
- [ ] Error toast appears with "Invalid password" message
- [ ] User stays on `/auth/login` page
- [ ] Form is re-enabled (not stuck in loading state)
- [ ] Can attempt login again

**Result:** ✅ PASS / ❌ FAIL

**Notes:**
_______________________________________________

---

### Test 3: Non-existent Email
**Goal:** Verify user not found handling

**Steps:**
1. Navigate to `http://localhost:3000/auth/login`
2. Enter email that doesn't exist in database
3. Click "Login" button

**Expected Results:**
- [ ] Error message: "That email does not exist in our database."
- [ ] User stays on login page
- [ ] Form is re-enabled

**Result:** ✅ PASS / ❌ FAIL

**Notes:**
_______________________________________________

---

### Test 4: Unauthorized User
**Goal:** Verify unauthorized user can't login

**Steps:**
1. Create a user in database with `authorized: false`
2. Try to login with that user's credentials

**Expected Results:**
- [ ] Error message: "Your account has not been approved yet."
- [ ] User stays on login page
- [ ] Cannot access protected routes

**Result:** ✅ PASS / ❌ FAIL

**Notes:**
_______________________________________________

---

### Test 5: Session Persistence
**Goal:** Verify session survives page refresh

**Steps:**
1. Login successfully (complete Test 1)
2. Once on `/home`, refresh the page (F5 or Ctrl+R)

**Expected Results:**
- [ ] Page reloads
- [ ] User remains on `/home`
- [ ] User data still displayed
- [ ] No redirect to login page
- [ ] Session status: "authenticated"

**Result:** ✅ PASS / ❌ FAIL

**Notes:**
_______________________________________________

---

### Test 6: Protected Route Access
**Goal:** Verify authenticated users can access protected routes

**Steps:**
1. Login successfully
2. Navigate to `/patient-dashboard`
3. Navigate to `/settings`
4. If admin, navigate to `/adminDashboard`

**Expected Results:**
- [ ] All routes load successfully
- [ ] No 401 errors
- [ ] No redirects to login page
- [ ] User data available on all pages

**Result:** ✅ PASS / ❌ FAIL

**Notes:**
_______________________________________________

---

### Test 7: API Endpoint Access
**Goal:** Verify API calls work with session

**Steps:**
1. Login successfully
2. Open Network tab in DevTools
3. Navigate to a page that makes API calls (like `/home`)
4. Watch for API requests

**API Calls to Check:**
- [ ] `/api/auth/session` - Status 200
- [ ] `/api/user-settings/[id]` - Status 200 (not 401)
- [ ] `/api/notifications/[id]` - Status 200 (not 401)
- [ ] `/api/messages/unread-count/[id]` - Status 200 (not 401)

**Expected Results:**
- [ ] All API calls return 200 OK
- [ ] No 401 Unauthorized errors
- [ ] Session cookie sent with each request
- [ ] Data returned successfully

**Result:** ✅ PASS / ❌ FAIL

**Notes:**
_______________________________________________

---

### Test 8: Logout Flow
**Goal:** Verify logout works correctly

**Steps:**
1. Login successfully
2. Click user avatar/menu
3. Click "Logout" (if available) or navigate to `/api/auth/signout`
4. Confirm logout

**Expected Results:**
- [ ] Session cleared
- [ ] Redirected to login page
- [ ] Cannot access protected routes without login
- [ ] Session cookie removed

**Result:** ✅ PASS / ❌ FAIL

**Notes:**
_______________________________________________

---

### Test 9: Direct Protected Route Access (Unauthenticated)
**Goal:** Verify middleware protects routes

**Steps:**
1. In incognito window, navigate directly to `http://localhost:3000/home`
2. Do NOT login first

**Expected Results:**
- [ ] Immediately redirected to `/auth/login`
- [ ] Cannot see home page content
- [ ] Middleware logs show redirect

**Result:** ✅ PASS / ❌ FAIL

**Notes:**
_______________________________________________

---

### Test 10: Already Authenticated User Visiting Login
**Goal:** Verify login page redirects authenticated users

**Steps:**
1. Login successfully (be on `/home`)
2. Manually navigate to `http://localhost:3000/auth/login`

**Expected Logs:**
```
🔐 Login page - Session status: authenticated
🔐 Login page - User is authenticated, redirecting to /home
```

**Expected Results:**
- [ ] Immediately redirected back to `/home`
- [ ] Don't see login form
- [ ] Stay authenticated

**Result:** ✅ PASS / ❌ FAIL

**Notes:**
_______________________________________________

---

## 🔍 Network Tab Inspection

### Session Cookie Check
After successful login, check cookies:

1. Open DevTools → Application tab → Cookies
2. Look for: `http://localhost:3000`

**Expected Cookies:**
- [ ] `next-auth.session-token` exists
- [ ] `next-auth.csrf-token` exists
- [ ] Cookies have correct domain
- [ ] Cookies are HttpOnly (where appropriate)

### API Request Headers
Check any protected API request:

1. Network tab → Click on API request
2. Check "Request Headers"

**Expected:**
- [ ] Cookie header includes `next-auth.session-token`
- [ ] Request has proper origin

### API Response Check
For `/api/auth/session` request:

**Expected Response:**
```json
{
  "user": {
    "id": "...",
    "email": "...",
    "firstName": "...",
    "lastName": "...",
    "accountType": "...",
    "isAdmin": false,
    ...
  },
  "expires": "..."
}
```

## 🐛 Troubleshooting Guide

### Issue: Form submits but no logs appear
**Check:**
- Console cleared after page load?
- Correct email format?
- Form validation passing?

**Try:**
```javascript
// In browser console
document.querySelector('form').reportValidity()
```

### Issue: Redirect logs appear but page doesn't change
**Check:**
- Browser console for errors
- Network tab for failed requests
- Cookie is actually set

**Try:**
```javascript
// Force navigate
window.location.href = '/home'
```

### Issue: 401 errors after login
**Check:**
- Session cookie exists
- Middleware logs
- Server-side `getServerSession` calls

**Debug:**
```javascript
// Check session
fetch('/api/auth/session').then(r => r.json()).then(console.log)
```

### Issue: Infinite loading state
**Check:**
- SessionProvider wrapping app
- No JavaScript errors
- Network requests completing

## 📊 Test Summary

**Date:** _______________
**Tester:** _______________
**Environment:** Dev / Staging / Production
**Browser:** _______________

| Test | Result | Notes |
|------|--------|-------|
| 1. Fresh Login | ⬜ PASS / FAIL | |
| 2. Invalid Password | ⬜ PASS / FAIL | |
| 3. Non-existent Email | ⬜ PASS / FAIL | |
| 4. Unauthorized User | ⬜ PASS / FAIL | |
| 5. Session Persistence | ⬜ PASS / FAIL | |
| 6. Protected Routes | ⬜ PASS / FAIL | |
| 7. API Endpoints | ⬜ PASS / FAIL | |
| 8. Logout Flow | ⬜ PASS / FAIL | |
| 9. Protected Access | ⬜ PASS / FAIL | |
| 10. Already Auth | ⬜ PASS / FAIL | |

**Overall Status:** ✅ ALL PASS / ⚠️ PARTIAL / ❌ FAILED

**Critical Issues Found:**
_______________________________________________
_______________________________________________

**Non-Critical Issues:**
_______________________________________________
_______________________________________________

**Recommendations:**
_______________________________________________
_______________________________________________

## ✅ Sign-off

Once all tests pass:
- [ ] All 10 test cases passed
- [ ] No 401 errors observed
- [ ] Session persistence working
- [ ] Logout working
- [ ] Ready for production

**Approved by:** _______________
**Date:** _______________

---

**Next Steps:**
1. If all tests pass → Proceed with MongoDB to PostgreSQL migration
2. If tests fail → Review LOGIN_DEBUG_GUIDE.md
3. Document any new issues found