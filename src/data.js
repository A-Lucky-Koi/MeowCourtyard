(function(root){
'use strict';
const names=['英国短毛猫','布偶猫','美国短毛猫','波斯猫','暹罗猫','缅因猫','挪威森林猫','西伯利亚猫','孟加拉猫','俄罗斯蓝猫','苏格兰折耳猫','异国短毛猫','伯曼猫','土耳其安哥拉猫','土耳其梵猫','阿比西尼亚猫','索马里猫','缅甸猫','孟买猫','埃及猫','斯芬克斯猫','德文卷毛猫','柯尼斯卷毛猫','美国卷耳猫','曼基康猫','日本短尾猫','马恩岛猫','塞尔凯克卷毛猫','巴厘猫','奥西猫'];
const en=['British Shorthair','Ragdoll','American Shorthair','Persian','Siamese','Maine Coon','Norwegian Forest','Siberian','Bengal','Russian Blue','Scottish Fold','Exotic Shorthair','Birman','Turkish Angora','Turkish Van','Abyssinian','Somali','Burmese','Bombay','Egyptian Mau','Sphynx','Devon Rex','Cornish Rex','American Curl','Munchkin','Japanese Bobtail','Manx','Selkirk Rex','Balinese','Ocicat'];
const traits=['圆脸蓝灰短毛','蓝眼长毛重点色','银色经典虎斑','白色长毛扁脸','蓝眼深色面罩','耳尖簇毛与蓬松尾巴','橘白厚长毛','灰棕厚毛虎斑','金色豹纹斑点','银蓝短毛绿眼','向前折叠的小耳朵','橘白短毛扁脸','重点色与白手套','修长纯白长毛','白身橘色耳尾','肉桂色细密短毛','红棕长毛狐狸尾','深棕缎面短毛','黑色皮毛铜色眼睛','银底斑点','粉色无毛与褶皱','大耳与卷曲短毛','修长体型细卷毛','向后卷曲耳尖','橘色虎斑短腿','三花短绒球尾','灰白无尾圆臀','灰色羊毛卷','重点色丝绒长毛','棕色点状花纹'];
const cats=names.map((name,id)=>({id,name,en:en[id],trait:traits[id],rarity:['N','R','SR','SSR'][Math.min(3,Math.floor(id/8))],price:[800,2500,8000,20000][Math.min(3,Math.floor(id/8))],personality:['文静','活泼','贪睡'][id%3]}));
const chains=[
 {name:'猫薄荷',color:'#83a776',names:['猫薄荷球','双叶薄荷球','薄荷绒团','薄荷花束','薄荷小花园','薄荷梦境园']},
 {name:'猫爪大福',color:'#d9919a',names:['猫爪大福','双拼大福','三色大福','大福礼盒','大福塔','猫爪甜品屋']},
 {name:'铃铛',color:'#c69a4d',names:['小铃铛','蝴蝶结铃铛','双铃项圈','铃铛风铃','月亮铃饰','星光铃塔']},
 {name:'小鱼干',color:'#ca8b62',names:['小鱼干','双鱼干','鱼干小碟','烤鱼餐','豪华猫饭','海味猫宴']},
 {name:'小鸟玩具',color:'#77a5b6',names:['小鸟玩具','羽毛小鸟','逗猫鸟棒','小鸟秋千','玩具树屋','小鸟梦乐园']}
];
const maps=[{name:'初见庭院',en:'The first little home',level:1,price:0,stars:0,file:'garden'}, {name:'阳光花房',en:'A pocket of sunshine',level:10,price:5000,stars:12,file:'greenhouse'}, {name:'湖畔木屋',en:'Slow days by the lake',level:20,price:15000,stars:30,file:'lake'}, {name:'星空天台',en:'Where wishes gather',level:30,price:40000,stars:60,file:'rooftop'}];
const data={cats,chains,maps,poses:['walk1','walk2','eat','sleep','purr','sun'],poseNames:['走动','走动第二帧','吃饭','睡觉','呼噜','晒太阳']};
if(typeof module!=='undefined')module.exports=data;root.MeowData=data;
})(typeof globalThis!=='undefined'?globalThis:this);
