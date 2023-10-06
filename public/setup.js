// setup.js

import App from "./models/App.js";
import UIManager from "./components/UIManager.js";

const setup = () => {
    const app = new App();
    const uiManager = new UIManager(app);

    // Add any necessary setup code for the UIManager instance here

    return uiManager;
};

export default setup;
