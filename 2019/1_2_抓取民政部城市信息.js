/*
获取民政部信息辅助补全

在以下页面执行
http://www.mca.gov.cn/article/sj/xzqh/中打开最新行政区划代码链接

先加载jQuery
var s=document.createElement("script");
s.src="https://cdn.bootcss.com/jquery/1.9.1/jquery.min.js";
document.body.append(s);

加载数据
	先直接运行本代码，根据提示输入data1_1.txt到文本框 (内容太大，控制台吃不消，文本框快很多)
	或者使用本地网址更快：
	var s=document.createElement("script");s.src="https://地址/data1_1.txt";document.documentElement.appendChild(s)
*/
"use strict";
jQuery;

if(!$(".DataTxt").length){
	$("body").append('<div style="position: fixed;bottom: 80px;left: 100px;padding: 20px;background: #0ca;z-index:9999999">输入data1_1.txt<textarea class="DataTxt"></textarea></div>');
};
if(!window.CITY_LIST1){
	var val=$(".DataTxt").val();
	if(!val){
		throw new Error("需要输入data1_1.txt");
	}else{
		window.CITY_LIST1=eval(val+";CITY_LIST1");
	};
}else{
	$(".DataTxt").val("CITY_LIST1="+JSON.stringify(CITY_LIST1,null,"\t"));
};
var cityList=CITY_LIST1;
CITY_LIST1=null;


//*******生成民政部数据*******
var allTxt=$("body").text();//html格式分析，no！
var exp=/\n[^\S\n]*(\d+)[^\S\n]*\n[^\S\n]*(.+?)[^\S\n]*\n/g;
var m;
var data={};
var arr=[];
while(m=exp.exec(allTxt)){
	var o={
		name: m[2]
		,code: m[1]
		,child: []
	};
	o.code=o.code.replace(/(0000|00)$/,"");
	data[o.code]=o;
	arr.push(o);
};
if(arr[0].name!="北京市" || arr[arr.length-1].code!="82"){
	console.log(arr);
	throw new Error("首尾数据不是预期城市");
};
console.log("读取到"+arr.length+"条数据", arr);


//人工修正数据，有些直辖市没有上级，用统计局的补齐
var fixParent={
	1101:{name:"市辖区"}//北京市
	,1201:{name:"市辖区"}//天津市
	,3101:{name:"市辖区"}//上海市
	,5001:{name:"市辖区"}//重庆市
	,5002:{name:"县"}//重庆市
	
	,4190:{name:"省直辖县级行政区划"}//河南省
	,4290:{name:"省直辖县级行政区划"}//湖北省
	,4690:{name:"省直辖县级行政区划"}//海南省
	,6590:{name:"自治区直辖县级行政区划"}//新疆
};
//人工修正数据，民政部新数据已撤销的市，统计局滞后
var fixRemove={
	3712:"莱芜市" //2019.01已被拆分到济南市
	
	//移除单独的港澳台，采用集中的 港澳台 选项
	,71:"台湾省"
	,81:"香港特别行政区"
	,82:"澳门特别行政区"
};
//构造成统一格式
var list=[];
for(var i=0;i<arr.length;i++){
	var o=arr[i];
	if(o.code.length==2){
		list.push(o);
	}else{
		var pid="";
		if(o.code.length==4){
			pid=o.code.substr(0,2);
		}else if(o.code.length==6){
			pid=o.code.substr(0,4);
		}else{
			console.error(o);
			throw new Error("不能处理的编号");
		};
		
		var parent=data[pid];
		if(!parent){
			parent=fixParent[pid];
			if(parent){
				if(!parent.code){
					parent.code=pid;
					parent.child=[];
					data[pid.substr(0,pid.length-2)].child.push(parent);
				};
			};
		};
		if(!parent){
			console.error(o);
			throw new Error("没有上级，请添加fixParent");
		};
		parent.child.push(o);
	};
};
console.log("民政部数据准备完成",list);




//*******合并数据*******
var notfinds=[];
var notfindsIgnore=[];
var maxDeep=0;
function merge(arr1,arr2,deep){
	if(deep==3){
		if(arr1.length){
			maxDeep=3;//有镇级
		};
		return;
	};
	maxDeep=Math.max(maxDeep,deep);
	
	//检查冲突
	for(var i=0;i<arr1.length;i++){
		var oi=arr1[i];
		if(deep==0&&!oi.code){
			oi.code=oi.child[0].code.substr(0,2)+"0000000000";//【格式化】给省级加上code
		};
		var oiCode=(oi.code+"").substr(0,6).replace(/(0000|00)$/,"");
		var find=false;
		for(var j=0;j<arr2.length;j++){
			var oj=arr2[j];
			if(oiCode==oj.code && oi.name!=oj.name){
				console.error("名称不同",oi,oj);
				throw new Error();
			};
			if(oi.name==oj.name && oiCode!=oj.code){
				console.error("编号不同",oi,oj);
				throw new Error();
			};
			if(oi.name==oj.name){
				oi.findOj=oj;
				find=true;
			};
		};
		if(!find){
			if(fixRemove[oiCode]==oi.name){//检查移除列表，发现就直接移除
				console.log("移除匹配项",oi);
				arr1.splice(i,1);
				i--;
			}else if(deep==2&&oiCode.length==4){
				//NOOP 补齐的区级，如东莞的区级
			}else if(/(新区|新城|新城区|实验区|保税区|开发区|管理区|食品区|园区|产业园|名胜区|示范区)$/.test(oi.name)){
				notfindsIgnore.push(oi);
			}else{
				notfinds.push(oi);
			};
		};
	};
	
	//合并不存在的项
	for(var j=0;j<arr2.length;j++){
		var oj=arr2[j];
		var find=false;
		for(var i=0;i<arr1.length;i++){
			var oi=arr1[i];
			if(oi.name==oj.name){
				find=true;
			};
		};
		//合并
		if(!find){
			if(fixRemove[oj.code]==oj.name){
				console.log("阻止添加新项",oj);
			}else{
				console.log("已添加",oj);
				arr1.push(oj);
			};
		};
	};
	
	//处理child
	for(var i=0;i<arr1.length;i++){
		var oi=arr1[i];
		if(oi.findOj){
			merge(oi.child,oi.findOj.child,deep+1);
		};
	};
};
merge(cityList,list,0);

if(notfinds.length){
	console.warn("发现"+notfinds.length+"条多余项", notfinds);
};
if(notfindsIgnore.length){
	console.log("忽略"+notfindsIgnore.length+"条多余项", notfindsIgnore);
};

console.log("合并完成", cityList);



/****格式化数据*****/

//顶上4个省的直辖市直接往上提一级
for(var i=0;i<cityList.length;i++){
	var oi=cityList[i];
	for(var j=0;j<oi.child.length;j++){
		var oj=oi.child[j];
		if(/行政区划$/ig.test(oj.name)){
			console.log("直辖市child上提一级",oj);
			oi.child.splice(j,1);
			j--;
			for(var k=0;k<oj.child.length;k++){
				var ok=oj.child[k];
				oi.child.push({
					name:ok.name
					,code:ok.code
					,child:[ok]
				});
			};
		};
	};
};

var format=function(arr,deep){
	var rtv=[];
	for(var i=0;i<arr.length;i++){
		var oi=arr[i];
		var o={
			name:oi.name
			,code:oi.code.length>=12?oi.code:(oi.code+"000000000000").substr(0,12)
			,child:[]
		};
		rtv.push(o);
		
		if(deep!=maxDeep){
			if(oi.child.length==0){
				console.log(deep+" 缺失下级，用自身补齐",oi);
				oi.child.push({
					name:oi.name
					,code:oi.code
					,child:[]
				});
			};
			
			if(oi.child.length!=0){
				o.child=format(oi.child,deep+1);
			};
		};
	};
	return rtv;
};
cityList=format(cityList,0);

console.log(cityList);


var url=URL.createObjectURL(
	new Blob([
		new Uint8Array([0xEF,0xBB,0xBF])
		,"var CITY_LIST2="
		,JSON.stringify(cityList,null,"\t")
	]
	,{"type":"text/plain"})
);
var downA=document.createElement("A");
downA.innerHTML="下载合并好的数据文件";
downA.href=url;
downA.download="data1_2.txt";
downA.click();

console.log("--完成--");