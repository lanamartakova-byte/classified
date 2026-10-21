// Measured source-pixel coordinates in the approved 1046 × 1504 PNG.
// The 154px hit circles sit inside the roughly 168px gold rims, with gaps.
const columns = [340, 520, 702];
const rows = [482, 658, 835, 1012];
const values = ['1','2','3','4','5','6','7','8','9','clear','0','enter'];
export const safeKeys = values.map((value, index) => ({
  value,
  label: value === 'clear' ? 'C' : value === 'enter' ? 'OK' : value,
  accessible: value === 'clear' ? 'Очистить код' : value === 'enter' ? 'Проверить код и открыть сейф' : `Цифра ${value}`,
  x: columns[index % 3] / 1046 * 100, y: rows[Math.floor(index / 3)] / 1504 * 100,
  width: 154 / 1046 * 100, height: 154 / 1504 * 100
}));
export const safeDisplay = {x:520.5/1046*100,y:320/1504*100,width:402/1046*100,height:89/1504*100};
// Shared stage in source-like units. Open image has a uniform 1.16 scale;
// left/top cabinet anchors, rather than whole-image centers, determine its offset.
export const safeGeometry = {
  width:1351,height:1755,
  closed:{x:152.5,y:100,width:1046,height:1504},
  open:{x:137.5,y:10,width:1213.36,height:1744.64},
  alpha:{left:0,top:21,right:1024,bottom:1504}
};
export function safeFit(width,height,messageHeight){
  const top=(safeGeometry.closed.y+safeGeometry.alpha.top)/safeGeometry.width;
  const stageWidth=Math.max(0,Math.min(width,650,(height-messageHeight-20)/(safeGeometry.height/safeGeometry.width-top)));
  return {width:stageWidth,marginTop:20-stageWidth*top};
}
