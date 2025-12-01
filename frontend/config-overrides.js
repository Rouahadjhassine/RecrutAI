const { override } = require('customize-cra');

module.exports = override((config) => {
  // Forcer le chargement des variables d'environnement
  config.plugins.forEach((plugin) => {
    if (plugin.definitions && plugin.definitions['process.env']) {
      plugin.definitions['process.env'].NODE_ENV = JSON.stringify(process.env.NODE_ENV || 'development');
      plugin.definitions['process.env'].REACT_APP_API_URL = JSON.stringify(process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1/');
    }
  });
  
  return config;
});
