# Actions on Google: Windy City Bus Tracker

### Prerequisites
1. Node.js and NPM
    + We recommend installing using [nvm for Linux/Mac](https://github.com/creationix/nvm) and [nvm-windows for Windows](https://github.com/coreybutler/nvm-windows)
1. Install the [Firebase CLI](https://developers.google.com/assistant/actions/dialogflow/deploy-fulfillment)
    + We recommend using MAJOR version `8` , `npm install -g firebase-tools@^8.0.0`
    + Run `firebase login` with your Google account
1. Get an API key on the [CTA website](https://www.transitchicago.com/developers/bustracker/)

### Setup
#### Actions Console
1. From the [Actions on Google Console](https://console.actions.google.com/), **New project** > **Create project** > under **What kind of Action do you want to build?** > **Custom** > **Blank project**

#### Actions CLI
1. Install the [Actions CLI](https://developers.google.com/assistant/actionssdk/gactions)
1. Navigate to `sdk/settings/settings.yaml`, and replace `<PROJECT_ID>` with your project ID
    + To find your project ID, click the three dots > **Project Settings**
1. Navigate to the `sdk/` directory by running `cd sdk` from the root directory of this project.
1. Run `gactions login` to login to your account.
1. Run `gactions push` to push your project.
1. Update `settings.yaml` (or **Settings** in the Actions Console) to fix errors
    + e.g. `displayName` key must be unique from other Actions).

#### Firebase Functions
1. Navigate to the functions directory.
1. Run `npm install`
1. Run `firebase use --add` and follow the prompts to use your project.
1. Run `npm run deploy`. Follow console instructions to fix errors (i.e. update your billing plan).
1. Navigate to `functions/package.json` and update the `name` key with your project name.
1. Configure your functions environment by running `firebase functions:config:set ctabustracker.key="THE API KEY"` with your API key from the CTA
1. Run `npm run deploy` again. Copy the function URL and paste it in `baseUrl` key in `sdk/webhooks/ActionsOnGoogleFulfillment.yaml`
1. Navigate to the `sdk/` directory and run `gactions push`.

### Running this Sample
+ Run `gactions deploy preview` to deploy your project. Alternatively, go to the Actions Console, refresh the page and click on the "Test" tab.
+ You can test your Action on any Google Assistant-enabled device on which the Assistant is signed into the same account used to create this project. Just say or type, “OK Google, talk to my test app”.
+ You can also use the Actions on Google Console simulator to test most features and preview on-device behavior.

### Developing this Sample
Deploying your function every time you update code gets annoying. So here is how you test locally. It is recommended to create another project solely for testing by following the instructions above.
1. Run `npm i ngrok -g`.
1. Navigate to the `functions/` directory.
1. `firebase functions:config:get > .runtimeconfig.json`
    + If using Windows PowerShell, replace the above with: `firebase functions:config:get | ac .runtimeconfig.json`
1. Run `npm run serve`. Note the port on which the function is running, usually 5001
1. Run `ngrok http <PORT>` with the port number.
1. Copy the HTTPS forwarding URL and paste it in `baseUrl` key in `sdk/webhooks/ActionsOnGoogleFulfillment.yaml`
1. Run `gactions push` from the `sdk/` directory.
1. Test code live from the Actions on Google Console simulator.
#### When Finished
1. Replace the `baseUrl` value with the original Firebase function URL
    + You can find this in your Firebase Console if it doesn't appear in your own.
1. Run `npm run deploy` from the `functions/` directory.



## References & Issues
+ Questions? Go to [StackOverflow](https://stackoverflow.com/questions/tagged/actions-on-google) or the [Assistant Developer Community on Reddit](https://www.reddit.com/r/GoogleAssistantDev/).
+ For bugs, please report an issue on Github.
+ Actions on Google [Documentation](https://developers.google.com/assistant)
+ Actions on Google [Codelabs](https://codelabs.developers.google.com/?cat=Assistant)
+ Firebase [Environment Configuration](https://firebase.google.com/docs/functions/config-env)
+ Firebase [Run Functions Locally](https://firebase.google.com/docs/functions/local-emulator#set_up_functions_configuration_optional)

## Contributing
Please read and follow the steps in the [CONTRIBUTING.md](CONTRIBUTING.md).

## License
See [LICENSE](LICENSE).
