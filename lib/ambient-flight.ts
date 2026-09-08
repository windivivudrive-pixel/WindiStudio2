export function makeDuckFlight(width:number,height:number,random= Math.random){
  const w=Math.max(320,width),h=Math.max(300,height);
  const reverse=random()>.5;
  // Use the quiet strip above the hero instead of crossing paragraphs or inputs.
  const compact=w<=900;
  const y=compact?8+random()*12:24+random()*Math.min(72,h*.10);
  const drift=(random()-.5)*(compact?12:28);
  return {
    direction:reverse?-1:1,
    duration:11000+random()*4000,
    delay:2800+random()*3200,
    points:[
      {transform:`translate3d(${reverse?w+110:-110}px,${y}px,0)`,opacity:0,offset:0},
      {transform:`translate3d(${w*(reverse?.90:.10)}px,${y-(compact?4:28)}px,0)`,opacity:1,offset:.15},
      {transform:`translate3d(${w*(reverse?.18:.82)}px,${y+drift}px,0)`,opacity:1,offset:.85},
      {transform:`translate3d(${reverse?-110:w+110}px,${y+18}px,0)`,opacity:0,offset:1},
    ],
  };
}

export function makeDuckFall(x:number,y:number,floor:number){
  return [
    {transform:`translate3d(${x}px,${y}px,0)`,opacity:1,offset:0},
    {transform:`translate3d(${x}px,${Math.max(y,floor)}px,0)`,opacity:1,offset:.92},
    {transform:`translate3d(${x}px,${Math.max(y,floor)+90}px,0)`,opacity:0,offset:1},
  ];
}
