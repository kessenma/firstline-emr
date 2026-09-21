This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

# Fajr.EMR
![Fajr.EMR Logo](public/assets/images/logo.svg)

---

## Getting Started (running and updating the code)
This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).


- Clone the repository:
```bash
git clone https://github.com/<your github username>/med-flow.git
cd med-flow
npm install
```

- Run the development server:
```bash
npm run dev
```

- Open http://localhost:3000 in your browser.

- to log in, contact a senior developer with the most recent .env file, then put the .env file at the root of the med-flow folder.

## To update the code, follow the following process:
-create a new branch;
```bash
git checkout -b "newFeatureName"
```
- make your updates on this new branch and upload (push) them to the branch: 
```bash
git add files/that/were/updated 
```
```bash
git commit -m "feature name, feature description, etc"
```
```bash
git push
```
- then when complete, merge the main branch onto yours (or use a Git GUI for a better DEVx)
```bash
git merge staging 
```
- manage any merge conflicts that come up. once all the merge conflicts are satisfied, run 
```bash
npm build 
```
- manage any build conflicts that come up. once all the build conflicts are satisfied, run
```bash
git checkout staging
```

- merge your new feature branch into the staging branch (there should not be any merge conflicts, but if there are correct them)
```bash
git merge newFeatureName
```

- push your changes to the staging branch 
 ```bash
git push
```

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

