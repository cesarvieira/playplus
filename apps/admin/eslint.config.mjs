import withNuxt from './.nuxt/eslint.config.mjs';
import rootConfig from '../../eslint.config.mjs';

const sharedConfigs = Array.isArray(rootConfig) ? rootConfig : [rootConfig];

export default withNuxt(...sharedConfigs);
