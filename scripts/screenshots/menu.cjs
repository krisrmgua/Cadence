const board = require('./menu-board.cjs');
module.exports = async (_root,output) => {
  const {createTrayIcon,trayHealthFromJobs}=require('../../dist-electron/trayIcon.js');
  const assert = require('node:assert/strict');
  assert.equal(trayHealthFromJobs([]), 'ok');
  assert.equal(trayHealthFromJobs([{enabled:false,lastStatus:'fail'}]), 'ok');
  assert.equal(trayHealthFromJobs([{enabled:true,lastStatus:'fail'}]), 'fail');
  assert.equal(trayHealthFromJobs([{enabled:true,lastStatus:'running'}]), 'ok');
  for (const status of ['ok','fail']) {
    const icon=await createTrayIcon(status);
    assert.deepEqual(icon.getSize(), {width:18,height:18});
    assert.deepEqual(icon.getScaleFactors(), [1,2]);
    assert.equal(icon.isTemplateImage(), false);
  }
  const ok = await createTrayIcon('ok');
  const fail = await createTrayIcon('fail');
  return board(output,'menu-bar.png','Cadence · menu-bar icons',[
    {label:'Healthy · enabled jobs have no failures',iconSize:18,png:ok.toPNG({scaleFactor:2})},
    {label:'Attention · an enabled job last failed',iconSize:18,png:fail.toPNG({scaleFactor:2})},
    {label:'Healthy · on a light menu bar',background:'#eff2f5',iconSize:18,png:ok.toPNG({scaleFactor:2})},
    {label:'Attention · on a light menu bar',background:'#eff2f5',iconSize:18,png:fail.toPNG({scaleFactor:2})},
  ],'Actual Cadence Timeflow menu-bar hourglass icons: white rails, with a green center when healthy and a red center when an enabled job last failed.');
};
