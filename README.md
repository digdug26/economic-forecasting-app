# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Environment Setup

Copy `.env.example` to `.env` and fill in the values before building or
deploying the project. The following environment variables are supported:

- `NEXT_PUBLIC_SITE_URL` (or `REACT_APP_SITE_URL`)
- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`
- Optional: `REACT_APP_SUPABASE_SERVICE_ROLE_KEY`
- Optional: `INVITE_REDIRECT_URL` - redirect URL for invitation links
- Optional: `REACT_APP_NEWS_API_KEY` - NewsAPI key for the Economic News widget
- Optional: `REACT_APP_GUARDIAN_API_KEY` - Guardian Open Platform key used when NewsAPI quota is exhausted

These values must be provided before running `npm run build` or starting a
deployment.

## Supabase Edge Function

The application expects an Edge Function named `invite-user` to be deployed to
your Supabase project. This function calls the database RPC
`create_user_invitation` and then uses Supabase's Admin API to send an invite
email from `noreply@mail.app.supabase.io`. The email contains a link to set the
user's password. The link will redirect to the URL specified in the
`INVITE_REDIRECT_URL` environment variable. A reference implementation is
provided under `supabase/functions/invite-user`.

The underlying database function is defined in
`supabase/migrations/000_create_user_invitation.sql`. Run
`npm run db:init` to execute this migration on a new Supabase project
before invoking the edge function.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
