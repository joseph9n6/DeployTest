// Joseph: Tips til dere som vil teste ut Ut-ut-demo
Tips: etter å ha lastet ned mappen og strukturen gjennom her/github dekstop. 1.Kjør npm install først. 2.kjør npm run dev. npm greiene skal kjører i vs codes in terminal. bytt terminalen fra powershell til cdm. Hvis ikke dette funker så har du kanskje ikke installert node.js og Git. Sørg også at inni VS CODE terminalen at din mappestruktur er inni UT-ut-demo.

-Frontend:
    cd UT-ut-demo/gå inn i mappen UT-ut-demo
    npm install
    npm run dev
- Backend:
    cd backend
    npm install
    npm run dev

.env forklaring:

lag backend/.env fra .env.example

2) Legg til .env.example (må pushes)

Fil: backend/.env.example

PORT=5000
MONGODB_URI=YOUR_ATLAS_URI_HERE
SESSION_SECRET=CHANGE_ME

3) Fortell dem “hva de IKKE skal endre”

Gi dem en enkel regel:

Ikke rør routes/auth.routes.js, config/passport.js, session-oppsettet i server.js uten å si ifra

Legg nye features i egne routes/collections:

f.eks. routes/trips.routes.js, models/Trip.js


// Default greier når man laster ned react/vite....
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
