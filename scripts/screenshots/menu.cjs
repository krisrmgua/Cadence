const board = require('./menu-board.cjs');
module.exports = async (_root,output) => {
  const {createTrayIcon}=require('../../dist-electron/trayIcon.js');
  return board(output,'menu-bar.png','Cadence · menu-bar icons',[
    {label:'Healthy · enabled jobs have no failures',png:createTrayIcon('ok').toPNG()},
    {label:'Attention · an enabled job last failed',png:createTrayIcon('fail').toPNG()},
  ],'Actual Cadence menu-bar clock icons: green for healthy jobs and red for an enabled job failure.');
};
