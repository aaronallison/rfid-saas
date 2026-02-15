/**
 * @fileoverview Entry point for the React Native application
 * This file registers the root component and is used by Metro bundler
 */

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);